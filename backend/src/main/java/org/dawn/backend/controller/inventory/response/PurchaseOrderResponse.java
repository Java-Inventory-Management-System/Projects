package org.dawn.backend.controller.inventory.response;

import lombok.Builder;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Builder
public record PurchaseOrderResponse(
        Long id,
        String poCode,
        Long supplierId,
        String supplierName,
        BigDecimal totalAmount,
        String status,
        Boolean locked,
        long rejectedReceiptCount,
        LocalDate expectedDate,
        String note,
        String invoiceCode,
        String asnCode,
        Long createdBy,
        String createdByName,
        Instant createdAt,
        Instant updatedAt,
        List<POItemResponse> items
) {
    @Builder
    public record POItemResponse(
            Long id,
            Long productId,
            String productName,
            String productSku,
            String trackingType,
            BigDecimal quantity,
            BigDecimal unitPrice,
            BigDecimal receivedQuantity,
            List<String> serials
    ) {}
}
