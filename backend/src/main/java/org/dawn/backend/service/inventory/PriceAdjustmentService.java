package org.dawn.backend.service.inventory;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dawn.backend.config.anno.AuditLog;
import org.dawn.backend.config.web.response.ResponsePage;
import org.dawn.backend.constant.inventory.AdjustmentStatus;
import org.springframework.data.domain.Page;
import org.dawn.backend.constant.shared.LogConstant;
import org.dawn.backend.constant.shared.Message;
import org.dawn.backend.controller.inventory.request.CreatePriceAdjustmentRequest;
import org.dawn.backend.controller.inventory.response.PriceAdjustmentResponse;
import org.dawn.backend.entity.catalog.Product;
import org.dawn.backend.entity.inventory.ImportReceiptItem;
import org.dawn.backend.entity.inventory.PriceAdjustment;
import org.dawn.backend.exception.wrapper.InvalidRequestException;
import org.dawn.backend.exception.wrapper.ResourceNotFoundException;
import org.dawn.backend.repository.catalog.ProductRepository;
import org.dawn.backend.repository.inventory.ImportReceiptItemRepository;
import org.dawn.backend.repository.inventory.PriceAdjustmentRepository;
import org.dawn.backend.repository.auth.UserRepository;
import org.dawn.backend.entity.auth.User;
import org.dawn.backend.utils.ReceiptCodeGenerator;
import org.dawn.backend.utils.SecurityUtils;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PriceAdjustmentService {

    private final PriceAdjustmentRepository priceAdjustmentRepository;
    private final ImportReceiptItemRepository importReceiptItemRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public ResponsePage<PriceAdjustmentResponse> findAll(Pageable pageable, String status) {
        AdjustmentStatus s = safeParseAdjustmentStatus(status);
        Page<PriceAdjustment> page = s != null
                ? priceAdjustmentRepository.findByStatus(s, pageable)
                : status != null && !status.isBlank()
                    ? Page.empty(pageable)
                    : priceAdjustmentRepository.findAll(pageable);
        var adjs = page.getContent();
        var itemProductMap = fetchItemProductMap(adjs);
        var userMap = fetchUserMap(adjs);
        return ResponsePage.of(page.map(a -> enrich(a, itemProductMap, userMap)));
    }

    @Transactional(readOnly = true)
    public PriceAdjustmentResponse findOne(Long id) {
        var adj = priceAdjustmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.PRICE_ADJ_NOT_FOUND));
        return enrich(adj);
    }

    @Transactional(readOnly = true)
    public ResponsePage<PriceAdjustmentResponse> findMyAdjustments(Pageable pageable, String status) {
        Long userId = SecurityUtils.getCurrentUserId();
        AdjustmentStatus s = safeParseAdjustmentStatus(status);
        Page<PriceAdjustment> page = s != null
                ? priceAdjustmentRepository.findByCreatedByAndStatus(userId, s, pageable)
                : status != null && !status.isBlank()
                    ? Page.empty(pageable)
                    : priceAdjustmentRepository.findByCreatedBy(userId, pageable);
        var adjs = page.getContent();
        var itemProductMap = fetchItemProductMap(adjs);
        var userMap = fetchUserMap(adjs);
        return ResponsePage.of(page.map(a -> enrich(a, itemProductMap, userMap)));
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.CREATE_PRICE_ADJUSTMENT, entity = LogConstant.Entity.PRICE_ADJUSTMENT)
    public PriceAdjustmentResponse create(CreatePriceAdjustmentRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        if (userId == null) throw new InvalidRequestException(Message.Auth.USER_NOT_AUTHENTICATED);

        if (request.importReceiptItemId() == null) {
            throw new InvalidRequestException(Message.Inventory.PRICE_ADJ_ITEM_REQUIRED);
        }
        if (request.newPrice() == null || request.newPrice().compareTo(java.math.BigDecimal.ZERO) < 0) {
            throw new InvalidRequestException(Message.Inventory.PRICE_ADJ_NEW_PRICE_NEGATIVE);
        }
        if (request.reason() == null || request.reason().isBlank()) {
            throw new InvalidRequestException(Message.Inventory.PRICE_ADJ_REASON_REQUIRED);
        }

        var item = importReceiptItemRepository.findById(request.importReceiptItemId())
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.IMPORT_ITEM_NOT_FOUND));

        java.math.BigDecimal oldPrice = item.getUnitPrice() != null ? item.getUnitPrice() : java.math.BigDecimal.ZERO;
        if (oldPrice.compareTo(request.newPrice()) == 0) {
            throw new InvalidRequestException(Message.Inventory.PRICE_ADJ_SAME_PRICE);
        }

        String adjustCode = ReceiptCodeGenerator.generate("PADJ-", priceAdjustmentRepository::existsByAdjustCode);

        PriceAdjustment adj = PriceAdjustment.builder()
                .adjustCode(adjustCode)
                .importReceiptItemId(request.importReceiptItemId())
                .oldPrice(oldPrice)
                .newPrice(request.newPrice())
                .reason(request.reason())
                .status(AdjustmentStatus.PENDING)
                .createdBy(userId)
                .build();
        adj = priceAdjustmentRepository.save(adj);
        return enrich(adj);
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.APPROVE_PRICE_ADJUSTMENT, entity = LogConstant.Entity.PRICE_ADJUSTMENT)
    public PriceAdjustmentResponse approve(Long id, String approvalNote) {
        Long userId = SecurityUtils.getCurrentUserId();
        if (userId == null) throw new InvalidRequestException(Message.Auth.USER_NOT_AUTHENTICATED);

        var adj = priceAdjustmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.PRICE_ADJ_NOT_FOUND));

        if (AdjustmentStatus.PENDING != adj.getStatus()) {
            throw new InvalidRequestException(Message.Inventory.PRICE_ADJ_ONLY_PENDING_APPROVE);
        }
        if (adj.getCreatedBy().equals(userId)) {
            throw new InvalidRequestException(Message.Inventory.CREATOR_CANNOT_APPROVE);
        }

        var item = importReceiptItemRepository.findById(adj.getImportReceiptItemId())
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.IMPORT_ITEM_NOT_FOUND));
        item.setUnitPrice(adj.getNewPrice());
        importReceiptItemRepository.save(item);

        adj.setStatus(AdjustmentStatus.APPROVED);
        adj.setApprovedBy(userId);
        adj.setApprovalNote(approvalNote);
        adj = priceAdjustmentRepository.save(adj);
        return enrich(adj);
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.REJECT_PRICE_ADJUSTMENT, entity = LogConstant.Entity.PRICE_ADJUSTMENT)
    public PriceAdjustmentResponse reject(Long id, String approvalNote) {
        Long userId = SecurityUtils.getCurrentUserId();
        if (userId == null) throw new InvalidRequestException(Message.Auth.USER_NOT_AUTHENTICATED);

        var adj = priceAdjustmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.PRICE_ADJ_NOT_FOUND));

        if (AdjustmentStatus.PENDING != adj.getStatus()) {
            throw new InvalidRequestException(Message.Inventory.PRICE_ADJ_ONLY_PENDING_REJECT);
        }

        adj.setStatus(AdjustmentStatus.REJECTED);
        adj.setApprovedBy(userId);
        adj.setApprovalNote(approvalNote);
        adj = priceAdjustmentRepository.save(adj);
        return enrich(adj);
    }

    private Map<Long, String[]> fetchItemProductMap(List<PriceAdjustment> adjs) {
        var itemIds = adjs.stream().map(PriceAdjustment::getImportReceiptItemId).distinct().toList();
        var items = importReceiptItemRepository.findAllById(itemIds).stream()
                .collect(Collectors.toMap(ImportReceiptItem::getId, Function.identity()));
        var productIds = items.values().stream().map(ImportReceiptItem::getProductId).distinct().toList();
        var products = productRepository.findAllById(productIds).stream()
                .collect(Collectors.toMap(Product::getId, Function.identity()));
        return items.entrySet().stream().collect(Collectors.toMap(
                Map.Entry::getKey,
                e -> {
                    var p = products.get(e.getValue().getProductId());
                    return new String[]{p != null ? p.getName() : null, p != null ? p.getSku() : null};
                }));
    }

    private Map<Long, String> fetchUserMap(List<PriceAdjustment> adjs) {
        var ids = adjs.stream()
                .flatMap(a -> {
                    var list = new java.util.ArrayList<Long>();
                    list.add(a.getCreatedBy());
                    if (a.getApprovedBy() != null) list.add(a.getApprovedBy());
                    return list.stream();
                })
                .distinct().toList();
        return userRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(User::getId, User::getFullName));
    }

    private PriceAdjustmentResponse enrich(PriceAdjustment adj, Map<Long, String[]> itemProductMap, Map<Long, String> userMap) {
        var itemProduct = itemProductMap.get(adj.getImportReceiptItemId());
        return PriceAdjustmentMappingHelper.map(adj,
                itemProduct != null ? itemProduct[0] : null,
                itemProduct != null ? itemProduct[1] : null,
                userMap.get(adj.getCreatedBy()),
                adj.getApprovedBy() != null ? userMap.get(adj.getApprovedBy()) : null);
    }

    private PriceAdjustmentResponse enrich(PriceAdjustment adj) {
        var item = importReceiptItemRepository.findById(adj.getImportReceiptItemId()).orElse(null);
        String productName = null, productSku = null;
        if (item != null) {
            var product = productRepository.findById(item.getProductId()).orElse(null);
            if (product != null) {
                productName = product.getName();
                productSku = product.getSku();
            }
        }
        var createdByName = userRepository.findById(adj.getCreatedBy()).map(User::getFullName).orElse(null);
        var approvedByName = adj.getApprovedBy() != null
                ? userRepository.findById(adj.getApprovedBy()).map(User::getFullName).orElse(null)
                : null;
        return PriceAdjustmentMappingHelper.map(adj, productName, productSku, createdByName, approvedByName);
    }

    private AdjustmentStatus safeParseAdjustmentStatus(String value) {
        if (value == null || value.isBlank()) return null;
        try { return AdjustmentStatus.valueOf(value.toUpperCase()); }
        catch (IllegalArgumentException e) { return null; }
    }
}
