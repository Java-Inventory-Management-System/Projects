package org.dawn.backend.controller.report.response;

import lombok.Builder;

import java.math.BigDecimal;
import java.time.Instant;

@Builder
public record DeadStockResponse(
        Long productId,
        String productName,
        String productSku,
        String serialNumber,
        Instant importedAt,
        long daysInStock,
        BigDecimal costPrice
) {}
