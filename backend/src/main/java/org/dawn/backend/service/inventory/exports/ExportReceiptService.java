package org.dawn.backend.service.inventory.exports;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dawn.backend.config.web.response.ResponsePage;
import org.dawn.backend.constant.enums.catalog.UnitOfMeasure;
import org.dawn.backend.constant.enums.inventory.exports.ExportReceiptStatus;
import org.dawn.backend.constant.enums.inventory.exports.ExportReason;
import org.dawn.backend.constant.enums.inventory.ProductUnitStatus;
import org.dawn.backend.constant.shared.LogConstant;
import org.dawn.backend.constant.shared.Message;
import org.dawn.backend.controller.inventory.request.ExportReceiptRequest;
import org.dawn.backend.controller.inventory.response.ExportReceiptResponse;
import org.dawn.backend.controller.inventory.response.ProductUnitResponse;
import org.dawn.backend.entity.auth.User;
import org.dawn.backend.entity.catalog.Product;
import org.dawn.backend.entity.inventory.Customer;
import org.dawn.backend.entity.inventory.ExportReceipt;
import org.dawn.backend.entity.inventory.ExportReceiptItem;
import org.dawn.backend.entity.inventory.ExportReceiptStatusHistory;
import org.dawn.backend.entity.inventory.Location;
import org.dawn.backend.entity.inventory.ProductUnit;
import org.dawn.backend.exception.type.InvalidRequestException;
import org.dawn.backend.exception.type.ResourceAlreadyExistedException;
import org.dawn.backend.exception.type.ResourceNotFoundException;
import org.dawn.backend.repository.auth.UserRepository;
import org.dawn.backend.repository.catalog.ProductRepository;
import org.dawn.backend.repository.inventory.CustomerRepository;
import org.dawn.backend.repository.inventory.LocationRepository;
import org.dawn.backend.repository.inventory.ProductUnitRepository;
import org.dawn.backend.repository.inventory.exports.ExportReceiptItemRepository;
import org.dawn.backend.repository.inventory.exports.ExportReceiptItemUnitRepository;
import org.dawn.backend.repository.inventory.exports.ExportReceiptRepository;
import org.dawn.backend.repository.inventory.exports.ExportReceiptStatusHistoryRepository;
import org.dawn.backend.aspect.AuditLog;
import org.dawn.backend.service.inventory.ProductUnitMappingHelper;
import org.dawn.backend.shared.util.ReceiptCodeGenerator;
import org.dawn.backend.config.security.SecurityPolicy;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
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
    private final ProductRepository productRepository;
    private final CustomerRepository customerRepository;
    private final LocationRepository locationRepository;
    private final UserRepository userRepository;
    private final SecurityPolicy securityPolicy;

    private static final List<String> BULK_UNITS = List.of(
            UnitOfMeasure.METER.name(),
            UnitOfMeasure.KG.name());

    @Transactional(readOnly = true)
    public ResponsePage<ExportReceiptResponse> findAll(Pageable pageable, String status, Long customerId) {
        ExportReceiptStatus s = safeParseExportStatus(status);
        Page<ExportReceipt> page;
        if (customerId != null && s != null) {
            page = exportReceiptRepository.findByCustomerIdAndStatus(customerId, s, pageable);
        } else if (customerId != null) {
            page = exportReceiptRepository.findByCustomerId(customerId, pageable);
        } else if (s != null) {
            page = exportReceiptRepository.findByStatus(s, pageable);
        } else if (status != null && !status.isBlank()) {
            page = Page.empty(pageable);
        } else {
            page = exportReceiptRepository.findAll(pageable);
        }
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
                .externalReference(request.externalReference())
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

    @Transactional(readOnly = true)
    public List<ProductUnitResponse> getUnitsByReceipt(Long receiptId, Long productId) {
        var unitIds = exportReceiptItemUnitRepository.findProductUnitIdsByReceiptId(receiptId);
        if (unitIds.isEmpty()) return List.of();
        var allUnits = productUnitRepository.findAllById(unitIds).stream()
                .filter(u -> ProductUnitStatus.EXPORTED == u.getStatus())
                .toList();
        if (productId != null) {
            allUnits = allUnits.stream().filter(u -> productId.equals(u.getProductId())).toList();
        }
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

    public ExportReceiptResponse toResponse(ExportReceipt receipt) {
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
