package org.dawn.backend.controller.catalog.response;

import lombok.Builder;

import java.math.BigDecimal;
import java.time.Instant;

@Builder
public record ProductResponse(
        Long id,
        String name,
        String sku,
        String barcode,
        Long brandId,
        String brandName,
        Long categoryId,
        String categoryName,
        String description,
        String unit,
        String trackingType,
        BigDecimal sellPrice,
        Integer minStock,
        Boolean isActive,
        Instant createdAt,
        Instant updatedAt
) {
}
