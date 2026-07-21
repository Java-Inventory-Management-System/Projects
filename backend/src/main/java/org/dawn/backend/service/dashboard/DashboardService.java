package org.dawn.backend.service.dashboard;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dawn.backend.controller.dashboard.response.DashboardResponse;
import org.dawn.backend.entity.catalog.Product;
import org.dawn.backend.entity.inventory.ProductUnit;
import org.dawn.backend.repository.catalog.ProductRepository;
import org.dawn.backend.repository.inventory.ProductUnitRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class DashboardService {

    private final ProductRepository productRepository;
    private final ProductUnitRepository productUnitRepository;

    public DashboardResponse getStats() {
        List<Product> activeProducts = productRepository.findByIsActiveTrue();
        List<Long> activeProductIds = activeProducts.stream().map(Product::getId).toList();

        Map<Long, List<ProductUnit>> unitsByProduct = productUnitRepository
                .findByProductIdInAndStatus(activeProductIds, "IN_STOCK")
                .stream()
                .collect(Collectors.groupingBy(ProductUnit::getProductId));

        long totalItems = 0;
        int lowStockCount = 0;

        for (Product product : activeProducts) {
            List<ProductUnit> productUnits = unitsByProduct.getOrDefault(product.getId(), List.of());

            long productQty;
            if ("BULK".equals(product.getTrackingType())) {
                productQty = productUnits.stream()
                        .mapToLong(u -> u.getRemainingQuantity() != null ? u.getRemainingQuantity().longValue() : 0L)
                        .sum();
            } else {
                productQty = productUnits.size();
            }

            totalItems += productQty;

            if (productQty <= (product.getMinStock() != null ? product.getMinStock() : 0)) {
                lowStockCount++;
            }
        }

        long count = activeProducts.size();

        return DashboardResponse.builder()
                .totalProducts(count)
                .totalItems(totalItems)
                .lowStockCount(lowStockCount)
                .activeProducts(count)
                .build();
    }
}
