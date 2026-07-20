package org.dawn.backend.service.inventory;

import org.dawn.backend.controller.inventory.response.PriceAdjustmentResponse;
import org.dawn.backend.entity.inventory.PriceAdjustment;

public interface PriceAdjustmentMappingHelper {

    static PriceAdjustmentResponse map(PriceAdjustment adj,
                                        String productName,
                                        String productSku,
                                        String createdByName,
                                        String approvedByName) {
        return PriceAdjustmentResponse.builder()
                .id(adj.getId())
                .adjustCode(adj.getAdjustCode())
                .importReceiptItemId(adj.getImportReceiptItemId())
                .productName(productName)
                .productSku(productSku)
                .oldPrice(adj.getOldPrice())
                .newPrice(adj.getNewPrice())
                .reason(adj.getReason())
                .status(adj.getStatus())
                .createdBy(adj.getCreatedBy())
                .createdByName(createdByName)
                .approvedBy(adj.getApprovedBy())
                .approvedByName(approvedByName)
                .approvalNote(adj.getApprovalNote())
                .createdAt(adj.getCreatedAt())
                .updatedAt(adj.getUpdatedAt())
                .build();
    }
}
