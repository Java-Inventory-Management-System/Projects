package org.dawn.backend.service.inventory;

import org.dawn.backend.controller.inventory.response.StockCheckResponse;
import org.dawn.backend.controller.inventory.response.StockCheckResponse.StockCheckItemResponse;
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
            if ("MATCH".equals(diff)) matchCount++;
            else if ("MISSING".equals(diff)) missingCount++;
            else if ("UNEXPECTED".equals(diff)) unexpectedCount++;
            itemResponses.add(new StockCheckItemResponse(
                    item.getId(), item.getProductUnitId(),
                    pu != null ? pu.getSerialNumber() : null,
                    p != null ? p.getId() : null,
                    p != null ? p.getName() : null,
                    p != null ? p.getSku() : null,
                    item.getExpectedStatus(), item.getActualStatus(),
                    item.getCountedQuantity(), item.getDifference(), item.getNote()
            ));
        }

        return new StockCheckResponse(
                sc.getId(), sc.getCheckCode(), sc.getStatus(), sc.getNote(),
                sc.getCreatedBy(), createdByName,
                sc.getApprovedBy(), approvedByName,
                sc.getApprovalNote(),
                itemResponses, items.size(),
                matchCount, missingCount, unexpectedCount,
                sc.getCreatedAt(), sc.getUpdatedAt()
        );
    }
}
