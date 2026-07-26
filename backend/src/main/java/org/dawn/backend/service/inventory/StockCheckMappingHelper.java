package org.dawn.backend.service.inventory;

import org.dawn.backend.controller.inventory.response.StockCheckResponse;
import org.dawn.backend.controller.inventory.response.StockCheckResponse.StockCheckItemResponse;
import org.dawn.backend.constant.inventory.DifferenceType;
import org.dawn.backend.entity.catalog.Product;
import org.dawn.backend.entity.inventory.ProductUnit;
import org.dawn.backend.entity.inventory.StockCheck;
import org.dawn.backend.entity.inventory.StockCheckItem;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public interface StockCheckMappingHelper {

    static StockCheckResponse map(StockCheck sc, String createdByName, String approvedByName,
                                   List<StockCheckItem> items,
                                   Map<Long, ProductUnit> unitMap,
                                   Map<Long, Product> productMap) {
        int matchCount = 0, missingCount = 0, unexpectedCount = 0;
        List<StockCheckItemResponse> itemResponses = new ArrayList<>();

        for (var item : items) {
            ProductUnit pu = unitMap.get(item.getProductUnitId());
            Product p = pu != null ? productMap.get(pu.getProductId()) : null;
            String diff = item.getDifference();
            if (DifferenceType.MATCH.name().equals(diff)) matchCount++;
            else if (DifferenceType.MISSING.name().equals(diff)) missingCount++;
            else if (DifferenceType.UNEXPECTED.name().equals(diff)) unexpectedCount++;
            itemResponses.add(StockCheckItemResponse.builder()
                    .id(item.getId())
                    .productUnitId(item.getProductUnitId())
                    .serialNumber(pu != null ? pu.getSerialNumber() : null)
                    .productId(p != null ? p.getId() : null)
                    .productName(p != null ? p.getName() : null)
                    .productSku(p != null ? p.getSku() : null)
                    .expectedStatus(item.getExpectedStatus())
                    .actualStatus(item.getActualStatus())
                    .countedQuantity(item.getCountedQuantity())
                    .difference(item.getDifference())
                    .note(item.getNote())
                    .build());
        }

        return StockCheckResponse.builder()
                .id(sc.getId())
                .checkCode(sc.getCheckCode())
                .status(sc.getStatus().name())
                .scopeType(sc.getScopeType())
                .scopeId(sc.getScopeId())
                .note(sc.getNote())
                .createdBy(sc.getCreatedBy())
                .createdByName(createdByName)
                .approvedBy(sc.getApprovedBy())
                .approvedByName(approvedByName)
                .approvalNote(sc.getApprovalNote())
                .items(itemResponses)
                .totalItems(items.size())
                .matchCount(matchCount)
                .missingCount(missingCount)
                .unexpectedCount(unexpectedCount)
                .createdAt(sc.getCreatedAt())
                .updatedAt(sc.getUpdatedAt())
                .build();
    }
}