package org.dawn.backend.controller.inventory.response;

import lombok.Builder;

import java.math.BigDecimal;
import java.time.Instant;

@Builder
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
