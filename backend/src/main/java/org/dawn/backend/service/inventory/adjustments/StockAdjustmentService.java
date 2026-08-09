package org.dawn.backend.service.inventory.adjustments;
import org.dawn.backend.constant.shared.ErrorCode;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dawn.backend.shared.statemachine.StateMachine;
import org.dawn.backend.aspect.AuditLog;
import org.dawn.backend.config.web.response.ResponsePage;
import org.dawn.backend.constant.enums.inventory.adjustments.AdjustmentSourceType;
import org.dawn.backend.constant.enums.inventory.adjustments.AdjustmentStatus;
import org.dawn.backend.constant.enums.inventory.adjustments.AdjustmentType;
import org.dawn.backend.constant.enums.inventory.SourceType;
import org.dawn.backend.constant.shared.LogConstant;
import org.dawn.backend.controller.inventory.request.ApproveAdjustmentRequest;
import org.dawn.backend.controller.inventory.request.CreateStockAdjustmentRequest;
import org.dawn.backend.controller.inventory.response.StockAdjustmentResponse;
import org.dawn.backend.entity.auth.User;
import org.dawn.backend.entity.catalog.Product;
import org.dawn.backend.entity.inventory.ProductUnit;
import org.dawn.backend.entity.inventory.StockAdjustment;
import org.dawn.backend.exception.type.InvalidRequestException;
import org.dawn.backend.exception.type.ResourceNotFoundException;
import org.dawn.backend.repository.auth.UserRepository;
import org.dawn.backend.repository.catalog.ProductRepository;
import org.dawn.backend.repository.inventory.ProductUnitRepository;
import org.dawn.backend.repository.inventory.adjustments.StockAdjustmentRepository;
import org.dawn.backend.shared.util.ReceiptCodeGenerator;
import org.dawn.backend.config.security.SecurityPolicy;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
@Slf4j
public class StockAdjustmentService {

    private final StockAdjustmentRepository adjustmentRepository;
    private final ProductUnitRepository productUnitRepository;
    private final ProductRepository productRepository;
    private final org.dawn.backend.repository.inventory.LocationRepository locationRepository;
    private final UserRepository userRepository;
    private final AdjustmentUnitService adjustmentUnitService;
    private final StateMachine<AdjustmentStatus> adjustmentStateMachine;
    private final SecurityPolicy securityPolicy;

    @Transactional(readOnly = true)
    public ResponsePage<StockAdjustmentResponse> findAll(Pageable pageable, String type, String status) {
        String t = normalize(type);
        AdjustmentStatus s = parseAdjustmentStatus(status);
        org.springframework.data.domain.Page<StockAdjustment> page;
        if (t != null && s != null) page = adjustmentRepository.findByTypeAndStatus(t, s, pageable);
        else if (t != null) page = adjustmentRepository.findByType(t, pageable);
        else if (s != null) page = adjustmentRepository.findByStatus(s, pageable);
        else page = adjustmentRepository.findAll(pageable);
        return enrichPage(page);
    }

    @Transactional(readOnly = true)
    public StockAdjustmentResponse findOne(Long id) {
        var adj = adjustmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.ADJUSTMENT_NOT_FOUND));
        return enrich(adj);
    }

    @Transactional(readOnly = true)
    public ResponsePage<StockAdjustmentResponse> findMyAdjustments(Pageable pageable, String type, String status) {
        Long userId = securityPolicy.requireAuthenticated();
        String t = normalize(type);
        AdjustmentStatus s = parseAdjustmentStatus(status);
        org.springframework.data.domain.Page<StockAdjustment> page;
        if (t != null && s != null) page = adjustmentRepository.findByCreatedByAndTypeAndStatus(userId, t, s, pageable);
        else if (t != null) page = adjustmentRepository.findByCreatedByAndType(userId, t, pageable);
        else if (s != null) page = adjustmentRepository.findByCreatedByAndStatus(userId, s, pageable);
        else page = adjustmentRepository.findByCreatedBy(userId, pageable);
        return enrichPage(page);
    }

    @Transactional(readOnly = true)
    public ResponsePage<StockAdjustmentResponse> findByProductUnitId(Long productUnitId, Pageable pageable) {
        var page = adjustmentRepository.findByProductUnitIdOrderByCreatedAtDesc(productUnitId, pageable);
        return enrichPage(page);
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
        Long userId = securityPolicy.requireAuthenticated();

        if (request.type() == null || request.type().isBlank()) {
            throw new InvalidRequestException(ErrorCode.ADJUSTMENT_TYPE_REQUIRED);
        }
        AdjustmentType type;
        try {
            type = AdjustmentType.valueOf(request.type().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new InvalidRequestException(ErrorCode.INVALID_ADJUSTMENT_TYPE.format( request.type()));
        }

        if (request.reason() == null || request.reason().isBlank()) {
            throw new InvalidRequestException(ErrorCode.ADJUSTMENT_REASON_REQUIRED);
        }

        ProductUnit unit = null;
        if (request.productUnitId() != null) {
            unit = productUnitRepository.findById(request.productUnitId())
                    .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.PRODUCT_UNIT_NOT_FOUND));
            if (adjustmentRepository.existsByProductUnitIdAndStatus(request.productUnitId(), AdjustmentStatus.PENDING)) {
                throw new InvalidRequestException(ErrorCode.ADJUSTMENT_PENDING_EXISTS, request.productUnitId());
            }
        }

        if (type == AdjustmentType.DAMAGED || type == AdjustmentType.LOST) {
            if (request.productUnitId() == null) {
                throw new InvalidRequestException(
                        ErrorCode.ADJUSTMENT_UNIT_REQUIRED.format( type.name().toLowerCase()));
            }
            if (type == AdjustmentType.DAMAGED && (request.imageUrl() == null || request.imageUrl().isBlank())) {
                throw new InvalidRequestException(ErrorCode.ADJUSTMENT_PHOTO_REQUIRED_DAMAGED);
            }
            adjustmentUnitService.assertManualAdjustable(unit, type.name().toLowerCase());
        }

        if (type == AdjustmentType.FOUND) {
            if (request.productUnitId() != null) {
                adjustmentUnitService.assertRestorable(unit);
                adjustmentUnitService.assertNotInSealedBox(unit);
            } else {
                if (request.productId() == null) {
                    throw new InvalidRequestException(ErrorCode.ADJUSTMENT_PRODUCT_REQUIRED);
                }
                if (request.serialNumber() == null || request.serialNumber().isBlank()) {
                    throw new InvalidRequestException(ErrorCode.ADJUSTMENT_SERIAL_REQUIRED_FOUND);
                }
                if (request.locationId() == null) {
                    throw new InvalidRequestException(ErrorCode.ADJUSTMENT_LOCATION_REQUIRED_FOUND);
                }
                productRepository.findById(request.productId())
                        .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.PRODUCT_NOT_FOUND));
                if (locationRepository.findById(request.locationId()).isEmpty()) {
                    throw new InvalidRequestException(ErrorCode.LOCATION_NOT_FOUND);
                }
                if (productUnitRepository.findBySerialNumberIgnoreCase(request.serialNumber()).isPresent()) {
                    throw new InvalidRequestException(ErrorCode.ADJUSTMENT_SERIAL_DUPLICATE, request.serialNumber());
                }
            }
        }

        String adjustCode = generateAdjustCode();
        AdjustmentSourceType sourceType = request.sourceType() != null
                ? AdjustmentSourceType.valueOf(request.sourceType().toUpperCase())
                : AdjustmentSourceType.MANUAL;

        StockAdjustment adj = StockAdjustment.builder()
                .adjustCode(adjustCode)
                .type(type.name())
                .productUnitId(request.productUnitId())
                .productId(request.productId())
                .quantity(request.quantity() != null ? request.quantity() : BigDecimal.ONE)
                .reason(request.reason())
                .imageUrl(request.imageUrl())
                .serialNumber(request.serialNumber())
                .locationId(request.locationId())
                .sourceType(sourceType.name())
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
        Long userId = securityPolicy.requireAuthenticated();

        var adj = adjustmentRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.ADJUSTMENT_NOT_FOUND));

        adjustmentStateMachine.validate(adj.getStatus(), AdjustmentStatus.APPROVED);
        securityPolicy.requireNotCreator(adj.getCreatedBy());

        AdjustmentType type = AdjustmentType.valueOf(adj.getType());
        SourceType source = SourceType.STOCK_CHECK.name().equals(adj.getSourceType())
                ? SourceType.STOCK_CHECK : SourceType.STOCK_ADJUSTMENT;
        ProductUnit unit = adj.getProductUnitId() != null
                ? productUnitRepository.findById(adj.getProductUnitId()).orElse(null)
                : null;
        boolean bulk = unit != null && "BULK".equals(unit.getTrackingType());
        BigDecimal quantity = adj.getQuantity() != null ? adj.getQuantity() : BigDecimal.ONE;
        switch (type) {
            case DAMAGED -> {
                if (bulk) adjustmentUnitService.applyBulkQuantity(unit, source, type, quantity, userId);
                else adjustmentUnitService.applyDamaged(adj.getProductUnitId(), source, adj.getId(), userId);
            }
            case LOST -> {
                if (bulk) adjustmentUnitService.applyBulkQuantity(unit, source, type, quantity, userId);
                else adjustmentUnitService.applyLost(adj.getProductUnitId(), source, adj.getId(), userId);
            }
            case FOUND -> {
                if (bulk) {
                    adjustmentUnitService.applyBulkQuantity(unit, source, type, quantity, userId);
                } else if (adj.getProductUnitId() != null) {
                    adjustmentUnitService.applyFoundRestore(adj.getProductUnitId(), source, adj.getId(), userId);
                } else {
                    adjustmentUnitService.applyFoundNew(adj, userId);
                }
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
        Long userId = securityPolicy.requireAuthenticated();

        var adj = adjustmentRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.ADJUSTMENT_NOT_FOUND));

        adjustmentStateMachine.validate(adj.getStatus(), AdjustmentStatus.REJECTED);
        securityPolicy.requireNotCreator(adj.getCreatedBy());

        if (request == null || request.approvalNote() == null || request.approvalNote().isBlank()) {
            throw new InvalidRequestException(ErrorCode.REJECTION_REASON_REQUIRED);
        }

        adj.setStatus(AdjustmentStatus.REJECTED);
        adj.setApprovedBy(userId);
        adj.setApprovalNote(request.approvalNote());
        adj = adjustmentRepository.save(adj);
        return enrich(adj);
    }

    private ResponsePage<StockAdjustmentResponse> enrichPage(org.springframework.data.domain.Page<StockAdjustment> page) {
        List<StockAdjustment> adjs = page.getContent();
        if (adjs.isEmpty()) {
            return ResponsePage.of(page.map(this::enrichSingle));
        }
        List<Long> userIds = adjs.stream()
                .flatMap(a -> a.getApprovedBy() != null
                        ? java.util.stream.Stream.of(a.getCreatedBy(), a.getApprovedBy())
                        : java.util.stream.Stream.of(a.getCreatedBy()))
                .distinct().toList();
        Map<Long, String> userMap = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, User::getFullName));

        List<Long> unitIds = adjs.stream().map(StockAdjustment::getProductUnitId)
                .filter(java.util.Objects::nonNull).distinct().toList();
        Map<Long, ProductUnit> unitMap = unitIds.isEmpty() ? Map.of()
                : productUnitRepository.findAllById(unitIds).stream()
                    .collect(Collectors.toMap(ProductUnit::getId, u -> u));

        List<Long> productIds = new ArrayList<>(adjs.stream().map(StockAdjustment::getProductId)
                .filter(java.util.Objects::nonNull).toList());
        unitMap.values().stream().map(ProductUnit::getProductId)
                .filter(java.util.Objects::nonNull).forEach(productIds::add);
        productIds = productIds.stream().distinct().toList();
        Map<Long, Product> productMap = productIds.isEmpty() ? Map.of()
                : productRepository.findAllById(productIds).stream()
                    .collect(Collectors.toMap(Product::getId, p -> p));

        return ResponsePage.of(page.map(a -> enrichBatch(a, userMap, unitMap, productMap)));
    }

    private StockAdjustmentResponse enrichBatch(StockAdjustment adj, Map<Long, String> userMap, Map<Long, ProductUnit> unitMap, Map<Long, Product> productMap) {
        var createdByName = userMap.get(adj.getCreatedBy());
        var approvedByName = adj.getApprovedBy() != null ? userMap.get(adj.getApprovedBy()) : null;
        ProductUnit unit = adj.getProductUnitId() != null ? unitMap.get(adj.getProductUnitId()) : null;
        Long productId = adj.getProductId() != null ? adj.getProductId()
                : (unit != null ? unit.getProductId() : null);
        Product product = productId != null ? productMap.get(productId) : null;
        return StockAdjustmentMappingHelper.map(adj, createdByName, approvedByName, unit, product);
    }

    private StockAdjustmentResponse enrichSingle(StockAdjustment adj) {
        return enrichBatch(adj, Map.of(), Map.of(), Map.of());
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
