package org.dawn.backend.service.inventory.adjustments;

import org.dawn.backend.config.security.SecurityPolicy;
import org.dawn.backend.constant.enums.inventory.adjustments.AdjustmentStatus;
import org.dawn.backend.constant.enums.inventory.imports.ImportReceiptStatus;
import org.dawn.backend.constant.shared.ErrorCode;
import org.dawn.backend.exception.type.InvalidRequestException;
import org.dawn.backend.service.shared.LockGuard;
import org.dawn.backend.controller.inventory.request.CreatePriceAdjustmentRequest;
import org.dawn.backend.controller.inventory.response.PriceAdjustmentResponse;
import org.dawn.backend.entity.inventory.ImportReceipt;
import org.dawn.backend.entity.inventory.ImportReceiptItem;
import org.dawn.backend.entity.inventory.PriceAdjustment;
import org.dawn.backend.entity.inventory.ProductUnit;
import org.dawn.backend.entity.catalog.Product;
import org.dawn.backend.repository.catalog.ProductRepository;
import org.dawn.backend.repository.inventory.ProductUnitRepository;
import org.dawn.backend.repository.inventory.adjustments.PriceAdjustmentRepository;
import org.dawn.backend.repository.inventory.imports.ImportReceiptItemRepository;
import org.dawn.backend.repository.inventory.imports.ImportReceiptRepository;
import org.dawn.backend.repository.auth.UserRepository;
import org.dawn.backend.entity.auth.User;
import org.dawn.backend.shared.statemachine.StateMachine;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PriceAdjustmentServiceTests {

    @Mock PriceAdjustmentRepository priceAdjustmentRepository;
    @Mock ImportReceiptItemRepository importReceiptItemRepository;
    @Mock ImportReceiptRepository importReceiptRepository;
    @Mock ProductRepository productRepository;
    @Mock ProductUnitRepository productUnitRepository;
    @Mock UserRepository userRepository;
    @Mock SecurityPolicy securityPolicy;
    @Mock StateMachine<AdjustmentStatus> adjustmentStateMachine;
    @Mock LockGuard lockGuard;

    @InjectMocks PriceAdjustmentService priceAdjustmentService;

    private PriceAdjustment adj(Long id, Long itemId, BigDecimal oldPrice, BigDecimal newPrice, AdjustmentStatus status) {
        PriceAdjustment a = new PriceAdjustment();
        a.setId(id);
        a.setAdjustCode("PADJ-0000" + id);
        a.setImportReceiptItemId(itemId);
        a.setOldPrice(oldPrice);
        a.setNewPrice(newPrice);
        a.setStatus(status);
        a.setCreatedBy(1L);
        a.setCreatedAt(Instant.parse("2026-01-01T00:00:00Z"));
        return a;
    }

    private ImportReceiptItem item(Long id, Long receiptId, Long productId, BigDecimal unitPrice) {
        ImportReceiptItem it = new ImportReceiptItem();
        it.setId(id);
        it.setReceiptId(receiptId);
        it.setProductId(productId);
        it.setUnitPrice(unitPrice);
        return it;
    }

    @Test
    void create_savesPendingWithOldPriceFromItem() {
        when(securityPolicy.requireAuthenticated()).thenReturn(1L);
        when(priceAdjustmentRepository.findByImportReceiptItemIdAndStatus(10L, AdjustmentStatus.PENDING))
                .thenReturn(Optional.empty());
        when(importReceiptItemRepository.findById(10L)).thenReturn(Optional.of(item(10L, 5L, 7L, BigDecimal.valueOf(12000))));
        ImportReceipt receipt = new ImportReceipt();
        receipt.setId(5L);
        receipt.setStatus(ImportReceiptStatus.RECEIVED);
        when(importReceiptRepository.findById(5L)).thenReturn(Optional.of(receipt));
        when(priceAdjustmentRepository.save(any(PriceAdjustment.class))).thenAnswer(inv -> inv.getArgument(0));

        PriceAdjustmentResponse res = priceAdjustmentService.create(
                new CreatePriceAdjustmentRequest(10L, BigDecimal.valueOf(15000), "Tăng giá theo nhà cung cấp"));

        ArgumentCaptor<PriceAdjustment> captor = ArgumentCaptor.forClass(PriceAdjustment.class);
        verify(priceAdjustmentRepository).save(captor.capture());
        assertEquals(BigDecimal.valueOf(12000), captor.getValue().getOldPrice());
        assertEquals(BigDecimal.valueOf(15000), captor.getValue().getNewPrice());
        assertEquals(AdjustmentStatus.PENDING, captor.getValue().getStatus());
        assertNull(res.approvedAt());
    }

    @Test
    void create_inactiveProduct_rejected() {
        when(securityPolicy.requireAuthenticated()).thenReturn(1L);
        when(importReceiptItemRepository.findById(10L)).thenReturn(Optional.of(item(10L, 5L, 7L, BigDecimal.valueOf(12000))));
        doThrow(new InvalidRequestException(ErrorCode.PRODUCT_INACTIVE))
                .when(lockGuard).assertProductsActive(any());

        assertThrows(InvalidRequestException.class, () -> priceAdjustmentService.create(
                new CreatePriceAdjustmentRequest(10L, BigDecimal.valueOf(15000), "test")));
        verify(priceAdjustmentRepository, never()).save(any(PriceAdjustment.class));
    }

    @Test
    void approve_setsApprovedAtAndUpdatesItemAndUnitCostPrices() {
        when(securityPolicy.requireAuthenticated()).thenReturn(2L);
        PriceAdjustment adj = adj(42L, 10L, BigDecimal.valueOf(12000), BigDecimal.valueOf(15000), AdjustmentStatus.PENDING);
        when(priceAdjustmentRepository.findById(42L)).thenReturn(Optional.of(adj));
        when(importReceiptItemRepository.findById(10L)).thenReturn(Optional.of(item(10L, 5L, 7L, BigDecimal.valueOf(12000))));
        when(priceAdjustmentRepository.optimisticApprove(eq(42L), eq(2L), eq("ok"), any(Instant.class))).thenReturn(1);
        ProductUnit unit = new ProductUnit();
        unit.setId(100L);
        unit.setCostPrice(BigDecimal.valueOf(12000));
        when(productUnitRepository.findByImportReceiptItemId(10L)).thenReturn(List.of(unit));

        PriceAdjustmentResponse res = priceAdjustmentService.approve(42L, "ok");

        ArgumentCaptor<ImportReceiptItem> itemCaptor = ArgumentCaptor.forClass(ImportReceiptItem.class);
        verify(importReceiptItemRepository).save(itemCaptor.capture());
        assertEquals(BigDecimal.valueOf(15000), itemCaptor.getValue().getUnitPrice());
        assertEquals(BigDecimal.valueOf(15000), unit.getCostPrice());
        assertNotNull(res.approvedAt());
        assertEquals(AdjustmentStatus.APPROVED, adj.getStatus());
    }

    @Test
    void reject_doesNotSetApprovedAt() {
        when(securityPolicy.requireAuthenticated()).thenReturn(2L);
        PriceAdjustment adj = adj(43L, 10L, BigDecimal.valueOf(12000), BigDecimal.valueOf(15000), AdjustmentStatus.PENDING);
        when(priceAdjustmentRepository.findById(43L)).thenReturn(Optional.of(adj));
        when(priceAdjustmentRepository.optimisticUpdateStatus(43L, AdjustmentStatus.REJECTED, 2L, "Giá chưa hợp lý")).thenReturn(1);

        PriceAdjustmentResponse res = priceAdjustmentService.reject(43L, "Giá chưa hợp lý");

        assertNull(res.approvedAt());
        assertEquals(AdjustmentStatus.REJECTED, adj.getStatus());
    }

    @Test
    void findHistoryByProduct_returnsOnlyApprovedAndPendingSortedDesc() {
        when(importReceiptItemRepository.findByProductId(7L)).thenReturn(List.of(
                item(10L, 5L, 7L, BigDecimal.valueOf(12000)),
                item(11L, 6L, 7L, BigDecimal.valueOf(9000))));
        PriceAdjustment approved = adj(1L, 10L, BigDecimal.valueOf(12000), BigDecimal.valueOf(15000), AdjustmentStatus.APPROVED);
        approved.setApprovedAt(Instant.parse("2026-03-10T00:00:00Z"));
        approved.setApprovedBy(2L);
        PriceAdjustment pending = adj(2L, 11L, BigDecimal.valueOf(9000), BigDecimal.valueOf(12000), AdjustmentStatus.PENDING);
        pending.setCreatedAt(Instant.parse("2026-04-01T00:00:00Z"));
        PriceAdjustment rejected = adj(3L, 11L, BigDecimal.valueOf(9000), BigDecimal.valueOf(8000), AdjustmentStatus.REJECTED);
        rejected.setCreatedAt(Instant.parse("2026-02-01T00:00:00Z"));
        when(priceAdjustmentRepository.findByImportReceiptItemIdIn(List.of(10L, 11L)))
                .thenReturn(List.of(approved, pending, rejected));

        when(importReceiptItemRepository.findAllById(anyList())).thenReturn(List.of(
                item(10L, 5L, 7L, BigDecimal.valueOf(12000)),
                item(11L, 6L, 7L, BigDecimal.valueOf(9000))));
        ImportReceipt r5 = new ImportReceipt();
        r5.setId(5L);
        r5.setReceiptCode("NH-00005");
        r5.setCreatedAt(Instant.parse("2026-01-10T00:00:00Z"));
        ImportReceipt r6 = new ImportReceipt();
        r6.setId(6L);
        r6.setReceiptCode("NH-00006");
        r6.setCreatedAt(Instant.parse("2026-02-10T00:00:00Z"));
        when(importReceiptRepository.findAllById(anyList())).thenReturn(List.of(r5, r6));
        Product p = new Product();
        p.setId(7L);
        p.setName("RAM Kingston 16GB");
        p.setSku("RAM-16");
        when(productRepository.findAllById(List.of(7L))).thenReturn(List.of(p));
        User u1 = new User();
        u1.setId(1L);
        u1.setFullName("Kho A");
        User u2 = new User();
        u2.setId(2L);
        u2.setFullName("Quản lý");
        when(userRepository.findAllById(List.of(1L, 2L))).thenReturn(List.of(u1, u2));

        List<PriceAdjustmentResponse> res = priceAdjustmentService.findHistoryByProduct(7L);

        assertEquals(2, res.size());
        assertEquals("PADJ-00002", res.get(0).adjustCode());
        assertEquals("PADJ-00001", res.get(1).adjustCode());
        assertTrue(res.stream().noneMatch(r -> r.status().equals(AdjustmentStatus.REJECTED.name())));
        assertEquals("NH-00005", res.get(1).receiptCode());
        assertNotNull(res.get(1).receiptDate());
        assertNotNull(res.get(1).approvedAt());
        assertNull(res.get(0).approvedAt());
    }
}