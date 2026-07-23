package org.dawn.backend.service.inventory;

import java.util.List;
import java.util.Map;

import org.dawn.backend.controller.inventory.response.ImportReceiptResponse;
import org.dawn.backend.controller.inventory.response.ImportReceiptResponse.ImportItemResponse;
import org.dawn.backend.entity.catalog.Product;
import org.dawn.backend.entity.inventory.ImportReceipt;
import org.dawn.backend.entity.inventory.ImportReceiptItem;

public interface ImportReceiptMappingHelper {

    static ImportReceiptResponse map(ImportReceipt receipt,
                                      String supplierName,
                                      String createdByName,
                                      String approvedByName,
                                      String poCode,
                                      List<ImportReceiptItem> items,
                                      Map<Long, Product> productMap,
                                      Map<Long, Integer> unitCounts,
                                      Map<Long, List<Long>> unitIds) {
        return ImportReceiptResponse.builder()
                .id(receipt.getId())
                .receiptCode(receipt.getReceiptCode())
                .supplierId(receipt.getSupplierId())
                .supplierName(supplierName)
                .purchaseOrderId(receipt.getPurchaseOrderId())
                .poCode(poCode)
                .totalAmount(receipt.getTotalAmount())
                .status(receipt.getStatus().name())
                .note(receipt.getNote())
                .createdBy(receipt.getCreatedBy())
                .createdByName(createdByName)
                .approvedBy(receipt.getApprovedBy())
                .approvedByName(approvedByName)
                .items(items.stream().map(item -> {
                    Product p = productMap.get(item.getProductId());
                    return ImportItemResponse.builder()
                            .id(item.getId())
                            .productId(item.getProductId())
                            .productName(p != null ? p.getName() : null)
                            .productSku(p != null ? p.getSku() : null)
                            .quantity(item.getQuantity())
                            .unitPrice(item.getUnitPrice())
                            .warrantyMonths(item.getWarrantyMonths())
                            .createdUnits(unitCounts.getOrDefault(item.getId(), 0))
                            .productUnitIds(unitIds.getOrDefault(item.getId(), List.of()))
                            .build();
                }).toList())
                .createdAt(receipt.getCreatedAt())
                .updatedAt(receipt.getUpdatedAt())
                .build();
    }
}
