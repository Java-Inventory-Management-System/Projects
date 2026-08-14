package org.dawn.backend.service.inventory;
import org.dawn.backend.constant.shared.ErrorCode;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dawn.backend.aspect.AuditLog;
import org.dawn.backend.config.web.response.ResponsePage;
import org.dawn.backend.constant.enums.inventory.PurchaseOrderStatus;
import org.springframework.data.domain.Page;
import org.dawn.backend.constant.enums.inventory.imports.ImportReceiptStatus;
import org.dawn.backend.constant.shared.LogConstant;
import org.dawn.backend.controller.inventory.request.CreatePurchaseOrderRequest;
import org.dawn.backend.controller.inventory.request.CreatePurchaseOrderRequest.POItemRequest;
import org.dawn.backend.controller.inventory.request.UpdatePurchaseOrderRequest;
import org.dawn.backend.controller.inventory.response.PurchaseOrderResponse;
import org.dawn.backend.entity.catalog.Product;
import org.dawn.backend.entity.catalog.Supplier;
import org.dawn.backend.entity.inventory.PurchaseOrder;
import org.dawn.backend.entity.inventory.PurchaseOrderItem;
import org.dawn.backend.exception.type.InvalidRequestException;
import org.dawn.backend.exception.type.ResourceAlreadyExistedException;
import org.dawn.backend.exception.type.ResourceNotFoundException;
import org.dawn.backend.repository.auth.UserRepository;
import org.dawn.backend.repository.catalog.ProductRepository;
import org.dawn.backend.repository.catalog.SupplierRepository;
import org.dawn.backend.repository.inventory.imports.ImportReceiptRepository;
import org.dawn.backend.repository.inventory.PurchaseOrderItemRepository;
import org.dawn.backend.repository.inventory.PurchaseOrderRepository;
import org.dawn.backend.shared.util.ReceiptCodeGenerator;
import org.dawn.backend.config.security.SecurityPolicy;
import org.dawn.backend.service.shared.LockGuard;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PurchaseOrderService {

    private final PurchaseOrderRepository purchaseOrderRepository;
    private final PurchaseOrderItemRepository purchaseOrderItemRepository;
    private final ImportReceiptRepository importReceiptRepository;
    private final SupplierRepository supplierRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final SecurityPolicy securityPolicy;
    private final LockGuard lockGuard;

    @Transactional(readOnly = true)
    public ResponsePage<PurchaseOrderResponse> findAll(Pageable pageable, String status) {
        PurchaseOrderStatus s = safeParsePOStatus(status);
        Page<PurchaseOrder> page = s != null
                ? purchaseOrderRepository.findByStatus(s, pageable)
                : status != null && !status.isBlank()
                    ? Page.empty(pageable)
                    : purchaseOrderRepository.findAll(pageable);
        List<Long> ids = page.getContent().stream().map(PurchaseOrder::getId).toList();
        Map<Long, Long> rejectedCounts = ids.isEmpty() ? Map.of()
                : importReceiptRepository.countByPurchaseOrderIdInAndStatusGrouped(ids, ImportReceiptStatus.REJECTED)
                    .stream().collect(Collectors.toMap(
                            org.dawn.backend.repository.inventory.imports.ImportReceiptRepository.PurchaseOrderIdCount::getPurchaseOrderId,
                            org.dawn.backend.repository.inventory.imports.ImportReceiptRepository.PurchaseOrderIdCount::getCount));
        return ResponsePage.of(page.map(po -> enrich(po, rejectedCounts.getOrDefault(po.getId(), 0L))));
    }

    @Transactional(readOnly = true)
    public PurchaseOrderResponse findOne(Long id) {
        var po = purchaseOrderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.PO_NOT_FOUND));
        return enrich(po, importReceiptRepository.countByPurchaseOrderIdAndStatus(id, ImportReceiptStatus.REJECTED));
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.CREATE_PURCHASE_ORDER, entity = LogConstant.Entity.PURCHASE_ORDER)
    public PurchaseOrderResponse create(CreatePurchaseOrderRequest request) {
        Long userId = securityPolicy.requireAuthenticated();

        if (request.items() == null || request.items().isEmpty()) {
            throw new InvalidRequestException(ErrorCode.AT_LEAST_ONE_ITEM_REQUIRED);
        }
        if (request.supplierId() == null) {
            throw new InvalidRequestException(ErrorCode.SUPPLIER_REQUIRED);
        }
        supplierRepository.findById(request.supplierId())
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.SUPPLIER_NOT_FOUND));
        lockGuard.assertSupplierActive(request.supplierId());

        String poCode = generatePoCode();
        PurchaseOrder po = PurchaseOrder.builder()
                .poCode(poCode)
                .supplierId(request.supplierId())
                .status(PurchaseOrderStatus.DRAFT)
                .expectedDate(request.expectedDate())
                .note(request.note())
                .invoiceCode(request.invoiceCode())
                .createdBy(userId)
                .build();
        po = purchaseOrderRepository.save(po);

        BigDecimal totalAmount = BigDecimal.ZERO;
        lockGuard.assertProductsActive(request.items().stream().map(POItemRequest::productId).toList());
        for (POItemRequest itemReq : request.items()) {
            Product product = requireValidItem(itemReq.productId(), itemReq.quantity(),
                    itemReq.unitPrice(), request.supplierId());
            var item = PurchaseOrderItem.builder()
                    .poId(po.getId())
                    .productId(itemReq.productId())
                    .quantity(itemReq.quantity())
                    .unitPrice(itemReq.unitPrice())
                    .serials(itemReq.serials() != null && !itemReq.serials().isEmpty()
                            ? String.join("\n", itemReq.serials())
                            : null)
                    .build();
            purchaseOrderItemRepository.save(item);
            totalAmount = totalAmount.add(itemReq.unitPrice().multiply(itemReq.quantity()));        }

        po.setTotalAmount(totalAmount);
        po = purchaseOrderRepository.save(po);

        return enrich(po, 0L);
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.CANCEL_PURCHASE_ORDER, entity = LogConstant.Entity.PURCHASE_ORDER)
    public PurchaseOrderResponse cancel(Long id) {
        var po = purchaseOrderRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.PO_NOT_FOUND));

        if (PurchaseOrderStatus.CANCELLED == po.getStatus()) {
            throw new InvalidRequestException(ErrorCode.PO_ALREADY_CANCELLED);
        }

        // Phiếu nhập DRAFT đang làm dở của stock sẽ bị hủy theo; phiếu đã nhận/từ chối thì chặn
        boolean hasFinalReceipts = importReceiptRepository.existsByPurchaseOrderIdAndStatusIn(
                id, List.of(ImportReceiptStatus.RECEIVED, ImportReceiptStatus.REJECTED));
        if (hasFinalReceipts) {
            throw new InvalidRequestException(ErrorCode.PO_HAS_COMPLETED_RECEIPTS);
        }

        importReceiptRepository.findByPurchaseOrderId(id).stream()
                .filter(r -> ImportReceiptStatus.DRAFT == r.getStatus())
                .forEach(r -> r.setStatus(ImportReceiptStatus.CANCELLED));

        po.setStatus(PurchaseOrderStatus.CANCELLED);
        po = purchaseOrderRepository.save(po);
        return enrich(po, importReceiptRepository.countByPurchaseOrderIdAndStatus(po.getId(), ImportReceiptStatus.REJECTED));
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.UPDATE_PURCHASE_ORDER, entity = LogConstant.Entity.PURCHASE_ORDER)
    public PurchaseOrderResponse update(Long id, UpdatePurchaseOrderRequest request) {
        var po = purchaseOrderRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.PO_NOT_FOUND));

        if (PurchaseOrderStatus.CANCELLED == po.getStatus()) {
            throw new InvalidRequestException(ErrorCode.PO_ALREADY_CANCELLED);
        }
        assertNotLocked(id);
        if (request.items() == null || request.items().isEmpty()) {
            throw new InvalidRequestException(ErrorCode.AT_LEAST_ONE_ITEM_REQUIRED);
        }
        lockGuard.assertSupplierActive(po.getSupplierId());
        lockGuard.assertProductsActive(request.items().stream().map(UpdatePurchaseOrderRequest.POItemRequest::productId).toList());

        purchaseOrderItemRepository.deleteByPoId(id);

        BigDecimal totalAmount = BigDecimal.ZERO;
        for (UpdatePurchaseOrderRequest.POItemRequest itemReq : request.items()) {
            requireValidItem(itemReq.productId(), itemReq.quantity(), itemReq.unitPrice(), po.getSupplierId());
            var item = PurchaseOrderItem.builder()
                    .poId(po.getId())
                    .productId(itemReq.productId())
                    .quantity(itemReq.quantity())
                    .unitPrice(itemReq.unitPrice())
                    .serials(itemReq.serials() != null && !itemReq.serials().isEmpty()
                            ? String.join("\n", itemReq.serials())
                            : null)
                    .build();
            purchaseOrderItemRepository.save(item);
            totalAmount = totalAmount.add(itemReq.unitPrice().multiply(itemReq.quantity()));
        }

        po.setTotalAmount(totalAmount);
        po = purchaseOrderRepository.save(po);
        return enrich(po, 0L);
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.DELETE_PURCHASE_ORDER, entity = LogConstant.Entity.PURCHASE_ORDER)
    public void delete(Long id) {
        var po = purchaseOrderRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.PO_NOT_FOUND));
        if (PurchaseOrderStatus.DRAFT != po.getStatus()) {
            throw new InvalidRequestException(ErrorCode.PO_DELETE_ONLY_DRAFT);
        }
        assertNotLocked(id);
        purchaseOrderItemRepository.deleteByPoId(id);
        purchaseOrderRepository.delete(po);
    }

    private void assertNotLocked(Long id) {
        if (importReceiptRepository.existsByPurchaseOrderIdAndStatus(id, ImportReceiptStatus.DRAFT)) {
            throw new InvalidRequestException(ErrorCode.PO_LOCKED);
        }
    }

    private Product requireValidItem(Long productId, BigDecimal quantity, BigDecimal unitPrice, Long supplierId) {
        if (quantity == null || quantity.compareTo(BigDecimal.ZERO) <= 0) {
            throw new InvalidRequestException(ErrorCode.INVALID_QUANTITY.format(quantity));
        }
        if (unitPrice == null) {
            throw new InvalidRequestException(ErrorCode.PRICE_REQUIRED);
        }
        if (unitPrice.compareTo(BigDecimal.ZERO) < 0) {
            throw new InvalidRequestException(ErrorCode.NEGATIVE_PRICE);
        }
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.PRODUCT_NOT_FOUND));
        List<Long> supplierIds = product.getSuppliers().stream().map(Supplier::getId).toList();
        if (!supplierIds.isEmpty() && !supplierIds.contains(supplierId)) {
            throw new InvalidRequestException(ErrorCode.PRODUCT_NOT_FROM_SUPPLIER.format(productId));
        }
        return product;
    }

    private void requireSerialsForSerialized(Long poId) {
        var items = purchaseOrderItemRepository.findByPoId(poId);
        var products = productRepository.findAllById(items.stream()
                        .map(PurchaseOrderItem::getProductId).toList())
                .stream().collect(Collectors.toMap(Product::getId, p -> p));
        for (var item : items) {
            Product p = products.get(item.getProductId());
            if (p == null || org.dawn.backend.constant.enums.catalog.TrackingType.BULK.name().equals(p.getTrackingType())) {
                continue;
            }
            int serialCount = item.getSerials() == null || item.getSerials().isBlank()
                    ? 0 : item.getSerials().split("\r?\n").length;
            if (BigDecimal.valueOf(serialCount).compareTo(item.getQuantity()) != 0) {
                throw new InvalidRequestException(ErrorCode.PO_SERIAL_REQUIRED.format(p.getName()));
            }
        }
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.OPEN_PURCHASE_ORDER, entity = LogConstant.Entity.PURCHASE_ORDER)
    public PurchaseOrderResponse open(Long id, String asnCode) {
        var po = purchaseOrderRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.PO_NOT_FOUND));

        if (PurchaseOrderStatus.DRAFT != po.getStatus()) {
            throw new InvalidRequestException(ErrorCode.PO_NOT_DRAFT);
        }

        requireSerialsForSerialized(po.getId());

        po.setStatus(PurchaseOrderStatus.OPEN);
        if (asnCode != null && !asnCode.isBlank()) {
            po.setAsnCode(asnCode.trim());
        }
        po = purchaseOrderRepository.save(po);
        return enrich(po, importReceiptRepository.countByPurchaseOrderIdAndStatus(po.getId(), ImportReceiptStatus.REJECTED));
    }

    private PurchaseOrderResponse enrich(PurchaseOrder po, long rejectedReceiptCount) {
        var items = purchaseOrderItemRepository.findByPoId(po.getId());
        var productIds = items.stream().map(PurchaseOrderItem::getProductId).toList();
        var products = productRepository.findAllById(productIds).stream()
                .collect(Collectors.toMap(Product::getId, p -> p));
        var supplierName = supplierRepository.findById(po.getSupplierId())
                .map(Supplier::getName).orElse(null);
        var createdByName = userRepository.findById(po.getCreatedBy())
                .map(org.dawn.backend.entity.auth.User::getFullName).orElse(null);
        boolean locked = importReceiptRepository.existsByPurchaseOrderIdAndStatus(
                po.getId(), ImportReceiptStatus.DRAFT);

        return PurchaseOrderMappingHelper.map(po, supplierName, createdByName, items, products, locked, rejectedReceiptCount);
    }

    private String generatePoCode() {
        return ReceiptCodeGenerator.generate("PO-", purchaseOrderRepository::existsByPoCode);
    }

    private PurchaseOrderStatus safeParsePOStatus(String value) {
        if (value == null || value.isBlank()) return null;
        try { return PurchaseOrderStatus.valueOf(value.toUpperCase()); }
        catch (IllegalArgumentException e) { return null; }
    }
}
