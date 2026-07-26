package org.dawn.backend.service.inventory;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dawn.backend.config.anno.AuditLog;
import org.dawn.backend.config.web.response.ResponsePage;
import org.dawn.backend.constant.inventory.AdjustmentSourceType;
import org.dawn.backend.constant.inventory.AdjustmentStatus;
import org.dawn.backend.constant.inventory.AdjustmentType;
import org.springframework.data.domain.Page;
import org.dawn.backend.constant.inventory.ProductUnitStatus;
import org.dawn.backend.constant.inventory.SourceType;
import org.dawn.backend.constant.catalog.TrackingType;
import org.dawn.backend.constant.shared.LogConstant;
import org.dawn.backend.constant.shared.Message;
import org.dawn.backend.controller.inventory.request.ApproveAdjustmentRequest;
import org.dawn.backend.controller.inventory.request.CreateStockAdjustmentRequest;
import org.dawn.backend.controller.inventory.response.StockAdjustmentResponse;
import org.dawn.backend.entity.auth.User;
import org.dawn.backend.entity.catalog.Product;
import org.dawn.backend.entity.inventory.ProductUnit;
import org.dawn.backend.entity.inventory.ProductUnitStatusLog;
import org.dawn.backend.entity.inventory.StockAdjustment;
import org.dawn.backend.exception.wrapper.InvalidRequestException;
import org.dawn.backend.exception.wrapper.ResourceNotFoundException;
import org.dawn.backend.repository.auth.UserRepository;
import org.dawn.backend.repository.catalog.ProductRepository;
import org.dawn.backend.repository.inventory.ProductUnitRepository;
import org.dawn.backend.repository.inventory.ProductUnitStatusLogRepository;
import org.dawn.backend.repository.inventory.StockAdjustmentRepository;
import org.dawn.backend.utils.ReceiptCodeGenerator;
import org.dawn.backend.utils.SecurityUtils;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class StockAdjustmentService {

    private final StockAdjustmentRepository adjustmentRepository;
    private final ProductUnitRepository productUnitRepository;
    private final ProductUnitStatusLogRepository statusLogRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public ResponsePage<StockAdjustmentResponse> findAll(Pageable pageable, String type, String status) {
        String t = normalize(type);
        AdjustmentStatus s = parseAdjustmentStatus(status);
        org.springframework.data.domain.Page<StockAdjustment> page;
        if (t != null && s != null) page = adjustmentRepository.findByTypeAndStatus(t, s, pageable);
        else if (t != null) page = adjustmentRepository.findByType(t, pageable);
        else if (s != null) page = adjustmentRepository.findByStatus(s, pageable);
        else page = adjustmentRepository.findAll(pageable);
        return ResponsePage.of(page.map(this::enrich));
    }

    @Transactional(readOnly = true)
    public StockAdjustmentResponse findOne(Long id) {
        var adj = adjustmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.ADJUSTMENT_NOT_FOUND));
        return enrich(adj);
    }

    @Transactional(readOnly = true)
    public ResponsePage<StockAdjustmentResponse> findMyAdjustments(Pageable pageable, String type, String status) {
        Long userId = SecurityUtils.getCurrentUserId();
        String t = normalize(type);
        AdjustmentStatus s = parseAdjustmentStatus(status);
        org.springframework.data.domain.Page<StockAdjustment> page;
        if (t != null && s != null) page = adjustmentRepository.findByCreatedByAndTypeAndStatus(userId, t, s, pageable);
        else if (t != null) page = adjustmentRepository.findByCreatedByAndType(userId, t, pageable);
        else if (s != null) page = adjustmentRepository.findByCreatedByAndStatus(userId, s, pageable);
        else page = adjustmentRepository.findByCreatedBy(userId, pageable);
        return ResponsePage.of(page.map(this::enrich));
    }

    private String normalize(String value) {
        return (value != null && !value.isBlank()) ? value.toUpperCase() : null;
    }

    private AdjustmentStatus parseAdjustmentStatus(String value) {
        if (value == null || value.isBlank()) return null;
        try { return AdjustmentStatus.valueOf(value.toUpperCase()); }
        catch (IllegalArgumentException e) { return null; }
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.CREATE_ADJUSTMENT, entity = LogConstant.Entity.STOCK_ADJUSTMENT)
    public StockAdjustmentResponse create(CreateStockAdjustmentRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        if (userId == null) throw new InvalidRequestException(Message.Auth.USER_NOT_AUTHENTICATED);

        if (request.type() == null || request.type().isBlank()) {
            throw new InvalidRequestException(Message.Inventory.ADJUSTMENT_TYPE_REQUIRED);
        }
        String type = request.type().toUpperCase();
        try {
            AdjustmentType.valueOf(type);
        } catch (IllegalArgumentException e) {
            throw new InvalidRequestException(Message.format(Message.Inventory.INVALID_ADJUSTMENT_TYPE, type));
        }

        if (request.reason() == null || request.reason().isBlank()) {
            throw new InvalidRequestException(Message.Inventory.ADJUSTMENT_REASON_REQUIRED);
        }

        if (AdjustmentType.DAMAGED.name().equals(type) || AdjustmentType.LOST.name().equals(type)) {
            if (request.productUnitId() == null) {
                throw new InvalidRequestException(
                        Message.format(Message.Inventory.ADJUSTMENT_UNIT_REQUIRED, type.toLowerCase()));
            }
        }

        if (AdjustmentType.FOUND.name().equals(type) && request.productUnitId() == null) {
            if (request.productId() == null) {
                throw new InvalidRequestException(Message.Inventory.ADJUSTMENT_PRODUCT_REQUIRED);
            }
        }

        String adjustCode = generateAdjustCode();
        String sourceType = request.sourceType() != null ? request.sourceType().toUpperCase() : AdjustmentSourceType.MANUAL.name();

        StockAdjustment adj = StockAdjustment.builder()
                .adjustCode(adjustCode)
                .type(type)
                .productUnitId(request.productUnitId())
                .productId(request.productId())
                .quantity(request.quantity() != null ? request.quantity() : 1)
                .reason(request.reason())
                .imageUrl(request.imageUrl())
                .sourceType(sourceType)
                .sourceId(request.sourceId())
                .status(AdjustmentStatus.PENDING)
                .createdBy(userId)
                .build();
        adj = adjustmentRepository.save(adj);
        return enrich(adj);
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.APPROVE_ADJUSTMENT, entity = LogConstant.Entity.STOCK_ADJUSTMENT)
    public StockAdjustmentResponse approve(Long id, ApproveAdjustmentRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        if (userId == null) throw new InvalidRequestException(Message.Auth.USER_NOT_AUTHENTICATED);

        var adj = adjustmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.ADJUSTMENT_NOT_FOUND));

        if (AdjustmentStatus.PENDING != adj.getStatus()) {
            throw new InvalidRequestException(Message.Inventory.ONLY_PENDING_CAN_APPROVE);
        }
        if (adj.getCreatedBy().equals(userId)) {
            // throw new InvalidRequestException(Message.Inventory.CREATOR_CANNOT_APPROVE);
        }

        String type = adj.getType();
        if (AdjustmentType.DAMAGED.name().equals(type)) {
            applyDamaged(adj, userId);
        } else if (AdjustmentType.LOST.name().equals(type)) {
            applyLost(adj, userId);
        } else if (AdjustmentType.FOUND.name().equals(type)) {
            applyFound(adj, userId);
        }

        adj.setStatus(AdjustmentStatus.APPROVED);
        adj.setApprovedBy(userId);
        adj.setApprovalNote(request != null ? request.approvalNote() : null);
        adj = adjustmentRepository.save(adj);
        return enrich(adj);
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.REJECT_ADJUSTMENT, entity = LogConstant.Entity.STOCK_ADJUSTMENT)
    public StockAdjustmentResponse reject(Long id, ApproveAdjustmentRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        if (userId == null) throw new InvalidRequestException(Message.Auth.USER_NOT_AUTHENTICATED);

        var adj = adjustmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.ADJUSTMENT_NOT_FOUND));

        if (AdjustmentStatus.PENDING != adj.getStatus()) {
            throw new InvalidRequestException(Message.Inventory.ONLY_PENDING_CAN_REJECT);
        }

        if (request == null || request.approvalNote() == null || request.approvalNote().isBlank()) {
            throw new InvalidRequestException("Rejection reason is required");
        }

        adj.setStatus(AdjustmentStatus.PENDING);
        adj.setApprovalNote(request.approvalNote());
        adj = adjustmentRepository.save(adj);
        return enrich(adj);
    }

    private void applyDamaged(StockAdjustment adj, Long userId) {
        var unit = productUnitRepository.findById(adj.getProductUnitId())
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.PRODUCT_UNIT_NOT_FOUND));
        ProductUnitStatus oldStatus = unit.getStatus();
        unit.setStatus(ProductUnitStatus.DAMAGED_IN_STORAGE);
        productUnitRepository.save(unit);
        statusLogRepository.save(ProductUnitStatusLog.builder()
                .productUnitId(unit.getId())
                .fromStatus(oldStatus.name())
                .toStatus(ProductUnitStatus.DAMAGED_IN_STORAGE.name())
                .sourceType(SourceType.STOCK_ADJUSTMENT.name())
                .sourceId(adj.getId())
                .changedBy(userId)
                .build());
    }

    private void applyLost(StockAdjustment adj, Long userId) {
        var unit = productUnitRepository.findById(adj.getProductUnitId())
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.PRODUCT_UNIT_NOT_FOUND));
        ProductUnitStatus oldStatus = unit.getStatus();
        unit.setStatus(ProductUnitStatus.LOST);
        productUnitRepository.save(unit);
        statusLogRepository.save(ProductUnitStatusLog.builder()
                .productUnitId(unit.getId())
                .fromStatus(oldStatus.name())
                .toStatus(ProductUnitStatus.LOST.name())
                .sourceType(SourceType.STOCK_ADJUSTMENT.name())
                .sourceId(adj.getId())
                .changedBy(userId)
                .build());
    }

    private void applyFound(StockAdjustment adj, Long userId) {
        if (adj.getProductUnitId() != null) {
            var unit = productUnitRepository.findById(adj.getProductUnitId())
                    .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.PRODUCT_UNIT_NOT_FOUND));
            ProductUnitStatus currentStatus = unit.getStatus();

            if (ProductUnitStatus.IN_STOCK == currentStatus) {
                return;
            }

            if (!Set.of(ProductUnitStatus.LOST, ProductUnitStatus.REMOVED, ProductUnitStatus.DAMAGED_IN_STORAGE).contains(currentStatus)) {
                throw new InvalidRequestException(
                        Message.format(Message.Inventory.ADJUSTMENT_UNIT_NOT_RESTORABLE, currentStatus.name()));
            }

            unit.setStatus(ProductUnitStatus.IN_STOCK);
            productUnitRepository.save(unit);
            statusLogRepository.save(ProductUnitStatusLog.builder()
                    .productUnitId(unit.getId())
                    .fromStatus(currentStatus.name())
                    .toStatus(ProductUnitStatus.IN_STOCK.name())
                    .sourceType(SourceType.STOCK_ADJUSTMENT.name())
                    .sourceId(adj.getId())
                    .changedBy(userId)
                    .build());
        } else {
            var product = productRepository.findById(adj.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException(Message.Catalog.PRODUCT_NOT_FOUND));
            String trackingType = product.getTrackingType();

            String serialNumber = null;
            if (TrackingType.SERIALIZED.name().equals(trackingType)) {
                serialNumber = "FOUND-" + adj.getAdjustCode();
            }

                    ProductUnit newUnit = ProductUnit.builder()
                            .serialNumber(serialNumber)
                            .productId(product.getId())
                            .trackingType(trackingType)
                            .initialQuantity(adj.getQuantity() != null ? java.math.BigDecimal.valueOf(adj.getQuantity()) : java.math.BigDecimal.ONE)
                            .remainingQuantity(TrackingType.BULK.name().equals(trackingType) && adj.getQuantity() != null
                                    ? java.math.BigDecimal.valueOf(adj.getQuantity()) : java.math.BigDecimal.ZERO)
                            .status(ProductUnitStatus.IN_STOCK)
                            .importedAt(Instant.now())
                            .warrantyMonths(0)
                            .build();
            newUnit = productUnitRepository.save(newUnit);

            statusLogRepository.save(ProductUnitStatusLog.builder()
                    .productUnitId(newUnit.getId())
                    .fromStatus("N/A")
                    .toStatus(ProductUnitStatus.IN_STOCK.name())
                    .sourceType(SourceType.STOCK_ADJUSTMENT.name())
                    .sourceId(adj.getId())
                    .changedBy(userId)
                    .build());

            adj.setProductUnitId(newUnit.getId());
            adj.setQuantity(TrackingType.BULK.name().equals(trackingType) ? adj.getQuantity() : null);
        }
    }

    private StockAdjustmentResponse enrich(StockAdjustment adj) {
        var createdByName = userRepository.findById(adj.getCreatedBy())
                .map(User::getFullName).orElse(null);
        var approvedByName = adj.getApprovedBy() != null
                ? userRepository.findById(adj.getApprovedBy()).map(User::getFullName).orElse(null)
                : null;
        ProductUnit unit = adj.getProductUnitId() != null
                ? productUnitRepository.findById(adj.getProductUnitId()).orElse(null)
                : null;
        Long productId = adj.getProductId() != null ? adj.getProductId()
                : (unit != null ? unit.getProductId() : null);
        Product product = productId != null
                ? productRepository.findById(productId).orElse(null)
                : null;
        return StockAdjustmentMappingHelper.map(adj, createdByName, approvedByName, unit, product);
    }

    private String generateAdjustCode() {
        return ReceiptCodeGenerator.generate("ADJ-", adjustmentRepository::existsByAdjustCode);
    }
}
