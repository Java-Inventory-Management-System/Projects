package org.dawn.backend.service.inventory;

import org.dawn.backend.controller.inventory.response.ReturnReceiptResponse;
import org.dawn.backend.entity.inventory.ReturnReceipt;
import org.dawn.backend.entity.inventory.ReturnReceiptItem;

import java.util.List;
import java.util.stream.Collectors;

public interface ReturnReceiptMappingHelper {
    static ReturnReceiptResponse map(ReturnReceipt receipt, String customerName,
                                      String createdByName, String approvedByName,
                                      List<ReturnReceiptItem> items) {
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
                .items(items.stream().map(ReturnReceiptMappingHelper::mapItem).collect(Collectors.toList()))
                .build();
    }

    private static ReturnReceiptResponse.ReturnReceiptItemResponse mapItem(ReturnReceiptItem item) {
        return ReturnReceiptResponse.ReturnReceiptItemResponse.builder()
                .id(item.getId())
                .productUnitId(item.getProductUnitId())
                .productId(item.getProductId())
                .quantity(item.getQuantity())
                .condition(item.getCondition())
                .resultingAction(item.getResultingAction())
                .build();
    }
}
