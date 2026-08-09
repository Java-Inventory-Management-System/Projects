package org.dawn.backend.service.inventory.exports;
import org.dawn.backend.constant.shared.ErrorCode;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dawn.backend.config.web.response.ResponsePage;
import org.dawn.backend.constant.enums.catalog.UnitOfMeasure;
import org.dawn.backend.constant.enums.inventory.exports.ExportReceiptStatus;
import org.dawn.backend.constant.enums.inventory.exports.ExportReason;
import org.dawn.backend.constant.enums.inventory.ProductUnitStatus;
import org.dawn.backend.constant.shared.LogConstant;
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
private final org.dawn.backend.repository.catalog.SupplierRepository supplierRepository;
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
        var receiptIds = page.getContent().stream().map(ExportReceipt::getId).toList();
        var historyByReceipt = statusHistoryRepository.findByReceiptIdInOrderByCreatedAtAsc(receiptIds).stream()
                .collect(Collectors.groupingBy(ExportReceiptStatusHistory::getReceiptId));
        return ResponsePage.of(page.map(r -> toResponse(r, customers, userNameMap,
                historyByReceipt.getOrDefault(r.getId(), List.of()))));
    }

    @Transactional(readOnly = true)
    public ExportReceiptResponse findOne(Long id) {
        var receipt = exportReceiptRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.EXPORT_RECEIPT_NOT_FOUND));
        return toResponse(receipt);
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.CREATE_EXPORT, entity = LogConstant.Entity.EXPORT_RECEIPT)
    public ExportReceiptResponse create(ExportReceiptRequest request) {
        Long userId = securityPolicy.requireAuthenticated();

        if (request.items() == null || request.items().isEmpty()) {
            throw new InvalidRequestException(ErrorCode.AT_LEAST_ONE_ITEM_REQUIRED);
        }
        if (request.reason() == null || request.reason().isBlank()) {
            throw new InvalidRequestException(ErrorCode.EXPORT_REASON_REQUIRED);
        }
        ExportReason reason;
        try {
            reason = ExportReason.valueOf(request.reason().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new InvalidRequestException(ErrorCode.INVALID_EXPORT_REASON.format( request.reason()));
        }
        if (reason == ExportReason.SALE && request.customerId() == null) {
            throw new InvalidRequestException(ErrorCode.CUSTOMER_REQUIRED_FOR_SALE);
        }
        if (reason == ExportReason.SALE && request.customerId() != null) {
            Customer customer = customerRepository.findById(request.customerId())
                    .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.CUSTOMER_NOT_FOUND));
            if (!Boolean.TRUE.equals(customer.getIsActive())) {
                throw new InvalidRequestException(ErrorCode.CUSTOMER_INACTIVE);
            }
        }
        if ((reason == ExportReason.RETURN_SUPPLIER
                || reason == ExportReason.WARRANTY_REPLACEMENT)
                && request.supplierId() == null) {
            throw new InvalidRequestException(ErrorCode.EXPORT_SUPPLIER_REQUIRED);
        }
        if (request.supplierId() != null && !supplierRepository.existsById(request.supplierId())) {
            throw new ResourceNotFoundException(ErrorCode.SUPPLIER_NOT_FOUND);
        }

        String receiptCode = generateReceiptCode();
        if (exportReceiptRepository.existsByReceiptCode(receiptCode)) {
            throw new ResourceAlreadyExistedException(ErrorCode.RECEIPT_CODE_EXISTS);
        }

        ExportReceipt receipt = ExportReceipt.builder()
                .receiptCode(receiptCode)
                .reason(reason.name())
                .customerId(request.customerId())
                .supplierId(request.supplierId())
                .status(ExportReceiptStatus.PENDING)
                .note(request.note())
                .externalReference(request.externalReference())
                .createdBy(userId)
                .build();
        receipt = exportReceiptRepository.save(receipt);
        Long receiptId = receipt.getId();

        BigDecimal totalAmount = BigDecimal.ZERO;

        for (var itemReq : request.items()) {
            if (itemReq.quantity() == null || itemReq.quantity().compareTo(java.math.BigDecimal.ZERO) <= 0) {
                throw new InvalidRequestException(ErrorCode.INVALID_QUANTITY.format(itemReq.quantity()));
            }
            Product product = productRepository.findById(itemReq.productId())
                    .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.PRODUCT_NOT_FOUND));

            BigDecimal inStock = getInStockQuantity(product, reason);
            BigDecimal committed = exportReceiptRepository.sumCommittedQuantityByProductIdAndStatusIn(
                    itemReq.productId(), List.of(ExportReceiptStatus.PENDING, ExportReceiptStatus.APPROVED));
            BigDecimal available = inStock.subtract(committed);

            if (available.compareTo(itemReq.quantity()) < 0) {
                throw new InvalidRequestException(
                        ErrorCode.INSUFFICIENT_STOCK.format( product.getName(), available, itemReq.quantity()));
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

    private BigDecimal getInStockQuantity(Product product, ExportReason reason) {
        ProductUnitStatus status = reason == ExportReason.WARRANTY_REPLACEMENT
                ? ProductUnitStatus.WAITING_RMA_EXPORT
                : ProductUnitStatus.IN_STOCK;
        String unit = product.getUnit();
        boolean isBulk = BULK_UNITS.contains(unit);
        if (isBulk) {
            return productUnitRepository.sumQuantityByProductIdAndStatusAndBoxIdIsNull(product.getId(), status);
        }
        return BigDecimal.valueOf(productUnitRepository.countByProductIdAndStatusAndBoxIdIsNull(
                product.getId(), status));
    }

    @Transactional(readOnly = true)
    public List<ProductUnitResponse> getUnitsByReceipt(Long receiptId, Long productId) {
        var unitIds = exportReceiptItemUnitRepository.findProductUnitIdsByReceiptId(receiptId);
        if (unitIds.isEmpty()) return List.of();
        ProductUnitStatus expectedStatus = expectedUnitStatus(receiptId);
        var allUnits = productUnitRepository.findAllById(unitIds).stream()
                .filter(u -> expectedStatus == u.getStatus())
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

    private ProductUnitStatus expectedUnitStatus(Long receiptId) {
        String reason = exportReceiptRepository.findById(receiptId)
                .map(ExportReceipt::getReason)
                .orElse("");
        return switch (reason) {
            case "WARRANTY_REPLACEMENT" -> ProductUnitStatus.SENT_TO_MANUFACTURER;
            case "RETURN_SUPPLIER" -> ProductUnitStatus.RETURNED_TO_SUPPLIER;
            default -> ProductUnitStatus.EXPORTED;
        };
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
        var history = statusHistoryRepository.findByReceiptIdOrderByCreatedAtAsc(receipt.getId());
        return ExportReceiptMappingHelper.map(receipt, customerName, createdByName, approvedByName,
                fulfilledByName, rejectedByName, items, products, trackingTypeMap, history);
    }

    private ExportReceiptResponse toResponse(ExportReceipt receipt, Map<Long, String> customers, Map<Long, String> users,
                                             List<ExportReceiptStatusHistory> history) {
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
                items, products, trackingTypeMap, history);
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
