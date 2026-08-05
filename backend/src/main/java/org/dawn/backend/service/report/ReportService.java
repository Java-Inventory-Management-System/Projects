package org.dawn.backend.service.report;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dawn.backend.config.web.response.ResponsePage;
import org.dawn.backend.constant.enums.catalog.TrackingType;
import org.dawn.backend.constant.enums.inventory.ProductUnitStatus;
import org.dawn.backend.constant.enums.inventory.adjustments.AdjustmentSourceType;
import org.dawn.backend.constant.enums.inventory.stockcheck.DifferenceType;
import org.dawn.backend.constant.enums.inventory.stockcheck.StockCheckStatus;
import org.dawn.backend.controller.report.response.*;
import org.dawn.backend.entity.catalog.Category;
import org.dawn.backend.entity.catalog.Product;
import org.dawn.backend.entity.catalog.Supplier;
import org.dawn.backend.entity.inventory.Customer;
import org.dawn.backend.entity.inventory.ExportReceipt;
import org.dawn.backend.entity.inventory.ImportReceipt;
import org.dawn.backend.entity.inventory.ImportReceiptItem;
import org.dawn.backend.entity.inventory.ProductUnit;
import org.dawn.backend.entity.inventory.StockCheck;
import org.dawn.backend.entity.inventory.StockCheckItem;
import org.dawn.backend.repository.catalog.CategoryRepository;
import org.dawn.backend.repository.catalog.ProductRepository;
import org.dawn.backend.repository.catalog.SupplierRepository;
import org.dawn.backend.repository.inventory.CustomerRepository;
import org.dawn.backend.repository.inventory.exports.ExportReceiptRepository;
import org.dawn.backend.repository.inventory.imports.ImportReceiptItemRepository;
import org.dawn.backend.repository.inventory.imports.ImportReceiptRepository;
import org.dawn.backend.repository.inventory.ProductUnitRepository;
import org.dawn.backend.repository.inventory.adjustments.StockAdjustmentRepository;
import org.dawn.backend.repository.inventory.stockcheck.StockCheckItemRepository;
import org.dawn.backend.repository.inventory.stockcheck.StockCheckRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
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
    private final StockCheckRepository stockCheckRepository;
    private final StockCheckItemRepository stockCheckItemRepository;
    private final StockAdjustmentRepository stockAdjustmentRepository;

    @Transactional(readOnly = true)
    public InventorySummaryResponse getInventorySummary() {
        var aggregates = productUnitRepository.aggregateInStockByProduct();
        long totalProducts = productRepository.countByIsActiveTrue();
        long totalUnits = 0;
        BigDecimal totalValue = BigDecimal.ZERO;
        long lowStockCount = 0;
        long outOfStockCount = 0;

        for (var row : aggregates) {
            long qty = ((Number) row[1]).longValue();
            int minStock = row[2] != null ? ((Number) row[2]).intValue() : 0;
            BigDecimal sellPrice = row[3] != null ? BigDecimal.valueOf(((Number) row[3]).doubleValue()) : BigDecimal.ZERO;

            totalUnits += qty;
            totalValue = totalValue.add(sellPrice.multiply(BigDecimal.valueOf(qty)));

            if (qty <= minStock && qty > 0) {
                lowStockCount++;
            } else if (qty == 0) {
                outOfStockCount++;
            }
        }

        Instant now = Instant.now();
        Instant monthAgo = now.minus(java.time.Duration.ofDays(30));
        BigDecimal importTotal = importReceiptRepository.sumTotalAmountByStatusAndCreatedAtBetween(monthAgo, now);
        BigDecimal exportTotal = exportReceiptRepository.sumTotalAmountByStatusAndCreatedAtBetween(monthAgo, now);
        BigDecimal previousValue = totalValue.subtract(importTotal).add(exportTotal);
        if (previousValue.compareTo(BigDecimal.ZERO) < 0) previousValue = BigDecimal.ZERO;

        BigDecimal trendPercent = BigDecimal.ZERO;
        if (previousValue.compareTo(BigDecimal.ZERO) > 0) {
            trendPercent = totalValue.subtract(previousValue)
                    .multiply(BigDecimal.valueOf(100))
                    .divide(previousValue, 1, java.math.RoundingMode.HALF_UP);
        }

        return InventorySummaryResponse.builder()
                .totalProducts(totalProducts)
                .totalUnits(totalUnits)
                .totalStockValue(totalValue)
                .lowStockCount(lowStockCount)
                .outOfStockCount(outOfStockCount)
                .previousPeriodStockValue(previousValue)
                .trendPercent(trendPercent)
                .build();
    }

    @Transactional(readOnly = true)
    public List<CategoryStockResponse> getStockByCategory() {
        List<Category> categories = categoryRepository.findAll();
        List<Product> allProducts = productRepository.findByIsActiveTrue();
        List<Long> activeProductIds = allProducts.stream().map(Product::getId).toList();

        var aggregates = productUnitRepository.aggregateInStockByProductIdIn(activeProductIds);

        Map<Long, CategoryStats> catAgg = new HashMap<>();
        for (var row : aggregates) {
            Long catId = row[4] != null ? ((Number) row[4]).longValue() : 0L;
            long qty = ((Number) row[1]).longValue();
            int minStock = row[2] != null ? ((Number) row[2]).intValue() : 0;
            BigDecimal sellPrice = row[3] != null ? BigDecimal.valueOf(((Number) row[3]).doubleValue()) : BigDecimal.ZERO;

            var agg = catAgg.computeIfAbsent(catId, k -> new CategoryStats());
            agg.productCount++;
            agg.totalUnits += qty;
            agg.totalStockValue = agg.totalStockValue.add(sellPrice.multiply(BigDecimal.valueOf(qty)));

            if (qty == 0) {
                agg.outOfStockCount++;
            } else if (qty <= minStock) {
                agg.lowStockCount++;
            } else {
                agg.healthyCount++;
            }
        }

        Map<Long, String> categoryNames = new HashMap<>();
        categories.forEach(c -> categoryNames.put(c.getId(), c.getName()));

        return categoryNames.entrySet().stream()
                .map(entry -> {
                    Long catId = entry.getKey();
                    var agg = catAgg.getOrDefault(catId, new CategoryStats());
                    return CategoryStockResponse.builder()
                            .categoryId(catId)
                            .categoryName(entry.getValue())
                            .productCount(agg.productCount)
                            .totalUnits(agg.totalUnits)
                            .totalStockValue(agg.totalStockValue)
                            .healthyCount(agg.healthyCount)
                            .lowStockCount(agg.lowStockCount)
                            .outOfStockCount(agg.outOfStockCount)
                            .build();
                })
                .sorted(Comparator.comparing(CategoryStockResponse::categoryName))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<StockValueResponse> getStockValue() {
        var aggregates = productUnitRepository.aggregateInStockByProduct();
        var productIds = aggregates.stream().map(row -> (Long) row[0]).toList();
        var products = productRepository.findAllById(productIds);

        return products.stream().map(product -> {
            long qty = aggregates.stream()
                    .filter(row -> row[0].equals(product.getId()))
                    .mapToLong(row -> ((Number) row[1]).longValue())
                    .findFirst().orElse(0L);

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

    @Transactional(readOnly = true)
    public List<ActivityResponse> getActivity(Instant from, Instant to) {
        List<ImportReceipt> imports = importReceiptRepository.findByCreatedAtBetween(from, to);
        List<ExportReceipt> exports = exportReceiptRepository.findByCreatedAtBetween(from, to);

        var allSupplierIds = imports.stream().map(ImportReceipt::getSupplierId).distinct().toList();
        var allCustomerIds = exports.stream().map(ExportReceipt::getCustomerId).filter(java.util.Objects::nonNull).distinct().toList();
        var supplierNames = supplierRepository.findAllById(allSupplierIds).stream()
                .collect(Collectors.toMap(Supplier::getId, Supplier::getName));
        var customerNames = customerRepository.findAllById(allCustomerIds).stream()
                .collect(Collectors.toMap(Customer::getId, Customer::getName));

        List<ActivityResponse> result = new ArrayList<>();

        for (ImportReceipt receipt : imports) {
            String name = supplierNames.getOrDefault(receipt.getSupplierId(), "Unknown");
            List<ImportReceiptItem> items = importReceiptItemRepository.findByReceiptId(receipt.getId());

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
            String name = receipt.getCustomerId() != null
                    ? customerNames.getOrDefault(receipt.getCustomerId(), "Unknown")
                    : "Unknown";

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

    static class CategoryStats {
        long productCount;
        long totalUnits;
        BigDecimal totalStockValue = BigDecimal.ZERO;
        long healthyCount;
        long lowStockCount;
        long outOfStockCount;
    }

    @Transactional(readOnly = true)
    public ResponsePage<DeadStockResponse> getDeadStock(int daysThreshold, String keyword, Long categoryId, Instant fromDate, Instant toDate, Pageable pageable) {
        Instant cutoffDate = daysThreshold > 0 ? Instant.now().minus(Duration.ofDays(daysThreshold)) : null;
        Page<ProductUnit> deadUnitPage = productUnitRepository.findDeadStockFiltered(cutoffDate, keyword, categoryId, fromDate, toDate, pageable);

        Map<Long, Product> productCache = new HashMap<>();
        Map<Long, ImportReceiptItem> itemCache = new HashMap<>();

        return ResponsePage.of(deadUnitPage.map(unit -> {
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
        }));
    }

    @Transactional(readOnly = true)
    public ResponsePage<LowStockResponse> getLowStock(Pageable pageable) {
        Page<Product> productPage = productRepository.findByIsActiveTrue(pageable);
        List<Long> productIds = productPage.getContent().stream().map(Product::getId).toList();

        Map<Long, List<ProductUnit>> unitsByProduct = productUnitRepository
                .findByProductIdInAndStatus(productIds, ProductUnitStatus.IN_STOCK)
                .stream()
                .collect(Collectors.groupingBy(ProductUnit::getProductId));

        return ResponsePage.of(productPage.map(product -> {
            List<ProductUnit> units = unitsByProduct.getOrDefault(product.getId(), List.of());

            int qty;
            if (TrackingType.BULK.name().equals(product.getTrackingType())) {
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

    @Transactional(readOnly = true)
    public StockCheckOverviewResponse getStockCheckOverview(Instant from, Instant to) {
        var checks = stockCheckRepository.findByStatusAndCreatedAtBetween(StockCheckStatus.COMPLETED, from, to);
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM").withZone(ZoneId.systemDefault());

        var checksPerMonth = checks.stream()
                .collect(Collectors.groupingBy(sc -> fmt.format(sc.getCreatedAt()), TreeMap::new, Collectors.counting()))
                .entrySet().stream()
                .map(e -> StockCheckOverviewResponse.StockCheckMonthCount.builder()
                        .month(e.getKey()).count(e.getValue()).build())
                .toList();

        var adjustments = stockAdjustmentRepository.findBySourceTypeAndCreatedAtBetween(
                AdjustmentSourceType.STOCK_CHECK.name(), from, to);
        Map<String, long[]> buckets = new TreeMap<>();
        for (var adj : adjustments) {
            long[] bucket = buckets.computeIfAbsent(fmt.format(adj.getCreatedAt()), k -> new long[3]);
            switch (adj.getType()) {
                case "LOST" -> bucket[0]++;
                case "FOUND" -> bucket[1]++;
                case "DAMAGED" -> bucket[2]++;
                default -> { }
            }
        }
        var adjustmentsPerMonth = buckets.entrySet().stream()
                .map(e -> StockCheckOverviewResponse.AdjustmentMonthCount.builder()
                        .month(e.getKey()).lost(e.getValue()[0]).found(e.getValue()[1]).damaged(e.getValue()[2]).build())
                .toList();

        var recent = checks.stream()
                .sorted(Comparator.comparing(StockCheck::getCreatedAt).reversed())
                .limit(10)
                .toList();
        var itemsByCheck = stockCheckItemRepository.findByStockCheckIdIn(recent.stream().map(StockCheck::getId).toList())
                .stream()
                .collect(Collectors.groupingBy(StockCheckItem::getStockCheckId));
        var recentDiscrepancies = recent.stream()
                .map(sc -> {
                    var items = itemsByCheck.getOrDefault(sc.getId(), List.of());
                    long missing = items.stream()
                            .filter(i -> DifferenceType.MISSING.name().equals(i.getDifference())).count();
                    long unexpected = items.stream()
                            .filter(i -> DifferenceType.UNEXPECTED.name().equals(i.getDifference())).count();
                    return StockCheckOverviewResponse.StockCheckDiscrepancy.builder()
                            .id(sc.getId())
                            .checkCode(sc.getCheckCode())
                            .createdAt(sc.getCreatedAt())
                            .missingCount(missing)
                            .unexpectedCount(unexpected)
                            .build();
                })
                .toList();

        return StockCheckOverviewResponse.builder()
                .checksPerMonth(checksPerMonth)
                .adjustmentsPerMonth(adjustmentsPerMonth)
                .recentDiscrepancies(recentDiscrepancies)
                .build();
    }
}
