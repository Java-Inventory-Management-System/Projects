package org.dawn.backend.controller.inventory.response;

import java.math.BigDecimal;
import java.time.Instant;

public record WarrantyExchangeResponse(
        String receiptCode,
        Long exportReceiptId,
        Long replacementUnitId,
        String replacementSerial,
        BigDecimal originalPrice,
        BigDecimal newPrice,
        BigDecimal chargeAmount,
        Instant warrantyExpiresAt
) {
}