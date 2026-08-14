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
        Long purchaseOrderId,
        String poCode,
        Long originalWarrantyExportId,
        BigDecimal totalAmount,
        String status,
        String note,
        Long createdBy,
        String createdByName,
        Long approvedBy,
        String approvedByName,
        String rejectReason,
        Long rejectedBy,
        String rejectedByName,
        Instant rejectedAt,
        String evidenceImage,
        String resolution,
        String resolutionNote,
        Long resolvedBy,
        String resolvedByName,
        Instant resolvedAt,
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
            String trackingType,
            BigDecimal quantity,
            BigDecimal receivedQuantity,
            BigDecimal unitPrice,
            Integer warrantyMonths,
            String warrantyResultType,
            Integer createdUnits,
            List<Long> productUnitIds
    ) {}
}
