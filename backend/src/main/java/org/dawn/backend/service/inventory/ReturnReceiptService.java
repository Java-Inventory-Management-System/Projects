package org.dawn.backend.service.inventory;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dawn.backend.config.anno.AuditLog;
import org.dawn.backend.config.web.response.ResponsePage;
import org.dawn.backend.constant.inventory.*;
import org.dawn.backend.constant.shared.LogConstant;
import org.dawn.backend.constant.shared.Message;
import org.dawn.backend.controller.inventory.request.ReturnReceiptRequest;
import org.dawn.backend.controller.inventory.response.ReturnReceiptResponse;
import org.dawn.backend.entity.auth.User;
import org.dawn.backend.entity.catalog.Product;
import org.dawn.backend.entity.inventory.*;
import org.dawn.backend.exception.wrapper.InvalidRequestException;
import org.dawn.backend.exception.wrapper.ResourceNotFoundException;
import org.dawn.backend.repository.auth.UserRepository;
import org.dawn.backend.repository.catalog.ProductRepository;
import org.dawn.backend.repository.inventory.*;
import org.dawn.backend.utils.ReceiptCodeGenerator;
import org.dawn.backend.utils.SecurityUtils;
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
    private final ExportReceiptRepository exportReceiptRepository;
    private final CustomerRepository customerRepository;
    private final UserRepository userRepository;
    private final ProductUnitStatusLogRepository statusLogRepository;
    private final ProductRepository productRepository;
    private final ExportReceiptItemUnitRepository exportReceiptItemUnitRepository;

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
        Long userId = SecurityUtils.getCurrentUserId();
        if (userId == null) throw new InvalidRequestException(Message.Auth.USER_NOT_AUTHENTICATED);

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
        Long userId = SecurityUtils.getCurrentUserId();
        var receipt = returnReceiptRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.RETURN_RECEIPT_NOT_FOUND));

        if (receipt.getCreatedBy().equals(userId)) {
            throw new InvalidRequestException(Message.Inventory.CREATOR_CANNOT_APPROVE);
        }
        if (ReturnReceiptStatus.PENDING_APPROVAL != receipt.getStatus()) {
            throw new InvalidRequestException(Message.Inventory.RETURN_ONLY_PENDING);
        }

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

        if (ReturnReceiptStatus.CANCELLED == receipt.getStatus()) {
            throw new InvalidRequestException(Message.Inventory.RETURN_ALREADY_CANCELLED);
        }
        if (ReturnReceiptStatus.COMPLETED == receipt.getStatus()) {
            throw new InvalidRequestException(Message.Inventory.RETURN_ALREADY_COMPLETED);
        }

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
        var productUnitMap = puIds.isEmpty() ? Map.of()
                : productUnitRepository.findAllById(puIds).stream()
                .collect(Collectors.toMap(ProductUnit::getId, Function.identity()));

        var productIds = new HashSet<>(items.stream()
                .map(ReturnReceiptItem::getProductId)
                .filter(Objects::nonNull)
                .toList());
        productUnitMap.values().forEach(pu -> productIds.add(pu.getProductId()));

        var productMap = productIds.isEmpty() ? Map.of()
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
