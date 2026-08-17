package org.dawn.backend.controller.catalog.request;

import java.math.BigDecimal;
import java.util.List;

public record ProductRequest(
        String name,
        String sku,
        String barcode,
        Long brandId,
        Long categoryId,
        String description,
        String unit,
        String trackingType,
        BigDecimal sellPrice,
        Integer minStock,
        List<Long> supplierIds
) {
}
