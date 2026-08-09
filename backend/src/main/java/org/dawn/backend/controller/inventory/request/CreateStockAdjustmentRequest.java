package org.dawn.backend.controller.inventory.request;

import java.math.BigDecimal;

public record CreateStockAdjustmentRequest(
        String type,
        Long productUnitId,
        Long productId,
        BigDecimal quantity,
        String reason,
        String imageUrl,
        String sourceType,
        Long sourceId,
        String serialNumber,
        Long locationId
) {}
