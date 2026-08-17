package org.dawn.backend.controller.inventory.request;

import java.math.BigDecimal;

public record WarrantyExchangeRequest(
        Long replacementUnitId,
        BigDecimal discountAmount,
        String note
) {
}