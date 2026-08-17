package org.dawn.backend.service.inventory;

import org.dawn.backend.constant.enums.inventory.PurchaseOrderStatus;
import org.dawn.backend.constant.enums.inventory.imports.ImportReceiptStatus;
import org.dawn.backend.config.security.SecurityPolicy;
import org.dawn.backend.controller.inventory.request.CreatePurchaseOrderRequest;
import org.dawn.backend.controller.inventory.request.CreatePurchaseOrderRequest.POItemRequest;
import org.dawn.backend.controller.inventory.request.UpdatePurchaseOrderRequest;
import org.dawn.backend.controller.inventory.response.PurchaseOrderResponse;
import org.dawn.backend.entity.catalog.Product;
import org.dawn.backend.entity.catalog.Supplier;
import org.dawn.backend.entity.inventory.PurchaseOrder;
import org.dawn.backend.entity.inventory.PurchaseOrderItem;
import org.dawn.backend.exception.type.InvalidRequestException;
import org.dawn.backend.constant.shared.ErrorCode;
import org.dawn.backend.service.shared.LockGuard;
import org.dawn.backend.repository.auth.UserRepository;
import org.dawn.backend.repository.catalog.ProductRepository;
import org.dawn.backend.repository.catalog.SupplierRepository;
import org.dawn.backend.repository.inventory.imports.ImportReceiptRepository;
import org.dawn.backend.repository.inventory.PurchaseOrderItemRepository;
import org.dawn.backend.repository.inventory.PurchaseOrderRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PurchaseOrderServiceTests {

    @Mock PurchaseOrderRepository purchaseOrderRepository;
    @Mock PurchaseOrderItemRepository purchaseOrderItemRepository;
    @Mock ImportReceiptRepository importReceiptRepository;
    @Mock SupplierRepository supplierRepository;
    @Mock ProductRepository productRepository;
    @Mock UserRepository userRepository;
    @Mock SecurityPolicy securityPolicy;
    @Mock LockGuard lockGuard;

    @InjectMocks PurchaseOrderService service;

    private final Long poId = 10L;

    private PurchaseOrder po(PurchaseOrderStatus status) {
        return PurchaseOrder.builder()
                .id(poId)
                .poCode("PO-001")
                .supplierId(1L)
                .status(status)
                .build();
    }

    private Product product(String trackingType) {
        Product p = mock(Product.class);
        lenient().when(p.getId()).thenReturn(20L);
        lenient().when(p.getTrackingType()).thenReturn(trackingType);
        lenient().when(p.getSuppliers()).thenReturn(java.util.Set.of());
        return p;
    }

    private PurchaseOrderItem poItem(Long id, Long productId, BigDecimal qty, String serials) {
        return PurchaseOrderItem.builder()
                .id(id)
                .poId(poId)
                .productId(productId)
                .quantity(qty)
                .unitPrice(BigDecimal.TEN)
                .serials(serials)
                .build();
    }

    private void stubEnrich() {
        lenient().when(purchaseOrderItemRepository.findByPoId(poId)).thenReturn(List.of());
        lenient().when(productRepository.findAllById(anyList())).thenReturn(List.of());
        lenient().when(supplierRepository.findById(1L)).thenReturn(Optional.of(Supplier.builder().name("NCC").build()));
        lenient().when(userRepository.findById(any())).thenReturn(Optional.of(
                org.dawn.backend.entity.auth.User.builder().fullName("Admin").build()));
    }

    private UpdatePurchaseOrderRequest updateRequest() {
        return new UpdatePurchaseOrderRequest(List.of(
                new UpdatePurchaseOrderRequest.POItemRequest(20L, BigDecimal.valueOf(2), BigDecimal.valueOf(50),
                        List.of("SN-1", "SN-2"))));
    }

    // ─── update ────────────────────────────────────────────

    @Test
    void update_draft_replacesItemsAndRecalculatesTotal() {
        when(purchaseOrderRepository.findByIdForUpdate(poId)).thenReturn(Optional.of(po(PurchaseOrderStatus.DRAFT)));
        when(importReceiptRepository.existsByPurchaseOrderIdAndStatus(poId, ImportReceiptStatus.DRAFT)).thenReturn(false);
        Product p = product("SERIALIZED");
        when(productRepository.findById(20L)).thenReturn(Optional.of(p));
        stubEnrich();
        when(purchaseOrderRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        PurchaseOrderResponse res = service.update(poId, updateRequest());

        verify(purchaseOrderItemRepository).deleteByPoId(poId);
        verify(purchaseOrderItemRepository, atLeastOnce()).save(argThat(item ->
                item.getQuantity().compareTo(BigDecimal.valueOf(2)) == 0 && "SN-1\nSN-2".equals(item.getSerials())));
        assertEquals(0, BigDecimal.valueOf(100).compareTo(res.totalAmount()));
    }

    @Test
    void update_locked_throws() {
        when(purchaseOrderRepository.findByIdForUpdate(poId)).thenReturn(Optional.of(po(PurchaseOrderStatus.OPEN)));
        when(importReceiptRepository.existsByPurchaseOrderIdAndStatus(poId, ImportReceiptStatus.DRAFT)).thenReturn(true);

        assertThrows(InvalidRequestException.class, () -> service.update(poId, updateRequest()));
        verify(purchaseOrderItemRepository, never()).deleteByPoId(any());
    }

    @Test
    void update_inactiveProduct_throws() {
        when(purchaseOrderRepository.findByIdForUpdate(poId)).thenReturn(Optional.of(po(PurchaseOrderStatus.DRAFT)));
        when(importReceiptRepository.existsByPurchaseOrderIdAndStatus(poId, ImportReceiptStatus.DRAFT)).thenReturn(false);
        doThrow(new InvalidRequestException(ErrorCode.PRODUCT_INACTIVE))
                .when(lockGuard).assertProductsActive(any());

        assertThrows(InvalidRequestException.class, () -> service.update(poId, updateRequest()));
        verify(purchaseOrderItemRepository, never()).deleteByPoId(any());
    }

    @Test
    void update_cancelled_throws() {
        when(purchaseOrderRepository.findByIdForUpdate(poId)).thenReturn(Optional.of(po(PurchaseOrderStatus.CANCELLED)));

        assertThrows(InvalidRequestException.class, () -> service.update(poId, updateRequest()));
        verify(purchaseOrderItemRepository, never()).deleteByPoId(any());
    }

    @Test
    void update_missingPrice_throws() {
        when(purchaseOrderRepository.findByIdForUpdate(poId)).thenReturn(Optional.of(po(PurchaseOrderStatus.DRAFT)));
        when(importReceiptRepository.existsByPurchaseOrderIdAndStatus(poId, ImportReceiptStatus.DRAFT)).thenReturn(false);

        UpdatePurchaseOrderRequest req = new UpdatePurchaseOrderRequest(List.of(
                new UpdatePurchaseOrderRequest.POItemRequest(20L, BigDecimal.ONE, null, null)));

        assertThrows(InvalidRequestException.class, () -> service.update(poId, req));
    }

    // ─── delete ────────────────────────────────────────────

    @Test
    void delete_draft_ok() {
        when(purchaseOrderRepository.findByIdForUpdate(poId)).thenReturn(Optional.of(po(PurchaseOrderStatus.DRAFT)));
        when(importReceiptRepository.existsByPurchaseOrderIdAndStatus(poId, ImportReceiptStatus.DRAFT)).thenReturn(false);

        service.delete(poId);

        verify(purchaseOrderItemRepository).deleteByPoId(poId);
        verify(purchaseOrderRepository).delete(argThat(p -> p.getId().equals(poId)));
    }

    @Test
    void delete_open_throws() {
        when(purchaseOrderRepository.findByIdForUpdate(poId)).thenReturn(Optional.of(po(PurchaseOrderStatus.OPEN)));

        assertThrows(InvalidRequestException.class, () -> service.delete(poId));
        verify(purchaseOrderRepository, never()).delete(any());
    }

    @Test
    void delete_locked_throws() {
        when(purchaseOrderRepository.findByIdForUpdate(poId)).thenReturn(Optional.of(po(PurchaseOrderStatus.DRAFT)));
        when(importReceiptRepository.existsByPurchaseOrderIdAndStatus(poId, ImportReceiptStatus.DRAFT)).thenReturn(true);

        assertThrows(InvalidRequestException.class, () -> service.delete(poId));
        verify(purchaseOrderRepository, never()).delete(any());
    }

    // ─── open: bắt buộc serial cho sản phẩm theo dõi serial ──

    @Test
    void open_serializedMissingSerials_throws() {
        when(purchaseOrderRepository.findByIdForUpdate(poId)).thenReturn(Optional.of(po(PurchaseOrderStatus.DRAFT)));
        when(purchaseOrderItemRepository.findByPoId(poId)).thenReturn(List.of(poItem(1L, 20L, BigDecimal.valueOf(2), null)));
        Product p = product("SERIALIZED");
        when(productRepository.findAllById(List.of(20L))).thenReturn(List.of(p));

        assertThrows(InvalidRequestException.class, () -> service.open(poId, null));
        verify(purchaseOrderRepository, never()).save(any());
    }

    @Test
    void open_serializedWithSerials_setsOpen() {
        when(purchaseOrderRepository.findByIdForUpdate(poId)).thenReturn(Optional.of(po(PurchaseOrderStatus.DRAFT)));
        stubEnrich();
        when(purchaseOrderItemRepository.findByPoId(poId)).thenReturn(List.of(poItem(1L, 20L, BigDecimal.valueOf(2), "SN-1\nSN-2")));
        Product p = product("SERIALIZED");
        when(productRepository.findAllById(List.of(20L))).thenReturn(List.of(p));
        when(purchaseOrderRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.open(poId, "ASN-1");

        verify(purchaseOrderRepository).save(argThat(saved ->
                PurchaseOrderStatus.OPEN == saved.getStatus() && "ASN-1".equals(saved.getAsnCode())));
    }

    @Test
    void open_bulkNoSerials_ok() {
        when(purchaseOrderRepository.findByIdForUpdate(poId)).thenReturn(Optional.of(po(PurchaseOrderStatus.DRAFT)));
        when(purchaseOrderItemRepository.findByPoId(poId)).thenReturn(List.of(poItem(1L, 20L, BigDecimal.ONE, null)));
        stubEnrich();
        when(purchaseOrderRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.open(poId, null);

        verify(purchaseOrderRepository).save(argThat(saved -> PurchaseOrderStatus.OPEN == saved.getStatus()));
    }

    @Test
    void open_notDraft_throws() {
        when(purchaseOrderRepository.findByIdForUpdate(poId)).thenReturn(Optional.of(po(PurchaseOrderStatus.OPEN)));

        assertThrows(InvalidRequestException.class, () -> service.open(poId, null));
        verify(purchaseOrderRepository, never()).save(any());
    }

    // ─── create: đơn giá bắt buộc ─────────────────────────

    @Test
    void create_missingPrice_throws() {
        when(supplierRepository.findById(1L)).thenReturn(Optional.of(Supplier.builder().name("NCC").build()));

        CreatePurchaseOrderRequest req = new CreatePurchaseOrderRequest(
                1L, java.time.LocalDate.of(2026, 9, 1), null, null,
                List.of(new POItemRequest(20L, BigDecimal.ONE, null, null)));

        assertThrows(InvalidRequestException.class, () -> service.create(req));
    }

    @Test
    void create_negativePrice_throws() {
        when(supplierRepository.findById(1L)).thenReturn(Optional.of(Supplier.builder().name("NCC").build()));

        CreatePurchaseOrderRequest req = new CreatePurchaseOrderRequest(
                1L, java.time.LocalDate.of(2026, 9, 1), null, null,
                List.of(new POItemRequest(20L, BigDecimal.ONE, BigDecimal.valueOf(-1), null)));

        assertThrows(InvalidRequestException.class, () -> service.create(req));
    }

    // ─── locked flag trong response ───────────────────────

    @Test
    void findOne_lockedFlagReflectsReceipts() {
        when(purchaseOrderRepository.findById(poId)).thenReturn(Optional.of(po(PurchaseOrderStatus.OPEN)));
        when(importReceiptRepository.existsByPurchaseOrderIdAndStatus(poId, ImportReceiptStatus.DRAFT)).thenReturn(true);
        stubEnrich();

        PurchaseOrderResponse res = service.findOne(poId);

        assertTrue(res.locked());
    }

    // ─── rejectedReceiptCount trong response ───────────────────────

    @Test
    void findOne_countsRejectedReceipts() {
        when(purchaseOrderRepository.findById(poId)).thenReturn(Optional.of(po(PurchaseOrderStatus.OPEN)));
        when(importReceiptRepository.countByPurchaseOrderIdAndStatus(poId, ImportReceiptStatus.REJECTED)).thenReturn(2L);
        stubEnrich();

        PurchaseOrderResponse res = service.findOne(poId);

        assertEquals(2L, res.rejectedReceiptCount());
    }

    @Test
    void findAll_countsRejectedReceiptsPerPo() {
        var page = new org.springframework.data.domain.PageImpl<>(List.of(po(PurchaseOrderStatus.OPEN)),
                org.springframework.data.domain.PageRequest.of(0, 20), 1);
        when(purchaseOrderRepository.findAll(any(org.springframework.data.domain.Pageable.class))).thenReturn(page);
        when(importReceiptRepository.countByPurchaseOrderIdInAndStatusGrouped(anyCollection(), eq(ImportReceiptStatus.REJECTED)))
                .thenReturn(List.of(new ImportReceiptRepository.PurchaseOrderIdCount() {
                    @Override
                    public Long getPurchaseOrderId() {
                        return poId;
                    }

                    @Override
                    public long getCount() {
                        return 3L;
                    }
                }));
        stubEnrich();

        var res = service.findAll(org.springframework.data.domain.PageRequest.of(0, 20), null);

        assertEquals(3L, res.getContent().get(0).rejectedReceiptCount());
    }
}