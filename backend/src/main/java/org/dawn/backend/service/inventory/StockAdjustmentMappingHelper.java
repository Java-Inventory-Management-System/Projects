package org.dawn.backend.service.inventory;

import org.dawn.backend.controller.inventory.response.StockAdjustmentResponse;
import org.dawn.backend.entity.catalog.Product;
import org.dawn.backend.entity.inventory.ProductUnit;
import org.dawn.backend.entity.inventory.StockAdjustment;

public interface StockAdjustmentMappingHelper {

    static StockAdjustmentResponse map(StockAdjustment adj,
                                        String createdByName,
                                        String approvedByName,
                                        ProductUnit unit,
                                        Product product) {
        return StockAdjustmentResponse.builder()
                .id(adj.getId())
                .adjustCode(adj.getAdjustCode())
                .type(adj.getType())
                .productUnitId(adj.getProductUnitId())
                .serialNumber(unit != null ? unit.getSerialNumber() : null)
                .productId(adj.getProductId() != null ? adj.getProductId()
                        : (unit != null ? unit.getProductId() : null))
                .productName(product != null ? product.getName() : null)
                .productSku(product != null ? product.getSku() : null)
                .quantity(adj.getQuantity())
                .reason(adj.getReason())
                .imageUrl(adj.getImageUrl())
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
