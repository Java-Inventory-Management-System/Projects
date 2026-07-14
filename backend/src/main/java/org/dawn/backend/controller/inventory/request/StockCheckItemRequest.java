package org.dawn.backend.controller.inventory.request;

import java.math.BigDecimal;
import java.util.List;

public record StockCheckItemRequest(
        Long productUnitId,
        String actualStatus,
        BigDecimal countedQuantity,
        String note
) {
    public record BatchRequest(
            List<StockCheckItemRequest> items
    ) {}
}
