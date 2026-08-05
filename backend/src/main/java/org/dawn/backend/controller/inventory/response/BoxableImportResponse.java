package org.dawn.backend.controller.inventory.response;

import lombok.Builder;

import java.time.Instant;

@Builder
public record BoxableImportResponse(
        Long receiptId,
        String receiptCode,
        String supplierName,
        Instant importedAt,
        long boxableUnits
) {}
