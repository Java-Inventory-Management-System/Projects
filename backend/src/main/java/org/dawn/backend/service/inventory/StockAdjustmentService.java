package org.dawn.backend.service.inventory;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dawn.backend.config.anno.AuditLog;
import org.dawn.backend.config.web.response.ResponsePage;
import org.dawn.backend.constant.inventory.AdjustmentSourceType;
import org.dawn.backend.constant.inventory.AdjustmentStatus;
import org.dawn.backend.constant.inventory.AdjustmentType;
import org.dawn.backend.constant.inventory.SourceType;
import org.dawn.backend.constant.shared.LogConstant;
import org.dawn.backend.constant.shared.Message;
import org.dawn.backend.controller.inventory.request.ApproveAdjustmentRequest;
import org.dawn.backend.controller.inventory.request.CreateStockAdjustmentRequest;
import org.dawn.backend.controller.inventory.response.StockAdjustmentResponse;
import org.dawn.backend.entity.auth.User;
import org.dawn.backend.entity.catalog.Product;
import org.dawn.backend.entity.inventory.ProductUnit;
import org.dawn.backend.entity.inventory.StockAdjustment;
import org.dawn.backend.exception.wrapper.InvalidRequestException;
import org.dawn.backend.exception.wrapper.ResourceNotFoundException;
import org.dawn.backend.repository.auth.UserRepository;
import org.dawn.backend.repository.catalog.ProductRepository;
import org.dawn.backend.repository.inventory.ProductUnitRepository;
import org.dawn.backend.repository.inventory.StockAdjustmentRepository;
import org.dawn.backend.utils.ReceiptCodeGenerator;
import org.dawn.backend.utils.SecurityUtils;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class StockAdjustmentService {

    private final StockAdjustmentRepository adjustmentRepository;
    private final ProductUnitRepository productUnitRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final AdjustmentUnitService adjustmentUnitService;

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

    @Transactional(readOnly = true)
    public ResponsePage<StockAdjustmentResponse> findByProductUnitId(Long productUnitId, Pageable pageable) {
        var page = adjustmentRepository.findByProductUnitIdOrderByCreatedAtDesc(productUnitId, pageable);
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
            if (AdjustmentType.DAMAGED.name().equals(type) && (request.imageUrl() == null || request.imageUrl().isBlank())) {
                throw new InvalidRequestException("Photo is required for DAMAGED adjustment");
            }
        }

        if (AdjustmentType.FOUND.name().equals(type) && request.productUnitId() == null) {
            if (request.productId() == null) {
                throw new InvalidRequestException(Message.Inventory.ADJUSTMENT_PRODUCT_REQUIRED);
            }
            if (request.serialNumber() == null || request.serialNumber().isBlank()) {
                throw new InvalidRequestException("Serial number is required for FOUND adjustment");
            }
            if (request.locationId() == null) {
                throw new InvalidRequestException("Location is required for FOUND adjustment");
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
                .serialNumber(request.serialNumber())
                .locationId(request.locationId())
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
                throw new InvalidRequestException(Message.Inventory.CREATOR_CANNOT_APPROVE);
            }

        String type = adj.getType();
        if (AdjustmentType.DAMAGED.name().equals(type)) {
            adjustmentUnitService.applyDamaged(adj.getProductUnitId(), SourceType.STOCK_ADJUSTMENT.name(), adj.getId(), userId);
        } else if (AdjustmentType.LOST.name().equals(type)) {
            adjustmentUnitService.applyLost(adj.getProductUnitId(), SourceType.STOCK_ADJUSTMENT.name(), adj.getId(), userId);
        } else if (AdjustmentType.FOUND.name().equals(type)) {
            if (adj.getProductUnitId() != null) {
                adjustmentUnitService.applyFoundRestore(adj.getProductUnitId(), SourceType.STOCK_ADJUSTMENT.name(), adj.getId(), userId);
            } else {
                adjustmentUnitService.applyFoundNew(adj, userId);
            }
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

        adj.setStatus(AdjustmentStatus.REJECTED);
        adj.setApprovedBy(userId);
        adj.setApprovalNote(request.approvalNote());
        adj = adjustmentRepository.save(adj);
        return enrich(adj);
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
