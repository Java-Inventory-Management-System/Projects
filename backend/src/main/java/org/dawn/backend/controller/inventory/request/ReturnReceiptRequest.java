package org.dawn.backend.controller.inventory.request;

import java.math.BigDecimal;
import java.util.List;

public record ReturnReceiptRequest(
        Long customerId,
        Long originalExportReceiptId,
        String reason,
        String note,
        List<ReturnItemRequest> items
) {
    public record ReturnItemRequest(
            Long productUnitId,
            Long productId,
            BigDecimal quantity,
            String condition,
            String resultingAction,
            String description,
            String evidenceImage,
            Long defectCategoryId
    ) {
        public ReturnItemRequest(Long productUnitId, Long productId, BigDecimal quantity,
                                 String condition, String resultingAction,
                                 String description, String evidenceImage) {
            this(productUnitId, productId, quantity, condition, resultingAction, description, evidenceImage, null);
        }
    }
}
