package org.dawn.backend.controller.inventory.response;

import lombok.Builder;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Builder
public record ImportReceiptResponse(
        Long id,
        String receiptCode,
        Long supplierId,
        String supplierName,
        BigDecimal totalAmount,
        String status,
        String note,
        Long createdBy,
        String createdByName,
        Long approvedBy,
        String approvedByName,
        List<ImportItemResponse> items,
        Instant createdAt,
        Instant updatedAt
) {
    @Builder
    public record ImportItemResponse(
            Long id,
            Long productId,
            String productName,
            String productSku,
            BigDecimal quantity,
            BigDecimal unitPrice,
            Integer warrantyMonths,
            Integer createdUnits
    ) {}
}
