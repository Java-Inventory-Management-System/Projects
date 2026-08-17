package org.dawn.backend.service.inventory.returns;
import org.dawn.backend.constant.shared.ErrorCode;

import org.dawn.backend.shared.statemachine.StateMachine;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dawn.backend.aspect.AuditLog;
import org.dawn.backend.config.web.response.ResponsePage;
import org.dawn.backend.constant.enums.inventory.adjustments.*;
import org.dawn.backend.constant.enums.inventory.exports.*;
import org.dawn.backend.constant.enums.inventory.imports.*;
import org.dawn.backend.constant.enums.inventory.returns.*;


import org.dawn.backend.constant.enums.inventory.*;
import org.dawn.backend.constant.shared.LogConstant;
import org.dawn.backend.constant.shared.QcProcessingLocations;
import org.dawn.backend.controller.inventory.request.ReturnReceiptRequest;
import org.dawn.backend.controller.inventory.request.ReturnReceiptRequest.ReturnItemRequest;
import org.dawn.backend.controller.inventory.response.ReturnReceiptResponse;
import org.dawn.backend.entity.auth.User;
import org.dawn.backend.entity.catalog.Product;
import org.dawn.backend.entity.inventory.*;
import org.dawn.backend.exception.type.InvalidRequestException;
import org.dawn.backend.exception.type.ResourceNotFoundException;
import org.dawn.backend.repository.auth.UserRepository;
import org.dawn.backend.repository.catalog.ProductRepository;
import org.dawn.backend.repository.inventory.CustomerRepository;
import org.dawn.backend.repository.inventory.ProductUnitRepository;
import org.dawn.backend.repository.inventory.ProductUnitStatusLogRepository;
import org.dawn.backend.repository.inventory.exports.ExportReceiptItemRepository;
import org.dawn.backend.repository.inventory.exports.ExportReceiptItemUnitRepository;
import org.dawn.backend.repository.inventory.exports.ExportReceiptRepository;
import org.dawn.backend.repository.inventory.returns.ReturnReceiptItemRepository;
import org.dawn.backend.repository.inventory.returns.ReturnReceiptRepository;
import org.dawn.backend.shared.util.ReceiptCodeGenerator;
import org.dawn.backend.config.security.SecurityPolicy;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReturnReceiptService {

    private final ReturnReceiptRepository returnReceiptRepository;
    private final ReturnReceiptItemRepository returnReceiptItemRepository;
    private final ProductUnitRepository productUnitRepository;
    private final ProductUnitStatusLogRepository statusLogRepository;
    private final ExportReceiptRepository exportReceiptRepository;
    private final CustomerRepository customerRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final ExportReceiptItemUnitRepository exportReceiptItemUnitRepository;
    private final ExportReceiptItemRepository exportReceiptItemRepository;
    private final org.dawn.backend.repository.catalog.DefectCategoryRepository defectCategoryRepository;
    private final org.dawn.backend.repository.inventory.LocationRepository locationRepository;
    private final StateMachine<ReturnReceiptStatus> returnReceiptStateMachine;
    private final SecurityPolicy securityPolicy;
    private final org.dawn.backend.service.shared.LockGuard lockGuard;

    private static final String RETURN_STAGING_LOCATION_FULL_CODE = QcProcessingLocations.QC_SHELF_1_NEW_RETURNS;
    private static final String WARRANTY_HOLD_LOCATION_FULL_CODE = QcProcessingLocations.QC_SHELF_2_WAIT_RMA;

    @Transactional(readOnly = true)
    public ResponsePage<ReturnReceiptResponse> findAll(Pageable pageable,
                                                       String status,
                                                       String reason,
                                                       String search,
                                                       Long createdBy) {
        ReturnReceiptStatus st = safeParseStatus(status);
        Page<ReturnReceipt> page;
        if (createdBy != null) {
            page = st != null
                    ? returnReceiptRepository.findByStatusAndCreatedBy(st, createdBy, pageable)
                    : returnReceiptRepository.findByCreatedBy(createdBy, pageable);
        } else if (st != null && reason != null) {
            page = returnReceiptRepository.findByStatusAndReason(st, reason, pageable);
        } else if (st != null) {
            page = returnReceiptRepository.findByStatus(st, pageable);
        } else if (reason != null) {
            page = returnReceiptRepository.findByReason(reason, pageable);
        } else if (search != null && !search.isBlank()) {
            page = returnReceiptRepository.findByReceiptCodeContainingIgnoreCase(search, pageable);
        } else {
            page = returnReceiptRepository.findAll(pageable);
        }
        var receipts = page.getContent();
        var customerMap = fetchCustomerMap(receipts);
        var userMap = fetchUserMap(receipts);
        var itemsByReceiptId = fetchItems(receipts);
        var allItems = itemsByReceiptId.values().stream().flatMap(List::stream).toList();
        var productInfo = fetchItemProductInfo(allItems);
        return ResponsePage.of(page.map(r -> {
            var items = itemsByReceiptId.getOrDefault(r.getId(), List.of());
            return ReturnReceiptMappingHelper.map(r,
                    r.getCustomerId() != null ? customerMap.get(r.getCustomerId()) : null,
                    userMap.get(r.getCreatedBy()),
                    r.getApprovedBy() != null ? userMap.get(r.getApprovedBy()) : null,
                    items, productInfo.productUnitMap(), productInfo.productMap());
        }));
    }

    @Transactional(readOnly = true)
    public ReturnReceiptResponse findOne(Long id) {
        var receipt = returnReceiptRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.RETURN_RECEIPT_NOT_FOUND));
        return enrich(receipt);
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.CREATE_RETURN, entity = LogConstant.Entity.RETURN_RECEIPT)
    public ReturnReceiptResponse create(ReturnReceiptRequest request) {
        Long userId = securityPolicy.requireAuthenticated();

        if (request.items() == null || request.items().isEmpty()) {
            throw new InvalidRequestException(ErrorCode.RETURN_ITEMS_REQUIRED);
        }
        if (request.reason() == null || request.reason().isBlank()) {
            throw new InvalidRequestException(ErrorCode.RETURN_REASON_REQUIRED);
        }
        if (request.originalExportReceiptId() == null) {
            throw new InvalidRequestException(ErrorCode.RETURN_EXPORT_REQUIRED);
        }
        if (request.customerId() == null) {
            throw new InvalidRequestException(ErrorCode.RETURN_CUSTOMER_REQUIRED);
        }

        ReturnReason reason;
        try {
            reason = ReturnReason.valueOf(request.reason().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new InvalidRequestException(ErrorCode.RETURN_INVALID_REASON.format( request.reason()));
        }

        var exportReceipt = exportReceiptRepository.findById(request.originalExportReceiptId())
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.EXPORT_RECEIPT_NOT_FOUND));
        if (!exportReceipt.getCustomerId().equals(request.customerId())) {
            throw new InvalidRequestException(ErrorCode.RETURN_EXPORT_NOT_BELONG_TO_CUSTOMER);
        }
        if (reason == ReturnReason.CHANGE_MIND && exportReceipt.getCreatedAt() != null
                && exportReceipt.getCreatedAt().plus(7, ChronoUnit.DAYS).isBefore(Instant.now())) {
            throw new InvalidRequestException(ErrorCode.RETURN_7_DAY_LIMIT);
        }

        String receiptCode = ReceiptCodeGenerator.generate("RET-", returnReceiptRepository::existsByReceiptCode);

        var exportUnitIds = exportReceiptItemUnitRepository.findProductUnitIdsByReceiptId(request.originalExportReceiptId());

        var unitIds = request.items().stream()
                .map(ReturnReceiptRequest.ReturnItemRequest::productUnitId)
                .filter(Objects::nonNull).filter(id -> id > 0).toList();
        // Lock the involved units first so two concurrent return requests for the
        // same unit cannot both pass the duplicate check below (see gap 6.4).
        if (!unitIds.isEmpty()) {
            productUnitRepository.findByIdsForUpdate(unitIds);
        }
        if (!unitIds.isEmpty()
                && returnReceiptItemRepository.existsByProductUnitIdsInNonCancelledReceipts(unitIds, ReturnReceiptStatus.CANCELLED)) {
            throw new InvalidRequestException(ErrorCode.RETURN_UNIT_ALREADY_RETURNED);
        }
        for (var itemReq : request.items()) {
            if (itemReq.productUnitId() == null && itemReq.productId() != null
                    && returnReceiptItemRepository.existsBulkByExportAndProductInNonCancelled(
                            request.originalExportReceiptId(), itemReq.productId(), ReturnReceiptStatus.CANCELLED)) {
                throw new InvalidRequestException(ErrorCode.RETURN_UNIT_ALREADY_RETURNED);
            }
        }

        lockGuard.assertProductsActive(request.items().stream()
                .map(ReturnItemRequest::productId).filter(Objects::nonNull).toList());

        boolean hasSerial = request.items().stream()
                .anyMatch(i -> i.productUnitId() != null && i.productUnitId() > 0);
        boolean hasBulk = request.items().stream().anyMatch(i -> i.productUnitId() == null);
        if (hasSerial && hasBulk) {
            throw new InvalidRequestException(ErrorCode.RETURN_MIXED_ITEM_TYPES);
        }

        ReturnReceipt receipt = ReturnReceipt.builder()
                .receiptCode(receiptCode)
                .customerId(request.customerId())
                .originalExportReceiptId(request.originalExportReceiptId())
                .reason(reason.name())
                .status(ReturnReceiptStatus.PENDING_APPROVAL)
                .note(request.note())
                .createdBy(userId)
                .build();
        receipt = returnReceiptRepository.save(receipt);
        Long receiptId = receipt.getId();

        for (var itemReq : request.items()) {
            ReturnCondition condition;
            try {
                condition = ReturnCondition.valueOf(itemReq.condition().toUpperCase());
            } catch (IllegalArgumentException e) {
                throw new InvalidRequestException(ErrorCode.RETURN_INVALID_CONDITION.format( itemReq.condition()));
            }

            ResultingAction action;
            try {
                action = ResultingAction.valueOf(itemReq.resultingAction().toUpperCase());
            } catch (IllegalArgumentException e) {
                throw new InvalidRequestException(ErrorCode.RETURN_INVALID_ACTION.format( itemReq.resultingAction()));
            }

            if (condition == ReturnCondition.DEFECTIVE
                    && (itemReq.description() == null || itemReq.description().isBlank()
                        || itemReq.evidenceImage() == null || itemReq.evidenceImage().isBlank())) {
                throw new InvalidRequestException(ErrorCode.RETURN_EVIDENCE_REQUIRED);
            }

            if (condition == ReturnCondition.DEFECTIVE && itemReq.defectCategoryId() == null) {
                throw new InvalidRequestException(ErrorCode.DEFECT_CATEGORY_REQUIRED_FOR_DEFECTIVE);
            }
            if (itemReq.defectCategoryId() != null
                    && !defectCategoryRepository.existsById(itemReq.defectCategoryId())) {
                throw new ResourceNotFoundException(ErrorCode.DEFECT_CATEGORY_NOT_FOUND);
            }

            boolean good = condition == ReturnCondition.GOOD;
            if (good && action != ResultingAction.RESTOCK
                    || !good && action == ResultingAction.RESTOCK) {
                throw new InvalidRequestException(
                    ErrorCode.RETURN_CONDITION_ACTION_MISMATCH.format( condition, action));
            }

            if (itemReq.productUnitId() == null && action == ResultingAction.WARRANTY_TRANSFER) {
                throw new InvalidRequestException(ErrorCode.WARRANTY_BULK_NOT_ALLOWED);
            }

            if (itemReq.productUnitId() == null
                    && (itemReq.quantity() == null
                        || itemReq.quantity().compareTo(java.math.BigDecimal.ZERO) <= 0)) {
                throw new InvalidRequestException(ErrorCode.INVALID_QUANTITY.format( itemReq.quantity()));
            }

            if (itemReq.productUnitId() != null && itemReq.productUnitId() > 0) {
                var pu = productUnitRepository.findById(itemReq.productUnitId())
                        .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.PRODUCT_UNIT_NOT_FOUND));
                if (ProductUnitStatus.EXPORTED != pu.getStatus()) {
                    throw new InvalidRequestException(ErrorCode.RETURN_UNIT_NOT_SOLD);
                }
                if (!exportUnitIds.contains(pu.getId())) {
                    throw new InvalidRequestException(ErrorCode.RETURN_UNIT_NOT_IN_EXPORT);
                }
            }

            Long capProductId = itemReq.productUnitId() != null && itemReq.productUnitId() > 0
                    ? itemReq.productId() != null ? itemReq.productId()
                            : productUnitRepository.findById(itemReq.productUnitId())
                                    .map(ProductUnit::getProductId).orElse(null)
                    : itemReq.productId();
            if (capProductId != null) {
                BigDecimal soldQty = exportReceiptItemRepository
                        .sumQuantityByReceiptAndProduct(request.originalExportReceiptId(), capProductId);
                BigDecimal returnedQty = returnReceiptItemRepository
                        .sumBulkReturnedQtyByExportAndProduct(
                                request.originalExportReceiptId(), capProductId, ReturnReceiptStatus.CANCELLED)
                        .add(BigDecimal.valueOf(returnReceiptItemRepository
                                .countSerialReturnedByExportAndProduct(
                                        request.originalExportReceiptId(), capProductId, ReturnReceiptStatus.CANCELLED)));
                BigDecimal newQty = itemReq.productUnitId() != null && itemReq.productUnitId() > 0
                        ? BigDecimal.ONE : itemReq.quantity();
                if (soldQty == null || returnedQty.add(newQty).compareTo(soldQty) > 0) {
                    throw new InvalidRequestException(ErrorCode.RETURN_EXCEEDS_SOLD.format(
                            soldQty == null ? BigDecimal.ZERO : soldQty, returnedQty));
                }
            }

            returnReceiptItemRepository.save(ReturnReceiptItem.builder()
                    .returnReceiptId(receiptId)
                    .productUnitId(itemReq.productUnitId())
                    .productId(itemReq.productId())
                    .quantity(itemReq.quantity())
                    .condition(condition.name())
                    .resultingAction(action.name())
                    .description(itemReq.description())
                    .evidenceImage(itemReq.evidenceImage())
                    .defectCategoryId(itemReq.defectCategoryId())
                    .build());
        }

        return enrich(receipt);
    }

    @Transactional(readOnly = true)
    public ProductUnitLookup lookupUnitBySerial(String serial, Long exportReceiptId) {
        var opt = productUnitRepository.findBySerialNumberIgnoreCase(serial.trim());
        if (opt.isEmpty()) {
            return new ProductUnitLookup(false, false, null, null, null, null, null, null);
        }
        var pu = opt.get();
        var unitIdsInExport = exportReceiptItemUnitRepository.findProductUnitIdsByReceiptId(exportReceiptId);
        boolean inExport = unitIdsInExport.contains(pu.getId());

        String productName = null;
        String productSku = null;
        var productOpt = productRepository.findById(pu.getProductId());
        if (productOpt.isPresent()) {
            productName = productOpt.get().getName();
            productSku = productOpt.get().getSku();
        }

        return new ProductUnitLookup(true, inExport, pu.getId(), pu.getProductId(),
                productName, productSku, pu.getSerialNumber(), pu.getStatus().name());
    }

    @Transactional(readOnly = true)
    public ReturnableUnitsInfo returnableUnits(Long exportReceiptId) {
        exportReceiptRepository.findById(exportReceiptId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.EXPORT_RECEIPT_NOT_FOUND));
        var exportUnitIds = exportReceiptItemUnitRepository.findProductUnitIdsByReceiptId(exportReceiptId);
        Set<Long> heldUnitIds = exportUnitIds.isEmpty() ? Set.of()
                : new HashSet<>(returnReceiptItemRepository
                        .findHeldUnitIdsInNonCancelledReceipts(ReturnReceiptStatus.CANCELLED));
        var units = exportUnitIds.isEmpty() ? List.<ProductUnit>of()
                : productUnitRepository.findAllById(exportUnitIds).stream()
                        .filter(u -> ProductUnitStatus.EXPORTED == u.getStatus())
                        .toList();

        var soldByProduct = exportReceiptItemRepository
                .sumQuantityByReceiptGroupByProduct(exportReceiptId).stream()
                .collect(Collectors.toMap(row -> (Long) row[0], row -> (BigDecimal) row[1]));
        var productIds = new HashSet<Long>(units.stream().map(ProductUnit::getProductId).toList());
        productIds.addAll(soldByProduct.keySet());
        var products = productIds.isEmpty() ? Map.<Long, Product>of()
                : productRepository.findAllById(productIds).stream()
                        .collect(Collectors.toMap(Product::getId, Function.identity()));

        List<ReturnableUnit> unitList = units.stream()
                .map(u -> {
                    Product p = products.get(u.getProductId());
                    return new ReturnableUnit(u.getId(), u.getSerialNumber(), u.getProductId(),
                            p != null ? p.getName() : null, p != null ? p.getSku() : null,
                            heldUnitIds.contains(u.getId()), u.getWarrantyExpiresAt());
                })
                .toList();

        List<BulkSummary> bulkList = soldByProduct.entrySet().stream()
                .map(e -> {
                    Long pid = e.getKey();
                    BigDecimal sold = e.getValue();
                    BigDecimal returned = returnReceiptItemRepository
                            .sumBulkReturnedQtyByExportAndProduct(
                                    exportReceiptId, pid, ReturnReceiptStatus.CANCELLED)
                            .add(java.math.BigDecimal.valueOf(returnReceiptItemRepository
                                    .countSerialReturnedByExportAndProduct(
                                            exportReceiptId, pid, ReturnReceiptStatus.CANCELLED)));
                    Product p = products.get(pid);
                    return new BulkSummary(pid,
                            p != null ? p.getName() : null, p != null ? p.getSku() : null,
                            p != null ? p.getTrackingType() : null,
                            sold, returned, sold.subtract(returned));
                })
                .sorted(Comparator.comparing(BulkSummary::productName,
                        Comparator.nullsLast(String::compareTo)))
                .toList();
        return new ReturnableUnitsInfo(unitList, bulkList);
    }

    public record ReturnableUnitsInfo(List<ReturnableUnit> units, List<BulkSummary> bulkSummary) {}

    public record ReturnableUnit(Long unitId, String serialNumber, Long productId,
                                 String productName, String productSku, boolean held,
                                 java.time.Instant warrantyExpiresAt) {}

    public record BulkSummary(Long productId, String productName, String productSku, String trackingType,
                              BigDecimal soldQty, BigDecimal returnedQty, BigDecimal remainingQty) {}

    public record ProductUnitLookup(
            boolean found, boolean inExport, Long productUnitId, Long productId,
            String productName, String productSku, String serialNumber, String status) {}

    @Transactional
    @AuditLog(action = LogConstant.Action.APPROVE_RETURN, entity = LogConstant.Entity.RETURN_RECEIPT)
    public ReturnReceiptResponse approve(Long id) {
        Long userId = securityPolicy.requireAuthenticated();
        var receipt = returnReceiptRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.RETURN_RECEIPT_NOT_FOUND));

        securityPolicy.requireNotCreator(receipt.getCreatedBy());
        returnReceiptStateMachine.validate(receipt.getStatus(), ReturnReceiptStatus.COMPLETED);

        var items = returnReceiptItemRepository.findByReturnReceiptId(receipt.getId());
        for (var item : items) {
            if (item.getProductUnitId() == null) {
                processBulkUnit(receipt.getId(), userId, item);
                continue;
            }
            var pu = productUnitRepository.findByIdForUpdate(item.getProductUnitId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            ErrorCode.PRODUCT_UNIT_NOT_FOUND, item.getProductUnitId()));
            if (ProductUnitStatus.EXPORTED != pu.getStatus()) {
                throw new InvalidRequestException(
                        ErrorCode.RETURN_UNIT_NOT_SOLD.format(pu.getStatus()));
            }

            ProductUnitStatus oldStatus = pu.getStatus();
            ResultingAction action = ResultingAction.valueOf(item.getResultingAction());

            switch (action) {
                case REJECT, SCRAP -> {
                    pu.setStatus(ProductUnitStatus.PENDING_DISPOSAL);
                    assignLocationIfExists(pu, QcProcessingLocations.QC_SHELF_4_DEAD);
                }
                case RESTOCK -> {
                    pu.setStatus(ProductUnitStatus.RETURN_QC_HOLD);
                    assignLocationIfExists(pu, QcProcessingLocations.QC_SHELF_1_NEW_RETURNS);
                }
                case WARRANTY_TRANSFER -> {
                    pu.setStatus(ProductUnitStatus.WAITING_RMA_EXPORT);
                    assignLocationIfExists(pu, QcProcessingLocations.QC_SHELF_2_WAIT_RMA);
                }
            }

            productUnitRepository.save(pu);
            statusLogRepository.save(ProductUnitStatusLog.builder()
                    .productUnitId(pu.getId())
                    .fromStatus(oldStatus.name())
                    .toStatus(pu.getStatus().name())
                    .sourceType(SourceType.RETURN_RECEIPT.name())
                    .sourceId(receipt.getId())
                    .changedBy(userId)
                    .build());
        }

        receipt.setStatus(ReturnReceiptStatus.COMPLETED);
        receipt.setApprovedBy(userId);
        receipt.setApprovedAt(java.time.Instant.now());
        receipt = returnReceiptRepository.save(receipt);

        return enrich(receipt);
    }

    private void processBulkUnit(Long receiptId, Long userId, ReturnReceiptItem item) {
        if (item.getProductId() == null
                || item.getQuantity() == null
                || item.getQuantity().compareTo(java.math.BigDecimal.ZERO) <= 0) {
            throw new InvalidRequestException(ErrorCode.INVALID_QUANTITY.format( item.getQuantity()));
        }
        var product = productRepository.findById(item.getProductId())
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.PRODUCT_NOT_FOUND));

        ProductUnitStatus targetStatus;
        String targetLocation;
        ResultingAction action = ResultingAction.valueOf(item.getResultingAction());
        switch (action) {
            case RESTOCK -> {
                targetStatus = ProductUnitStatus.RETURN_QC_HOLD;
                targetLocation = QcProcessingLocations.QC_SHELF_1_NEW_RETURNS;
            }
            case WARRANTY_TRANSFER -> {
                targetStatus = ProductUnitStatus.WAITING_RMA_EXPORT;
                targetLocation = QcProcessingLocations.QC_SHELF_2_WAIT_RMA;
            }
            default -> {
                targetStatus = ProductUnitStatus.PENDING_DISPOSAL;
                targetLocation = QcProcessingLocations.QC_SHELF_4_DEAD;
            }
        }

        ProductUnit unit = ProductUnit.builder()
                .productId(item.getProductId())
                .trackingType(product.getTrackingType())
                .initialQuantity(item.getQuantity())
                .remainingQuantity(item.getQuantity())
                .locationId(resolveLocationId(targetLocation))
                .status(targetStatus)
                .importedAt(Instant.now())
                .build();
        unit = productUnitRepository.save(unit);

        statusLogRepository.save(ProductUnitStatusLog.builder()
                .productUnitId(unit.getId())
                .fromStatus(null)
                .toStatus(targetStatus.name())
                .sourceType(SourceType.RETURN_RECEIPT.name())
                .sourceId(receiptId)
                .changedBy(userId)
                .build());
    }

    private void assignLocationIfExists(ProductUnit pu, String fullCode) {
        Long locationId = resolveLocationId(fullCode);
        if (locationId != null) {
            pu.setLocationId(locationId);
        }
    }

    private Long resolveLocationId(String fullCode) {
        return locationRepository.findByFullCode(fullCode).map(Location::getId).orElse(null);
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.CANCEL_RETURN, entity = LogConstant.Entity.RETURN_RECEIPT)
    public ReturnReceiptResponse cancel(Long id) {        var receipt = returnReceiptRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.RETURN_RECEIPT_NOT_FOUND));

        returnReceiptStateMachine.validate(receipt.getStatus(), ReturnReceiptStatus.CANCELLED);

        receipt.setStatus(ReturnReceiptStatus.CANCELLED);
        return enrich(returnReceiptRepository.save(receipt));
    }

    private Map<Long, String> fetchCustomerMap(List<ReturnReceipt> receipts) {
        var ids = receipts.stream().map(ReturnReceipt::getCustomerId).filter(java.util.Objects::nonNull).distinct().toList();
        return customerRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(Customer::getId, Customer::getName));
    }

    private Map<Long, String> fetchUserMap(List<ReturnReceipt> receipts) {
        var ids = receipts.stream()
                .flatMap(r -> {
                    var list = new java.util.ArrayList<Long>();
                    list.add(r.getCreatedBy());
                    if (r.getApprovedBy() != null) list.add(r.getApprovedBy());
                    return list.stream();
                })
                .distinct().toList();
        return userRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(User::getId, User::getFullName));
    }

    private Map<Long, List<ReturnReceiptItem>> fetchItems(List<ReturnReceipt> receipts) {
        var ids = receipts.stream().map(ReturnReceipt::getId).toList();
        return returnReceiptItemRepository.findByReturnReceiptIdIn(ids).stream()
                .collect(Collectors.groupingBy(ReturnReceiptItem::getReturnReceiptId));
    }

    private record ItemProductInfo(Map<Long, ProductUnit> productUnitMap, Map<Long, Product> productMap) {}

    private ItemProductInfo fetchItemProductInfo(List<ReturnReceiptItem> items) {
        var puIds = items.stream()
                .map(ReturnReceiptItem::getProductUnitId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        var productUnitMap = puIds.isEmpty()
                ? java.util.Collections.<Long, ProductUnit>emptyMap()
                : productUnitRepository.findAllById(puIds).stream()
                .collect(Collectors.toMap(ProductUnit::getId, Function.identity()));

        var productIds = new HashSet<>(items.stream()
                .map(ReturnReceiptItem::getProductId)
                .filter(Objects::nonNull)
                .toList());
        productUnitMap.values().forEach(pu -> productIds.add(pu.getProductId()));

        var productMap = productIds.isEmpty()
                ? java.util.Collections.<Long, Product>emptyMap()
                : productRepository.findAllById(productIds).stream()
                .collect(Collectors.toMap(Product::getId, Function.identity()));

        return new ItemProductInfo(productUnitMap, productMap);
    }

    private ReturnReceiptStatus safeParseStatus(String value) {
        if (value == null || value.isBlank()) return null;
        try { return ReturnReceiptStatus.valueOf(value.toUpperCase()); }
        catch (IllegalArgumentException e) { throw new InvalidRequestException(ErrorCode.INVALID_STATUS.format(value)); }
    }

    private ReturnReceiptResponse enrich(ReturnReceipt receipt) {
        var items = returnReceiptItemRepository.findByReturnReceiptId(receipt.getId());
        String customerName = null;
        if (receipt.getCustomerId() != null) {
            customerName = customerRepository.findById(receipt.getCustomerId())
                    .map(c -> c.getName()).orElse(null);
        }
        var createdByName = userRepository.findById(receipt.getCreatedBy())
                .map(User::getFullName).orElse(null);
        var approvedByName = receipt.getApprovedBy() != null
                ? userRepository.findById(receipt.getApprovedBy()).map(User::getFullName).orElse(null)
                : null;
        var productInfo = fetchItemProductInfo(items);
        return ReturnReceiptMappingHelper.map(receipt, customerName, createdByName, approvedByName, items,
                productInfo.productUnitMap(), productInfo.productMap());
    }
}
