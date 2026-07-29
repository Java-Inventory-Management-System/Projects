package org.dawn.backend.controller.inventory.request;

import java.math.BigDecimal;
import java.util.List;

public record ExportReceiptRequest(
        String reason,
        Long customerId,
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
