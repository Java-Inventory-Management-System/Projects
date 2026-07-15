package org.dawn.backend.controller.inventory.request;

import java.util.List;

public record ConfirmImportRequest(
        Long receiptId,
        List<SerialAssignment> serials
) {
    public record SerialAssignment(
            Long itemId,
            List<String> serialNumbers,
            Long locationId
    ) {}
}
