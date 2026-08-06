package org.dawn.backend.service.inventory.imports;
import org.dawn.backend.constant.shared.ErrorCode;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dawn.backend.aspect.AuditLog;
import org.dawn.backend.constant.enums.catalog.TrackingType;
import org.dawn.backend.constant.enums.catalog.UnitOfMeasure;
import org.dawn.backend.constant.enums.inventory.ProductUnitStatus;
import org.dawn.backend.constant.enums.inventory.SourceType;
import org.dawn.backend.constant.enums.inventory.exports.ExportReason;
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
import java.util.List;
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
    private final LocationCapacityValidator capacityValidator;
    private final ExportReceiptRepository exportReceiptRepository;
    private final ExportReceiptItemUnitRepository exportReceiptItemUnitRepository;

    private static final List<String> BULK_UNITS = List.of(
            UnitOfMeasure.METER.name(),
            UnitOfMeasure.KG.name());
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
                .status(ImportReceiptStatus.PENDING_APPROVAL)
                .note(request.note())
                .createdBy(userId)
                .build();
        receipt = importReceiptRepository.save(receipt);
        Long receiptId = receipt.getId();

        if (request.originalWarrantyExportId() != null) {
            return createAndConfirmWarranty(request, receipt, userId);
        }

        BigDecimal totalAmount = BigDecimal.ZERO;
        List<ImportReceiptItem> savedItems = new ArrayList<>();

        for (ImportReceiptRequest.ImportItemRequest itemReq : request.items()) {
            Product product = productRepository.findById(itemReq.productId())
                    .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.PRODUCT_NOT_FOUND));

            String unit = product.getUnit();
            TrackingType trackingType = TrackingType.valueOf(product.getTrackingType());
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
                if (serials.size() != qty.intValue()) {
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
                productUnitRepository.saveAll(batch);
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
        importReceiptStateMachine.validate(receipt.getStatus(), ImportReceiptStatus.PENDING_APPROVAL);

        var items = importReceiptItemRepository.findByReceiptId(id);
        var productMap = items.stream().collect(Collectors.toMap(
                ImportReceiptItem::getProductId, item -> productRepository.findById(item.getProductId()).orElse(null)));

        BigDecimal totalAmount = receipt.getTotalAmount() != null ? receipt.getTotalAmount() : BigDecimal.ZERO;

        for (var serial : request.serials()) {
            ImportReceiptItem item = importReceiptItemRepository.findById(serial.itemId())
                    .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.IMPORT_ITEM_NOT_FOUND));
            Product product = productMap.get(item.getProductId());
            TrackingType trackingType = product != null
                    ? TrackingType.valueOf(product.getTrackingType())
                    : TrackingType.SERIALIZED;

            var serials = serial.serialNumbers().stream().map(String::trim).peek(s -> {
                if (s.isBlank()) throw new InvalidRequestException(ErrorCode.SERIAL_BLANK);
            }).toList();

            var existing = productUnitRepository.findExistingSerialNumbers(serials);
            if (!existing.isEmpty()) {
                throw new ResourceAlreadyExistedException(
                        ErrorCode.SERIAL_ALREADY_EXISTS_LIST.format( String.join(", ", existing)));
            }

            capacityValidator.assertCapacity(serial.locationId(), BigDecimal.valueOf(serials.size()));

            var now = Instant.now();
            var batch = serials.stream().map(s -> ProductUnit.builder()
                    .serialNumber(s)
                    .productId(item.getProductId())
                    .trackingType(trackingType.name())
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

        return importReceiptService.toResponse(receipt);
    }

    private ImportReceiptResponse createAndConfirmWarranty(ImportReceiptRequest request, ImportReceipt receipt, Long userId) {
        var export = exportReceiptRepository.findById(request.originalWarrantyExportId())
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.EXPORT_RECEIPT_NOT_FOUND));
        boolean supplierReturn = ExportReason.RETURN_SUPPLIER.name().equals(export.getReason());
        if (!supplierReturn && !ExportReason.WARRANTY_REPLACEMENT.name().equals(export.getReason())) {
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
            if (serials.size() != itemReq.quantity().intValue()) {
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
                        if (targetLocationId != null) {
                            unit.setLocationId(targetLocationId);
                        }
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
