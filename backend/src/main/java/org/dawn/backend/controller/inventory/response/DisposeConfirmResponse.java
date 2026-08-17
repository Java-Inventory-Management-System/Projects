package org.dawn.backend.controller.inventory.response;

public record DisposeConfirmResponse(
        String receiptCode,
        Long exportReceiptId
) {
}
