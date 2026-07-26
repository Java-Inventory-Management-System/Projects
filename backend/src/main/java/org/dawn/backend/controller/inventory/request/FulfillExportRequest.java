package org.dawn.backend.controller.inventory.request;

import java.math.BigDecimal;
import java.util.List;

public record FulfillExportRequest(
        List<FulfillItemRequest> items
) {
    public record FulfillItemRequest(
            Long itemId,
            List<String> serialNumbers,
            BigDecimal actualQuantity
    ) {}
}
