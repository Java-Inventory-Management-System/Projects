package org.dawn.backend.service.inventory.adjustments;
import org.dawn.backend.constant.shared.ErrorCode;

import lombok.RequiredArgsConstructor;
import org.dawn.backend.constant.enums.catalog.TrackingType;
import org.dawn.backend.constant.enums.inventory.ProductUnitStatus;
import org.dawn.backend.constant.enums.inventory.SourceType;
import org.dawn.backend.constant.enums.inventory.adjustments.AdjustmentType;
import org.dawn.backend.constant.enums.inventory.box.BoxStatus;
import org.dawn.backend.entity.inventory.ProductUnit;
import org.dawn.backend.entity.inventory.ProductUnitStatusLog;
import org.dawn.backend.entity.inventory.StockAdjustment;
import org.dawn.backend.exception.type.InvalidRequestException;
import org.dawn.backend.exception.type.ResourceNotFoundException;
import org.dawn.backend.repository.catalog.ProductRepository;
import org.dawn.backend.repository.inventory.ProductUnitRepository;
import org.dawn.backend.repository.inventory.ProductUnitStatusLogRepository;
import org.dawn.backend.repository.inventory.box.BoxRepository;
import org.dawn.backend.repository.inventory.stockcheck.StockCheckItemRepository;
import org.dawn.backend.service.inventory.LocationCapacityValidator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class AdjustmentUnitService {

    private static final Set<ProductUnitStatus> ADJUSTABLE_STATUSES = Set.of(
            ProductUnitStatus.IN_STOCK, ProductUnitStatus.PENDING_QC, ProductUnitStatus.RETURN_QC_HOLD);
    private static final Set<ProductUnitStatus> RESTORABLE_STATUSES = Set.of(
            ProductUnitStatus.LOST, ProductUnitStatus.REMOVED, ProductUnitStatus.DAMAGED_IN_STORAGE);

    private final ProductUnitRepository productUnitRepository;
    private final ProductUnitStatusLogRepository statusLogRepository;
    private final ProductRepository productRepository;
    private final LocationCapacityValidator capacityValidator;
    private final org.dawn.backend.repository.inventory.LocationRepository locationRepository;
    private final BoxRepository boxRepository;
    private final StockCheckItemRepository stockCheckItemRepository;

    /**
     * Full manual-adjustment gate used at creation time: the unit must be physically present
     * (not sold/removed/...), outside the QC processing zone, outside any sealed box,
     * and not currently being counted in an in-progress stock check.
     */
    public void assertManualAdjustable(ProductUnit unit, String action) {
        assertAdjustableFor(unit, action, true);
    }

    private void assertAdjustableFor(ProductUnit unit, String action, boolean manual) {
        if (!ADJUSTABLE_STATUSES.contains(unit.getStatus())) {
            throw new InvalidRequestException(ErrorCode.ADJUSTMENT_UNIT_NOT_ADJUSTABLE,
                    unit.getStatus().name(), action);
        }
        if (manual) {
            if (isInQcZone(unit)) {
                throw new InvalidRequestException(ErrorCode.ADJUSTMENT_QC_ZONE_ADJUST_NOT_ALLOWED, unit.getId());
            }
            if (isInSealedBox(unit)) {
                throw new InvalidRequestException(ErrorCode.ADJUSTMENT_UNIT_IN_SEALED_BOX, unit.getId());
            }
            if (stockCheckItemRepository.existsByProductUnitIdInActiveCheck(unit.getId())) {
                throw new InvalidRequestException(ErrorCode.ADJUSTMENT_UNIT_IN_STOCK_CHECK, unit.getId());
            }
        }
    }

    public void assertRestorable(ProductUnit unit) {
        if (!RESTORABLE_STATUSES.contains(unit.getStatus())) {
            throw new InvalidRequestException(ErrorCode.ADJUSTMENT_UNIT_NOT_RESTORABLE, unit.getStatus().name());
        }
    }

    public void assertNotInSealedBox(ProductUnit unit) {
        if (isInSealedBox(unit)) {
            throw new InvalidRequestException(ErrorCode.ADJUSTMENT_UNIT_IN_SEALED_BOX, unit.getId());
        }
    }

    @Transactional
    public void applyDamaged(Long productUnitId, SourceType sourceType, Long sourceId, Long userId) {
        var unit = findUnit(productUnitId);
        assertAdjustableFor(unit, "damaged", sourceType == SourceType.STOCK_ADJUSTMENT);
        ProductUnitStatus oldStatus = unit.getStatus();
        unit.setStatus(ProductUnitStatus.DAMAGED_IN_STORAGE);
        productUnitRepository.save(unit);
        statusLogRepository.save(ProductUnitStatusLog.builder()
                .productUnitId(unit.getId())
                .fromStatus(oldStatus.name())
                .toStatus(ProductUnitStatus.DAMAGED_IN_STORAGE.name())
                .sourceType(sourceType.name())
                .sourceId(sourceId)
                .changedBy(userId)
                .build());
    }

    @Transactional
    public void applyLost(Long productUnitId, SourceType sourceType, Long sourceId, Long userId) {
        var unit = findUnit(productUnitId);
        assertAdjustableFor(unit, "lost", sourceType == SourceType.STOCK_ADJUSTMENT);
        ProductUnitStatus oldStatus = unit.getStatus();
        unit.setStatus(ProductUnitStatus.LOST);
        productUnitRepository.save(unit);
        statusLogRepository.save(ProductUnitStatusLog.builder()
                .productUnitId(unit.getId())
                .fromStatus(oldStatus.name())
                .toStatus(ProductUnitStatus.LOST.name())
                .sourceType(sourceType.name())
                .sourceId(sourceId)
                .changedBy(userId)
                .build());
    }

    /**
     * Bulk (meter/kg) units are adjusted by quantity, not by flipping the whole unit's status.
     * LOST/DAMAGED decrement remaining quantity (status only when it reaches zero);
     * FOUND restores the surplus into the same unit.
     */
    @Transactional
    public void applyBulkQuantity(ProductUnit unit, SourceType sourceType, AdjustmentType type,
                                  BigDecimal quantity, Long sourceId, Long userId) {
        assertAdjustableFor(unit, type.name().toLowerCase(), sourceType == SourceType.STOCK_ADJUSTMENT);
        BigDecimal remaining = unit.getRemainingQuantity() != null ? unit.getRemainingQuantity() : BigDecimal.ZERO;
        switch (type) {
            case LOST, DAMAGED -> {
                BigDecimal newRemaining = remaining.subtract(quantity);
                if (newRemaining.signum() <= 0) {
                    newRemaining = BigDecimal.ZERO;
                    ProductUnitStatus to = type == AdjustmentType.DAMAGED
                            ? ProductUnitStatus.DAMAGED_IN_STORAGE
                            : ProductUnitStatus.LOST;
                    statusLogRepository.save(ProductUnitStatusLog.builder()
                            .productUnitId(unit.getId())
                            .fromStatus(unit.getStatus().name())
                            .toStatus(to.name())
                            .sourceType(sourceType.name())
                            .sourceId(sourceId)
                            .changedBy(userId)
                            .build());
                    unit.setStatus(to);
                }
                unit.setRemainingQuantity(newRemaining);
                productUnitRepository.save(unit);
            }
            case FOUND -> {
                capacityValidator.assertCapacity(unit.getLocationId(), quantity);
                unit.setRemainingQuantity(remaining.add(quantity));
                productUnitRepository.save(unit);
            }
        }
    }

    @Transactional
    public void applyFoundRestore(Long productUnitId, SourceType sourceType, Long sourceId, Long userId) {
        var unit = findUnit(productUnitId);
        ProductUnitStatus currentStatus = unit.getStatus();

        if (ProductUnitStatus.IN_STOCK == currentStatus) {
            if (sourceType == SourceType.STOCK_ADJUSTMENT) {
                throw new InvalidRequestException(ErrorCode.ADJUSTMENT_NO_EFFECT, productUnitId);
            }
            return;
        }

        assertRestorable(unit);
        if (sourceType == SourceType.STOCK_ADJUSTMENT) {
            assertNotInSealedBox(unit);
        }

        unit.setStatus(ProductUnitStatus.IN_STOCK);
        productUnitRepository.save(unit);
        statusLogRepository.save(ProductUnitStatusLog.builder()
                .productUnitId(unit.getId())
                .fromStatus(currentStatus.name())
                .toStatus(ProductUnitStatus.IN_STOCK.name())
                .sourceType(sourceType.name())
                .sourceId(sourceId)
                .changedBy(userId)
                .build());
    }

    private ProductUnit findUnit(Long productUnitId) {
        return productUnitRepository.findById(productUnitId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.PRODUCT_UNIT_NOT_FOUND));
    }

    private boolean isInQcZone(ProductUnit unit) {
        if (unit.getLocationId() == null) return false;
        return locationRepository.findById(unit.getLocationId())
                .map(loc -> "QC".equals(loc.getZoneCode()))
                .orElse(false);
    }

    private boolean isInSealedBox(ProductUnit unit) {
        if (unit.getBoxId() == null) return false;
        return boxRepository.findById(unit.getBoxId())
                .map(b -> b.getStatus() == BoxStatus.SEALED)
                .orElse(false);
    }

    @Transactional
    public void applyFoundNew(StockAdjustment adj, Long userId) {
        var product = productRepository.findById(adj.getProductId())
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.PRODUCT_NOT_FOUND));
        TrackingType trackingType = TrackingType.valueOf(product.getTrackingType());

        String serialNumber = adj.getSerialNumber();
        if (serialNumber == null && trackingType == TrackingType.SERIALIZED) {
            serialNumber = "FOUND-" + adj.getAdjustCode();
        }
        if (serialNumber != null && productUnitRepository.existsBySerialNumber(serialNumber)) {
            throw new InvalidRequestException(ErrorCode.ADJUSTMENT_SERIAL_DUPLICATE, serialNumber);
        }

        Long locationId = adj.getLocationId();
        boolean isBulk = trackingType == TrackingType.BULK;
        BigDecimal incoming = isBulk && adj.getQuantity() != null
                ? adj.getQuantity() : BigDecimal.ONE;
        capacityValidator.assertCapacity(locationId, incoming);

        ProductUnit newUnit = ProductUnit.builder()
                .serialNumber(serialNumber)
                .productId(product.getId())
                .trackingType(trackingType.name())
                .initialQuantity(adj.getQuantity() != null ? adj.getQuantity() : BigDecimal.ONE)
                .remainingQuantity(isBulk && adj.getQuantity() != null
                        ? adj.getQuantity() : BigDecimal.ZERO)
                .locationId(locationId)
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
        adj.setQuantity(trackingType == TrackingType.BULK ? adj.getQuantity() : null);
    }
}
