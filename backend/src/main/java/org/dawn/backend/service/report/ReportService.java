package org.dawn.backend.service.report;

import lombok.RequiredArgsConstructor;
import org.dawn.backend.config.web.response.ResponsePage;
import org.dawn.backend.controller.report.response.CategoryStockResponse;
import org.dawn.backend.controller.report.response.InventorySummaryResponse;
import org.dawn.backend.controller.report.response.LowStockResponse;
import org.dawn.backend.entity.catalog.Category;
import org.dawn.backend.entity.catalog.Product;
import org.dawn.backend.entity.inventory.ProductUnit;
import org.dawn.backend.repository.catalog.CategoryRepository;
import org.dawn.backend.repository.catalog.ProductRepository;
import org.dawn.backend.repository.inventory.ProductUnitRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final ProductRepository productRepository;
    private final ProductUnitRepository productUnitRepository;
    private final CategoryRepository categoryRepository;

    public InventorySummaryResponse getInventorySummary() {
        List<Product> allProducts = productRepository.findByIsActiveTrue();
        List<Long> activeProductIds = allProducts.stream().map(Product::getId).toList();

        List<ProductUnit> inStockUnits = productUnitRepository
                .findByProductIdInAndStatus(activeProductIds, "IN_STOCK");

        Map<Long, List<ProductUnit>> unitsByProduct = inStockUnits.stream()
                .collect(Collectors.groupingBy(ProductUnit::getProductId));

        long totalUnits = 0;
        BigDecimal totalValue = BigDecimal.ZERO;
        long lowStockCount = 0;
        long outOfStockCount = 0;

        for (Product product : allProducts) {
            List<ProductUnit> units = unitsByProduct.getOrDefault(product.getId(), List.of());

            long qty;
            if ("BULK".equals(product.getTrackingType())) {
                qty = units.stream()
                        .mapToLong(u -> u.getRemainingQuantity() != null ? u.getRemainingQuantity().longValue() : 0L)
                        .sum();
            } else {
                qty = units.size();
            }

            totalUnits += qty;

            if (product.getSellPrice() != null) {
                totalValue = totalValue.add(product.getSellPrice().multiply(BigDecimal.valueOf(qty)));
            }

            int minStock = product.getMinStock() != null ? product.getMinStock() : 0;
            if (qty <= minStock && qty > 0) {
                lowStockCount++;
            } else if (qty == 0) {
                outOfStockCount++;
            }
        }

        return InventorySummaryResponse.builder()
                .totalProducts(allProducts.size())
                .totalUnits(totalUnits)
                .totalStockValue(totalValue)
                .lowStockCount(lowStockCount)
                .outOfStockCount(outOfStockCount)
                .build();
    }

    public List<CategoryStockResponse> getStockByCategory() {
        List<Category> categories = categoryRepository.findAll();
        List<Product> allProducts = productRepository.findByIsActiveTrue();
        List<Long> activeProductIds = allProducts.stream().map(Product::getId).toList();

        List<ProductUnit> inStockUnits = productUnitRepository
                .findByProductIdInAndStatus(activeProductIds, "IN_STOCK");

        Map<Long, List<ProductUnit>> unitsByProduct = inStockUnits.stream()
                .collect(Collectors.groupingBy(ProductUnit::getProductId));

        Map<Long, List<Product>> productsByCategory = allProducts.stream()
                .collect(Collectors.groupingBy(
                        p -> p.getCategory() != null ? p.getCategory().getId() : 0L));

        Map<Long, String> categoryNames = new HashMap<>();
        categoryNames.put(0L, "Uncategorized");
        categories.forEach(c -> categoryNames.put(c.getId(), c.getName()));

        return categoryNames.entrySet().stream()
                .map(entry -> {
                    Long catId = entry.getKey();
                    List<Product> catProducts = productsByCategory.getOrDefault(catId, List.of());

                    long productCount = catProducts.size();
                    long totalUnits = 0;
                    BigDecimal totalValue = BigDecimal.ZERO;

                    for (Product p : catProducts) {
                        List<ProductUnit> units = unitsByProduct.getOrDefault(p.getId(), List.of());
                        long qty;
                        if ("BULK".equals(p.getTrackingType())) {
                            qty = units.stream()
                                    .mapToLong(u -> u.getRemainingQuantity() != null ? u.getRemainingQuantity().longValue() : 0L)
                                    .sum();
                        } else {
                            qty = units.size();
                        }
                        totalUnits += qty;
                        if (p.getSellPrice() != null) {
                            totalValue = totalValue.add(p.getSellPrice().multiply(BigDecimal.valueOf(qty)));
                        }
                    }

                    return CategoryStockResponse.builder()
                            .categoryId(0L == catId ? null : catId)
                            .categoryName(entry.getValue())
                            .productCount(productCount)
                            .totalUnits(totalUnits)
                            .totalStockValue(totalValue)
                            .build();
                })
                .sorted(Comparator.comparing(CategoryStockResponse::categoryName))
                .toList();
    }

    public ResponsePage<LowStockResponse> getLowStock(Pageable pageable) {
        Page<Product> productPage = productRepository.findByIsActiveTrue(pageable);
        List<Long> productIds = productPage.getContent().stream().map(Product::getId).toList();

        Map<Long, List<ProductUnit>> unitsByProduct = productUnitRepository
                .findByProductIdInAndStatus(productIds, "IN_STOCK")
                .stream()
                .collect(Collectors.groupingBy(ProductUnit::getProductId));

        return ResponsePage.of(productPage.map(product -> {
            List<ProductUnit> units = unitsByProduct.getOrDefault(product.getId(), List.of());

            int qty;
            if ("BULK".equals(product.getTrackingType())) {
                qty = units.stream()
                        .mapToInt(u -> u.getRemainingQuantity() != null ? u.getRemainingQuantity().intValue() : 0)
                        .sum();
            } else {
                qty = units.size();
            }

            int minStock = product.getMinStock() != null ? product.getMinStock() : 0;

            return LowStockResponse.builder()
                    .productId(product.getId())
                    .productName(product.getName())
                    .productSku(product.getSku())
                    .quantity(qty)
                    .minStock(minStock)
                    .build();
        }));
    }
}
