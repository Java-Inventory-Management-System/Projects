package org.dawn.backend.controller.report.response;

import lombok.Builder;

import java.math.BigDecimal;

@Builder
public record InventorySummaryResponse(
        long totalProducts,
        long totalUnits,
        BigDecimal totalStockValue,
        long lowStockCount,
        long outOfStockCount,
        BigDecimal previousPeriodStockValue,
        BigDecimal trendPercent
) {}
