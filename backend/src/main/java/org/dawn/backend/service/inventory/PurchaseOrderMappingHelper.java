package org.dawn.backend.service.inventory;

import org.dawn.backend.controller.inventory.response.PurchaseOrderResponse;
import org.dawn.backend.controller.inventory.response.PurchaseOrderResponse.POItemResponse;
import org.dawn.backend.entity.catalog.Product;
import org.dawn.backend.entity.inventory.PurchaseOrder;
import org.dawn.backend.entity.inventory.PurchaseOrderItem;

import java.util.List;
import java.util.Map;

public interface PurchaseOrderMappingHelper {

    static PurchaseOrderResponse map(PurchaseOrder po, String supplierName, String createdByName,
                                      List<PurchaseOrderItem> items, Map<Long, Product> products,
                                      boolean locked, long rejectedReceiptCount) {
        List<POItemResponse> itemResponses = items.stream().map(item -> {
            Product p = products.get(item.getProductId());
            return POItemResponse.builder()
                    .id(item.getId())
                    .productId(item.getProductId())
                    .productName(p != null ? p.getName() : null)
                    .productSku(p != null ? p.getSku() : null)
                    .trackingType(p != null ? p.getTrackingType() : null)
                    .quantity(item.getQuantity())
                    .unitPrice(item.getUnitPrice())
                    .receivedQuantity(item.getReceivedQuantity())
                    .serials(item.getSerials() != null && !item.getSerials().isBlank()
                            ? List.of(item.getSerials().split("\r?\n"))
                            : List.of())
                    .build();
        }).toList();

        return PurchaseOrderResponse.builder()
                .id(po.getId())
                .poCode(po.getPoCode())
                .supplierId(po.getSupplierId())
                .supplierName(supplierName)
                .totalAmount(po.getTotalAmount())
                .status(po.getStatus().name())
                .locked(locked)
                .rejectedReceiptCount(rejectedReceiptCount)
                .expectedDate(po.getExpectedDate())
                .note(po.getNote())
                .invoiceCode(po.getInvoiceCode())
                .asnCode(po.getAsnCode())
                .createdBy(po.getCreatedBy())
                .createdByName(createdByName)
                .createdAt(po.getCreatedAt())
                .updatedAt(po.getUpdatedAt())
                .items(itemResponses)
                .build();
    }
}
