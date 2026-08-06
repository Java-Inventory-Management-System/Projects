package org.dawn.backend.controller.inventory.response;

import java.math.BigDecimal;
import java.time.Instant;

public record QcUnitResponse(
        Long id,
        String serialNumber,
        Long productId,
        String productName,
        String status,
        String locationFullCode,
        BigDecimal initialQuantity,
        BigDecimal remainingQuantity,
        String description,
        String evidenceImage,
        Instant processedAt,
        String processedByName,
        String exportReceiptCode) {
}
