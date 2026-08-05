package org.dawn.backend.service.inventory.imports;
import org.dawn.backend.constant.shared.ErrorCode;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dawn.backend.aspect.AuditLog;
import org.dawn.backend.constant.enums.catalog.UnitOfMeasure;
import org.dawn.backend.constant.enums.inventory.ProductUnitStatus;
import org.dawn.backend.constant.enums.inventory.imports.ImportReceiptStatus;
import org.dawn.backend.constant.shared.LogConstant;
import org.dawn.backend.controller.inventory.request.ConfirmImportRequest;
import org.dawn.backend.controller.inventory.request.ImportReceiptRequest;
import org.dawn.backend.controller.inventory.response.ImportReceiptResponse;
import org.dawn.backend.entity.catalog.Product;
import org.dawn.backend.entity.inventory.ImportReceipt;
import org.dawn.backend.entity.inventory.ImportReceiptItem;
import org.dawn.backend.entity.inventory.ProductUnit;
import org.dawn.backend.exception.type.InvalidRequestException;
import org.dawn.backend.exception.type.ResourceAlreadyExistedException;
import org.dawn.backend.exception.type.ResourceNotFoundException;
import org.dawn.backend.repository.catalog.ProductRepository;
import org.dawn.backend.repository.inventory.LocationRepository;
import org.dawn.backend.repository.inventory.ProductUnitRepository;
import org.dawn.backend.repository.inventory.ProductUnitStatusLogRepository;
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

    private static final List<String> BULK_UNITS = List.of(
            UnitOfMeasure.METER.name(),
            UnitOfMeasure.KG.name());
    private static final List<String> SERIALIZED_UNITS = List.of(
            UnitOfMeasure.PIECE.name(),
            UnitOfMeasure.BOX.name(),
            UnitOfMeasure.SET.name());

    @Transactional
    @AuditLog(action = LogConstant.Action.CONFIRM_IMPORT, entity = LogConstant.Entity.IMPORT_RECEIPT)
    public ImportReceiptResponse createAndConfirm(ImportReceiptRequest request) {
        Long userId = securityPolicy.requireAuthenticated();

        if (request.items() == null || request.items().isEmpty()) {
            throw new InvalidRequestException(ErrorCode.AT_LEAST_ONE_ITEM_REQUIRED);
        }
        if (request.supplierId() == null) {
            throw new InvalidRequestException(ErrorCode.SUPPLIER_REQUIRED);
        }

        String receiptCode = request.receiptCode() != null ? request.receiptCode() : generateReceiptCode();
        if (importReceiptRepository.existsByReceiptCode(receiptCode)) {
            throw new ResourceAlreadyExistedException(ErrorCode.RECEIPT_CODE_EXISTS);
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

        for (ImportReceiptRequest.ImportItemRequest itemReq : request.items()) {
            Product product = productRepository.findById(itemReq.productId())
                    .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.PRODUCT_NOT_FOUND));

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
                capacityValidator.assertCapacity(itemReq.locationId(), qty);
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

        return importReceiptService.toResponse(receipt);
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.CONFIRM_IMPORT, entity = LogConstant.Entity.IMPORT_RECEIPT)
    public ImportReceiptResponse confirm(Long id, ConfirmImportRequest request) {
        Long userId = securityPolicy.requireAuthenticated();

        ImportReceipt receipt = importReceiptRepository.findById(id)
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
            String trackingType = product != null ? product.getTrackingType() : "SERIALIZED";

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

        return importReceiptService.toResponse(receipt);
    }

    private String generateReceiptCode() {
        return org.dawn.backend.shared.util.ReceiptCodeGenerator.generate("IMP-", importReceiptRepository::existsByReceiptCode);
    }
}
