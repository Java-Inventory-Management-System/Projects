package org.dawn.backend.controller.inventory.request;

import java.math.BigDecimal;
import java.util.List;

public record ImportReceiptRequest(
        String receiptCode,
        Long supplierId,
        Long purchaseOrderId,
        Long originalWarrantyExportId,
        String note,
        List<ImportItemRequest> items
) {
    public record ImportItemRequest(
            Long productId,
            BigDecimal quantity,
            BigDecimal unitPrice,
            Integer warrantyMonths,
            String warrantyResultType,
            List<String> serialNumbers,
            List<String> replacementSourceSerials,
            Long locationId
    ) {}
}
