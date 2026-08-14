package org.dawn.backend.service.inventory.adjustments;

import org.dawn.backend.controller.inventory.response.PriceAdjustmentResponse;
import org.dawn.backend.entity.inventory.PriceAdjustment;

import java.time.Instant;

public interface PriceAdjustmentMappingHelper {

    static PriceAdjustmentResponse map(PriceAdjustment adj,
                                        Long productId,
                                        String productName,
                                        String productSku,
                                        String receiptCode,
                                        Instant receiptDate,
                                        String createdByName,
                                        String approvedByName) {
        return PriceAdjustmentResponse.builder()
                .id(adj.getId())
                .adjustCode(adj.getAdjustCode())
                .importReceiptItemId(adj.getImportReceiptItemId())
                .productId(productId)
                .productName(productName)
                .productSku(productSku)
                .receiptCode(receiptCode)
                .receiptDate(receiptDate)
                .oldPrice(adj.getOldPrice())
                .newPrice(adj.getNewPrice())
                .reason(adj.getReason())
                .status(adj.getStatus().name())
                .createdBy(adj.getCreatedBy())
                .createdByName(createdByName)
                .approvedBy(adj.getApprovedBy())
                .approvedByName(approvedByName)
                .approvedAt(adj.getApprovedAt())
                .approvalNote(adj.getApprovalNote())
                .createdAt(adj.getCreatedAt())
                .updatedAt(adj.getUpdatedAt())
                .build();
    }
}