package org.dawn.backend.controller.inventory.request;

import java.math.BigDecimal;
import java.util.List;

public record ExportReceiptRequest(
        String reason,
        Long customerId,
        String note,
        List<ExportItemRequest> items
) {
    public record ExportItemRequest(
            Long productId,
            Integer quantity,
            BigDecimal unitPrice
    ) {}
}
