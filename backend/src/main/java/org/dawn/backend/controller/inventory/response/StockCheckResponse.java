package org.dawn.backend.controller.inventory.response;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record StockCheckResponse(
        Long id,
        String checkCode,
        String status,
        String note,
        Long createdBy,
        String createdByName,
        Long approvedBy,
        String approvedByName,
        String approvalNote,
        List<StockCheckItemResponse> items,
        int totalItems,
        int matchCount,
        int missingCount,
        int unexpectedCount,
        Instant createdAt,
        Instant updatedAt
) {
    public record StockCheckItemResponse(
            Long id,
            Long productUnitId,
            String serialNumber,
            Long productId,
            String productName,
            String productSku,
            String expectedStatus,
            String actualStatus,
            BigDecimal countedQuantity,
            String difference,
            String note
    ) {}
}
