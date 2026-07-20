package org.dawn.backend.controller.inventory.response;

import lombok.Builder;

import java.time.Instant;
import java.util.List;

@Builder
public record WarrantyLookupResponse(
        Long productUnitId,
        String serialNumber,
        Long productId,
        String productName,
        String productSku,
        String productUnitStatus,
        Instant purchaseDate,
        Instant warrantyExpiresAt,
        String warrantyStatus,
        boolean eligible,
        Long customerId,
        String customerName,
        String saleReceiptCode,
        List<WarrantyRequestResponse> history
) {}
