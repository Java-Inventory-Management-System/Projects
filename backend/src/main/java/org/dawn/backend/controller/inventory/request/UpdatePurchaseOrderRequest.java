package org.dawn.backend.controller.inventory.request;

import java.math.BigDecimal;
import java.util.List;

public record UpdatePurchaseOrderRequest(
        List<POItemRequest> items
) {
    public record POItemRequest(
            Long productId,
            BigDecimal quantity,
            BigDecimal unitPrice,
            List<String> serials
    ) {}
}