package org.dawn.backend.controller.report.response;

import lombok.Builder;

import java.math.BigDecimal;

@Builder
public record CategoryStockResponse(
        Long categoryId,
        String categoryName,
        long productCount,
        long totalUnits,
        BigDecimal totalStockValue
) {}
