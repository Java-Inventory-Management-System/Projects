package org.dawn.backend.service.inventory.imports;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.dawn.backend.shared.statemachine.StateMachine;
import org.dawn.backend.aspect.AuditLog;
import org.dawn.backend.config.web.response.ResponsePage;
import org.dawn.backend.constant.enums.catalog.TrackingType;
import org.dawn.backend.constant.enums.inventory.imports.ImportReceiptStatus;
import org.dawn.backend.constant.enums.inventory.ProductUnitStatus;
import org.dawn.backend.constant.enums.inventory.PurchaseOrderStatus;
import org.dawn.backend.constant.enums.inventory.SourceType;
import org.dawn.backend.constant.shared.LogConstant;
import org.dawn.backend.constant.shared.Message;
import org.dawn.backend.controller.inventory.request.ConfirmImportRequest;
import org.dawn.backend.controller.inventory.request.ImportReceiptRequest;
import org.dawn.backend.controller.inventory.request.ImportReceiptRequest.ImportItemRequest;
import org.dawn.backend.controller.inventory.response.ImportReceiptResponse;
import org.dawn.backend.controller.inventory.response.ProductUnitResponse;
import org.dawn.backend.entity.auth.User;
import org.dawn.backend.entity.catalog.Product;
import org.dawn.backend.entity.catalog.Supplier;
import org.dawn.backend.entity.inventory.ImportReceipt;
import org.dawn.backend.entity.inventory.ImportReceiptItem;
import org.dawn.backend.entity.inventory.Location;
import org.dawn.backend.entity.inventory.ProductUnit;
import org.dawn.backend.entity.inventory.ProductUnitStatusLog;
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
import org.dawn.backend.repository.inventory.ProductUnitStatusLogRepository;
import org.dawn.backend.repository.inventory.PurchaseOrderItemRepository;
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
    private final ProductUnitStatusLogRepository statusLogRepository;
    private final ProductRepository productRepository;
    private final LocationRepository locationRepository;
    private final SupplierRepository supplierRepository;
    private final UserRepository userRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final PurchaseOrderItemRepository purchaseOrderItemRepository;
    private final StateMachine<ImportReceiptStatus> importReceiptStateMachine;
    private final SecurityPolicy securityPolicy;

    private static final List<String> BULK_UNITS = List.of(
            org.dawn.backend.constant.enums.catalog.ProductUnit.METER.name(),
            org.dawn.backend.constant.enums.catalog.ProductUnit.KG.name());
    private static final List<String> SERIALIZED_UNITS = List.of(
            org.dawn.backend.constant.enums.catalog.ProductUnit.PIECE.name(),
            org.dawn.backend.constant.enums.catalog.ProductUnit.BOX.name(),
            org.dawn.backend.constant.enums.catalog.ProductUnit.SET.name());

    public ResponsePage<ImportReceiptResponse> findAll(Pageable pageable, String status) {
        ImportReceiptStatus s = safeParseImportStatus(status);
        Page<ImportReceipt> page = s != null
                ? importReceiptRepository.findByStatus(s, pageable)
                : status != null && !status.isBlank()
                    ? Page.empty(pageable)
                    : importReceiptRepository.findAll(pageable);
        return ResponsePage.of(page.map(r -> {
            var items = importReceiptItemRepository.findByReceiptId(r.getId());
            var products = fetchProducts(items);
            var unitCounts = getUnitCounts(items);
            var unitIds = getUnitIds(items);
            var enrichment = fetchEnrichmentData(r);
            return ImportReceiptMappingHelper.map(r, enrichment.supplierName(), enrichment.createdByName(), enrichment.approvedByName(), enrichment.poCode(), items, products, unitCounts, unitIds);
        }));
    }

    public ImportReceiptResponse findOne(Long id) {
        var receipt = importReceiptRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.IMPORT_RECEIPT_NOT_FOUND));
        var items = importReceiptItemRepository.findByReceiptId(receipt.getId());
        var products = fetchProducts(items);
        var unitCounts = getUnitCounts(items);
        var unitIds = getUnitIds(items);
        var enrichment = fetchEnrichmentData(receipt);
        return ImportReceiptMappingHelper.map(receipt, enrichment.supplierName(), enrichment.createdByName(), enrichment.approvedByName(), enrichment.poCode(), items, products, unitCounts, unitIds);
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.CONFIRM_IMPORT, entity = LogConstant.Entity.IMPORT_RECEIPT)
    public ImportReceiptResponse createAndConfirm(ImportReceiptRequest request) {
        Long userId = securityPolicy.requireAuthenticated();

        if (request.items() == null || request.items().isEmpty()) {
            throw new InvalidRequestException(Message.Inventory.AT_LEAST_ONE_ITEM_REQUIRED);
        }
        if (request.supplierId() == null) {
            throw new InvalidRequestException(Message.Inventory.SUPPLIER_REQUIRED);
        }

        String receiptCode = request.receiptCode() != null ? request.receiptCode() : generateReceiptCode();
        if (importReceiptRepository.existsByReceiptCode(receiptCode)) {
            throw new ResourceAlreadyExistedException(Message.Inventory.RECEIPT_CODE_EXISTS);
        }

        ImportReceipt receipt = ImportReceipt.builder()
                .receiptCode(receiptCode)
                .supplierId(request.supplierId())
                .purchaseOrderId(request.purchaseOrderId())
                .status(ImportReceiptStatus.PENDING_APPROVAL)
                .note(request.note())
                .createdBy(userId)
                .build();
        receipt = importReceiptRepository.save(receipt);
        Long receiptId = receipt.getId();

        BigDecimal totalAmount = BigDecimal.ZERO;
        List<ImportReceiptItem> savedItems = new ArrayList<>();

        for (ImportItemRequest itemReq : request.items()) {
            Product product = productRepository.findById(itemReq.productId())
                    .orElseThrow(() -> new ResourceNotFoundException(Message.Catalog.PRODUCT_NOT_FOUND));

            String unit = product.getUnit();
            String trackingType = product.getTrackingType();
            boolean isBulk = BULK_UNITS.contains(unit);
            BigDecimal qty = itemReq.quantity();

            ImportReceiptItem item = ImportReceiptItem.builder()
                    .receiptId(receiptId)
                    .productId(itemReq.productId())
                    .quantity(qty)
                    .unitPrice(itemReq.unitPrice())
                    .warrantyMonths(itemReq.warrantyMonths())
                    .build();
            item = importReceiptItemRepository.save(item);
            savedItems.add(item);

            if (isBulk) {
                ProductUnit pu = ProductUnit.builder()
                        .serialNumber(null)
                        .productId(itemReq.productId())
                        .trackingType(trackingType)
                        .initialQuantity(qty)
                        .remainingQuantity(qty)
                        .importReceiptItemId(item.getId())
                        .locationId(itemReq.locationId())
                        .status(ProductUnitStatus.IN_STOCK)
                        .importedAt(Instant.now())
                        .warrantyMonths(itemReq.warrantyMonths())
                        .build();
                productUnitRepository.save(pu);
            } else {
                List<String> serials = itemReq.serialNumbers();
                if (serials == null || serials.isEmpty()) {
                    throw new InvalidRequestException(Message.Inventory.SERIAL_REQUIRED_FOR_SERIALIZED);
                }
                if (serials.size() != qty.intValue()) {
                    throw new InvalidRequestException(Message.Inventory.SERIAL_COUNT_MUST_MATCH);
                }

                var trimmedSerials = serials.stream()
                        .map(String::trim)
                        .peek(s -> {
                            if (s.isBlank()) throw new InvalidRequestException(Message.Inventory.SERIAL_BLANK);
                        })
                        .toList();

                var existing = productUnitRepository.findExistingSerialNumbers(trimmedSerials);
                if (!existing.isEmpty()) {
                    throw new ResourceAlreadyExistedException(
                            Message.format(Message.Inventory.SERIAL_ALREADY_EXISTS_LIST, String.join(", ", existing))
                    );
                }

                var now = Instant.now();
                final var prodId = itemReq.productId();
                final var locId = itemReq.locationId();
                final var wm = itemReq.warrantyMonths();
                final var itemId = item.getId();
                var batch = trimmedSerials.stream()
                        .map(s -> ProductUnit.builder()
                                .serialNumber(s)
                                .productId(prodId)
                                .trackingType(trackingType)
                                .initialQuantity(null)
                                .remainingQuantity(null)
                                .importReceiptItemId(itemId)
                                .locationId(locId)
                                .status(ProductUnitStatus.IN_STOCK)
                                .importedAt(now)
                                .warrantyMonths(wm)
                                .build())
                        .toList();
                productUnitRepository.saveAll(batch);
            }

            BigDecimal lineTotal = itemReq.unitPrice() != null
                    ? itemReq.unitPrice().multiply(qty)
                    : BigDecimal.ZERO;
            totalAmount = totalAmount.add(lineTotal);
        }

        receipt.setTotalAmount(totalAmount);
        receipt = importReceiptRepository.save(receipt);

        var products = fetchProducts(savedItems);
        var unitCounts = getUnitCounts(savedItems);
        var unitIds = getUnitIds(savedItems);
        var enrichment = fetchEnrichmentData(receipt);
        return ImportReceiptMappingHelper.map(receipt, enrichment.supplierName(), enrichment.createdByName(), enrichment.approvedByName(), enrichment.poCode(), savedItems, products, unitCounts, unitIds);
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.CREATE_IMPORT, entity = LogConstant.Entity.IMPORT_RECEIPT)
    public ImportReceiptResponse create(ImportReceiptRequest request) {
        Long userId = securityPolicy.requireAuthenticated();
        if (request.supplierId() == null) throw new InvalidRequestException(Message.Inventory.SUPPLIER_REQUIRED);

        String receiptCode = request.receiptCode() != null ? request.receiptCode() : generateReceiptCode();
        if (importReceiptRepository.existsByReceiptCode(receiptCode)) {
            throw new ResourceAlreadyExistedException(Message.Inventory.RECEIPT_CODE_EXISTS);
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
            for (ImportItemRequest itemReq : request.items()) {
                productRepository.findById(itemReq.productId())
                        .orElseThrow(() -> new ResourceNotFoundException(Message.Catalog.PRODUCT_NOT_FOUND));

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

    @Transactional
    @AuditLog(action = LogConstant.Action.CONFIRM_IMPORT, entity = LogConstant.Entity.IMPORT_RECEIPT)
    public ImportReceiptResponse confirm(Long id, ConfirmImportRequest request) {
        Long userId = securityPolicy.requireAuthenticated();

        ImportReceipt receipt = importReceiptRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.IMPORT_RECEIPT_NOT_FOUND));
        importReceiptStateMachine.validate(receipt.getStatus(), ImportReceiptStatus.PENDING_APPROVAL);

        var items = importReceiptItemRepository.findByReceiptId(id);
        var productMap = items.stream().collect(Collectors.toMap(
                ImportReceiptItem::getProductId, item -> productRepository.findById(item.getProductId()).orElse(null)));

        BigDecimal totalAmount = receipt.getTotalAmount() != null ? receipt.getTotalAmount() : BigDecimal.ZERO;

        for (var serial : request.serials()) {
            ImportReceiptItem item = importReceiptItemRepository.findById(serial.itemId())
                    .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.IMPORT_ITEM_NOT_FOUND));
            Product product = productMap.get(item.getProductId());
            String trackingType = product != null ? product.getTrackingType() : "SERIALIZED";

            var serials = serial.serialNumbers().stream().map(String::trim).peek(s -> {
                if (s.isBlank()) throw new InvalidRequestException(Message.Inventory.SERIAL_BLANK);
            }).toList();

            var existing = productUnitRepository.findExistingSerialNumbers(serials);
            if (!existing.isEmpty()) {
                throw new ResourceAlreadyExistedException(
                        Message.format(Message.Inventory.SERIAL_ALREADY_EXISTS_LIST, String.join(", ", existing)));
            }

            var now = Instant.now();
            var batch = serials.stream().map(s -> ProductUnit.builder()
                    .serialNumber(s)
                    .productId(item.getProductId())
                    .trackingType(trackingType)
                    .initialQuantity(null)
                    .remainingQuantity(null)
                    .importReceiptItemId(item.getId())
                    .locationId(serial.locationId())
                    .status(ProductUnitStatus.IN_STOCK)
                    .importedAt(now)
                    .warrantyMonths(item.getWarrantyMonths())
                    .build()).toList();
            productUnitRepository.saveAll(batch);
        }

        receipt.setStatus(ImportReceiptStatus.PENDING_APPROVAL);
        receipt = importReceiptRepository.save(receipt);

        var savedItems = importReceiptItemRepository.findByReceiptId(id);
        var products = fetchProducts(savedItems);
        var unitCounts = getUnitCounts(savedItems);
        var unitIds = getUnitIds(savedItems);
        var enrichment = fetchEnrichmentData(receipt);
        return ImportReceiptMappingHelper.map(receipt, enrichment.supplierName(), enrichment.createdByName(), enrichment.approvedByName(), enrichment.poCode(), savedItems, products, unitCounts, unitIds);
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.APPROVE_IMPORT, entity = LogConstant.Entity.IMPORT_RECEIPT)
    public ImportReceiptResponse approve(Long id) {
        Long userId = securityPolicy.requireAuthenticated();
        ImportReceipt receipt = importReceiptRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.IMPORT_RECEIPT_NOT_FOUND));

        securityPolicy.requireNotCreator(receipt.getCreatedBy());
        importReceiptStateMachine.validate(receipt.getStatus(), ImportReceiptStatus.COMPLETED);

        receipt.setStatus(ImportReceiptStatus.COMPLETED);
        receipt.setApprovedBy(userId);
        receipt = importReceiptRepository.save(receipt);

        if (receipt.getPurchaseOrderId() != null) {
            updatePOProgress(receipt.getPurchaseOrderId());
        }

        return findOne(receipt.getId());
    }

    private void updatePOProgress(Long poId) {
        var po = purchaseOrderRepository.findById(poId).orElse(null);
        if (po == null) return;

        var items = purchaseOrderItemRepository.findByPoId(poId);
        var completedReceipts = importReceiptRepository.findByPurchaseOrderId(poId).stream()
                .filter(r -> ImportReceiptStatus.COMPLETED == r.getStatus())
                .toList();
        if (completedReceipts.isEmpty()) return;

        var receiptItemIds = completedReceipts.stream()
                .flatMap(r -> importReceiptItemRepository.findByReceiptId(r.getId()).stream())
                .toList();

        for (var poItem : items) {
            BigDecimal received = receiptItemIds.stream()
                    .filter(ri -> ri.getProductId().equals(poItem.getProductId()))
                    .map(ImportReceiptItem::getQuantity)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            poItem.setReceivedQuantity(received);
        }
        purchaseOrderItemRepository.saveAll(items);

        boolean anyReceived = items.stream()
                .anyMatch(i -> i.getReceivedQuantity().compareTo(BigDecimal.ZERO) > 0);
        boolean allFullyReceived = items.stream()
                .allMatch(i -> i.getReceivedQuantity().compareTo(i.getQuantity()) >= 0);

        if (allFullyReceived) {
            po.setStatus(PurchaseOrderStatus.COMPLETED);
        } else if (anyReceived) {
            po.setStatus(PurchaseOrderStatus.PARTIAL);
        }
        purchaseOrderRepository.save(po);
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.CANCEL_IMPORT, entity = LogConstant.Entity.IMPORT_RECEIPT)
    public ImportReceiptResponse cancel(Long id) {
        ImportReceipt receipt = importReceiptRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.IMPORT_RECEIPT_NOT_FOUND));

        importReceiptStateMachine.validate(receipt.getStatus(), ImportReceiptStatus.CANCELLED);

        var items = importReceiptItemRepository.findByReceiptId(id);
        for (var item : items) {
            var units = productUnitRepository.findByImportReceiptItemId(item.getId());
            for (var unit : units) {
                if (ProductUnitStatus.IN_STOCK != unit.getStatus()) {
                    throw new InvalidRequestException(Message.Inventory.IMPORT_CANNOT_CANCEL_UNITS_EXPORTED);
                }
                boolean isBulk = unit.getInitialQuantity() != null;
                if (isBulk && unit.getRemainingQuantity().compareTo(unit.getInitialQuantity()) != 0) {
                    throw new InvalidRequestException(Message.Inventory.IMPORT_CANNOT_CANCEL_UNITS_EXPORTED);
                }
            }
        }

        Long userId = securityPolicy.requireAuthenticated();
        for (var item : items) {
            var units = productUnitRepository.findByImportReceiptItemId(item.getId());
            for (var unit : units) {
                ProductUnitStatus oldStatus = unit.getStatus();
                unit.setStatus(ProductUnitStatus.REMOVED);
                productUnitRepository.save(unit);
                statusLogRepository.save(ProductUnitStatusLog.builder()
                        .productUnitId(unit.getId())
                        .fromStatus(oldStatus.name())
                        .toStatus(ProductUnitStatus.REMOVED.name())
                        .sourceType(SourceType.IMPORT_RECEIPT.name())
                        .sourceId(id)
                        .changedBy(userId)
                        .build());
            }
        }

        receipt.setStatus(ImportReceiptStatus.CANCELLED);
        receipt = importReceiptRepository.save(receipt);
        return findOne(receipt.getId());
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

    private ReceiptEnrichment fetchEnrichmentData(ImportReceipt receipt) {
        var supplierName = supplierRepository.findById(receipt.getSupplierId())
                .map(Supplier::getName).orElse(null);
        var createdByName = userRepository.findById(receipt.getCreatedBy())
                .map(User::getFullName).orElse(null);
        var approvedByName = receipt.getApprovedBy() != null
                ? userRepository.findById(receipt.getApprovedBy()).map(User::getFullName).orElse(null)
                : null;
        var poCode = receipt.getPurchaseOrderId() != null
                ? purchaseOrderRepository.findById(receipt.getPurchaseOrderId())
                    .map(PurchaseOrder::getPoCode).orElse(null)
                : null;
        return new ReceiptEnrichment(supplierName, createdByName, approvedByName, poCode);
    }

    private ImportReceiptStatus safeParseImportStatus(String value) {
        if (value == null || value.isBlank()) return null;
        try { return ImportReceiptStatus.valueOf(value.toUpperCase()); }
        catch (IllegalArgumentException e) { return null; }
    }
}
