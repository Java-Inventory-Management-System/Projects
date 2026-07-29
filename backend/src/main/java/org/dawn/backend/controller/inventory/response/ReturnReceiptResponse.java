package org.dawn.backend.controller.inventory.response;

import lombok.Builder;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Builder
public record ReturnReceiptResponse(
        Long id,
        String receiptCode,
        Long customerId,
        String customerName,
        Long originalExportReceiptId,
        String reason,
        String status,
        String note,
        Long createdBy,
        String createdByName,
        Long approvedBy,
        String approvedByName,
        Instant approvedAt,
        Instant createdAt,
        List<ReturnReceiptItemResponse> items
) {
    @Builder
    public record ReturnReceiptItemResponse(
            Long id,
            Long productUnitId,
            Long productId,
            BigDecimal quantity,
            String condition,
            String resultingAction,
            String productName,
            String productSku,
            String serialNumber
    ) {}
}
