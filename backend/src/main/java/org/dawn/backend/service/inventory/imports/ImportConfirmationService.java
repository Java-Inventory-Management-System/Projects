package org.dawn.backend.service.inventory.imports;
import org.dawn.backend.constant.shared.ErrorCode;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dawn.backend.aspect.AuditLog;
import org.dawn.backend.constant.enums.catalog.TrackingType;
import org.dawn.backend.constant.enums.catalog.UnitOfMeasure;
import org.dawn.backend.constant.enums.inventory.ProductUnitStatus;
import org.dawn.backend.constant.enums.inventory.SourceType;
import org.dawn.backend.constant.enums.inventory.imports.ImportReceiptStatus;
import org.dawn.backend.constant.enums.inventory.imports.WarrantyResultType;
import org.dawn.backend.constant.shared.LogConstant;
import org.dawn.backend.constant.shared.QcProcessingLocations;
import org.dawn.backend.controller.inventory.request.ConfirmImportRequest;
import org.dawn.backend.controller.inventory.request.ImportReceiptRequest;
import org.dawn.backend.controller.inventory.response.ImportReceiptResponse;
import org.dawn.backend.entity.catalog.Product;
import org.dawn.backend.entity.inventory.ImportReceipt;
import org.dawn.backend.entity.inventory.ImportReceiptItem;
import org.dawn.backend.entity.inventory.ProductUnit;
import org.dawn.backend.entity.inventory.ProductUnitStatusLog;
import org.dawn.backend.exception.type.InvalidRequestException;
import org.dawn.backend.exception.type.ResourceAlreadyExistedException;
import org.dawn.backend.exception.type.ResourceNotFoundException;
import org.dawn.backend.repository.catalog.ProductRepository;
import org.dawn.backend.repository.inventory.LocationRepository;
import org.dawn.backend.repository.inventory.ProductUnitRepository;
import org.dawn.backend.repository.inventory.ProductUnitStatusLogRepository;
import org.dawn.backend.repository.inventory.exports.ExportReceiptItemUnitRepository;
import org.dawn.backend.repository.inventory.exports.ExportReceiptRepository;
import org.dawn.backend.repository.inventory.imports.ImportReceiptItemRepository;
import org.dawn.backend.repository.inventory.imports.ImportReceiptRepository;
import org.dawn.backend.repository.inventory.PurchaseOrderItemRepository;
import org.dawn.backend.repository.inventory.PurchaseOrderRepository;
import org.dawn.backend.shared.statemachine.StateMachine;
import org.dawn.backend.config.security.SecurityPolicy;
import org.dawn.backend.service.inventory.LocationCapacityValidator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ImportConfirmationService {

    private final ImportReceiptRepository importReceiptRepository;
    private final ImportReceiptItemRepository importReceiptItemRepository;
    private final ProductUnitRepository productUnitRepository;
    private final ProductUnitStatusLogRepository statusLogRepository;
    private final ProductRepository productRepository;
    private final LocationRepository locationRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final PurchaseOrderItemRepository purchaseOrderItemRepository;
    private final StateMachine<ImportReceiptStatus> importReceiptStateMachine;
    private final SecurityPolicy securityPolicy;
    private final ImportReceiptService importReceiptService;
    private final ImportWorkflowService importWorkflowService;
    private final LocationCapacityValidator capacityValidator;
    private final ExportReceiptRepository exportReceiptRepository;
    private final ExportReceiptItemUnitRepository exportReceiptItemUnitRepository;

    private static final List<String> BULK_UNITS = List.of(
            UnitOfMeasure.METER.name(),
            UnitOfMeasure.KG.name(),
            UnitOfMeasure.TUBE.name());
    private static final List<String> SERIALIZED_UNITS = List.of(
            UnitOfMeasure.PIECE.name(),
            UnitOfMeasure.BOX.name(),
            UnitOfMeasure.SET.name());

    private static final String RETURN_STAGING_LOCATION_FULL_CODE = QcProcessingLocations.QC_SHELF_3_RMA_RETURNED;
    private static final String WASTE_SORTING_LOCATION_FULL_CODE = QcProcessingLocations.QC_SHELF_4_DEAD;

    @Transactional
    @AuditLog(action = LogConstant.Action.CONFIRM_IMPORT, entity = LogConstant.Entity.IMPORT_RECEIPT)
    public ImportReceiptResponse createAndConfirm(ImportReceiptRequest request) {
        Long userId = securityPolicy.requireAuthenticated();

        if (request.items() == null || request.items().isEmpty()) {
            throw new InvalidRequestException(ErrorCode.AT_LEAST_ONE_ITEM_REQUIRED);
        }
        if (request.supplierId() == null && request.originalWarrantyExportId() == null) {
            throw new InvalidRequestException(ErrorCode.SUPPLIER_REQUIRED);
        }

        String receiptCode = request.receiptCode() != null ? request.receiptCode() : generateReceiptCode();
        if (importReceiptRepository.existsByReceiptCode(receiptCode)) {
            throw new ResourceAlreadyExistedException(ErrorCode.RECEIPT_CODE_EXISTS);
        }

        ImportReceipt receipt = ImportReceipt.builder()
                .receiptCode(receiptCode)
                .supplierId(request.supplierId() != null ? request.supplierId()
                        : exportReceiptRepository.findById(request.originalWarrantyExportId())
                                .map(org.dawn.backend.entity.inventory.ExportReceipt::getSupplierId)
                                .orElse(null))
                .purchaseOrderId(request.purchaseOrderId())
                .originalWarrantyExportId(request.originalWarrantyExportId())
                .status(ImportReceiptStatus.RECEIVED)
                .note(request.note())
                .createdBy(userId)
                .build();
        receipt = importReceiptRepository.save(receipt);
        Long receiptId = receipt.getId();

        if (request.originalWarrantyExportId() != null) {
            return createAndConfirmWarranty(request, receipt, userId);
        }

        if (request.purchaseOrderId() != null) {
            Map<Long, BigDecimal> currentByProduct = new HashMap<>();
            for (ImportReceiptRequest.ImportItemRequest itemReq : request.items()) {
                currentByProduct.merge(itemReq.productId(),
                        itemReq.quantity() != null ? itemReq.quantity() : BigDecimal.ZERO, BigDecimal::add);
            }
            importWorkflowService.assertNotOverReceived(request.purchaseOrderId(), currentByProduct);
        }

        BigDecimal totalAmount = BigDecimal.ZERO;
        List<ImportReceiptItem> savedItems = new ArrayList<>();

        for (ImportReceiptRequest.ImportItemRequest itemReq : request.items()) {
            Product product = productRepository.findById(itemReq.productId())
                    .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.PRODUCT_NOT_FOUND));

            String unit = product.getUnit();
            TrackingType trackingType = TrackingType.valueOf(product.getTrackingType());
            boolean isBulk = unit != null && BULK_UNITS.contains(unit);
            BigDecimal qty = itemReq.quantity();

            if (itemReq.locationId() == null) {
                throw new InvalidRequestException(ErrorCode.IMPORT_LOCATION_REQUIRED.format( product.getId()));
            }

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
                if (qty == null || qty.compareTo(BigDecimal.ZERO) <= 0) {
                    throw new InvalidRequestException(ErrorCode.INVALID_QUANTITY.format( qty));
                }
                capacityValidator.assertCapacity(itemReq.locationId(), qty);
                ProductUnit pu = ProductUnit.builder()
                        .serialNumber(null)
                        .productId(itemReq.productId())
                        .trackingType(trackingType.name())
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
                    throw new InvalidRequestException(ErrorCode.SERIAL_REQUIRED_FOR_SERIALIZED);
                }
                if (BigDecimal.valueOf(serials.size()).compareTo(qty) != 0) {
                    throw new InvalidRequestException(ErrorCode.SERIAL_COUNT_MUST_MATCH);
                }

                var trimmedSerials = serials.stream()
                        .map(String::trim)
                        .peek(s -> {
                            if (s.isBlank()) throw new InvalidRequestException(ErrorCode.SERIAL_BLANK);
                        })
                        .toList();

                var existing = productUnitRepository.findExistingSerialNumbers(trimmedSerials);
                if (!existing.isEmpty()) {
                    throw new ResourceAlreadyExistedException(
                            ErrorCode.SERIAL_ALREADY_EXISTS_LIST.format( String.join(", ", existing))
                    );
                }

                capacityValidator.assertCapacity(itemReq.locationId(), BigDecimal.valueOf(trimmedSerials.size()));

                var now = Instant.now();
                final var prodId = itemReq.productId();
                final var locId = itemReq.locationId();
                final var wm = itemReq.warrantyMonths();
                final var itemId = item.getId();
                var batch = trimmedSerials.stream()
                        .map(s -> ProductUnit.builder()
                                .serialNumber(s)
                                .productId(prodId)
                                .trackingType(trackingType.name())
                                .initialQuantity(null)
                                .remainingQuantity(null)
                                .importReceiptItemId(itemId)
                                .locationId(locId)
                                .status(ProductUnitStatus.IN_STOCK)
                                .importedAt(now)
                                .warrantyMonths(wm)
                                .build())
                        .toList();
                try {
                    productUnitRepository.saveAll(batch);
                } catch (org.springframework.dao.DataIntegrityViolationException e) {
                    throw new ResourceAlreadyExistedException(ErrorCode.SERIAL_ALREADY_EXISTS);
                }
            }

            BigDecimal lineTotal = itemReq.unitPrice() != null
                    ? itemReq.unitPrice().multiply(qty)
                    : BigDecimal.ZERO;
            totalAmount = totalAmount.add(lineTotal);
        }

        receipt.setTotalAmount(totalAmount);
        receipt = importReceiptRepository.save(receipt);

        return importReceiptService.toResponse(receipt);
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.CONFIRM_IMPORT, entity = LogConstant.Entity.IMPORT_RECEIPT)
    public ImportReceiptResponse confirm(Long id, ConfirmImportRequest request) {
        Long userId = securityPolicy.requireAuthenticated();

        ImportReceipt receipt = importReceiptRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.IMPORT_RECEIPT_NOT_FOUND));
        importReceiptStateMachine.validate(receipt.getStatus(), ImportReceiptStatus.RECEIVED);

        var items = importReceiptItemRepository.findByReceiptId(id);
        var itemsById = items.stream().collect(Collectors.toMap(
                ImportReceiptItem::getId, it -> it));
        var productMap = items.stream().collect(Collectors.toMap(
                ImportReceiptItem::getProductId,
                item -> productRepository.findById(item.getProductId()).orElse(null)));

        var assignments = request.serials() != null
                ? request.serials()
                : List.<ConfirmImportRequest.SerialAssignment>of();
        var assignedItemIds = assignments.stream()
                .map(ConfirmImportRequest.SerialAssignment::itemId)
                .collect(Collectors.toSet());

        var notReceivedIds = request.notReceivedItemIds() != null
                ? Set.copyOf(request.notReceivedItemIds())
                : Set.<Long>of();
        var rejectedSerials = request.rejectedSerials() != null
                ? request.rejectedSerials()
                : List.<ConfirmImportRequest.RejectedSerial>of();
        var rejectedSet = rejectedSerials.stream()
                .map(r -> r.serial() == null ? "" : r.serial().trim().toLowerCase())
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toSet());

        if (!rejectedSet.isEmpty()) {
            var allEnteredSerials = assignments.stream().flatMap(a -> {
                var allocs = a.allocations();
                if (allocs != null && !allocs.isEmpty()) {
                    return allocs.stream().flatMap(al -> (al.serialNumbers() == null
                            ? List.<String>of() : al.serialNumbers()).stream());
                }
                return (a.serialNumbers() == null ? List.<String>of() : a.serialNumbers()).stream();
            }).map(String::trim).filter(s -> !s.isEmpty()).map(String::toLowerCase).collect(Collectors.toSet());
            for (var rej : rejectedSerials) {
                if (rej.serial() == null || !allEnteredSerials.contains(rej.serial().trim().toLowerCase())) {
                    throw new InvalidRequestException(ErrorCode.QC_REJECTED_SERIAL_NOT_IN_LIST.format(rej.serial()));
                }
            }
        }

        for (Long itemId : assignedItemIds) {
            if (!itemsById.containsKey(itemId)) {
                throw new InvalidRequestException(ErrorCode.IMPORT_ITEM_NOT_IN_RECEIPT.format( itemId));
            }
        }

        List<Long> missingItems = items.stream()
                .map(ImportReceiptItem::getId)
                .filter(itemId -> !assignedItemIds.contains(itemId) && !notReceivedIds.contains(itemId))
                .toList();
        if (!missingItems.isEmpty()) {
            throw new InvalidRequestException(ErrorCode.IMPORT_CONFIRM_ITEMS_INCOMPLETE.format( missingItems));
        }

        var now = Instant.now();
        List<ProductUnit> unitsToSave = new ArrayList<>();

        for (var assignment : assignments) {
            ImportReceiptItem item = itemsById.get(assignment.itemId());
            if (notReceivedIds.contains(assignment.itemId())) {
                continue;
            }
            Product product = productMap.get(item.getProductId());
            boolean isBulk = product != null && product.getUnit() != null && BULK_UNITS.contains(product.getUnit());
            List<ConfirmImportRequest.SerialAssignment.Allocation> allocations = assignment.allocations();
            boolean useAllocations = allocations != null && !allocations.isEmpty();

            if (isBulk) {
                if (item.getQuantity() == null || item.getQuantity().compareTo(BigDecimal.ZERO) <= 0) {
                    throw new InvalidRequestException(ErrorCode.INVALID_QUANTITY.format( item.getQuantity()));
                }
                if (assignment.serialNumbers() != null && !assignment.serialNumbers().isEmpty()) {
                    throw new InvalidRequestException(ErrorCode.SERIAL_NOT_ALLOWED_FOR_BULK);
                }
                if (useAllocations) {
                    validateAllocationQuantities(item, allocations);
                    for (var alloc : allocations) {
                        capacityValidator.assertCapacity(alloc.locationId(), alloc.quantity());
                        unitsToSave.add(bulkUnit(item, alloc.locationId(), alloc.quantity(), now));
                    }
                } else {
                    if (assignment.locationId() == null) {
                        throw new InvalidRequestException(ErrorCode.IMPORT_LOCATION_REQUIRED.format( item.getId()));
                    }
                    capacityValidator.assertCapacity(assignment.locationId(), item.getQuantity());
                    unitsToSave.add(bulkUnit(item, assignment.locationId(), item.getQuantity(), now));
                }
            } else {
                List<String> serials;
                if (useAllocations) {
                    serials = allocations.stream()
                            .flatMap(a -> (a.serialNumbers() == null ? List.<String>of() : a.serialNumbers()).stream())
                            .map(String::trim)
                            .peek(s -> {
                                if (s.isBlank()) throw new InvalidRequestException(ErrorCode.SERIAL_BLANK);
                            })
                            .toList();
                    var seen = new java.util.HashSet<String>();
                    for (String s : serials) {
                        if (!seen.add(s.toLowerCase())) {
                            throw new InvalidRequestException(ErrorCode.ALLOCATION_SERIAL_DUPLICATE.format(s));
                        }
                    }
                } else {
                    serials = assignment.serialNumbers() == null
                            ? List.<String>of()
                            : assignment.serialNumbers().stream()
                                    .map(String::trim)
                                    .peek(s -> {
                                        if (s.isBlank()) throw new InvalidRequestException(ErrorCode.SERIAL_BLANK);
                                    })
                                    .toList();
                }
                if (serials.isEmpty()) {
                    throw new InvalidRequestException(ErrorCode.SERIAL_REQUIRED_FOR_SERIALIZED);
                }
                if (BigDecimal.valueOf(serials.size()).compareTo(item.getQuantity()) > 0) {
                    throw new InvalidRequestException(ErrorCode.SERIAL_COUNT_MUST_MATCH);
                }

                List<String> passSerials = serials.stream()
                        .filter(s -> !rejectedSet.contains(s.toLowerCase()))
                        .toList();

                var existing = productUnitRepository.findExistingSerialNumbers(passSerials);
                if (!existing.isEmpty()) {
                    throw new ResourceAlreadyExistedException(
                            ErrorCode.SERIAL_ALREADY_EXISTS_LIST.format( String.join(", ", existing)));
                }

                String trackingType = product != null
                        ? TrackingType.valueOf(product.getTrackingType()).name()
                        : TrackingType.SERIALIZED.name();

                if (useAllocations) {
                    for (var alloc : allocations) {
                        List<String> allocSerials = alloc.serialNumbers() == null
                                ? List.<String>of()
                                : alloc.serialNumbers().stream().map(String::trim)
                                        .filter(s -> !s.isBlank()).toList();
                        boolean rejectedHere = allocSerials.stream()
                                .anyMatch(s -> rejectedSet.contains(s.toLowerCase()));
                        if (rejectedHere) {
                            allocSerials = allocSerials.stream()
                                    .filter(s -> !rejectedSet.contains(s.toLowerCase())).toList();
                        }
                        BigDecimal allocQty = alloc.quantity() != null
                                ? alloc.quantity()
                                : BigDecimal.valueOf(allocSerials.size());
                        if (alloc.locationId() == null) {
                            throw new InvalidRequestException(ErrorCode.ALLOCATION_LOCATION_REQUIRED.format(item.getId()));
                        }
                        if (allocQty.compareTo(BigDecimal.ZERO) <= 0) {
                            throw new InvalidRequestException(ErrorCode.ALLOCATION_QTY_INVALID.format(item.getId()));
                        }
                        if (!rejectedHere && BigDecimal.valueOf(allocSerials.size()).compareTo(allocQty) != 0) {
                            throw new InvalidRequestException(
                                    ErrorCode.ALLOCATION_SERIAL_COUNT_MISMATCH.format(item.getId(), allocQty));
                        }
                        capacityValidator.assertCapacity(alloc.locationId(), allocQty);
                        for (String serial : allocSerials) {
                            unitsToSave.add(serializedUnit(item, serial, trackingType, alloc.locationId(), now));
                        }
                    }
                } else {
                    if (assignment.locationId() == null) {
                        throw new InvalidRequestException(ErrorCode.IMPORT_LOCATION_REQUIRED.format( item.getId()));
                    }
                    capacityValidator.assertCapacity(assignment.locationId(), BigDecimal.valueOf(passSerials.size()));
                    for (String serial : passSerials) {
                        unitsToSave.add(serializedUnit(item, serial, trackingType, assignment.locationId(), now));
                    }
                }
            }
        }

        if (!unitsToSave.isEmpty()) {
            try {
                productUnitRepository.saveAll(unitsToSave);
            } catch (org.springframework.dao.DataIntegrityViolationException e) {
                throw new ResourceAlreadyExistedException(ErrorCode.SERIAL_ALREADY_EXISTS);
            }
        }

        var assignmentById = assignments.stream()
                .collect(Collectors.toMap(ConfirmImportRequest.SerialAssignment::itemId, a -> a));
        for (var item : items) {
            if (notReceivedIds.contains(item.getId())) {
                item.setReceivedQuantity(BigDecimal.ZERO);
                continue;
            }
            var assignment = assignmentById.get(item.getId());
            if (assignment == null) {
                continue;
            }
            Product product = productMap.get(item.getProductId());
            boolean isBulk = product != null && product.getUnit() != null && BULK_UNITS.contains(product.getUnit());
            item.setReceivedQuantity(isBulk
                    ? item.getQuantity()
                    : BigDecimal.valueOf(passCount(assignment, rejectedSet)));
        }
        importReceiptItemRepository.saveAll(items);

        if (receipt.getPurchaseOrderId() != null) {
            Map<Long, BigDecimal> currentByProduct = items.stream()
                    .filter(i -> i.getReceivedQuantity() != null
                            && i.getReceivedQuantity().compareTo(BigDecimal.ZERO) > 0)
                    .collect(Collectors.toMap(ImportReceiptItem::getProductId,
                            ImportReceiptItem::getReceivedQuantity, BigDecimal::add));
            importWorkflowService.assertNotOverReceived(receipt.getPurchaseOrderId(), currentByProduct);
        }

        receipt.setStatus(ImportReceiptStatus.RECEIVED);
        if (request.note() != null) {
            receipt.setNote(request.note());
        }
        receipt = importReceiptRepository.save(receipt);

        if (receipt.getPurchaseOrderId() != null) {
            importWorkflowService.updatePOProgress(receipt.getPurchaseOrderId());
        }

        return importReceiptService.toResponse(receipt);
    }

    private void validateAllocationQuantities(ImportReceiptItem item, List<ConfirmImportRequest.SerialAssignment.Allocation> allocations) {
        BigDecimal sum = BigDecimal.ZERO;
        for (var alloc : allocations) {
            if (alloc.locationId() == null) {
                throw new InvalidRequestException(ErrorCode.ALLOCATION_LOCATION_REQUIRED.format(item.getId()));
            }
            BigDecimal qty = alloc.quantity();
            if (qty == null || qty.compareTo(BigDecimal.ZERO) <= 0) {
                throw new InvalidRequestException(ErrorCode.ALLOCATION_QTY_INVALID.format(item.getId()));
            }
            sum = sum.add(qty);
        }
        if (sum.compareTo(item.getQuantity()) != 0) {
            throw new InvalidRequestException(ErrorCode.ALLOCATION_QTY_MISMATCH.format(sum, item.getQuantity()));
        }
    }

    private long passCount(ConfirmImportRequest.SerialAssignment assignment, Set<String> rejectedSet) {
        var serials = assignment.allocations() != null && !assignment.allocations().isEmpty()
                ? assignment.allocations().stream()
                        .flatMap(a -> (a.serialNumbers() == null ? List.<String>of() : a.serialNumbers()).stream())
                : (assignment.serialNumbers() == null ? List.<String>of().stream() : assignment.serialNumbers().stream());
        return serials.map(String::trim)
                .filter(s -> !s.isBlank())
                .filter(s -> !rejectedSet.contains(s.toLowerCase()))
                .count();
    }

    private ProductUnit bulkUnit(ImportReceiptItem item, Long locationId, BigDecimal qty, Instant now) {        return ProductUnit.builder()
                .serialNumber(null)
                .productId(item.getProductId())
                .trackingType(TrackingType.BULK.name())
                .initialQuantity(qty)
                .remainingQuantity(qty)
                .importReceiptItemId(item.getId())
                .locationId(locationId)
                .status(ProductUnitStatus.IN_STOCK)
                .importedAt(now)
                .warrantyMonths(item.getWarrantyMonths())
                .build();
    }

    private ProductUnit serializedUnit(ImportReceiptItem item, String serial, String trackingType,
                                       Long locationId, Instant now) {
        return ProductUnit.builder()
                .serialNumber(serial)
                .productId(item.getProductId())
                .trackingType(trackingType)
                .initialQuantity(null)
                .remainingQuantity(null)
                .importReceiptItemId(item.getId())
                .locationId(locationId)
                .status(ProductUnitStatus.IN_STOCK)
                .importedAt(now)
                .warrantyMonths(item.getWarrantyMonths())
                .build();
    }

    private ImportReceiptResponse createAndConfirmWarranty(ImportReceiptRequest request, ImportReceipt receipt, Long userId) {
        var export = exportReceiptRepository.findById(request.originalWarrantyExportId())
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.EXPORT_RECEIPT_NOT_FOUND));
        boolean supplierReturn = "RETURN_SUPPLIER".equals(export.getReason());
        if (!supplierReturn && !"WARRANTY_REPLACEMENT".equals(export.getReason())) {
            throw new InvalidRequestException(ErrorCode.WARRANTY_IMPORT_EXPORT_NOT_REPLACEMENT);
        }
        var exportUnitIds = exportReceiptItemUnitRepository.findProductUnitIdsByReceiptId(export.getId());
        var exportSerials = productUnitRepository.findAllById(exportUnitIds).stream()
                .map(ProductUnit::getSerialNumber)
                .filter(Objects::nonNull)
                .map(String::toLowerCase)
                .collect(Collectors.toSet());

        Long receiptId = receipt.getId();
        BigDecimal totalAmount = BigDecimal.ZERO;
        if (importReceiptRepository.existsByOriginalWarrantyExportIdAndIdNot(export.getId(), receiptId)) {
            throw new InvalidRequestException(ErrorCode.WARRANTY_IMPORT_ALREADY_RECEIVED);
        }
        Long returnStagingLocationId = locationRepository.findByFullCode(RETURN_STAGING_LOCATION_FULL_CODE)
                .map(loc -> loc.getId()).orElse(null);
        Long wasteSortingLocationId = locationRepository.findByFullCode(WASTE_SORTING_LOCATION_FULL_CODE)
                .map(loc -> loc.getId()).orElse(null);

        for (ImportReceiptRequest.ImportItemRequest itemReq : request.items()) {
            WarrantyResultType resultType = WarrantyResultType.REPAIRED;
            if (!supplierReturn) {
                String result = itemReq.warrantyResultType() == null ? null : itemReq.warrantyResultType().toUpperCase();
                try {
                    resultType = WarrantyResultType.valueOf(result);
                } catch (IllegalArgumentException e) {
                    throw new InvalidRequestException(ErrorCode.WARRANTY_INVALID_RESULT.format( itemReq.warrantyResultType()));
                }
            }

            var product = productRepository.findById(itemReq.productId())
                    .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.PRODUCT_NOT_FOUND));
            List<String> serials = trimSerials(itemReq.serialNumbers());
            if (BigDecimal.valueOf(serials.size()).compareTo(itemReq.quantity()) != 0) {
                throw new InvalidRequestException(ErrorCode.SERIAL_COUNT_MUST_MATCH);
            }

            ImportReceiptItem item = ImportReceiptItem.builder()
                    .receiptId(receiptId)
                    .productId(itemReq.productId())
                    .quantity(itemReq.quantity())
                    .unitPrice(itemReq.unitPrice())
                    .warrantyMonths(itemReq.warrantyMonths())
                    .warrantyResultType(resultType.name())
                    .build();
            item = importReceiptItemRepository.save(item);
            Long itemId = item.getId();

            switch (resultType) {
                case REPAIRED, REJECTED -> {
                    for (String serial : serials) {
                        ProductUnit unit = findWarrantyUnit(serial, exportSerials, supplierReturn);
                        ProductUnitStatus oldStatus = unit.getStatus();
                        boolean repaired = resultType == WarrantyResultType.REPAIRED;
                        unit.setStatus(repaired ? ProductUnitStatus.RMA_REPAIRED_RETURNED : ProductUnitStatus.RMA_UNREPAIRABLE);
                        Long targetLocationId = repaired ? returnStagingLocationId : wasteSortingLocationId;
                        if (targetLocationId == null) {
                            throw new InvalidRequestException(ErrorCode.QC_STAGING_LOCATION_MISSING.format(
                                    repaired ? RETURN_STAGING_LOCATION_FULL_CODE : WASTE_SORTING_LOCATION_FULL_CODE));
                        }
                        unit.setLocationId(targetLocationId);
                        productUnitRepository.save(unit);
                        saveStatusLog(unit.getId(), oldStatus, unit.getStatus(), receiptId, userId);
                    }
                }
                case REPLACED -> {
                    List<String> sourceSerials = trimSerials(itemReq.replacementSourceSerials());
                    if (sourceSerials.size() != serials.size()) {
                        throw new InvalidRequestException(ErrorCode.WARRANTY_IMPORT_SOURCE_SERIALS_REQUIRED);
                    }
                    var existingNew = productUnitRepository.findExistingSerialNumbers(serials);
                    if (!existingNew.isEmpty()) {
                        throw new ResourceAlreadyExistedException(
                                ErrorCode.SERIAL_ALREADY_EXISTS_LIST.format( String.join(", ", existingNew)));
                    }
                    for (int i = 0; i < serials.size(); i++) {
                        if (returnStagingLocationId == null) {
                            throw new InvalidRequestException(ErrorCode.QC_STAGING_LOCATION_MISSING.format(RETURN_STAGING_LOCATION_FULL_CODE));
                        }
                        ProductUnit oldUnit = findWarrantyUnit(sourceSerials.get(i), exportSerials, false);
                        ProductUnitStatus oldStatus = oldUnit.getStatus();
                        oldUnit.setStatus(ProductUnitStatus.RETURNED_TO_SUPPLIER);
                        oldUnit.setLocationId(null);
                        productUnitRepository.save(oldUnit);
                        saveStatusLog(oldUnit.getId(), oldStatus, oldUnit.getStatus(), receiptId, userId);

                        ProductUnit newUnit = ProductUnit.builder()
                                .serialNumber(serials.get(i))
                                .productId(itemReq.productId())
                                .trackingType(product.getTrackingType())
                                .initialQuantity(null)
                                .remainingQuantity(null)
                                .importReceiptItemId(itemId)
                                .locationId(returnStagingLocationId)
                                .status(ProductUnitStatus.RMA_REPAIRED_RETURNED)
                                .importedAt(Instant.now())
                                .warrantyMonths(itemReq.warrantyMonths())
                                .build();
                        newUnit = productUnitRepository.save(newUnit);
                        saveStatusLog(newUnit.getId(), null, newUnit.getStatus(), receiptId, userId);
                    }
                }
            }

            BigDecimal lineTotal = itemReq.unitPrice() != null
                    ? itemReq.unitPrice().multiply(itemReq.quantity())
                    : BigDecimal.ZERO;
            totalAmount = totalAmount.add(lineTotal);
        }

        receipt.setTotalAmount(totalAmount);
        receipt = importReceiptRepository.save(receipt);

        return importReceiptService.toResponse(receipt);
    }

    private ProductUnit findWarrantyUnit(String serial, Set<String> exportSerials, boolean supplierReturn) {
        if (!exportSerials.contains(serial.toLowerCase())) {
            throw new InvalidRequestException(ErrorCode.WARRANTY_IMPORT_SERIAL_NOT_IN_EXPORT.format( serial));
        }
        var unit = productUnitRepository.findBySerialNumberIgnoreCase(serial)
                .orElseThrow(() -> new InvalidRequestException(ErrorCode.WARRANTY_IMPORT_SERIAL_NOT_IN_EXPORT.format( serial)));
        ProductUnitStatus expected = supplierReturn ? ProductUnitStatus.RETURNED_TO_SUPPLIER : ProductUnitStatus.SENT_TO_MANUFACTURER;
        if (expected != unit.getStatus()) {
            throw new InvalidRequestException(ErrorCode.WARRANTY_IMPORT_UNIT_NOT_SENT.format( unit.getSerialNumber()));
        }
        return unit;
    }

    private List<String> trimSerials(List<String> serials) {
        if (serials == null) return List.of();
        return serials.stream().map(String::trim).peek(s -> {
            if (s.isBlank()) throw new InvalidRequestException(ErrorCode.SERIAL_BLANK);
        }).toList();
    }

    private void saveStatusLog(Long unitId, ProductUnitStatus from, ProductUnitStatus to, Long sourceId, Long userId) {
        statusLogRepository.save(ProductUnitStatusLog.builder()
                .productUnitId(unitId)
                .fromStatus(from != null ? from.name() : null)
                .toStatus(to.name())
                .sourceType(SourceType.IMPORT_RECEIPT.name())
                .sourceId(sourceId)
                .changedBy(userId)
                .build());
    }

    private String generateReceiptCode() {
        return org.dawn.backend.shared.util.ReceiptCodeGenerator.generate("IMP-", importReceiptRepository::existsByReceiptCode);
    }
}
