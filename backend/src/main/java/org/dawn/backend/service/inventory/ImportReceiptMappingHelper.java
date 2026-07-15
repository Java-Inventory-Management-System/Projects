package org.dawn.backend.service.inventory;

import org.dawn.backend.controller.inventory.response.ImportReceiptResponse;
import org.dawn.backend.controller.inventory.response.ImportReceiptResponse.ImportItemResponse;
import org.dawn.backend.entity.inventory.ImportReceipt;
import org.dawn.backend.entity.inventory.ImportReceiptItem;
import org.dawn.backend.entity.catalog.Product;

import java.util.List;

public class ImportReceiptMappingHelper {
    private ImportReceiptMappingHelper() {}

    public static ImportReceiptResponse map(ImportReceipt receipt,
                                             String supplierName,
                                             String createdByName,
                                             String approvedByName,
                                             List<ImportReceiptItem> items,
                                             java.util.Map<Long, Product> productMap,
                                             java.util.Map<Long, Integer> unitCounts) {
        return new ImportReceiptResponse(
                receipt.getId(),
                receipt.getReceiptCode(),
                receipt.getSupplierId(),
                supplierName,
                receipt.getTotalAmount(),
                receipt.getStatus(),
                receipt.getNote(),
                receipt.getCreatedBy(),
                createdByName,
                receipt.getApprovedBy(),
                approvedByName,
                items.stream().map(item -> {
                    Product p = productMap.get(item.getProductId());
                    return new ImportItemResponse(
                            item.getId(),
                            item.getProductId(),
                            p != null ? p.getName() : null,
                            p != null ? p.getSku() : null,
                            item.getQuantity(),
                            item.getUnitPrice(),
                            item.getWarrantyMonths(),
                            unitCounts.getOrDefault(item.getId(), 0)
                    );
                }).toList(),
                receipt.getCreatedAt(),
                receipt.getUpdatedAt()
        );
    }
}
