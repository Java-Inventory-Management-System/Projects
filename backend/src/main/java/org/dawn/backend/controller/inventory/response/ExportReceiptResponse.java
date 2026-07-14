package org.dawn.backend.controller.inventory.response;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record ExportReceiptResponse(
        Long id,
        String receiptCode,
        String reason,
        Long customerId,
        String customerName,
        BigDecimal totalAmount,
        String status,
        String note,
        Long createdBy,
        String createdByName,
        Long approvedBy,
        String approvedByName,
        List<ExportItemResponse> items,
        Instant createdAt,
        Instant updatedAt
) {
    public record ExportItemResponse(
            Long id,
            Long productId,
            String productName,
            String productSku,
            BigDecimal quantity,
            BigDecimal unitPrice
    ) {}
}
