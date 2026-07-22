package org.dawn.backend.service.inventory;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dawn.backend.config.anno.AuditLog;
import org.dawn.backend.config.web.response.ResponsePage;
import org.dawn.backend.constant.inventory.PurchaseOrderStatus;
import org.springframework.data.domain.Page;
import org.dawn.backend.constant.inventory.ImportReceiptStatus;
import org.dawn.backend.constant.shared.LogConstant;
import org.dawn.backend.constant.shared.Message;
import org.dawn.backend.controller.inventory.request.CreatePurchaseOrderRequest;
import org.dawn.backend.controller.inventory.request.CreatePurchaseOrderRequest.POItemRequest;
import org.dawn.backend.controller.inventory.response.PurchaseOrderResponse;
import org.dawn.backend.entity.catalog.Product;
import org.dawn.backend.entity.catalog.Supplier;
import org.dawn.backend.entity.inventory.PurchaseOrder;
import org.dawn.backend.entity.inventory.PurchaseOrderItem;
import org.dawn.backend.exception.wrapper.InvalidRequestException;
import org.dawn.backend.exception.wrapper.ResourceAlreadyExistedException;
import org.dawn.backend.exception.wrapper.ResourceNotFoundException;
import org.dawn.backend.repository.auth.UserRepository;
import org.dawn.backend.repository.catalog.ProductRepository;
import org.dawn.backend.repository.catalog.SupplierRepository;
import org.dawn.backend.repository.inventory.ImportReceiptRepository;
import org.dawn.backend.repository.inventory.PurchaseOrderItemRepository;
import org.dawn.backend.repository.inventory.PurchaseOrderRepository;
import org.dawn.backend.utils.ReceiptCodeGenerator;
import org.dawn.backend.utils.SecurityUtils;
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

    @Transactional(readOnly = true)
    public ResponsePage<PurchaseOrderResponse> findAll(Pageable pageable, String status) {
        PurchaseOrderStatus s = safeParsePOStatus(status);
        Page<PurchaseOrder> page = s != null
                ? purchaseOrderRepository.findByStatus(s, pageable)
                : status != null && !status.isBlank()
                    ? Page.empty(pageable)
                    : purchaseOrderRepository.findAll(pageable);
        return ResponsePage.of(page.map(this::enrich));
    }

    @Transactional(readOnly = true)
    public PurchaseOrderResponse findOne(Long id) {
        var po = purchaseOrderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.PO_NOT_FOUND));
        return enrich(po);
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.CREATE_PURCHASE_ORDER, entity = LogConstant.Entity.PURCHASE_ORDER)
    public PurchaseOrderResponse create(CreatePurchaseOrderRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        if (userId == null) throw new InvalidRequestException(Message.Auth.USER_NOT_AUTHENTICATED);

        if (request.items() == null || request.items().isEmpty()) {
            throw new InvalidRequestException(Message.Inventory.AT_LEAST_ONE_ITEM_REQUIRED);
        }
        if (request.supplierId() == null) {
            throw new InvalidRequestException(Message.Inventory.SUPPLIER_REQUIRED);
        }

        String poCode = generatePoCode();
        PurchaseOrder po = PurchaseOrder.builder()
                .poCode(poCode)
                .supplierId(request.supplierId())
                .status(PurchaseOrderStatus.DRAFT)
                .expectedDate(request.expectedDate())
                .note(request.note())
                .createdBy(userId)
                .build();
        po = purchaseOrderRepository.save(po);

        BigDecimal totalAmount = BigDecimal.ZERO;
        for (POItemRequest itemReq : request.items()) {
            if (!productRepository.existsById(itemReq.productId())) {
                throw new ResourceNotFoundException(Message.Catalog.PRODUCT_NOT_FOUND);
            }
            var item = PurchaseOrderItem.builder()
                    .poId(po.getId())
                    .productId(itemReq.productId())
                    .quantity(itemReq.quantity())
                    .unitPrice(itemReq.unitPrice())
                    .build();
            purchaseOrderItemRepository.save(item);
            totalAmount = totalAmount.add(itemReq.unitPrice().multiply(itemReq.quantity()));
        }

        po.setTotalAmount(totalAmount);
        po = purchaseOrderRepository.save(po);

        return enrich(po);
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.CANCEL_PURCHASE_ORDER, entity = LogConstant.Entity.PURCHASE_ORDER)
    public PurchaseOrderResponse cancel(Long id) {
        var po = purchaseOrderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.PO_NOT_FOUND));

        if (PurchaseOrderStatus.CANCELLED == po.getStatus()) {
            throw new InvalidRequestException(Message.Inventory.PO_ALREADY_CANCELLED);
        }

        boolean hasCompletedReceipts = importReceiptRepository.existsByPurchaseOrderIdAndStatus(id, ImportReceiptStatus.COMPLETED);

        if (hasCompletedReceipts) {
            throw new InvalidRequestException(Message.Inventory.PO_HAS_COMPLETED_RECEIPTS);
        }

        po.setStatus(PurchaseOrderStatus.CANCELLED);
        po = purchaseOrderRepository.save(po);
        return enrich(po);
    }

    private PurchaseOrderResponse enrich(PurchaseOrder po) {
        var items = purchaseOrderItemRepository.findByPoId(po.getId());
        var productIds = items.stream().map(PurchaseOrderItem::getProductId).toList();
        var products = productRepository.findAllById(productIds).stream()
                .collect(Collectors.toMap(Product::getId, p -> p));
        var supplierName = supplierRepository.findById(po.getSupplierId())
                .map(Supplier::getName).orElse(null);
        var createdByName = userRepository.findById(po.getCreatedBy())
                .map(org.dawn.backend.entity.auth.User::getFullName).orElse(null);

        return PurchaseOrderMappingHelper.map(po, supplierName, createdByName, items, products);
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
