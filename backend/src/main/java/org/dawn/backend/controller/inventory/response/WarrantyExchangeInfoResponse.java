package org.dawn.backend.controller.inventory.response;

import java.math.BigDecimal;
import java.time.Instant;

public record WarrantyExchangeInfoResponse(
        Long originalUnitId,
        String serialNumber,
        Long productId,
        String productName,
        BigDecimal originalSellPrice,
        Instant warrantyExpiresAt,
        Long defectCategoryId,
        String defectName,
        boolean replaceable
) {
}