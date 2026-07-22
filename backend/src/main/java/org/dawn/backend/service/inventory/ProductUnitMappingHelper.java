package org.dawn.backend.service.inventory;

import org.dawn.backend.controller.inventory.response.ProductUnitResponse;
import org.dawn.backend.entity.inventory.ProductUnit;

public interface ProductUnitMappingHelper {

    static ProductUnitResponse map(ProductUnit unit, String productName, String productSku, String locationCode) {
        return ProductUnitResponse.builder()
                .id(unit.getId())
                .serialNumber(unit.getSerialNumber())
                .productId(unit.getProductId())
                .productName(productName)
                .productSku(productSku)
                .trackingType(unit.getTrackingType())
                .initialQuantity(unit.getInitialQuantity())
                .remainingQuantity(unit.getRemainingQuantity())
                .importReceiptItemId(unit.getImportReceiptItemId())
                .locationId(unit.getLocationId())
                .locationCode(locationCode)
                .status(unit.getStatus().name())
                .importedAt(unit.getImportedAt())
                .warrantyMonths(unit.getWarrantyMonths())
                .warrantyStartDate(unit.getWarrantyStartDate())
                .warrantyExpiresAt(unit.getWarrantyExpiresAt())
                .createdAt(unit.getCreatedAt())
                .updatedAt(unit.getUpdatedAt())
                .build();
    }
}
