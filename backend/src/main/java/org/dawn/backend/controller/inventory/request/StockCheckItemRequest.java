package org.dawn.backend.controller.inventory.request;

import java.math.BigDecimal;
import java.util.List;

public record StockCheckItemRequest(
        Long productUnitId,
        String actualStatus,
        BigDecimal countedQuantity,
        String note,
        String photo,
        Boolean suspectSeal,
        Boolean damagedPackaging
) {
    public record BatchRequest(
            List<StockCheckItemRequest> items
    ) {}

    public record ExtraItemRequest(
            String sku,
            String serialNumber,
            BigDecimal countedQuantity,
            String note,
            String photo
    ) {}
}
