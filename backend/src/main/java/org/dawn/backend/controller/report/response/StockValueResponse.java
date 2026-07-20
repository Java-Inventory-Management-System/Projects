package org.dawn.backend.controller.report.response;

import lombok.Builder;

import java.math.BigDecimal;

@Builder
public record StockValueResponse(
        Long productId,
        String productName,
        String productSku,
        String categoryName,
        long quantity,
        BigDecimal unitPrice,
        BigDecimal totalValue
) {}
