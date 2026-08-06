package org.dawn.backend.service.inventory.adjustments;
import org.dawn.backend.constant.shared.ErrorCode;
import org.dawn.backend.constant.shared.QcProcessingLocations;

import lombok.RequiredArgsConstructor;
import org.dawn.backend.constant.enums.catalog.TrackingType;
import org.dawn.backend.constant.enums.inventory.ProductUnitStatus;
import org.dawn.backend.constant.enums.inventory.SourceType;
import org.dawn.backend.entity.inventory.ProductUnit;
import org.dawn.backend.entity.inventory.ProductUnitStatusLog;
import org.dawn.backend.entity.inventory.StockAdjustment;
import org.dawn.backend.exception.type.InvalidRequestException;
import org.dawn.backend.exception.type.ResourceNotFoundException;
import org.dawn.backend.repository.catalog.ProductRepository;
import org.dawn.backend.repository.inventory.ProductUnitRepository;
import org.dawn.backend.repository.inventory.ProductUnitStatusLogRepository;
import org.dawn.backend.service.inventory.LocationCapacityValidator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class AdjustmentUnitService {

    private final ProductUnitRepository productUnitRepository;
    private final ProductUnitStatusLogRepository statusLogRepository;
    private final ProductRepository productRepository;
    private final LocationCapacityValidator capacityValidator;
    private final org.dawn.backend.repository.inventory.LocationRepository locationRepository;

    @Transactional
    public void applyDamaged(Long productUnitId, SourceType sourceType, Long sourceId, Long userId) {
        var unit = productUnitRepository.findById(productUnitId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.PRODUCT_UNIT_NOT_FOUND));
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
        var unit = productUnitRepository.findById(productUnitId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.PRODUCT_UNIT_NOT_FOUND));
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

    @Transactional
    public void applyFoundRestore(Long productUnitId, SourceType sourceType, Long sourceId, Long userId) {
        var unit = productUnitRepository.findById(productUnitId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.PRODUCT_UNIT_NOT_FOUND));
        ProductUnitStatus currentStatus = unit.getStatus();

        if (ProductUnitStatus.IN_STOCK == currentStatus) return;

        if (!Set.of(ProductUnitStatus.LOST, ProductUnitStatus.REMOVED, ProductUnitStatus.DAMAGED_IN_STORAGE).contains(currentStatus)) {
            throw new InvalidRequestException(
                    ErrorCode.ADJUSTMENT_UNIT_NOT_RESTORABLE.format( currentStatus.name()));
        }

        if (isInQcZone(unit)) {
            throw new InvalidRequestException(ErrorCode.ADJUSTMENT_QC_ZONE_RESTORE_NOT_ALLOWED);
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

    private boolean isInQcZone(ProductUnit unit) {
        if (unit.getLocationId() == null) return false;
        return locationRepository.findById(unit.getLocationId())
                .map(loc -> "QC".equals(loc.getZoneCode()))
                .orElse(false);
    }

    @Transactional
    public void applyFoundNew(StockAdjustment adj, Long userId) {        var product = productRepository.findById(adj.getProductId())
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.PRODUCT_NOT_FOUND));
        TrackingType trackingType = TrackingType.valueOf(product.getTrackingType());

        String serialNumber = adj.getSerialNumber();
        if (serialNumber == null && trackingType == TrackingType.SERIALIZED) {
            serialNumber = "FOUND-" + adj.getAdjustCode();
        }

        Long locationId = adj.getLocationId();
        boolean isBulk = trackingType == TrackingType.BULK;
        BigDecimal incoming = isBulk && adj.getQuantity() != null
                ? BigDecimal.valueOf(adj.getQuantity()) : BigDecimal.ONE;
        capacityValidator.assertCapacity(locationId, incoming);

        ProductUnit newUnit = ProductUnit.builder()
                .serialNumber(serialNumber)
                .productId(product.getId())
                .trackingType(trackingType.name())
                .initialQuantity(adj.getQuantity() != null ? BigDecimal.valueOf(adj.getQuantity()) : BigDecimal.ONE)
                .remainingQuantity(isBulk && adj.getQuantity() != null
                        ? BigDecimal.valueOf(adj.getQuantity()) : BigDecimal.ZERO)
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