package org.dawn.backend.service.inventory.stockcheck;

import org.dawn.backend.controller.inventory.response.StockCheckResponse;
import org.dawn.backend.controller.inventory.response.StockCheckResponse.StockCheckItemResponse;
import org.dawn.backend.constant.enums.inventory.stockcheck.DifferenceType;
import org.dawn.backend.entity.catalog.Product;
import org.dawn.backend.entity.inventory.ProductUnit;
import org.dawn.backend.entity.inventory.StockCheck;
import org.dawn.backend.entity.inventory.StockCheckItem;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

public interface StockCheckMappingHelper {

    static StockCheckResponse map(StockCheck sc, String createdByName, String approvedByName,
                                   List<StockCheckItem> items,
                                   Map<Long, ProductUnit> unitMap,
                                   Map<Long, Product> productMap) {
        return map(sc, createdByName, approvedByName, null, null, items, unitMap, productMap, Map.of(), 0, null);
    }

    static StockCheckResponse map(StockCheck sc, String createdByName, String approvedByName,
                                   List<StockCheckItem> items,
                                   Map<Long, ProductUnit> unitMap,
                                   Map<Long, Product> productMap,
                                   Map<Long, String> boxCodeById) {
        return map(sc, createdByName, approvedByName, null, null, items, unitMap, productMap, boxCodeById, 0, null);
    }

    static StockCheckResponse map(StockCheck sc, String createdByName, String approvedByName,
                                   List<StockCheckItem> items,
                                   Map<Long, ProductUnit> unitMap,
                                   Map<Long, Product> productMap,
                                   int autoFilledCount) {
        return map(sc, createdByName, approvedByName, null, null, items, unitMap, productMap, Map.of(), autoFilledCount, null);
    }

    static StockCheckResponse map(StockCheck sc, String createdByName, String approvedByName,
                                   List<StockCheckItem> items,
                                   Map<Long, ProductUnit> unitMap,
                                   Map<Long, Product> productMap,
                                   Map<Long, String> boxCodeById,
                                   int autoFilledCount) {
        return map(sc, createdByName, approvedByName, null, null, items, unitMap, productMap, boxCodeById, autoFilledCount, null);
    }

    static StockCheckResponse map(StockCheck sc, String createdByName, String approvedByName,
                                   String checkedByName, String enteredByName,
                                   List<StockCheckItem> items,
                                   Map<Long, ProductUnit> unitMap,
                                   Map<Long, Product> productMap,
                                   Map<Long, String> boxCodeById,
                                   int autoFilledCount,
                                   String scopeName) {
        int matchCount = 0, missingCount = 0, unexpectedCount = 0;
        List<StockCheckItemResponse> itemResponses = new ArrayList<>();

        for (var item : items) {
            ProductUnit pu = unitMap.get(item.getProductUnitId());
            Product p = pu != null ? productMap.get(pu.getProductId()) : null;
            DifferenceType diff = item.getDifference() == null ? null : DifferenceType.valueOf(item.getDifference());
            if (diff != null) switch (diff) {
                case MATCH -> matchCount++;
                case MISSING, DAMAGED -> missingCount++;
                case UNEXPECTED -> unexpectedCount++;
                default -> { }
            }
            itemResponses.add(StockCheckItemResponse.builder()
                    .id(item.getId())
                    .productUnitId(item.getProductUnitId())
                    .serialNumber(pu != null ? pu.getSerialNumber() : null)
                    .productId(p != null ? p.getId() : null)
                    .productName(p != null ? p.getName() : null)
                    .productSku(p != null ? p.getSku() : null)
                    .unit(p != null ? p.getUnit() : null)
                    .trackingType(item.getTrackingType())
                    .boxId(pu != null ? pu.getBoxId() : null)
                    .boxCode(pu != null && pu.getBoxId() != null ? boxCodeById.get(pu.getBoxId()) : null)
                    .expectedStatus(item.getExpectedStatus())
                    .actualStatus(item.getActualStatus())
                    .countedQuantity(item.getCountedQuantity())
                    .expectedQuantity(item.getExpectedQuantity())
                    .difference(item.getDifference())
                    .note(item.getNote())
                    .photo(item.getPhoto())
                    .autoFilled(item.getAutoFilled())
                    .suspectSeal(item.getSuspectSeal())
                    .damagedPackaging(item.getDamagedPackaging())
                    .touchedAt(item.getTouchedAt())
                    .build());
        }

        return StockCheckResponse.builder()
                .id(sc.getId())
                .checkCode(sc.getCheckCode())
                .status(sc.getStatus().name())
                .scopeType(sc.getScopeType())
                .scopeId(sc.getScopeId())
                .scopeName(scopeName)
                .shelfCodes(sc.getShelfCodes() == null ? null
                        : Arrays.stream(sc.getShelfCodes().split(","))
                                .map(String::trim)
                                .filter(s -> !s.isEmpty())
                                .toList())
                .note(sc.getNote())
                .createdBy(sc.getCreatedBy())
                .createdByName(createdByName)
                .approvedBy(sc.getApprovedBy())
                .approvedByName(approvedByName)
                .approvalNote(sc.getApprovalNote())
                .checkedBy(sc.getCheckedBy())
                .checkedByName(checkedByName)
                .enteredBy(sc.getEnteredBy())
                .enteredByName(enteredByName)
                .items(itemResponses)
                .totalItems(items.size())
                .matchCount(matchCount)
                .missingCount(missingCount)
                .unexpectedCount(unexpectedCount)
                .autoFilledCount(autoFilledCount)
                .createdAt(sc.getCreatedAt())
                .updatedAt(sc.getUpdatedAt())
                .build();
    }
}