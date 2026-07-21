package org.dawn.backend.service.inventory;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dawn.backend.config.anno.AuditLog;
import org.dawn.backend.config.web.response.ResponsePage;
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

@Service
@RequiredArgsConstructor
@Slf4j
public class PriceAdjustmentService {

    private final PriceAdjustmentRepository priceAdjustmentRepository;
    private final ImportReceiptItemRepository importReceiptItemRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    public ResponsePage<PriceAdjustmentResponse> findAll(Pageable pageable, String status) {
        var page = status != null && !status.isBlank()
                ? priceAdjustmentRepository.findByStatus(status.toUpperCase(), pageable)
                : priceAdjustmentRepository.findAll(pageable);
        return ResponsePage.of(page.map(this::enrich));
    }

    public PriceAdjustmentResponse findOne(Long id) {
        var adj = priceAdjustmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.PRICE_ADJ_NOT_FOUND));
        return enrich(adj);
    }

    public ResponsePage<PriceAdjustmentResponse> findMyAdjustments(Pageable pageable, String status) {
        Long userId = SecurityUtils.getCurrentUserId();
        var page = status != null && !status.isBlank()
                ? priceAdjustmentRepository.findByCreatedByAndStatus(userId, status.toUpperCase(), pageable)
                : priceAdjustmentRepository.findByCreatedBy(userId, pageable);
        return ResponsePage.of(page.map(this::enrich));
    }

    @Transactional
    @AuditLog(action = "CREATE_PRICE_ADJUSTMENT", entity = LogConstant.Entity.IMPORT_RECEIPT)
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
                .status("PENDING")
                .createdBy(userId)
                .build();
        adj = priceAdjustmentRepository.save(adj);
        return enrich(adj);
    }

    @Transactional
    @AuditLog(action = "APPROVE_PRICE_ADJUSTMENT", entity = LogConstant.Entity.IMPORT_RECEIPT)
    public PriceAdjustmentResponse approve(Long id, String approvalNote) {
        Long userId = SecurityUtils.getCurrentUserId();
        if (userId == null) throw new InvalidRequestException(Message.Auth.USER_NOT_AUTHENTICATED);

        var adj = priceAdjustmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.PRICE_ADJ_NOT_FOUND));

        if (!"PENDING".equals(adj.getStatus())) {
            throw new InvalidRequestException(Message.Inventory.PRICE_ADJ_ONLY_PENDING_APPROVE);
        }
        if (adj.getCreatedBy().equals(userId)) {
            throw new InvalidRequestException(Message.Inventory.CREATOR_CANNOT_APPROVE);
        }

        var item = importReceiptItemRepository.findById(adj.getImportReceiptItemId())
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.IMPORT_ITEM_NOT_FOUND));
        item.setUnitPrice(adj.getNewPrice());
        importReceiptItemRepository.save(item);

        adj.setStatus("APPROVED");
        adj.setApprovedBy(userId);
        adj.setApprovalNote(approvalNote);
        adj = priceAdjustmentRepository.save(adj);
        return enrich(adj);
    }

    @Transactional
    @AuditLog(action = "REJECT_PRICE_ADJUSTMENT", entity = LogConstant.Entity.IMPORT_RECEIPT)
    public PriceAdjustmentResponse reject(Long id, String approvalNote) {
        Long userId = SecurityUtils.getCurrentUserId();
        if (userId == null) throw new InvalidRequestException(Message.Auth.USER_NOT_AUTHENTICATED);

        var adj = priceAdjustmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.PRICE_ADJ_NOT_FOUND));

        if (!"PENDING".equals(adj.getStatus())) {
            throw new InvalidRequestException(Message.Inventory.PRICE_ADJ_ONLY_PENDING_REJECT);
        }

        adj.setStatus("REJECTED");
        adj.setApprovedBy(userId);
        adj.setApprovalNote(approvalNote);
        adj = priceAdjustmentRepository.save(adj);
        return enrich(adj);
    }

    private PriceAdjustmentResponse enrich(PriceAdjustment adj) {
        var createdByName = userRepository.findById(adj.getCreatedBy())
                .map(User::getFullName).orElse(null);
        var approvedByName = adj.getApprovedBy() != null
                ? userRepository.findById(adj.getApprovedBy()).map(User::getFullName).orElse(null)
                : null;

        String productName = null;
        String productSku = null;
        var item = importReceiptItemRepository.findById(adj.getImportReceiptItemId()).orElse(null);
        if (item != null) {
            var product = productRepository.findById(item.getProductId()).orElse(null);
            if (product != null) {
                productName = product.getName();
                productSku = product.getSku();
            }
        }

        return PriceAdjustmentMappingHelper.map(adj, productName, productSku, createdByName, approvedByName);
    }
}
