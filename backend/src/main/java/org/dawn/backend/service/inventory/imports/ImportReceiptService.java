package org.dawn.backend.service.inventory.imports;
import org.dawn.backend.constant.shared.ErrorCode;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.dawn.backend.aspect.AuditLog;
import org.dawn.backend.config.web.response.ResponsePage;
import org.dawn.backend.constant.enums.catalog.UnitOfMeasure;
import org.dawn.backend.constant.enums.inventory.imports.ImportReceiptStatus;
import org.dawn.backend.constant.enums.inventory.ProductUnitStatus;
import org.dawn.backend.constant.shared.LogConstant;
import org.dawn.backend.controller.inventory.request.ImportReceiptRequest;
import org.dawn.backend.controller.inventory.response.BoxableImportResponse;
import org.dawn.backend.controller.inventory.response.ImportReceiptResponse;
import org.dawn.backend.controller.inventory.response.ProductUnitResponse;
import org.dawn.backend.entity.auth.User;
import org.dawn.backend.entity.catalog.Product;
import org.dawn.backend.entity.catalog.Supplier;
import org.dawn.backend.entity.inventory.ImportReceipt;
import org.dawn.backend.entity.inventory.ImportReceiptItem;
import org.dawn.backend.entity.inventory.Location;
import org.dawn.backend.entity.inventory.ProductUnit;
import org.dawn.backend.entity.inventory.PurchaseOrder;
import org.dawn.backend.exception.type.InvalidRequestException;
import org.dawn.backend.exception.type.ResourceAlreadyExistedException;
import org.dawn.backend.exception.type.ResourceNotFoundException;
import org.dawn.backend.repository.auth.UserRepository;
import org.dawn.backend.repository.catalog.ProductRepository;
import org.dawn.backend.repository.catalog.SupplierRepository;
import org.dawn.backend.repository.inventory.imports.ImportReceiptItemRepository;
import org.dawn.backend.repository.inventory.imports.ImportReceiptRepository;
import org.dawn.backend.repository.inventory.LocationRepository;
import org.dawn.backend.repository.inventory.ProductUnitRepository;
import org.dawn.backend.repository.inventory.PurchaseOrderRepository;
import org.dawn.backend.service.inventory.ProductUnitMappingHelper;
import org.dawn.backend.shared.util.ReceiptCodeGenerator;
import org.dawn.backend.config.security.SecurityPolicy;

@Service
@RequiredArgsConstructor
@Slf4j
public class ImportReceiptService {

    private final ImportReceiptRepository importReceiptRepository;
    private final ImportReceiptItemRepository importReceiptItemRepository;
    private final ProductUnitRepository productUnitRepository;
    private final ProductRepository productRepository;
    private final LocationRepository locationRepository;
    private final SupplierRepository supplierRepository;
    private final UserRepository userRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final SecurityPolicy securityPolicy;

    private static final List<String> BULK_UNITS = List.of(
            UnitOfMeasure.METER.name(),
            UnitOfMeasure.KG.name());
    private static final List<String> SERIALIZED_UNITS = List.of(
            UnitOfMeasure.PIECE.name(),
            UnitOfMeasure.BOX.name(),
            UnitOfMeasure.SET.name());

    public ResponsePage<ImportReceiptResponse> findAll(Pageable pageable, String status) {
        ImportReceiptStatus s = safeParseImportStatus(status);
        Page<ImportReceipt> page = s != null
                ? importReceiptRepository.findByStatus(s, pageable)
                : status != null && !status.isBlank()
                    ? Page.empty(pageable)
                    : importReceiptRepository.findAll(pageable);
        List<ImportReceipt> receipts = page.getContent();
        if (receipts.isEmpty()) {
            return ResponsePage.of(page.map(r -> ImportReceiptMappingHelper.map(r, null, null, null, null, List.of(), Map.of(), Map.of(), Map.of())));
        }
        List<Long> receiptIds = page.getContent().stream().map(ImportReceipt::getId).toList();
        Map<Long, List<ImportReceiptItem>> itemsByReceipt = importReceiptItemRepository
                .findByReceiptIdIn(receiptIds).stream()
                .collect(Collectors.groupingBy(ImportReceiptItem::getReceiptId));
        List<ImportReceiptItem> allItems = itemsByReceipt.values().stream()
                .flatMap(List::stream).toList();
        var products = fetchProducts(allItems);
        var unitCounts = getUnitCounts(allItems);
        var unitIds = getUnitIds(allItems);
        var enrichmentMap = fetchEnrichmentDataFor(receipts);
        return ResponsePage.of(page.map(r -> {
            var items = itemsByReceipt.getOrDefault(r.getId(), List.of());
            var enrichment = enrichmentMap.get(r.getId());
            return ImportReceiptMappingHelper.map(r,
                    enrichment.supplierName(), enrichment.createdByName(), enrichment.approvedByName(), enrichment.poCode(),
                    items, products, unitCounts, unitIds);
        }));
    }

    public ImportReceiptResponse findOne(Long id) {
        var receipt = importReceiptRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.IMPORT_RECEIPT_NOT_FOUND));
        var items = importReceiptItemRepository.findByReceiptId(receipt.getId());
        var products = fetchProducts(items);
        var unitCounts = getUnitCounts(items);
        var unitIds = getUnitIds(items);
        var enrichment = fetchEnrichmentData(receipt);
        return ImportReceiptMappingHelper.map(receipt, enrichment.supplierName(), enrichment.createdByName(), enrichment.approvedByName(), enrichment.poCode(), items, products, unitCounts, unitIds);
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.CREATE_IMPORT, entity = LogConstant.Entity.IMPORT_RECEIPT)
    public ImportReceiptResponse create(ImportReceiptRequest request) {
        Long userId = securityPolicy.requireAuthenticated();
        if (request.supplierId() == null) throw new InvalidRequestException(ErrorCode.SUPPLIER_REQUIRED);
        if (request.purchaseOrderId() == null) throw new InvalidRequestException(ErrorCode.PO_REQUIRED);
        var po = purchaseOrderRepository.findById(request.purchaseOrderId())
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.PO_NOT_FOUND));
        if (po.getSupplierId() != null && !po.getSupplierId().equals(request.supplierId())) {
            throw new InvalidRequestException(ErrorCode.PO_SUPPLIER_MISMATCH);
        }
        if (importReceiptRepository.existsByPurchaseOrderIdAndStatusNot(request.purchaseOrderId(), ImportReceiptStatus.CANCELLED)) {
            throw new InvalidRequestException(ErrorCode.PO_ALREADY_IMPORTED);
        }

        String receiptCode = request.receiptCode() != null ? request.receiptCode() : generateReceiptCode();
        if (importReceiptRepository.existsByReceiptCode(receiptCode)) {
            throw new ResourceAlreadyExistedException(ErrorCode.RECEIPT_CODE_EXISTS);
        }

        ImportReceipt receipt = ImportReceipt.builder()
                .receiptCode(receiptCode)
                .supplierId(request.supplierId())
                .purchaseOrderId(request.purchaseOrderId())
                .status(ImportReceiptStatus.DRAFT)
                .note(request.note())
                .createdBy(userId)
                .build();
        receipt = importReceiptRepository.save(receipt);
        Long receiptId = receipt.getId();

        BigDecimal totalAmount = BigDecimal.ZERO;
        List<ImportReceiptItem> savedItems = new ArrayList<>();
        if (request.items() != null) {
            for (ImportReceiptRequest.ImportItemRequest itemReq : request.items()) {
                productRepository.findById(itemReq.productId())
                        .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.PRODUCT_NOT_FOUND));
                if (itemReq.quantity() == null || itemReq.quantity().compareTo(BigDecimal.ZERO) <= 0) {
                    throw new InvalidRequestException(ErrorCode.INVALID_QUANTITY.format( itemReq.quantity()));
                }

                ImportReceiptItem item = ImportReceiptItem.builder()
                        .receiptId(receiptId)
                        .productId(itemReq.productId())
                        .quantity(itemReq.quantity())
                        .unitPrice(itemReq.unitPrice())
                        .warrantyMonths(itemReq.warrantyMonths())
                        .build();
                item = importReceiptItemRepository.save(item);
                savedItems.add(item);

                BigDecimal lineTotal = itemReq.unitPrice() != null
                        ? itemReq.unitPrice().multiply(itemReq.quantity())
                        : BigDecimal.ZERO;
                totalAmount = totalAmount.add(lineTotal);
            }
        }

        receipt.setTotalAmount(totalAmount);
        receipt = importReceiptRepository.save(receipt);

        var products = fetchProducts(savedItems);
        var unitCounts = getUnitCounts(savedItems);
        var unitIds = getUnitIds(savedItems);
        var enrichment = fetchEnrichmentData(receipt);
        return ImportReceiptMappingHelper.map(receipt, enrichment.supplierName(), enrichment.createdByName(), enrichment.approvedByName(), enrichment.poCode(), savedItems, products, unitCounts, unitIds);
    }

    public List<ProductUnitResponse> getUnitsByReceipt(Long receiptId) {
        var items = importReceiptItemRepository.findByReceiptId(receiptId);
        var unitIds = items.stream().map(ImportReceiptItem::getId).toList();
        var allUnits = productUnitRepository.findByImportReceiptItemIdIn(unitIds);
        var productIds = allUnits.stream().map(ProductUnit::getProductId).distinct().toList();
        var products = productRepository.findAllById(productIds).stream()
                .collect(Collectors.toMap(Product::getId, p -> p));
        var locationIds = allUnits.stream().map(ProductUnit::getLocationId).filter(java.util.Objects::nonNull).distinct().toList();
        var locations = locationRepository.findAllById(locationIds).stream()
                .collect(Collectors.toMap(Location::getId, l -> l));

        List<ProductUnitResponse> result = new ArrayList<>();
        for (var unit : allUnits) {
            Product p = products.get(unit.getProductId());
            Location loc = unit.getLocationId() != null ? locations.get(unit.getLocationId()) : null;
            result.add(ProductUnitMappingHelper.map(unit,
                    p != null ? p.getName() : null,
                    p != null ? p.getSku() : null,
                    loc != null ? loc.getFullCode() : null));
        }
        return result;
    }

    public ImportReceiptResponse toResponse(ImportReceipt receipt) {
        var items = importReceiptItemRepository.findByReceiptId(receipt.getId());
        var products = fetchProducts(items);
        var unitCounts = getUnitCounts(items);
        var unitIds = getUnitIds(items);
        var enrichment = fetchEnrichmentData(receipt);
        return ImportReceiptMappingHelper.map(receipt, enrichment.supplierName(), enrichment.createdByName(), enrichment.approvedByName(), enrichment.poCode(), items, products, unitCounts, unitIds);
    }

    public List<BoxableImportResponse> getBoxableImports() {
        var countsByItem = productUnitRepository.countBoxableByImportReceiptItem();
        if (countsByItem.isEmpty()) return List.of();
        var itemIds = countsByItem.stream().map(row -> (Long) row[0]).toList();
        var itemsById = importReceiptItemRepository.findAllById(itemIds).stream()
                .collect(Collectors.toMap(ImportReceiptItem::getId, it -> it));
        Map<Long, Long> countsByReceipt = new HashMap<>();
        for (var row : countsByItem) {
            var item = itemsById.get((Long) row[0]);
            if (item != null) countsByReceipt.merge(item.getReceiptId(), (Long) row[1], Long::sum);
        }
        if (countsByReceipt.isEmpty()) return List.of();
        var receipts = importReceiptRepository.findAllById(countsByReceipt.keySet());
        Map<Long, String> supplierNames = receipts.isEmpty() ? Map.of() : supplierRepository.findAllById(
                        receipts.stream().map(ImportReceipt::getSupplierId).filter(java.util.Objects::nonNull).distinct().toList())
                .stream().collect(Collectors.toMap(Supplier::getId, Supplier::getName));
        return receipts.stream()
                .sorted((a, b) -> {
                    Instant aAt = a.getCreatedAt();
                    Instant bAt = b.getCreatedAt();
                    if (aAt == null) return 1;
                    if (bAt == null) return -1;
                    return bAt.compareTo(aAt);
                })
                .map(r -> BoxableImportResponse.builder()
                        .receiptId(r.getId())
                        .receiptCode(r.getReceiptCode())
                        .supplierName(supplierNames.getOrDefault(r.getSupplierId(), null))
                        .importedAt(r.getCreatedAt())
                        .boxableUnits(countsByReceipt.getOrDefault(r.getId(), 0L))
                        .build())
                .toList();
    }

    private String generateReceiptCode() {
        return ReceiptCodeGenerator.generate("IMP-", importReceiptRepository::existsByReceiptCode);
    }

    private Map<Long, Integer> getUnitCounts(List<ImportReceiptItem> items) {
        if (items.isEmpty()) return Map.of();
        var itemIds = items.stream().map(ImportReceiptItem::getId).toList();
        var counts = productUnitRepository.countByImportReceiptItemIdIn(itemIds);
        return counts.stream().collect(Collectors.toMap(
                row -> (Long) row[0],
                row -> ((Long) row[1]).intValue()
        ));
    }

    private Map<Long, List<Long>> getUnitIds(List<ImportReceiptItem> items) {
        if (items.isEmpty()) return Map.of();
        var itemIds = items.stream().map(ImportReceiptItem::getId).toList();
        var units = productUnitRepository.findByImportReceiptItemIdIn(itemIds);
        return units.stream().collect(Collectors.groupingBy(
                ProductUnit::getImportReceiptItemId,
                Collectors.mapping(ProductUnit::getId, Collectors.toList())
        ));
    }

    private Map<Long, Product> fetchProducts(List<ImportReceiptItem> items) {
        var productIds = items.stream().map(ImportReceiptItem::getProductId).toList();
        return productRepository.findAllById(productIds).stream()
                .collect(Collectors.toMap(Product::getId, p -> p));
    }

    private record ReceiptEnrichment(String supplierName, String createdByName, String approvedByName, String poCode) {}

    private Map<Long, ReceiptEnrichment> fetchEnrichmentDataFor(List<ImportReceipt> receipts) {
        List<Long> supplierIds = receipts.stream()
                .map(ImportReceipt::getSupplierId).filter(java.util.Objects::nonNull).distinct().toList();
        List<Long> userIds = receipts.stream()
                .flatMap(r -> r.getApprovedBy() != null
                        ? java.util.stream.Stream.of(r.getCreatedBy(), r.getApprovedBy())
                        : java.util.stream.Stream.of(r.getCreatedBy()))
                .distinct().toList();
        List<Long> poIds = receipts.stream()
                .map(ImportReceipt::getPurchaseOrderId)
                .filter(java.util.Objects::nonNull).distinct().toList();

        Map<Long, String> supplierNames = supplierIds.isEmpty() ? Map.of() : supplierRepository.findAllById(supplierIds).stream()
                .collect(Collectors.toMap(Supplier::getId, Supplier::getName));
        Map<Long, String> userNames = userIds.isEmpty() ? Map.of() : userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, User::getFullName));
        Map<Long, String> poCodes = poIds.isEmpty() ? Map.of() : purchaseOrderRepository.findAllById(poIds).stream()
                .collect(Collectors.toMap(PurchaseOrder::getId, PurchaseOrder::getPoCode));

        return receipts.stream().collect(Collectors.toMap(
                ImportReceipt::getId,
                r -> new ReceiptEnrichment(
                        supplierNames.get(r.getSupplierId()),
                        userNames.get(r.getCreatedBy()),
                        r.getApprovedBy() != null ? userNames.get(r.getApprovedBy()) : null,
                        r.getPurchaseOrderId() != null ? poCodes.get(r.getPurchaseOrderId()) : null)) );
    }

    private ReceiptEnrichment fetchEnrichmentData(ImportReceipt receipt) {
        return fetchEnrichmentDataFor(List.of(receipt)).get(receipt.getId());
    }

    private ImportReceiptStatus safeParseImportStatus(String value) {
        if (value == null || value.isBlank()) return null;
        try { return ImportReceiptStatus.valueOf(value.toUpperCase()); }
        catch (IllegalArgumentException e) { return null; }
    }
}
