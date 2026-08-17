package org.dawn.backend.controller.inventory.request;

import java.math.BigDecimal;
import java.util.List;

import org.dawn.backend.constant.enums.inventory.exports.ExportReason;

public record ExportReceiptRequest(
        ExportReason type,
        String reason,
        Long customerId,
        Long supplierId,
        String note,
        String externalReference,
        List<ExportItemRequest> items
) {
    public record ExportItemRequest(
            Long productId,
            BigDecimal quantity,
            BigDecimal unitPrice
    ) {}
}
