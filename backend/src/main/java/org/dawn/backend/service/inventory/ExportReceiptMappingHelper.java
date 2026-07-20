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
        return ExportReceiptResponse.builder()
                .id(receipt.getId())
                .receiptCode(receipt.getReceiptCode())
                .reason(receipt.getReason())
                .customerId(receipt.getCustomerId())
                .customerName(customerName)
                .totalAmount(receipt.getTotalAmount())
                .status(receipt.getStatus())
                .note(receipt.getNote())
                .createdBy(receipt.getCreatedBy())
                .createdByName(createdByName)
                .approvedBy(receipt.getApprovedBy())
                .approvedByName(approvedByName)
                .items(items.stream().map(item -> {
                    Product p = productMap.get(item.getProductId());
                    return ExportItemResponse.builder()
                            .id(item.getId())
                            .productId(item.getProductId())
                            .productName(p != null ? p.getName() : null)
                            .productSku(p != null ? p.getSku() : null)
                            .quantity(item.getQuantity())
                            .unitPrice(item.getUnitPrice())
                            .build();
                }).toList())
                .createdAt(receipt.getCreatedAt())
                .updatedAt(receipt.getUpdatedAt())
                .build();
    }
}
