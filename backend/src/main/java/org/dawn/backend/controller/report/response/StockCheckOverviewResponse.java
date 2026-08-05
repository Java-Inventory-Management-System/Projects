package org.dawn.backend.controller.report.response;

import lombok.Builder;

import java.time.Instant;
import java.util.List;

@Builder
public record StockCheckOverviewResponse(
        List<StockCheckMonthCount> checksPerMonth,
        List<AdjustmentMonthCount> adjustmentsPerMonth,
        List<StockCheckDiscrepancy> recentDiscrepancies
) {
    @Builder
    public record StockCheckMonthCount(String month, long count) {}

    @Builder
    public record AdjustmentMonthCount(String month, long lost, long found, long damaged) {}

    @Builder
    public record StockCheckDiscrepancy(
            Long id,
            String checkCode,
            Instant createdAt,
            long missingCount,
            long unexpectedCount
    ) {}
}
