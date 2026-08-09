package org.dawn.backend.service.inventory.adjustments;

import org.dawn.backend.config.security.SecurityPolicy;
import org.dawn.backend.constant.enums.inventory.adjustments.AdjustmentStatus;
import org.dawn.backend.constant.enums.inventory.imports.ImportReceiptStatus;
import org.dawn.backend.controller.inventory.request.CreatePriceAdjustmentRequest;
import org.dawn.backend.entity.inventory.ImportReceipt;
import org.dawn.backend.entity.inventory.ImportReceiptItem;
import org.dawn.backend.entity.inventory.PriceAdjustment;
import org.dawn.backend.entity.inventory.ProductUnit;
import org.dawn.backend.exception.type.InvalidRequestException;
import org.dawn.backend.repository.auth.UserRepository;
import org.dawn.backend.repository.catalog.ProductRepository;
import org.dawn.backend.repository.inventory.ProductUnitRepository;
import org.dawn.backend.repository.inventory.adjustments.PriceAdjustmentRepository;
import org.dawn.backend.repository.inventory.imports.ImportReceiptItemRepository;
import org.dawn.backend.repository.inventory.imports.ImportReceiptRepository;
import org.dawn.backend.shared.statemachine.StateMachine;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
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

    @InjectMocks PriceAdjustmentService service;

    private ImportReceiptItem item(Long id, Long receiptId, BigDecimal unitPrice) {
        ImportReceiptItem item = new ImportReceiptItem();
        item.setId(id);
        item.setReceiptId(receiptId);
        item.setProductId(20L);
        item.setUnitPrice(unitPrice);
        return item;
    }

    private ImportReceipt receipt(Long id, ImportReceiptStatus status) {
        ImportReceipt r = new ImportReceipt();
        r.setId(id);
        r.setStatus(status);
        return r;
    }

    @Test
    void create_blocksReceiptNotCompleted() {
        when(securityPolicy.requireAuthenticated()).thenReturn(1L);
        when(priceAdjustmentRepository.findByImportReceiptItemIdAndStatus(7L, AdjustmentStatus.PENDING))
                .thenReturn(Optional.empty());
        when(importReceiptItemRepository.findById(7L)).thenReturn(Optional.of(item(7L, 3L, BigDecimal.valueOf(1000))));
        when(importReceiptRepository.findById(3L)).thenReturn(Optional.of(receipt(3L, ImportReceiptStatus.DRAFT)));

        assertThrows(InvalidRequestException.class,
                () -> service.create(new CreatePriceAdjustmentRequest(7L, BigDecimal.valueOf(1200), "reprice")));
        verify(priceAdjustmentRepository, never()).save(any());
    }

    @Test
    void create_allowsDecimalNewPrice() {
        when(securityPolicy.requireAuthenticated()).thenReturn(1L);
        when(priceAdjustmentRepository.findByImportReceiptItemIdAndStatus(7L, AdjustmentStatus.PENDING))
                .thenReturn(Optional.empty());
        when(importReceiptItemRepository.findById(7L)).thenReturn(Optional.of(item(7L, 3L, BigDecimal.valueOf(1000))));
        when(importReceiptRepository.findById(3L)).thenReturn(Optional.of(receipt(3L, ImportReceiptStatus.COMPLETED)));
        when(priceAdjustmentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.create(new CreatePriceAdjustmentRequest(7L, BigDecimal.valueOf(12345.5), "reprice"));

        verify(priceAdjustmentRepository).save(any());
    }

    @Test
    void approve_updatesUnitCostPrice() {
        PriceAdjustment adj = new PriceAdjustment();
        adj.setId(1L);
        adj.setImportReceiptItemId(7L);
        adj.setOldPrice(BigDecimal.valueOf(1000));
        adj.setNewPrice(BigDecimal.valueOf(1200));
        adj.setStatus(AdjustmentStatus.PENDING);
        adj.setCreatedBy(1L);
        ProductUnit unit = new ProductUnit();
        unit.setId(50L);
        unit.setProductId(20L);
        unit.setCostPrice(BigDecimal.valueOf(1000));
        when(securityPolicy.requireAuthenticated()).thenReturn(2L);
        when(priceAdjustmentRepository.findById(1L)).thenReturn(Optional.of(adj));
        when(importReceiptItemRepository.findById(7L)).thenReturn(Optional.of(item(7L, 3L, BigDecimal.valueOf(1000))));
        when(productUnitRepository.findByImportReceiptItemId(7L)).thenReturn(List.of(unit));
        when(priceAdjustmentRepository.optimisticUpdateStatus(1L, AdjustmentStatus.APPROVED, 2L, null)).thenReturn(1);

        service.approve(1L, null);

        assertEquals(0, BigDecimal.valueOf(1200).compareTo(unit.getCostPrice()));
        verify(productUnitRepository).saveAll(List.of(unit));
        verify(importReceiptItemRepository).save(any());
    }
}
