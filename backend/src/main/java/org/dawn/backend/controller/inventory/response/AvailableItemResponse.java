package org.dawn.backend.controller.inventory.response;

import lombok.Builder;

import java.math.BigDecimal;
import java.time.Instant;

@Builder
public record AvailableItemResponse(
        Long importReceiptItemId,
        Long productId,
        String productName,
        String productSku,
        String receiptCode,
        Instant receiptDate,
        BigDecimal unitPrice,
        boolean hasPending
) {}