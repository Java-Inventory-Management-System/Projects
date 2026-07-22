package org.dawn.backend.service.inventory;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dawn.backend.config.anno.AuditLog;
import org.dawn.backend.config.web.response.ResponsePage;
import org.dawn.backend.constant.inventory.ExportReceiptStatus;
import org.dawn.backend.constant.inventory.ExportReason;
import org.dawn.backend.constant.inventory.ProductUnitStatus;
import org.dawn.backend.constant.catalog.TrackingType;
import org.dawn.backend.constant.inventory.SourceType;
import org.dawn.backend.constant.shared.LogConstant;
import org.dawn.backend.constant.shared.Message;
import org.dawn.backend.controller.inventory.request.ExportReceiptRequest;
import org.dawn.backend.controller.inventory.response.ExportReceiptResponse;
import org.dawn.backend.entity.auth.User;
import org.dawn.backend.entity.catalog.Product;
import org.dawn.backend.entity.inventory.Customer;
import org.dawn.backend.entity.inventory.ExportReceipt;
import org.dawn.backend.entity.inventory.ExportReceiptItem;
import org.dawn.backend.entity.inventory.ExportReceiptItemUnit;
import org.dawn.backend.entity.inventory.ProductUnit;
import org.dawn.backend.entity.inventory.ProductUnitStatusLog;
import org.dawn.backend.entity.inventory.Customer;
import org.dawn.backend.exception.wrapper.InvalidRequestException;
import org.dawn.backend.exception.wrapper.ResourceAlreadyExistedException;
import org.dawn.backend.exception.wrapper.ResourceNotFoundException;
import org.dawn.backend.repository.auth.UserRepository;
import org.dawn.backend.repository.catalog.ProductRepository;
import org.dawn.backend.repository.inventory.CustomerRepository;
import org.dawn.backend.repository.inventory.ExportReceiptItemRepository;
import org.dawn.backend.repository.inventory.ExportReceiptItemUnitRepository;
import org.dawn.backend.repository.inventory.ExportReceiptRepository;
import org.dawn.backend.repository.inventory.ProductUnitRepository;
import org.dawn.backend.repository.inventory.ProductUnitStatusLogRepository;
import org.dawn.backend.utils.ReceiptCodeGenerator;
import org.dawn.backend.utils.SecurityUtils;
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
    private final ProductUnitRepository productUnitRepository;
    private final ProductUnitStatusLogRepository statusLogRepository;
    private final ProductRepository productRepository;
    private final CustomerRepository customerRepository;
    private final UserRepository userRepository;

    private static final List<String> BULK_UNITS = List.of(
            org.dawn.backend.constant.catalog.ProductUnit.METER.name(),
            org.dawn.backend.constant.catalog.ProductUnit.KG.name());

    @Transactional(readOnly = true)
    public ResponsePage<ExportReceiptResponse> findAll(Pageable pageable) {
        var page = exportReceiptRepository.findAll(pageable);
        var receipts = page.getContent();
        var customerIds = receipts.stream().map(ExportReceipt::getCustomerId).filter(java.util.Objects::nonNull).distinct().toList();
        var customers = customerRepository.findAllById(customerIds).stream()
                .collect(Collectors.toMap(Customer::getId, Customer::getName));
        var userIds = receipts.stream().flatMap(r -> {
            var ids = new java.util.ArrayList<Long>();
            ids.add(r.getCreatedBy());
            if (r.getApprovedBy() != null) ids.add(r.getApprovedBy());
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
        Long userId = SecurityUtils.getCurrentUserId();
        if (userId == null) throw new InvalidRequestException(Message.Auth.USER_NOT_AUTHENTICATED);

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
                .status(ExportReceiptStatus.PENDING_APPROVAL)
                .note(request.note())
                .createdBy(userId)
                .build();
        receipt = exportReceiptRepository.save(receipt);
        Long receiptId = receipt.getId();

        BigDecimal totalAmount = BigDecimal.ZERO;

        for (var itemReq : request.items()) {
            Product product = productRepository.findById(itemReq.productId())
                    .orElseThrow(() -> new ResourceNotFoundException(Message.Catalog.PRODUCT_NOT_FOUND));

            String unit = product.getUnit();
            boolean isBulk = BULK_UNITS.contains(unit);

            List<ProductUnit> available;
            if (isBulk) {
                available = productUnitRepository.findByProductIdAndStatusWithLock(itemReq.productId());
            } else {
                available = productUnitRepository.findAvailableForExportWithLock(itemReq.productId());
            }

            BigDecimal needed = itemReq.quantity();
            BigDecimal availableQty = isBulk
                    ? available.stream().map(ProductUnit::getRemainingQuantity)
                            .reduce(BigDecimal.ZERO, BigDecimal::add)
                    : BigDecimal.valueOf(available.size());

            if (availableQty.compareTo(needed) < 0) {
                throw new InvalidRequestException(
                        Message.format(Message.Inventory.INSUFFICIENT_STOCK, product.getName(), availableQty, needed));
            }

            BigDecimal totalPrice = itemReq.unitPrice() != null
                    ? itemReq.unitPrice().multiply(needed)
                    : BigDecimal.ZERO;

            ExportReceiptItem item = ExportReceiptItem.builder()
                    .receiptId(receiptId)
                    .productId(itemReq.productId())
                    .quantity(needed)
                    .unitPrice(itemReq.unitPrice())
                    .totalPrice(totalPrice)
                    .build();
            item = exportReceiptItemRepository.save(item);

            BigDecimal remaining = needed;
            if (isBulk) {
                for (ProductUnit pu : available) {
                    if (remaining.compareTo(BigDecimal.ZERO) <= 0) break;
                    BigDecimal take = pu.getRemainingQuantity().min(remaining);
                    exportReceiptItemUnitRepository.save(ExportReceiptItemUnit.builder()
                            .exportReceiptItemId(item.getId())
                            .productUnitId(pu.getId())
                            .quantity(take)
                            .sellPrice(itemReq.unitPrice())
                            .build());
                    remaining = remaining.subtract(take);
                }
            } else {
                int remainingInt = needed.intValue();
                for (ProductUnit pu : available) {
                    if (remainingInt <= 0) break;
                    exportReceiptItemUnitRepository.save(ExportReceiptItemUnit.builder()
                            .exportReceiptItemId(item.getId())
                            .productUnitId(pu.getId())
                            .quantity(BigDecimal.ONE)
                            .sellPrice(itemReq.unitPrice())
                            .build());
                    remainingInt--;
                }
            }

            totalAmount = totalAmount.add(totalPrice);
        }

        receipt.setTotalAmount(totalAmount);
        receipt = exportReceiptRepository.save(receipt);

        return toResponse(receipt);
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.APPROVE_EXPORT, entity = LogConstant.Entity.EXPORT_RECEIPT)
    public ExportReceiptResponse approve(Long id) {
        Long userId = SecurityUtils.getCurrentUserId();
        ExportReceipt receipt = exportReceiptRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.EXPORT_RECEIPT_NOT_FOUND));

        if (receipt.getCreatedBy().equals(userId)) {
            throw new InvalidRequestException(Message.Inventory.CREATOR_CANNOT_APPROVE);
        }
        if (ExportReceiptStatus.PENDING_APPROVAL != receipt.getStatus()) {
            throw new InvalidRequestException(Message.Inventory.ONLY_PENDING_APPROVAL_CAN_APPROVE);
        }

        String reason = receipt.getReason();
        boolean isSale = ExportReason.SALE.name().equals(reason);
        boolean isReturnSupplier = ExportReason.RETURN_SUPPLIER.name().equals(reason);
        boolean isDispose = ExportReason.DISPOSE.name().equals(reason);

        var items = exportReceiptItemRepository.findByReceiptId(receipt.getId());
        BigDecimal totalCogs = BigDecimal.ZERO;

        for (var item : items) {
            var units = exportReceiptItemUnitRepository.findByExportReceiptItemId(item.getId());
            for (var eiu : units) {
                ProductUnit pu = productUnitRepository.findByIdForUpdate(eiu.getProductUnitId())
                        .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.PRODUCT_UNIT_NOT_FOUND));

                ProductUnitStatus oldStatus = pu.getStatus();
                String trackingType = pu.getTrackingType();

                if (isDispose && ProductUnitStatus.DAMAGED_IN_STORAGE != oldStatus) {
                    throw new InvalidRequestException(
                            Message.Inventory.DISPOSE_ONLY_DAMAGED);
                }

                boolean isBulk = TrackingType.BULK.name().equals(trackingType);
                ProductUnitStatus targetStatus;
                if (isDispose) {
                    targetStatus = ProductUnitStatus.DISPOSED;
                } else if (isReturnSupplier) {
                    targetStatus = ProductUnitStatus.RETURNED_TO_SUPPLIER;
                } else {
                    targetStatus = ProductUnitStatus.SOLD;
                }

                if (isBulk) {
                    BigDecimal newRemaining = pu.getRemainingQuantity().subtract(eiu.getQuantity());
                    pu.setRemainingQuantity(newRemaining);
                    if (newRemaining.compareTo(BigDecimal.ZERO) > 0) {
                        if (!isDispose && !isReturnSupplier) {
                            continue;
                        }
                        pu.setRemainingQuantity(BigDecimal.ZERO);
                    }
                }

                pu.setStatus(targetStatus);

                if (isSale) {
                    Instant now = Instant.now();
                    pu.setWarrantyStartDate(now);
                    if (pu.getWarrantyMonths() != null) {
                        pu.setWarrantyExpiresAt(now.plusSeconds(pu.getWarrantyMonths() * 30L * 24L * 60L * 60L));
                    }
                }

                if (isSale || ExportReason.INTERNAL.name().equals(reason)) {
                    if (pu.getCostPrice() != null) {
                        totalCogs = totalCogs.add(pu.getCostPrice());
                    }
                }

                productUnitRepository.save(pu);

                statusLogRepository.save(ProductUnitStatusLog.builder()
                        .productUnitId(pu.getId())
                        .fromStatus(oldStatus.name())
                        .toStatus(pu.getStatus().name())
                        .sourceType(SourceType.EXPORT_RECEIPT.name())
                        .sourceId(receipt.getId())
                        .changedBy(userId)
                        .build());
            }
        }

        receipt.setStatus(ExportReceiptStatus.COMPLETED);
        receipt.setApprovedBy(userId);
        receipt.setTotalCogs(totalCogs);
        receipt = exportReceiptRepository.save(receipt);

        return toResponse(receipt);
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.CANCEL_EXPORT, entity = LogConstant.Entity.EXPORT_RECEIPT)
    public ExportReceiptResponse cancel(Long id) {
        ExportReceipt receipt = exportReceiptRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.EXPORT_RECEIPT_NOT_FOUND));

        if (ExportReceiptStatus.CANCELLED == receipt.getStatus()) {
            throw new InvalidRequestException(Message.Inventory.EXPORT_ALREADY_CANCELLED);
        }
        if (ExportReceiptStatus.PENDING_APPROVAL != receipt.getStatus()) {
            throw new InvalidRequestException(Message.Inventory.ONLY_PENDING_APPROVAL_CAN_CANCEL);
        }

        receipt.setStatus(ExportReceiptStatus.CANCELLED);
        receipt = exportReceiptRepository.save(receipt);

        return toResponse(receipt);
    }

    private ExportReceiptResponse toResponse(ExportReceipt receipt) {
        var items = exportReceiptItemRepository.findByReceiptId(receipt.getId());
        var productIds = items.stream().map(ExportReceiptItem::getProductId).toList();
        var products = productRepository.findAllById(productIds).stream()
                .collect(Collectors.toMap(Product::getId, p -> p));

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
        return ExportReceiptMappingHelper.map(receipt, customerName, createdByName, approvedByName, items, products);
    }

    private ExportReceiptResponse toResponse(ExportReceipt receipt, Map<Long, String> customers, Map<Long, String> users) {
        var items = exportReceiptItemRepository.findByReceiptId(receipt.getId());
        var productIds = items.stream().map(ExportReceiptItem::getProductId).toList();
        var products = productRepository.findAllById(productIds).stream()
                .collect(Collectors.toMap(Product::getId, p -> p));
        return ExportReceiptMappingHelper.map(receipt,
                receipt.getCustomerId() != null ? customers.get(receipt.getCustomerId()) : null,
                users.get(receipt.getCreatedBy()),
                receipt.getApprovedBy() != null ? users.get(receipt.getApprovedBy()) : null,
                items, products);
    }

    private String generateReceiptCode() {
        return ReceiptCodeGenerator.generate("EXP-", exportReceiptRepository::existsByReceiptCode);
    }
}
