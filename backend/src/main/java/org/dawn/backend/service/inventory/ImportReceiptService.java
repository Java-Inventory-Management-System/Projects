package org.dawn.backend.service.inventory;

import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dawn.backend.config.anno.AuditLog;
import org.dawn.backend.config.web.response.ResponsePage;
import org.dawn.backend.constant.inventory.ImportReceiptStatus;
import org.dawn.backend.constant.inventory.ProductUnitStatus;
import org.dawn.backend.constant.inventory.SourceType;
import org.dawn.backend.constant.shared.LogConstant;
import org.dawn.backend.constant.shared.Message;
import org.dawn.backend.controller.inventory.request.ConfirmImportRequest;
import org.dawn.backend.controller.inventory.request.ImportReceiptRequest;
import org.dawn.backend.controller.inventory.request.ImportReceiptRequest.ImportItemRequest;
import org.dawn.backend.controller.inventory.response.ImportReceiptResponse;
import org.dawn.backend.controller.inventory.response.ProductUnitResponse;
import org.dawn.backend.entity.catalog.Product;
import org.dawn.backend.entity.inventory.ImportReceipt;
import org.dawn.backend.entity.inventory.ImportReceiptItem;
import org.dawn.backend.entity.inventory.Location;
import org.dawn.backend.entity.inventory.ProductUnit;
import org.dawn.backend.entity.inventory.ProductUnitStatusLog;
import org.dawn.backend.exception.wrapper.InvalidRequestException;
import org.dawn.backend.exception.wrapper.ResourceAlreadyExistedException;
import org.dawn.backend.exception.wrapper.ResourceNotFoundException;
import org.dawn.backend.repository.catalog.ProductRepository;
import org.dawn.backend.repository.inventory.ImportReceiptItemRepository;
import org.dawn.backend.repository.inventory.ImportReceiptRepository;
import org.dawn.backend.repository.inventory.LocationRepository;
import org.dawn.backend.repository.inventory.ProductUnitRepository;
import org.dawn.backend.repository.inventory.ProductUnitStatusLogRepository;
import org.dawn.backend.utils.SecurityUtils;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

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
    private final EntityManager entityManager;

    private static final List<String> BULK_UNITS = List.of("METER", "KG");
    private static final List<String> SERIALIZED_UNITS = List.of("PIECE", "BOX", "SET");

    public ResponsePage<ImportReceiptResponse> findAll(Pageable pageable) {
        var page = importReceiptRepository.findAll(pageable);
        return ResponsePage.of(page.map(r -> {
            var items = importReceiptItemRepository.findByReceiptId(r.getId());
            var productIds = items.stream().map(ImportReceiptItem::getProductId).toList();
            var products = productRepository.findAllById(productIds).stream()
                    .collect(Collectors.toMap(Product::getId, p -> p));
            var unitCounts = getUnitCounts(items);
            return ImportReceiptMappingHelper.map(r, null, null, null, items, products, unitCounts);
        }));
    }

    public ImportReceiptResponse findOne(Long id) {
        var receipt = importReceiptRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.IMPORT_RECEIPT_NOT_FOUND));
        var items = importReceiptItemRepository.findByReceiptId(receipt.getId());
        var productIds = items.stream().map(ImportReceiptItem::getProductId).toList();
        var products = productRepository.findAllById(productIds).stream()
                .collect(Collectors.toMap(Product::getId, p -> p));
        var unitCounts = getUnitCounts(items);
        return ImportReceiptMappingHelper.map(receipt, null, null, null, items, products, unitCounts);
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.CONFIRM_IMPORT, entity = LogConstant.Entity.IMPORT_RECEIPT)
    public ImportReceiptResponse createAndConfirm(ImportReceiptRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        if (userId == null) throw new InvalidRequestException("User not authenticated");

        if (request.items() == null || request.items().isEmpty()) {
            throw new InvalidRequestException("At least one item is required");
        }
        if (request.supplierId() == null) {
            throw new InvalidRequestException("Supplier is required");
        }

        String receiptCode = request.receiptCode() != null ? request.receiptCode() : generateReceiptCode();
        if (importReceiptRepository.existsByReceiptCode(receiptCode)) {
            throw new ResourceAlreadyExistedException(Message.Inventory.RECEIPT_CODE_EXISTS);
        }

        ImportReceipt receipt = ImportReceipt.builder()
                .receiptCode(receiptCode)
                .supplierId(request.supplierId())
                .status(ImportReceiptStatus.COMPLETED.name())
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

            ImportReceiptItem item = ImportReceiptItem.builder()
                    .receiptId(receiptId)
                    .productId(itemReq.productId())
                    .quantity(itemReq.quantity())
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
                        .initialQuantity(BigDecimal.valueOf(itemReq.quantity()))
                        .remainingQuantity(BigDecimal.valueOf(itemReq.quantity()))
                        .importReceiptItemId(item.getId())
                        .locationId(itemReq.locationId())
                        .status(ProductUnitStatus.IN_STOCK.name())
                        .importedAt(Instant.now())
                        .warrantyMonths(itemReq.warrantyMonths())
                        .build();
                productUnitRepository.save(pu);
            } else {
                String serial = itemReq.serialNumber();
                if (serial == null || serial.isBlank()) {
                    throw new InvalidRequestException(Message.Inventory.SERIAL_REQUIRED_FOR_SERIALIZED);
                }
                if (productUnitRepository.existsBySerialNumber(serial.trim())) {
                    throw new ResourceAlreadyExistedException(Message.Inventory.SERIAL_ALREADY_EXISTS);
                }
                ProductUnit su = ProductUnit.builder()
                        .serialNumber(serial.trim())
                        .productId(itemReq.productId())
                        .trackingType(trackingType)
                        .initialQuantity(null)
                        .remainingQuantity(null)
                        .importReceiptItemId(item.getId())
                        .locationId(itemReq.locationId())
                        .status(ProductUnitStatus.IN_STOCK.name())
                        .importedAt(Instant.now())
                        .warrantyMonths(itemReq.warrantyMonths())
                        .build();
                productUnitRepository.save(su);
            }

            BigDecimal lineTotal = itemReq.unitPrice() != null
                    ? itemReq.unitPrice().multiply(BigDecimal.valueOf(itemReq.quantity()))
                    : BigDecimal.ZERO;
            totalAmount = totalAmount.add(lineTotal);
        }

        receipt.setTotalAmount(totalAmount);
        receipt = importReceiptRepository.save(receipt);

        var productIds = savedItems.stream().map(ImportReceiptItem::getProductId).toList();
        var products = productRepository.findAllById(productIds).stream()
                .collect(Collectors.toMap(Product::getId, p -> p));
        var unitCounts = getUnitCounts(savedItems);
        return ImportReceiptMappingHelper.map(receipt, null, null, null, savedItems, products, unitCounts);
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.APPROVE_IMPORT, entity = LogConstant.Entity.IMPORT_RECEIPT)
    public ImportReceiptResponse approve(Long id) {
        Long userId = SecurityUtils.getCurrentUserId();
        ImportReceipt receipt = importReceiptRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.IMPORT_RECEIPT_NOT_FOUND));

        if (receipt.getCreatedBy().equals(userId)) {
            throw new InvalidRequestException(Message.Inventory.CREATOR_CANNOT_APPROVE);
        }
        if (!ImportReceiptStatus.PENDING_APPROVAL.name().equals(receipt.getStatus())) {
            throw new InvalidRequestException("Only pending_approval receipts can be approved");
        }

        receipt.setStatus(ImportReceiptStatus.COMPLETED.name());
        receipt.setApprovedBy(userId);
        receipt = importReceiptRepository.save(receipt);

        return findOne(receipt.getId());
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.CANCEL_IMPORT, entity = LogConstant.Entity.IMPORT_RECEIPT)
    public ImportReceiptResponse cancel(Long id) {
        ImportReceipt receipt = importReceiptRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.IMPORT_RECEIPT_NOT_FOUND));

        if (ImportReceiptStatus.CANCELLED.name().equals(receipt.getStatus())) {
            throw new InvalidRequestException(Message.Inventory.IMPORT_ALREADY_CANCELLED);
        }

        var items = importReceiptItemRepository.findByReceiptId(id);
        for (var item : items) {
            var units = productUnitRepository.findByImportReceiptItemId(item.getId());
            for (var unit : units) {
                if (!ProductUnitStatus.IN_STOCK.name().equals(unit.getStatus())) {
                    throw new InvalidRequestException(Message.Inventory.IMPORT_CANNOT_CANCEL_UNITS_EXPORTED);
                }
            }
        }

        Long userId = SecurityUtils.getCurrentUserId();
        for (var item : items) {
            var units = productUnitRepository.findByImportReceiptItemId(item.getId());
            for (var unit : units) {
                String oldStatus = unit.getStatus();
                unit.setStatus(ProductUnitStatus.REMOVED.name());
                productUnitRepository.save(unit);
                statusLogRepository.save(ProductUnitStatusLog.builder()
                        .productUnitId(unit.getId())
                        .fromStatus(oldStatus)
                        .toStatus(ProductUnitStatus.REMOVED.name())
                        .sourceType(SourceType.IMPORT_RECEIPT.name())
                        .sourceId(id)
                        .changedBy(userId)
                        .build());
            }
        }

        receipt.setStatus(ImportReceiptStatus.CANCELLED.name());
        receipt = importReceiptRepository.save(receipt);
        return findOne(receipt.getId());
    }

    public List<ProductUnitResponse> getUnitsByReceipt(Long receiptId) {
        var items = importReceiptItemRepository.findByReceiptId(receiptId);
        List<ProductUnitResponse> result = new ArrayList<>();
        var products = productRepository.findAll();
        Map<Long, Product> productMap = products.stream().collect(Collectors.toMap(Product::getId, p -> p));
        var locations = locationRepository.findAll();
        Map<Long, Location> locationMap = locations.stream().collect(Collectors.toMap(Location::getId, l -> l));

        for (var item : items) {
            var units = productUnitRepository.findByImportReceiptItemId(item.getId());
            for (var unit : units) {
                Product p = productMap.get(unit.getProductId());
                Location loc = unit.getLocationId() != null ? locationMap.get(unit.getLocationId()) : null;
                result.add(ProductUnitMappingHelper.map(unit,
                        p != null ? p.getName() : null,
                        p != null ? p.getSku() : null,
                        loc != null ? loc.getFullCode() : null));
            }
        }
        return result;
    }

    private String generateReceiptCode() {
        String datePart = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String prefix = "IMP-" + datePart + "-";
        int seq = 1;
        while (importReceiptRepository.existsByReceiptCode(prefix + String.format("%04d", seq))) {
            seq++;
        }
        return prefix + String.format("%04d", seq);
    }

    private Map<Long, Integer> getUnitCounts(List<ImportReceiptItem> items) {
        return items.stream().collect(Collectors.toMap(
                ImportReceiptItem::getId,
                item -> (int) productUnitRepository.findByImportReceiptItemId(item.getId()).size()
        ));
    }
}
