package org.dawn.backend.controller.inventory.response;

import lombok.Builder;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Builder
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
        Long fulfilledBy,
        String fulfilledByName,
        Instant fulfilledAt,
        Long rejectedBy,
        String rejectedByName,
        String externalReference,
        Instant rejectedAt,
        String rejectReason,
        List<String> evidenceImages,
        List<ExportItemResponse> items,
        Instant createdAt,
        Instant updatedAt,
        List<StatusHistoryResponse> statusHistory
) {
    @Builder
    public record StatusHistoryResponse(
            String fromStatus,
            String toStatus,
            Instant createdAt,
            Long changedBy,
            String changedByName
    ) {}

    @Builder
    public record ExportItemResponse(
            Long id,
            Long productId,
            String productName,
            String productSku,
            BigDecimal quantity,
            BigDecimal unitPrice,
            String trackingType,
            List<String> serialNumbers
    ) {}
}
