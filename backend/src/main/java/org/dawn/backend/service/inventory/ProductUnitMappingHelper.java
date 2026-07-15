package org.dawn.backend.service.inventory;

import org.dawn.backend.controller.inventory.response.ProductUnitResponse;
import org.dawn.backend.entity.inventory.ProductUnit;

public class ProductUnitMappingHelper {
    private ProductUnitMappingHelper() {}

    public static ProductUnitResponse map(ProductUnit unit, String productName, String productSku, String locationCode) {
        return new ProductUnitResponse(
                unit.getId(),
                unit.getSerialNumber(),
                unit.getProductId(),
                productName,
                productSku,
                unit.getTrackingType(),
                unit.getInitialQuantity(),
                unit.getRemainingQuantity(),
                unit.getImportReceiptItemId(),
                unit.getLocationId(),
                locationCode,
                unit.getStatus(),
                unit.getImportedAt(),
                unit.getWarrantyMonths(),
                unit.getWarrantyStartDate(),
                unit.getWarrantyExpiresAt(),
                unit.getCreatedAt(),
                unit.getUpdatedAt()
        );
    }
}
