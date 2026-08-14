package org.dawn.backend.controller.inventory.request;

import java.math.BigDecimal;
import java.util.List;

public record ConfirmImportRequest(
        Long receiptId,
        List<SerialAssignment> serials,
        String note,
        List<RejectedSerial> rejectedSerials,
        List<Long> notReceivedItemIds
) {
    public ConfirmImportRequest(Long receiptId, List<SerialAssignment> serials) {
        this(receiptId, serials, null, null, null);
    }

    public ConfirmImportRequest(Long receiptId, List<SerialAssignment> serials, String note) {
        this(receiptId, serials, note, null, null);
    }

    public record SerialAssignment(
            Long itemId,
            List<String> serialNumbers,
            Long locationId,
            List<Allocation> allocations
    ) {
        public record Allocation(
                Long locationId,
                BigDecimal quantity,
                List<String> serialNumbers
        ) {}
    }

    public record RejectedSerial(
            String serial,
            String reason
    ) {}
}