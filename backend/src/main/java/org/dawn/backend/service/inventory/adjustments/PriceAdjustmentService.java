package org.dawn.backend.service.inventory.adjustments;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dawn.backend.shared.statemachine.StateMachine;
import org.dawn.backend.aspect.AuditLog;
import org.dawn.backend.config.web.response.ResponsePage;
import org.dawn.backend.constant.enums.inventory.adjustments.AdjustmentStatus;
import org.springframework.data.domain.Page;
import org.dawn.backend.constant.shared.LogConstant;
import org.dawn.backend.constant.shared.Message;
import org.dawn.backend.controller.inventory.request.CreatePriceAdjustmentRequest;
import org.dawn.backend.controller.inventory.response.AvailableItemResponse;
import org.dawn.backend.controller.inventory.response.PriceAdjustmentResponse;
import org.dawn.backend.entity.catalog.Product;
import org.dawn.backend.entity.inventory.ImportReceipt;
import org.dawn.backend.entity.inventory.ImportReceiptItem;
import org.dawn.backend.entity.inventory.PriceAdjustment;
import org.dawn.backend.exception.type.InvalidRequestException;
import org.dawn.backend.exception.type.ResourceNotFoundException;
import org.dawn.backend.repository.catalog.ProductRepository;
import org.dawn.backend.repository.inventory.imports.ImportReceiptItemRepository;
import org.dawn.backend.repository.inventory.imports.ImportReceiptRepository;
import org.dawn.backend.repository.inventory.adjustments.PriceAdjustmentRepository;
import org.dawn.backend.repository.auth.UserRepository;
import org.dawn.backend.entity.auth.User;
import org.dawn.backend.shared.util.ReceiptCodeGenerator;
import org.dawn.backend.shared.util.SecurityUtils;
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
    private final ImportReceiptRepository importReceiptRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final StateMachine<AdjustmentStatus> adjustmentStateMachine;

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
        Long userId = SecurityUtils.getCurrentUserId();
        if (userId == null) throw new InvalidRequestException(Message.Auth.USER_NOT_AUTHENTICATED);

        var adj = priceAdjustmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.PRICE_ADJ_NOT_FOUND));

        // STOCK/SALES: only own adjustments; MANAGER/ADMIN: all
        String role = SecurityUtils.getCurrentRole();
        boolean isManagerOrAdmin = "MANAGER".equals(role) || "ADMIN".equals(role);
        if (!isManagerOrAdmin && !adj.getCreatedBy().equals(userId)) {
            throw new ResourceNotFoundException(Message.Inventory.PRICE_ADJ_NOT_FOUND);
        }

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

    @Transactional(readOnly = true)
    public List<AvailableItemResponse> findAvailableItemsByProduct(Long productId) {
        var items = importReceiptItemRepository.findByProductId(productId);
        if (items.isEmpty()) return List.of();

        var receiptIds = items.stream().map(ImportReceiptItem::getReceiptId).distinct().toList();
        var receipts = importReceiptRepository.findAllById(receiptIds).stream()
                .filter(r -> r.getStatus() == org.dawn.backend.constant.enums.inventory.imports.ImportReceiptStatus.COMPLETED)
                .collect(java.util.stream.Collectors.toMap(ImportReceipt::getId, java.util.function.Function.identity()));

        var product = productRepository.findById(productId).orElse(null);
        String productName = product != null ? product.getName() : null;
        String productSku = product != null ? product.getSku() : null;

        var pendingItemIds = priceAdjustmentRepository.findAll().stream()
                .filter(a -> a.getStatus() == AdjustmentStatus.PENDING)
                .map(PriceAdjustment::getImportReceiptItemId)
                .collect(java.util.stream.Collectors.toSet());

        return items.stream()
                .filter(item -> receipts.containsKey(item.getReceiptId()))
                .map(item -> AvailableItemResponse.builder()
                        .importReceiptItemId(item.getId())
                        .productId(productId)
                        .productName(productName)
                        .productSku(productSku)
                        .receiptCode(receipts.get(item.getReceiptId()).getReceiptCode())
                        .receiptDate(receipts.get(item.getReceiptId()).getCreatedAt())
                        .unitPrice(item.getUnitPrice())
                        .hasPending(pendingItemIds.contains(item.getId()))
                        .build())
                .toList();
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.CREATE_PRICE_ADJUSTMENT, entity = LogConstant.Entity.PRICE_ADJUSTMENT)
    public PriceAdjustmentResponse create(CreatePriceAdjustmentRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        if (userId == null) throw new InvalidRequestException(Message.Auth.USER_NOT_AUTHENTICATED);

        if (request.importReceiptItemId() == null) {
            throw new InvalidRequestException(Message.Inventory.PRICE_ADJ_ITEM_REQUIRED);
        }
        if (request.newPrice() == null || request.newPrice().compareTo(java.math.BigDecimal.ONE) < 0) {
            throw new InvalidRequestException(Message.Inventory.PRICE_ADJ_NEW_PRICE_NEGATIVE);
        }
        if (request.newPrice().scale() > 0) {
            throw new InvalidRequestException(Message.Inventory.PRICE_ADJ_WHOLE_NUMBER);
        }
        if (request.reason() == null || request.reason().isBlank()) {
            throw new InvalidRequestException(Message.Inventory.PRICE_ADJ_REASON_REQUIRED);
        }

        var existing = priceAdjustmentRepository.findByImportReceiptItemIdAndStatus(
                request.importReceiptItemId(), AdjustmentStatus.PENDING);
        if (existing.isPresent()) {
            throw new InvalidRequestException(
                    Message.format(Message.Inventory.PRICE_ADJ_DUPLICATE_PENDING, existing.get().getAdjustCode()));
        }

        var item = importReceiptItemRepository.findById(request.importReceiptItemId())
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.IMPORT_ITEM_NOT_FOUND));

        var oldPrice = item.getUnitPrice() != null ? item.getUnitPrice() : java.math.BigDecimal.ZERO;
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

        adjustmentStateMachine.validate(adj.getStatus(), AdjustmentStatus.APPROVED);
        if (adj.getCreatedBy().equals(userId)) {
            throw new InvalidRequestException(Message.Inventory.CREATOR_CANNOT_APPROVE);
        }

        var item = importReceiptItemRepository.findById(adj.getImportReceiptItemId())
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.IMPORT_ITEM_NOT_FOUND));
        if (item.getUnitPrice().compareTo(adj.getOldPrice()) != 0) {
            throw new InvalidRequestException(Message.Inventory.PRICE_ADJ_PRICE_CHANGED);
        }
        item.setUnitPrice(adj.getNewPrice());
        importReceiptItemRepository.save(item);

        int updated = priceAdjustmentRepository.optimisticUpdateStatus(
                id, AdjustmentStatus.APPROVED, userId, approvalNote);
        if (updated == 0) {
            throw new InvalidRequestException(Message.Inventory.PRICE_ADJ_ONLY_PENDING_APPROVE);
        }
        adj.setStatus(AdjustmentStatus.APPROVED);
        return enrich(adj);
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.CANCEL_PRICE_ADJUSTMENT, entity = LogConstant.Entity.PRICE_ADJUSTMENT)
    public PriceAdjustmentResponse cancel(Long id) {
        Long userId = SecurityUtils.getCurrentUserId();
        if (userId == null) throw new InvalidRequestException(Message.Auth.USER_NOT_AUTHENTICATED);

        var adj = priceAdjustmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.PRICE_ADJ_NOT_FOUND));

        adjustmentStateMachine.validate(adj.getStatus(), AdjustmentStatus.CANCELLED);
        if (!adj.getCreatedBy().equals(userId)) {
            throw new InvalidRequestException(Message.Auth.FORBIDDEN);
        }

        int updated = priceAdjustmentRepository.optimisticUpdateStatus(
                id, AdjustmentStatus.CANCELLED, userId, null);
        if (updated == 0) {
            throw new InvalidRequestException(Message.Inventory.PRICE_ADJ_ONLY_PENDING_CANCEL);
        }
        return enrich(adj);
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.REJECT_PRICE_ADJUSTMENT, entity = LogConstant.Entity.PRICE_ADJUSTMENT)
    public PriceAdjustmentResponse reject(Long id, String reason) {
        Long userId = SecurityUtils.getCurrentUserId();
        if (userId == null) throw new InvalidRequestException(Message.Auth.USER_NOT_AUTHENTICATED);

        if (reason == null || reason.isBlank()) {
            throw new InvalidRequestException(Message.Inventory.PRICE_ADJ_REJECT_REASON_REQUIRED);
        }

        var adj = priceAdjustmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.PRICE_ADJ_NOT_FOUND));

        adjustmentStateMachine.validate(adj.getStatus(), AdjustmentStatus.REJECTED);

        int updated = priceAdjustmentRepository.optimisticUpdateStatus(
                id, AdjustmentStatus.REJECTED, userId, reason);
        if (updated == 0) {
            throw new InvalidRequestException(Message.Inventory.PRICE_ADJ_ONLY_PENDING_REJECT);
        }
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
