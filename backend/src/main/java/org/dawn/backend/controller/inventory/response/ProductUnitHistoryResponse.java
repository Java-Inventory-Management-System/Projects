package org.dawn.backend.controller.inventory.response;

import lombok.Builder;

import java.time.Instant;
import java.util.List;

@Builder
public record ProductUnitHistoryResponse(
        ImportInfo importInfo,
        List<Event> events
) {
    @Builder
    public record ImportInfo(
            Long importReceiptItemId,
            String receiptCode,
            Instant receiptDate,
            Instant importedAt
    ) {}

    @Builder
    public record Event(
            Long id,
            String fromStatus,
            String toStatus,
            String sourceType,
            Long sourceId,
            String sourceCode,
            String note,
            String changedByName,
            Instant createdAt
    ) {}
}
