package org.dawn.backend.service.dashboard;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dawn.backend.controller.dashboard.response.DashboardResponse;
import org.dawn.backend.repository.catalog.ProductRepository;
import org.dawn.backend.repository.inventory.ProductUnitRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class DashboardService {

    private final ProductRepository productRepository;
    private final ProductUnitRepository productUnitRepository;

    @Transactional(readOnly = true)
    public DashboardResponse getStats() {
        long totalProducts = productRepository.countByIsActiveTrue();

        var aggregates = productUnitRepository.aggregateInStockByProduct();
        long totalItems = 0;
        int lowStockCount = 0;

        for (var row : aggregates) {
            long qty = ((Number) row[1]).longValue();
            int minStock = row[2] != null ? ((Number) row[2]).intValue() : 0;
            totalItems += qty;
            if (qty <= minStock) lowStockCount++;
        }

        return DashboardResponse.builder()
                .totalProducts(totalProducts)
                .totalItems(totalItems)
                .lowStockCount(lowStockCount)
                .activeProducts(totalProducts)
                .build();
    }
}
