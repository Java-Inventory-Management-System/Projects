package org.dawn.backend.service.inventory;

import org.dawn.backend.controller.inventory.response.ExportReceiptResponse;
import org.dawn.backend.controller.inventory.response.ExportReceiptResponse.ExportItemResponse;
import org.dawn.backend.entity.catalog.Product;
import org.dawn.backend.entity.inventory.ExportReceipt;
import org.dawn.backend.entity.inventory.ExportReceiptItem;

import java.util.List;

public interface ExportReceiptMappingHelper {

    static ExportReceiptResponse map(ExportReceipt receipt,
                                             String customerName,
                                             String createdByName,
                                             String approvedByName,
                                             List<ExportReceiptItem> items,
                                             java.util.Map<Long, Product> productMap) {
        return new ExportReceiptResponse(
                receipt.getId(),
                receipt.getReceiptCode(),
                receipt.getReason(),
                receipt.getCustomerId(),
                customerName,
                receipt.getTotalAmount(),
                receipt.getStatus(),
                receipt.getNote(),
                receipt.getCreatedBy(),
                createdByName,
                receipt.getApprovedBy(),
                approvedByName,
                items.stream().map(item -> {
                    Product p = productMap.get(item.getProductId());
                    return new ExportItemResponse(
                            item.getId(),
                            item.getProductId(),
                            p != null ? p.getName() : null,
                            p != null ? p.getSku() : null,
                            item.getQuantity(),
                            item.getUnitPrice()
                    );
                }).toList(),
                receipt.getCreatedAt(),
                receipt.getUpdatedAt()
        );
    }
}
