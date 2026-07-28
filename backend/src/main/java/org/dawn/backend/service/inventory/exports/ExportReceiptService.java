package org.dawn.backend.service.inventory.exports;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dawn.backend.shared.statemachine.StateMachine;
import org.dawn.backend.aspect.AuditLog;
import org.dawn.backend.config.web.response.ResponsePage;
import org.dawn.backend.constant.enums.inventory.exports.ExportReceiptStatus;
import org.springframework.data.domain.Page;
import org.dawn.backend.constant.enums.catalog.TrackingType;
import org.dawn.backend.constant.enums.inventory.exports.ExportReason;
import org.dawn.backend.constant.enums.inventory.ProductUnitStatus;
import org.dawn.backend.constant.enums.inventory.SourceType;
import org.dawn.backend.constant.shared.LogConstant;
import org.dawn.backend.constant.shared.Message;
import org.dawn.backend.controller.inventory.request.ExportReceiptRequest;
import org.dawn.backend.controller.inventory.request.FulfillExportRequest;
import org.dawn.backend.controller.inventory.request.RejectExportRequest;
import org.dawn.backend.controller.inventory.response.ExportReceiptResponse;
import org.dawn.backend.entity.auth.User;
import org.dawn.backend.entity.catalog.Product;
import org.dawn.backend.entity.inventory.Customer;
import org.dawn.backend.entity.inventory.ExportReceipt;
import org.dawn.backend.entity.inventory.ExportReceiptItem;
import org.dawn.backend.entity.inventory.ExportReceiptItemUnit;
import org.dawn.backend.entity.inventory.ExportReceiptStatusHistory;
import org.dawn.backend.entity.inventory.ProductUnit;
import org.dawn.backend.entity.inventory.ProductUnitStatusLog;
import org.dawn.backend.exception.type.InvalidRequestException;
import org.dawn.backend.exception.type.ResourceAlreadyExistedException;
import org.dawn.backend.exception.type.ResourceNotFoundException;
import org.dawn.backend.repository.auth.UserRepository;
import org.dawn.backend.repository.catalog.ProductRepository;
import org.dawn.backend.repository.inventory.CustomerRepository;
import org.dawn.backend.repository.inventory.exports.ExportReceiptItemRepository;
import org.dawn.backend.repository.inventory.exports.ExportReceiptItemUnitRepository;
import org.dawn.backend.repository.inventory.exports.ExportReceiptRepository;
import org.dawn.backend.repository.inventory.exports.ExportReceiptStatusHistoryRepository;
import org.dawn.backend.repository.inventory.ProductUnitRepository;
import org.dawn.backend.repository.inventory.ProductUnitStatusLogRepository;
import org.dawn.backend.repository.inventory.stockcheck.StockCheckItemRepository;
import org.dawn.backend.shared.util.ReceiptCodeGenerator;
import org.dawn.backend.config.security.SecurityPolicy;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExportReceiptService {

    private final ExportReceiptRepository exportReceiptRepository;
    private final ExportReceiptItemRepository exportReceiptItemRepository;
    private final ExportReceiptItemUnitRepository exportReceiptItemUnitRepository;
    private final ExportReceiptStatusHistoryRepository statusHistoryRepository;
    private final ProductUnitRepository productUnitRepository;
    private final ProductUnitStatusLogRepository statusLogRepository;
    private final StockCheckItemRepository stockCheckItemRepository;
    private final ProductRepository productRepository;
    private final CustomerRepository customerRepository;
    private final UserRepository userRepository;
    private final StateMachine<ExportReceiptStatus> exportReceiptStateMachine;
    private final SecurityPolicy securityPolicy;

    private static final List<String> BULK_UNITS = List.of(
            org.dawn.backend.constant.enums.catalog.ProductUnit.METER.name(),
            org.dawn.backend.constant.enums.catalog.ProductUnit.KG.name());

    @Transactional(readOnly = true)
    public ResponsePage<ExportReceiptResponse> findAll(Pageable pageable, String status) {
        ExportReceiptStatus s = safeParseExportStatus(status);
        Page<ExportReceipt> page = s != null
                ? exportReceiptRepository.findByStatus(s, pageable)
                : status != null && !status.isBlank()
                    ? Page.empty(pageable)
                    : exportReceiptRepository.findAll(pageable);
        var receipts = page.getContent();
        var customerIds = receipts.stream().map(ExportReceipt::getCustomerId).filter(java.util.Objects::nonNull).distinct().toList();
        var customers = customerRepository.findAllById(customerIds).stream()
                .collect(Collectors.toMap(Customer::getId, Customer::getName));
        var userIds = receipts.stream().flatMap(r -> {
            var ids = new java.util.ArrayList<Long>();
            ids.add(r.getCreatedBy());
            if (r.getApprovedBy() != null) ids.add(r.getApprovedBy());
            if (r.getFulfilledBy() != null) ids.add(r.getFulfilledBy());
            if (r.getRejectedBy() != null) ids.add(r.getRejectedBy());
            return ids.stream();
        }).distinct().toList();
        var userNameMap = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, User::getFullName));
        return ResponsePage.of(page.map(r -> toResponse(r, customers, userNameMap)));
    }

    @Transactional(readOnly = true)
    public ExportReceiptResponse findOne(Long id) {
        var receipt = exportReceiptRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.EXPORT_RECEIPT_NOT_FOUND));
        return toResponse(receipt);
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.CREATE_EXPORT, entity = LogConstant.Entity.EXPORT_RECEIPT)
    public ExportReceiptResponse create(ExportReceiptRequest request) {
        Long userId = securityPolicy.requireAuthenticated();

        if (request.items() == null || request.items().isEmpty()) {
            throw new InvalidRequestException(Message.Inventory.AT_LEAST_ONE_ITEM_REQUIRED);
        }
        if (request.reason() == null || request.reason().isBlank()) {
            throw new InvalidRequestException(Message.Inventory.EXPORT_REASON_REQUIRED);
        }
        if (ExportReason.SALE.name().equalsIgnoreCase(request.reason()) && request.customerId() == null) {
            throw new InvalidRequestException(Message.Inventory.CUSTOMER_REQUIRED_FOR_SALE);
        }

        String reason = request.reason().toUpperCase();
        try {
            ExportReason.valueOf(reason);
        } catch (IllegalArgumentException e) {
            throw new InvalidRequestException(Message.format(Message.Inventory.INVALID_EXPORT_REASON, request.reason()));
        }

        String receiptCode = generateReceiptCode();
        if (exportReceiptRepository.existsByReceiptCode(receiptCode)) {
            throw new ResourceAlreadyExistedException(Message.Inventory.RECEIPT_CODE_EXISTS);
        }

        ExportReceipt receipt = ExportReceipt.builder()
                .receiptCode(receiptCode)
                .reason(reason)
                .customerId(request.customerId())
                .status(ExportReceiptStatus.PENDING)
                .note(request.note())
                .createdBy(userId)
                .build();
        receipt = exportReceiptRepository.save(receipt);
        Long receiptId = receipt.getId();

        BigDecimal totalAmount = BigDecimal.ZERO;

        for (var itemReq : request.items()) {
            Product product = productRepository.findById(itemReq.productId())
                    .orElseThrow(() -> new ResourceNotFoundException(Message.Catalog.PRODUCT_NOT_FOUND));

            BigDecimal inStock = getInStockQuantity(product);
            BigDecimal committed = exportReceiptRepository.sumCommittedQuantityByProductIdAndStatusIn(
                    itemReq.productId(), List.of(ExportReceiptStatus.PENDING, ExportReceiptStatus.APPROVED));
            BigDecimal available = inStock.subtract(committed);

            if (available.compareTo(itemReq.quantity()) < 0) {
                throw new InvalidRequestException(
                        Message.format(Message.Inventory.INSUFFICIENT_STOCK, product.getName(), available, itemReq.quantity()));
            }

            BigDecimal totalPrice = itemReq.unitPrice() != null
                    ? itemReq.unitPrice().multiply(itemReq.quantity())
                    : BigDecimal.ZERO;

            ExportReceiptItem item = ExportReceiptItem.builder()
                    .receiptId(receiptId)
                    .productId(itemReq.productId())
                    .quantity(itemReq.quantity())
                    .unitPrice(itemReq.unitPrice())
                    .totalPrice(totalPrice)
                    .build();
            item = exportReceiptItemRepository.save(item);

            totalAmount = totalAmount.add(totalPrice);
        }

        receipt.setTotalAmount(totalAmount);
        receipt = exportReceiptRepository.save(receipt);

        statusHistoryRepository.save(ExportReceiptStatusHistory.builder()
                .receiptId(receipt.getId())
                .fromStatus("NEW")
                .toStatus(ExportReceiptStatus.PENDING.name())
                .changedBy(userId)
                .build());

        return toResponse(receipt);
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.APPROVE_EXPORT, entity = LogConstant.Entity.EXPORT_RECEIPT)
    public ExportReceiptResponse approve(Long id) {
        Long userId = securityPolicy.requireAuthenticated();
        ExportReceipt receipt = exportReceiptRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.EXPORT_RECEIPT_NOT_FOUND));

        exportReceiptStateMachine.validate(receipt.getStatus(), ExportReceiptStatus.APPROVED);

        ExportReceiptStatus oldStatus = receipt.getStatus();
        receipt.setStatus(ExportReceiptStatus.APPROVED);
        receipt.setApprovedBy(userId);
        receipt = exportReceiptRepository.save(receipt);

        statusHistoryRepository.save(ExportReceiptStatusHistory.builder()
                .receiptId(receipt.getId())
                .fromStatus(oldStatus.name())
                .toStatus(ExportReceiptStatus.APPROVED.name())
                .changedBy(userId)
                .build());

        return toResponse(receipt);
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.REJECT_EXPORT, entity = LogConstant.Entity.EXPORT_RECEIPT)
    public ExportReceiptResponse reject(Long id, RejectExportRequest request) {
        Long userId = securityPolicy.requireAuthenticated();
        ExportReceipt receipt = exportReceiptRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.EXPORT_RECEIPT_NOT_FOUND));

        exportReceiptStateMachine.validate(receipt.getStatus(), ExportReceiptStatus.CANCELLED);

        receipt.setStatus(ExportReceiptStatus.CANCELLED);
        receipt.setRejectedBy(userId);
        receipt.setRejectedAt(Instant.now());
        receipt.setRejectReason(request.reason());
        receipt = exportReceiptRepository.save(receipt);

        statusHistoryRepository.save(ExportReceiptStatusHistory.builder()
                .receiptId(receipt.getId())
                .fromStatus(ExportReceiptStatus.PENDING.name())
                .toStatus(ExportReceiptStatus.CANCELLED.name())
                .reason(request.reason())
                .changedBy(userId)
                .build());

        return toResponse(receipt);
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.FULFILL_EXPORT, entity = LogConstant.Entity.EXPORT_RECEIPT)
    public ExportReceiptResponse fulfill(Long id, FulfillExportRequest request) {
        Long userId = securityPolicy.requireAuthenticated();
        ExportReceipt receipt = exportReceiptRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.EXPORT_RECEIPT_NOT_FOUND));

        exportReceiptStateMachine.validate(receipt.getStatus(), ExportReceiptStatus.COMPLETED);

        ExportReceiptStatus oldStatus = receipt.getStatus();
        var receiptItems = exportReceiptItemRepository.findByReceiptId(receipt.getId());
        var itemMap = receiptItems.stream().collect(Collectors.toMap(ExportReceiptItem::getId, i -> i));
        var productIds = receiptItems.stream().map(ExportReceiptItem::getProductId).toList();
        var products = productRepository.findAllById(productIds).stream()
                .collect(Collectors.toMap(Product::getId, p -> p));

        BigDecimal totalCogs = BigDecimal.ZERO;
        String reason = receipt.getReason();
        boolean isSale = ExportReason.SALE.name().equals(reason);
        boolean isReturnSupplier = ExportReason.RETURN_SUPPLIER.name().equals(reason);
        boolean isDispose = ExportReason.DISPOSE.name().equals(reason);

        for (var fulfillItem : request.items()) {
            ExportReceiptItem item = itemMap.get(fulfillItem.itemId());
            if (item == null) {
                throw new InvalidRequestException(Message.format(Message.Inventory.EXPORT_ITEM_NOT_FOUND, fulfillItem.itemId()));
            }

            Product product = products.get(item.getProductId());
            String unit = product.getUnit();
            boolean isBulk = BULK_UNITS.contains(unit);

            if (isBulk) {
                BigDecimal actualQty = fulfillItem.actualQuantity();
                if (actualQty == null || actualQty.compareTo(BigDecimal.ZERO) <= 0) {
                    throw new InvalidRequestException(Message.Inventory.EXPORT_ACTUAL_QTY_REQUIRED_BULK);
                }

                var bulkUnits = productUnitRepository.findByProductIdAndStatusWithLock(item.getProductId());
                BigDecimal remaining = actualQty;
                for (ProductUnit pu : bulkUnits) {
                    if (remaining.compareTo(BigDecimal.ZERO) <= 0) break;
                    BigDecimal take = pu.getRemainingQuantity().min(remaining);
                    exportReceiptItemUnitRepository.save(ExportReceiptItemUnit.builder()
                            .exportReceiptItemId(item.getId())
                            .productUnitId(pu.getId())
                            .quantity(take)
                            .sellPrice(item.getUnitPrice())
                            .build());
                    pu.setRemainingQuantity(pu.getRemainingQuantity().subtract(take));
                    remaining = remaining.subtract(take);
                }
            } else {
                String trackingType = product.getTrackingType();
                if (TrackingType.SERIALIZED.name().equals(trackingType)) {
                    List<String> serials = fulfillItem.serialNumbers();
                    if (serials == null || serials.isEmpty()) {
                        throw new InvalidRequestException(Message.Inventory.EXPORT_SERIALS_REQUIRED);
                    }

                    for (String sn : serials) {
                        ProductUnit pu = productUnitRepository.findBySerialNumber(sn)
                                .orElseThrow(() -> new InvalidRequestException(
                                        Message.format(Message.Inventory.PRODUCT_UNIT_NOT_FOUND, sn)));

                        if (!pu.getProductId().equals(item.getProductId())) {
                            throw new InvalidRequestException(Message.format(Message.Inventory.EXPORT_SERIAL_WRONG_PRODUCT, sn, product.getName()));
                        }
                        if (ProductUnitStatus.IN_STOCK != pu.getStatus()) {
                            throw new InvalidRequestException(Message.format(Message.Inventory.EXPORT_SERIAL_NOT_AVAILABLE, sn, pu.getStatus()));
                        }
                        if (stockCheckItemRepository.existsByProductUnitIdInActiveCheck(pu.getId())) {
                            throw new InvalidRequestException(Message.format(Message.Inventory.EXPORT_SERIAL_IN_STOCK_CHECK, sn));
                        }

                        ProductUnitStatus oldUnitStatus = pu.getStatus();
                        ProductUnitStatus targetStatus;
                        if (isDispose) {
                            targetStatus = ProductUnitStatus.DISPOSED;
                        } else if (isReturnSupplier) {
                            targetStatus = ProductUnitStatus.RETURNED_TO_SUPPLIER;
                        } else {
                            targetStatus = ProductUnitStatus.EXPORTED;
                        }

                        pu.setStatus(targetStatus);
                        if (isSale) {
                            Instant now = Instant.now();
                            pu.setWarrantyStartDate(now);
                            if (pu.getWarrantyMonths() != null) {
                                pu.setWarrantyExpiresAt(now.plusSeconds(pu.getWarrantyMonths() * 30L * 24L * 60L * 60L));
                            }
                        }
                        productUnitRepository.save(pu);

                        exportReceiptItemUnitRepository.save(ExportReceiptItemUnit.builder()
                                .exportReceiptItemId(item.getId())
                                .productUnitId(pu.getId())
                                .quantity(BigDecimal.ONE)
                                .sellPrice(item.getUnitPrice())
                                .build());

                        statusLogRepository.save(ProductUnitStatusLog.builder()
                                .productUnitId(pu.getId())
                                .fromStatus(oldUnitStatus.name())
                                .toStatus(pu.getStatus().name())
                                .sourceType(SourceType.EXPORT_RECEIPT.name())
                                .sourceId(receipt.getId())
                                .changedBy(userId)
                                .build());

                        if (isSale || ExportReason.INTERNAL.name().equals(reason)) {
                            if (pu.getCostPrice() != null) {
                                totalCogs = totalCogs.add(pu.getCostPrice());
                            }
                        }
                    }
                }
            }
        }

        receipt.setStatus(ExportReceiptStatus.COMPLETED);
        receipt.setFulfilledBy(userId);
        receipt.setFulfilledAt(Instant.now());
        receipt.setTotalCogs(totalCogs);
        receipt = exportReceiptRepository.save(receipt);

        statusHistoryRepository.save(ExportReceiptStatusHistory.builder()
                .receiptId(receipt.getId())
                .fromStatus(oldStatus.name())
                .toStatus(ExportReceiptStatus.COMPLETED.name())
                .changedBy(userId)
                .build());

        return toResponse(receipt);
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.CANCEL_EXPORT, entity = LogConstant.Entity.EXPORT_RECEIPT)
    public ExportReceiptResponse cancel(Long id) {
        Long userId = securityPolicy.requireAuthenticated();
        ExportReceipt receipt = exportReceiptRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.EXPORT_RECEIPT_NOT_FOUND));

        exportReceiptStateMachine.validate(receipt.getStatus(), ExportReceiptStatus.CANCELLED);

        ExportReceiptStatus oldStatus = receipt.getStatus();
        receipt.setStatus(ExportReceiptStatus.CANCELLED);
        receipt = exportReceiptRepository.save(receipt);

        statusHistoryRepository.save(ExportReceiptStatusHistory.builder()
                .receiptId(receipt.getId())
                .fromStatus(oldStatus.name())
                .toStatus(ExportReceiptStatus.CANCELLED.name())
                .changedBy(userId)
                .build());

        return toResponse(receipt);
    }

    private BigDecimal getInStockQuantity(Product product) {
        String unit = product.getUnit();
        boolean isBulk = BULK_UNITS.contains(unit);
        if (isBulk) {
            var units = productUnitRepository.findByProductIdAndStatus(product.getId(), ProductUnitStatus.IN_STOCK);
            return units.stream().map(ProductUnit::getRemainingQuantity)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
        }
        return BigDecimal.valueOf(productUnitRepository.countByProductIdAndStatus(
                product.getId(), ProductUnitStatus.IN_STOCK));
    }

    private ExportReceiptResponse toResponse(ExportReceipt receipt) {
        var items = exportReceiptItemRepository.findByReceiptId(receipt.getId());
        var productIds = items.stream().map(ExportReceiptItem::getProductId).toList();
        var products = productRepository.findAllById(productIds).stream()
                .collect(Collectors.toMap(Product::getId, p -> p));
        var trackingTypeMap = products.values().stream()
                .collect(Collectors.toMap(Product::getId, Product::getTrackingType));

        String customerName = null;
        if (receipt.getCustomerId() != null) {
            customerName = customerRepository.findById(receipt.getCustomerId())
                    .map(Customer::getName).orElse(null);
        }

        var createdByName = userRepository.findById(receipt.getCreatedBy())
                .map(User::getFullName).orElse(null);
        var approvedByName = receipt.getApprovedBy() != null
                ? userRepository.findById(receipt.getApprovedBy()).map(User::getFullName).orElse(null)
                : null;
        var fulfilledByName = receipt.getFulfilledBy() != null
                ? userRepository.findById(receipt.getFulfilledBy()).map(User::getFullName).orElse(null)
                : null;
        var rejectedByName = receipt.getRejectedBy() != null
                ? userRepository.findById(receipt.getRejectedBy()).map(User::getFullName).orElse(null)
                : null;
        return ExportReceiptMappingHelper.map(receipt, customerName, createdByName, approvedByName,
                fulfilledByName, rejectedByName, items, products, trackingTypeMap);
    }

    private ExportReceiptResponse toResponse(ExportReceipt receipt, Map<Long, String> customers, Map<Long, String> users) {
        var items = exportReceiptItemRepository.findByReceiptId(receipt.getId());
        var productIds = items.stream().map(ExportReceiptItem::getProductId).toList();
        var products = productRepository.findAllById(productIds).stream()
                .collect(Collectors.toMap(Product::getId, p -> p));
        var trackingTypeMap = products.values().stream()
                .collect(Collectors.toMap(Product::getId, Product::getTrackingType));
        return ExportReceiptMappingHelper.map(receipt,
                receipt.getCustomerId() != null ? customers.get(receipt.getCustomerId()) : null,
                users.get(receipt.getCreatedBy()),
                receipt.getApprovedBy() != null ? users.get(receipt.getApprovedBy()) : null,
                receipt.getFulfilledBy() != null ? users.get(receipt.getFulfilledBy()) : null,
                receipt.getRejectedBy() != null ? users.get(receipt.getRejectedBy()) : null,
                items, products, trackingTypeMap);
    }

    private String generateReceiptCode() {
        return ReceiptCodeGenerator.generate("EXP-", exportReceiptRepository::existsByReceiptCode);
    }

    private ExportReceiptStatus safeParseExportStatus(String value) {
        if (value == null || value.isBlank()) return null;
        try { return ExportReceiptStatus.valueOf(value.toUpperCase()); }
        catch (IllegalArgumentException e) { return null; }
    }
}