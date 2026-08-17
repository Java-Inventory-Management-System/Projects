package org.dawn.backend.controller.inventory.response;

import lombok.Builder;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Builder
public record BoxResponse(
        Long id,
        String boxCode,
        Long importReceiptId,
        String importReceiptCode,
        String boxType,
        Long locationId,
        String locationCode,
        String status,
        BigDecimal sealedQuantity,
        Long sealedBy,
        String sealedByName,
        Instant sealedAt,
        Long unsealedBy,
        String unsealedByName,
        Instant unsealedAt,
        String note,
        Long createdBy,
        String createdByName,
        Instant createdAt,
        int unitCount,
        List<BoxUnitResponse> units
) {
    @Builder
    public record BoxUnitResponse(
            Long productUnitId,
            String serialNumber,
            Long productId,
            String productName,
            String productSku,
            String trackingType,
            BigDecimal quantity
    ) {}
}
