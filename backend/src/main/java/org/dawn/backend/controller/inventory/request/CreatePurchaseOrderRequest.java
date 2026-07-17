package org.dawn.backend.controller.inventory.request;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record CreatePurchaseOrderRequest(
        Long supplierId,
        LocalDate expectedDate,
        String note,
        List<POItemRequest> items
) {
    public record POItemRequest(
            Long productId,
            BigDecimal quantity,
            BigDecimal unitPrice
    ) {}
}
