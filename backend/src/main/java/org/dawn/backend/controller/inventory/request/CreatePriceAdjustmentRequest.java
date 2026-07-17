package org.dawn.backend.controller.inventory.request;

import java.math.BigDecimal;

public record CreatePriceAdjustmentRequest(
        Long importReceiptItemId,
        BigDecimal newPrice,
        String reason
) {}
