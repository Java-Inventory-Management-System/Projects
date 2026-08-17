package org.dawn.backend.controller.inventory.response;

import lombok.Builder;

import java.math.BigDecimal;
import java.time.Instant;

@Builder
public record StockAdjustmentResponse(
        Long id,
        String adjustCode,
        String type,
        Long productUnitId,
        String serialNumber,
        Long productId,
        String productName,
        String productSku,
        BigDecimal quantity,
        String reason,
        String imageUrl,
        Long locationId,
        String status,
        String sourceType,
        Long sourceId,
        Long createdBy,
        String createdByName,
        Long approvedBy,
        String approvedByName,
        String approvalNote,
        Instant approvedAt,
        Instant createdAt,
        Instant updatedAt
) {}
