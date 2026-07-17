package org.dawn.backend.service.report;

import lombok.RequiredArgsConstructor;
import org.dawn.backend.config.web.response.ResponsePage;
import org.dawn.backend.controller.report.response.*;
import org.dawn.backend.entity.catalog.Category;
import org.dawn.backend.entity.catalog.Product;
import org.dawn.backend.entity.catalog.Supplier;
import org.dawn.backend.entity.inventory.Customer;
import org.dawn.backend.entity.inventory.ExportReceipt;
import org.dawn.backend.entity.inventory.ImportReceipt;
import org.dawn.backend.entity.inventory.ImportReceiptItem;
import org.dawn.backend.entity.inventory.ProductUnit;
import org.dawn.backend.repository.catalog.CategoryRepository;
import org.dawn.backend.repository.catalog.ProductRepository;
import org.dawn.backend.repository.catalog.SupplierRepository;
import org.dawn.backend.repository.inventory.CustomerRepository;
import org.dawn.backend.repository.inventory.ExportReceiptRepository;
import org.dawn.backend.repository.inventory.ImportReceiptItemRepository;
import org.dawn.backend.repository.inventory.ImportReceiptRepository;
import org.dawn.backend.repository.inventory.ProductUnitRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final ProductRepository productRepository;
    private final ProductUnitRepository productUnitRepository;
    private final CategoryRepository categoryRepository;
    private final ImportReceiptRepository importReceiptRepository;
    private final ExportReceiptRepository exportReceiptRepository;
    private final SupplierRepository supplierRepository;
    private final CustomerRepository customerRepository;
    private final ImportReceiptItemRepository importReceiptItemRepository;

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

    public List<StockValueResponse> getStockValue() {
        List<Product> allProducts = productRepository.findByIsActiveTrue();
        List<Long> productIds = allProducts.stream().map(Product::getId).toList();

        List<ProductUnit> inStockUnits = productUnitRepository
                .findByProductIdInAndStatus(productIds, "IN_STOCK");

        Map<Long, List<ProductUnit>> unitsByProduct = inStockUnits.stream()
                .collect(Collectors.groupingBy(ProductUnit::getProductId));

        return allProducts.stream().map(product -> {
            List<ProductUnit> units = unitsByProduct.getOrDefault(product.getId(), List.of());

            long qty;
            if ("BULK".equals(product.getTrackingType())) {
                qty = units.stream()
                        .mapToLong(u -> u.getRemainingQuantity() != null ? u.getRemainingQuantity().longValue() : 0L)
                        .sum();
            } else {
                qty = units.size();
            }

            BigDecimal unitPrice = product.getSellPrice() != null ? product.getSellPrice() : BigDecimal.ZERO;
            BigDecimal totalValue = unitPrice.multiply(BigDecimal.valueOf(qty));

            String categoryName = product.getCategory() != null ? product.getCategory().getName() : "Uncategorized";

            return StockValueResponse.builder()
                    .productId(product.getId())
                    .productName(product.getName())
                    .productSku(product.getSku())
                    .categoryName(categoryName)
                    .quantity(qty)
                    .unitPrice(unitPrice)
                    .totalValue(totalValue)
                    .build();
        }).sorted(Comparator.comparing(StockValueResponse::productName)).toList();
    }

    public List<ActivityResponse> getActivity(Instant from, Instant to) {
        List<ImportReceipt> imports = importReceiptRepository.findByCreatedAtBetween(from, to);
        List<ExportReceipt> exports = exportReceiptRepository.findByCreatedAtBetween(from, to);

        Map<Long, String> supplierCache = new HashMap<>();
        Map<Long, String> customerCache = new HashMap<>();
        Map<Long, List<ImportReceiptItem>> importItemsCache = new HashMap<>();

        List<ActivityResponse> result = new ArrayList<>();

        for (ImportReceipt receipt : imports) {
            String name = supplierCache.computeIfAbsent(receipt.getSupplierId(), id ->
                    supplierRepository.findById(id).map(Supplier::getName).orElse("Unknown"));

            List<ImportReceiptItem> items = importItemsCache.computeIfAbsent(receipt.getId(), id ->
                    importReceiptItemRepository.findByReceiptId(id));

            result.add(ActivityResponse.builder()
                    .type("IMPORT")
                    .receiptCode(receipt.getReceiptCode())
                    .date(receipt.getCreatedAt())
                    .counterpartyName(name)
                    .lineItems(items.size())
                    .totalAmount(receipt.getTotalAmount() != null ? receipt.getTotalAmount() : BigDecimal.ZERO)
                    .build());
        }

        for (ExportReceipt receipt : exports) {
            String name = customerCache.computeIfAbsent(receipt.getCustomerId(), id ->
                    customerRepository.findById(id).map(Customer::getName).orElse("Unknown"));

            result.add(ActivityResponse.builder()
                    .type("EXPORT")
                    .receiptCode(receipt.getReceiptCode())
                    .date(receipt.getCreatedAt())
                    .counterpartyName(name)
                    .lineItems(0)
                    .totalAmount(receipt.getTotalAmount() != null ? receipt.getTotalAmount() : BigDecimal.ZERO)
                    .build());
        }

        result.sort(Comparator.comparing(ActivityResponse::date).reversed());
        return result;
    }

    public List<DeadStockResponse> getDeadStock(int daysThreshold) {
        Instant cutoffDate = Instant.now().minus(Duration.ofDays(daysThreshold));
        List<ProductUnit> deadUnits = productUnitRepository.findDeadStockUnits(cutoffDate);

        Map<Long, Product> productCache = new HashMap<>();
        Map<Long, ImportReceiptItem> itemCache = new HashMap<>();

        return deadUnits.stream().map(unit -> {
            Product product = productCache.computeIfAbsent(unit.getProductId(),
                    id -> productRepository.findById(id).orElse(null));

            ImportReceiptItem item = unit.getImportReceiptItemId() != null
                    ? itemCache.computeIfAbsent(unit.getImportReceiptItemId(),
                    id -> importReceiptItemRepository.findById(id).orElse(null))
                    : null;

            long daysInStock = Duration.between(unit.getImportedAt(), Instant.now()).toDays();
            BigDecimal costPrice = item != null && item.getUnitPrice() != null
                    ? item.getUnitPrice()
                    : BigDecimal.ZERO;

            return DeadStockResponse.builder()
                    .productId(unit.getProductId())
                    .productName(product != null ? product.getName() : "Deleted")
                    .productSku(product != null ? product.getSku() : "N/A")
                    .serialNumber(unit.getSerialNumber())
                    .importedAt(unit.getImportedAt())
                    .daysInStock(daysInStock)
                    .costPrice(costPrice)
                    .build();
        }).sorted(Comparator.comparing(DeadStockResponse::daysInStock).reversed()).toList();
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
