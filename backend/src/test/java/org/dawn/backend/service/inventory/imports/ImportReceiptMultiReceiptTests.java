package org.dawn.backend.service.inventory.imports;

import org.dawn.backend.config.security.SecurityPolicy;
import org.dawn.backend.constant.enums.inventory.PurchaseOrderStatus;
import org.dawn.backend.constant.enums.inventory.imports.ImportReceiptStatus;
import org.dawn.backend.constant.shared.ErrorCode;
import org.dawn.backend.controller.inventory.request.ImportReceiptRequest;
import org.dawn.backend.entity.inventory.ImportReceipt;
import org.dawn.backend.entity.inventory.PurchaseOrder;
import org.dawn.backend.exception.type.InvalidRequestException;
import org.dawn.backend.repository.auth.UserRepository;
import org.dawn.backend.repository.catalog.ProductRepository;
import org.dawn.backend.repository.catalog.SupplierRepository;
import org.dawn.backend.repository.inventory.PurchaseOrderRepository;
import org.dawn.backend.repository.inventory.imports.ImportReceiptItemRepository;
import org.dawn.backend.repository.inventory.imports.ImportReceiptRepository;
import org.dawn.backend.service.shared.LockGuard;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ImportReceiptMultiReceiptTests {

    @Mock SecurityPolicy securityPolicy;
    @Mock LockGuard lockGuard;
    @Mock PurchaseOrderRepository purchaseOrderRepository;
    @Mock ImportReceiptRepository importReceiptRepository;
    @Mock ImportReceiptItemRepository importReceiptItemRepository;
    @Mock ProductRepository productRepository;
    @Mock SupplierRepository supplierRepository;
    @Mock UserRepository userRepository;

    @InjectMocks ImportReceiptService service;

    private ImportReceiptRequest request;

    @BeforeEach
    void setUp() {
        request = new ImportReceiptRequest("IMP-TEST", 5L, 1L, null, null, null);
    }

    private PurchaseOrder po(PurchaseOrderStatus status) {
        var po = mock(PurchaseOrder.class);
        when(po.getStatus()).thenReturn(status);
        when(po.getSupplierId()).thenReturn(5L);
        return po;
    }

    @Test
    void create_poCompleted_throws() {
        var po = po(PurchaseOrderStatus.COMPLETED);
        when(purchaseOrderRepository.findById(1L)).thenReturn(Optional.of(po));

        var ex = assertThrows(InvalidRequestException.class, () -> service.create(request));

        assertEquals(ErrorCode.PO_COMPLETED_CANNOT_IMPORT.code(), ex.getCode());
        verify(importReceiptRepository, never()).existsByPurchaseOrderIdAndStatus(any(), any());
    }

    @Test
    void create_poHasDraftReceipt_throws() {
        var po = po(PurchaseOrderStatus.OPEN);
        when(purchaseOrderRepository.findById(1L)).thenReturn(Optional.of(po));
        when(importReceiptRepository.existsByPurchaseOrderIdAndStatus(1L, ImportReceiptStatus.DRAFT))
                .thenReturn(true);

        var ex = assertThrows(InvalidRequestException.class, () -> service.create(request));

        assertEquals(ErrorCode.PO_ALREADY_IMPORTED.code(), ex.getCode());
    }

    @Test
    void create_poHasOnlyReceivedReceipt_allowsNewReceipt() {
        var po = po(PurchaseOrderStatus.PARTIAL);
        when(purchaseOrderRepository.findById(1L)).thenReturn(Optional.of(po));
        when(importReceiptRepository.existsByPurchaseOrderIdAndStatus(1L, ImportReceiptStatus.DRAFT))
                .thenReturn(false);
        when(importReceiptRepository.existsByReceiptCode("IMP-TEST")).thenReturn(false);
        when(importReceiptRepository.save(any(ImportReceipt.class))).thenAnswer(a -> a.getArgument(0));
        when(supplierRepository.findAllById(anyList())).thenReturn(List.of());
        when(userRepository.findAllById(anyList())).thenReturn(List.of());
        when(purchaseOrderRepository.findAllById(anyList())).thenReturn(List.of());
        when(securityPolicy.requireAuthenticated()).thenReturn(1L);

        var result = service.create(request);

        assertNotNull(result);
        verify(importReceiptRepository, times(2)).save(any(ImportReceipt.class));
    }
}
