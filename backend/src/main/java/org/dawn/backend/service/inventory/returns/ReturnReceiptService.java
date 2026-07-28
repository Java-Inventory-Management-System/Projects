package org.dawn.backend.service.inventory.returns;

import org.dawn.backend.shared.statemachine.StateMachine;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dawn.backend.aspect.AuditLog;
import org.dawn.backend.config.web.response.ResponsePage;
import org.dawn.backend.constant.enums.inventory.adjustments.*;
import org.dawn.backend.constant.enums.inventory.exports.*;
import org.dawn.backend.constant.enums.inventory.imports.*;
import org.dawn.backend.constant.enums.inventory.returns.*;
import org.dawn.backend.constant.enums.inventory.stockcheck.*;
import org.dawn.backend.constant.enums.inventory.warranty.*;
import org.dawn.backend.constant.enums.inventory.*;
import org.dawn.backend.constant.shared.LogConstant;
import org.dawn.backend.constant.shared.Message;
import org.dawn.backend.controller.inventory.request.ReturnReceiptRequest;
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
import org.dawn.backend.repository.inventory.exports.ExportReceiptItemUnitRepository;
import org.dawn.backend.repository.inventory.exports.ExportReceiptRepository;
import org.dawn.backend.repository.inventory.returns.ReturnReceiptItemRepository;
import org.dawn.backend.repository.inventory.returns.ReturnReceiptRepository;
import org.dawn.backend.shared.util.ReceiptCodeGenerator;
import org.dawn.backend.config.security.SecurityPolicy;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    private final StateMachine<ReturnReceiptStatus> returnReceiptStateMachine;
    private final SecurityPolicy securityPolicy;

    @Transactional(readOnly = true)
    public ResponsePage<ReturnReceiptResponse> findAll(Pageable pageable) {
        var page = returnReceiptRepository.findAll(pageable);
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
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.RETURN_RECEIPT_NOT_FOUND));
        return enrich(receipt);
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.CREATE_RETURN, entity = LogConstant.Entity.RETURN_RECEIPT)
    public ReturnReceiptResponse create(ReturnReceiptRequest request) {
        Long userId = securityPolicy.requireAuthenticated();

        if (request.items() == null || request.items().isEmpty()) {
            throw new InvalidRequestException(Message.Inventory.RETURN_ITEMS_REQUIRED);
        }
        if (request.reason() == null || request.reason().isBlank()) {
            throw new InvalidRequestException(Message.Inventory.RETURN_REASON_REQUIRED);
        }
        if (request.originalExportReceiptId() == null) {
            throw new InvalidRequestException(Message.Inventory.RETURN_EXPORT_REQUIRED);
        }
        if (request.customerId() == null) {
            throw new InvalidRequestException(Message.Inventory.RETURN_CUSTOMER_REQUIRED);
        }

        String reason = request.reason().toUpperCase();
        try {
            ReturnReason.valueOf(reason);
        } catch (IllegalArgumentException e) {
            throw new InvalidRequestException(Message.format(Message.Inventory.RETURN_INVALID_REASON, request.reason()));
        }

        var exportReceipt = exportReceiptRepository.findById(request.originalExportReceiptId())
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.EXPORT_RECEIPT_NOT_FOUND));

        String receiptCode = ReceiptCodeGenerator.generate("RET-", returnReceiptRepository::existsByReceiptCode);

        ReturnReceipt receipt = ReturnReceipt.builder()
                .receiptCode(receiptCode)
                .customerId(request.customerId())
                .originalExportReceiptId(request.originalExportReceiptId())
                .reason(reason)
                .status(ReturnReceiptStatus.PENDING_APPROVAL)
                .note(request.note())
                .createdBy(userId)
                .build();
        receipt = returnReceiptRepository.save(receipt);
        Long receiptId = receipt.getId();

        for (var itemReq : request.items()) {
            String condition = itemReq.condition().toUpperCase();
            try {
                ReturnCondition.valueOf(condition);
            } catch (IllegalArgumentException e) {
                throw new InvalidRequestException(Message.format(Message.Inventory.RETURN_INVALID_CONDITION, itemReq.condition()));
            }

            String action = itemReq.resultingAction().toUpperCase();
            try {
                ResultingAction.valueOf(action);
            } catch (IllegalArgumentException e) {
                throw new InvalidRequestException(Message.format(Message.Inventory.RETURN_INVALID_ACTION, itemReq.resultingAction()));
            }

            if (itemReq.productUnitId() != null) {
                var pu = productUnitRepository.findById(itemReq.productUnitId())
                        .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.PRODUCT_UNIT_NOT_FOUND));
                if (ProductUnitStatus.EXPORTED != pu.getStatus()) {
                    throw new InvalidRequestException(Message.Inventory.RETURN_UNIT_NOT_SOLD);
                }
            }

            returnReceiptItemRepository.save(ReturnReceiptItem.builder()
                    .returnReceiptId(receiptId)
                    .productUnitId(itemReq.productUnitId())
                    .productId(itemReq.productId())
                    .quantity(itemReq.quantity())
                    .condition(condition)
                    .resultingAction(action)
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

    public record ProductUnitLookup(
            boolean found, boolean inExport, Long productUnitId, Long productId,
            String productName, String productSku, String serialNumber, String status) {}

    @Transactional
    @AuditLog(action = LogConstant.Action.APPROVE_RETURN, entity = LogConstant.Entity.RETURN_RECEIPT)
    public ReturnReceiptResponse approve(Long id) {
        Long userId = securityPolicy.requireAuthenticated();
        var receipt = returnReceiptRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.RETURN_RECEIPT_NOT_FOUND));

        securityPolicy.requireNotCreator(receipt.getCreatedBy());
        returnReceiptStateMachine.validate(receipt.getStatus(), ReturnReceiptStatus.COMPLETED);

        var items = returnReceiptItemRepository.findByReturnReceiptId(receipt.getId());
        for (var item : items) {
            if (item.getProductUnitId() == null) continue;
            var pu = productUnitRepository.findByIdForUpdate(item.getProductUnitId())
                    .orElse(null);
            if (pu == null) continue;

            ProductUnitStatus oldStatus = pu.getStatus();
            String action = item.getResultingAction();

            if (ResultingAction.RESTOCK.name().equals(action)) {
                pu.setStatus(ProductUnitStatus.RETURNED);
            } else if (ResultingAction.SCRAP.name().equals(action)) {
                pu.setStatus(ProductUnitStatus.DISPOSED);
            } else if (ResultingAction.WARRANTY_TRANSFER.name().equals(action)) {
                pu.setStatus(ProductUnitStatus.DEFECTIVE);
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

    @Transactional
    @AuditLog(action = LogConstant.Action.CANCEL_RETURN, entity = LogConstant.Entity.RETURN_RECEIPT)
    public ReturnReceiptResponse cancel(Long id) {
        var receipt = returnReceiptRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.RETURN_RECEIPT_NOT_FOUND));

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
