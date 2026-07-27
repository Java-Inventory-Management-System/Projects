package org.dawn.backend.service.inventory;

import org.dawn.backend.controller.inventory.response.ReturnReceiptResponse;
import org.dawn.backend.entity.catalog.Product;
import org.dawn.backend.entity.inventory.ProductUnit;
import org.dawn.backend.entity.inventory.ReturnReceipt;
import org.dawn.backend.entity.inventory.ReturnReceiptItem;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public interface ReturnReceiptMappingHelper {
    static ReturnReceiptResponse map(ReturnReceipt receipt, String customerName,
                                      String createdByName, String approvedByName,
                                      List<ReturnReceiptItem> items,
                                      Map<Long, ProductUnit> productUnitMap,
                                      Map<Long, Product> productMap) {
        return ReturnReceiptResponse.builder()
                .id(receipt.getId())
                .receiptCode(receipt.getReceiptCode())
                .customerId(receipt.getCustomerId())
                .customerName(customerName)
                .originalExportReceiptId(receipt.getOriginalExportReceiptId())
                .reason(receipt.getReason())
                .status(receipt.getStatus().name())
                .note(receipt.getNote())
                .createdBy(receipt.getCreatedBy())
                .createdByName(createdByName)
                .approvedBy(receipt.getApprovedBy())
                .approvedByName(approvedByName)
                .approvedAt(receipt.getApprovedAt())
                .createdAt(receipt.getCreatedAt())
                .items(items.stream()
                        .map(item -> mapItem(item, productUnitMap, productMap))
                        .collect(Collectors.toList()))
                .build();
    }

    private static ReturnReceiptResponse.ReturnReceiptItemResponse mapItem(
            ReturnReceiptItem item,
            Map<Long, ProductUnit> productUnitMap,
            Map<Long, Product> productMap) {

        String productName = null;
        String productSku = null;
        String serialNumber = null;

        if (item.getProductUnitId() != null) {
            ProductUnit pu = productUnitMap.get(item.getProductUnitId());
            if (pu != null) {
                serialNumber = pu.getSerialNumber();
                Product product = productMap.get(pu.getProductId());
                if (product != null) {
                    productName = product.getName();
                    productSku = product.getSku();
                }
            }
        }

        if (productName == null && item.getProductId() != null) {
            Product product = productMap.get(item.getProductId());
            if (product != null) {
                productName = product.getName();
                productSku = product.getSku();
            }
        }

        return ReturnReceiptResponse.ReturnReceiptItemResponse.builder()
                .id(item.getId())
                .productUnitId(item.getProductUnitId())
                .productId(item.getProductId())
                .quantity(item.getQuantity())
                .condition(item.getCondition())
                .resultingAction(item.getResultingAction())
                .productName(productName)
                .productSku(productSku)
                .serialNumber(serialNumber)
                .build();
    }
}
