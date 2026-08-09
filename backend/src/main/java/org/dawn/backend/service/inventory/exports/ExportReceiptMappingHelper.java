package org.dawn.backend.service.inventory.exports;

import org.dawn.backend.controller.inventory.response.ExportReceiptResponse;
import org.dawn.backend.controller.inventory.response.ExportReceiptResponse.ExportItemResponse;
import org.dawn.backend.controller.inventory.response.ExportReceiptResponse.StatusHistoryResponse;
import org.dawn.backend.entity.catalog.Product;
import org.dawn.backend.entity.inventory.ExportReceipt;
import org.dawn.backend.entity.inventory.ExportReceiptItem;
import org.dawn.backend.entity.inventory.ExportReceiptStatusHistory;

import java.util.List;
import java.util.Map;

public interface ExportReceiptMappingHelper {

    static ExportReceiptResponse map(ExportReceipt receipt,
                                      String customerName,
                                      String createdByName,
                                      String approvedByName,
                                      String fulfilledByName,
                                      String rejectedByName,
                                      List<ExportReceiptItem> items,
                                      Map<Long, Product> productMap,
                                      Map<Long, String> trackingTypeMap,
                                      List<ExportReceiptStatusHistory> statusHistory) {
        return ExportReceiptResponse.builder()
                .id(receipt.getId())
                .receiptCode(receipt.getReceiptCode())
                .reason(receipt.getReason())
                .customerId(receipt.getCustomerId())
                .customerName(customerName)
                .totalAmount(receipt.getTotalAmount())
                .status(receipt.getStatus().name())
                .note(receipt.getNote())
                .createdBy(receipt.getCreatedBy())
                .createdByName(createdByName)
                .approvedBy(receipt.getApprovedBy())
                .approvedByName(approvedByName)
                .fulfilledBy(receipt.getFulfilledBy())
                .fulfilledByName(fulfilledByName)
                .fulfilledAt(receipt.getFulfilledAt())
                .rejectedBy(receipt.getRejectedBy())
                .rejectedByName(rejectedByName)
                .rejectedAt(receipt.getRejectedAt())
                .rejectReason(receipt.getRejectReason())
                .externalReference(receipt.getExternalReference())
                .items(items.stream().map(item -> {
                    Product p = productMap.get(item.getProductId());
                    return ExportItemResponse.builder()
                            .id(item.getId())
                            .productId(item.getProductId())
                            .productName(p != null ? p.getName() : null)
                            .productSku(p != null ? p.getSku() : null)
                            .quantity(item.getQuantity())
                            .unitPrice(item.getUnitPrice())
                            .trackingType(trackingTypeMap != null ? trackingTypeMap.get(item.getProductId()) : null)
                            .build();
                }).toList())
                .statusHistory(statusHistory == null ? List.of() : statusHistory.stream()
                        .map(h -> StatusHistoryResponse.builder()
                                .fromStatus(h.getFromStatus())
                                .toStatus(h.getToStatus())
                                .createdAt(h.getCreatedAt())
                                .changedBy(h.getChangedBy())
                                .build())
                        .toList())
                .createdAt(receipt.getCreatedAt())
                .updatedAt(receipt.getUpdatedAt())
                .build();
    }
}
