package org.dawn.backend.controller.inventory.response;

import java.math.BigDecimal;
import java.time.Instant;

public record ProductUnitResponse(
        Long id,
        String serialNumber,
        Long productId,
        String productName,
        String productSku,
        String trackingType,
        BigDecimal initialQuantity,
        BigDecimal remainingQuantity,
        Long importReceiptItemId,
        Long locationId,
        String locationCode,
        String status,
        Instant importedAt,
        Integer warrantyMonths,
        Instant warrantyStartDate,
        Instant warrantyExpiresAt,
        Instant createdAt,
        Instant updatedAt
) {}
