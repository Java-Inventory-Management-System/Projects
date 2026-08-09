package org.dawn.backend.controller.inventory.response;

import lombok.Builder;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Builder
public record StockCheckResponse(
        Long id,
        String checkCode,
        String status,
        String scopeType,
        Long scopeId,
        String scopeName,
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
        int autoFilledCount,
        Instant createdAt,
        Instant updatedAt
) {
    @Builder
    public record StockCheckItemResponse(
            Long id,
            Long productUnitId,
            String serialNumber,
            Long productId,
            String productName,
            String productSku,
            String trackingType,
            Long boxId,
            String boxCode,
            String expectedStatus,
            String actualStatus,
            BigDecimal countedQuantity,
            String difference,
            String note,
            String photo,
            Boolean autoFilled
    ) {}
}