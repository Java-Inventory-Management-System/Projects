package org.dawn.backend.controller.inventory.response;

import lombok.Builder;

import java.math.BigDecimal;
import java.time.Instant;

@Builder
public record PriceAdjustmentResponse(
        Long id,
        String adjustCode,
        Long importReceiptItemId,
        String productName,
        String productSku,
        BigDecimal oldPrice,
        BigDecimal newPrice,
        String reason,
        String status,
        Long createdBy,
        String createdByName,
        Long approvedBy,
        String approvedByName,
        String approvalNote,
        Instant createdAt,
        Instant updatedAt
) {}
