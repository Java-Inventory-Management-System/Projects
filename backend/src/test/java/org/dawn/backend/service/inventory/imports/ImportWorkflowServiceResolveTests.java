package org.dawn.backend.service.inventory.imports;

import org.dawn.backend.config.security.SecurityPolicy;
import org.dawn.backend.constant.enums.inventory.imports.ImportReceiptStatus;
import org.dawn.backend.entity.inventory.ImportReceipt;
import org.dawn.backend.exception.type.InvalidRequestException;
import org.dawn.backend.exception.type.ResourceNotFoundException;
import org.dawn.backend.repository.inventory.imports.ImportReceiptRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ImportWorkflowServiceResolveTests {

    @Mock ImportReceiptRepository importReceiptRepository;
    @Mock ImportReceiptService importReceiptService;
    @Mock SecurityPolicy securityPolicy;
    @Mock org.dawn.backend.repository.inventory.imports.ImportReceiptItemRepository importReceiptItemRepository;
    @Mock org.dawn.backend.repository.inventory.ProductUnitRepository productUnitRepository;
    @Mock org.dawn.backend.repository.inventory.ProductUnitStatusLogRepository statusLogRepository;
    @Mock org.dawn.backend.repository.inventory.PurchaseOrderRepository purchaseOrderRepository;
    @Mock org.dawn.backend.repository.inventory.PurchaseOrderItemRepository purchaseOrderItemRepository;
    @Mock org.dawn.backend.repository.inventory.box.BoxRepository boxRepository;
    @Mock org.dawn.backend.repository.inventory.stockcheck.StockCheckItemRepository stockCheckItemRepository;
    @Mock org.dawn.backend.shared.statemachine.StateMachine<ImportReceiptStatus> importReceiptStateMachine;

    @InjectMocks ImportWorkflowService service;

    private final Long receiptId = 100L;
    private final Long userId = 1L;

    private ImportReceipt receipt(ImportReceiptStatus status) {
        return ImportReceipt.builder()
                .id(receiptId)
                .receiptCode("IMP-001")
                .status(status)
                .build();
    }

    @Test
    void resolve_rejectedReceipt_setsResolution() {
        when(securityPolicy.requireAuthenticated()).thenReturn(userId);
        when(importReceiptRepository.findByIdForUpdate(receiptId)).thenReturn(Optional.of(receipt(ImportReceiptStatus.REJECTED)));
        when(importReceiptRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(importReceiptService.toResponse(any())).thenReturn(null);

        service.resolve(receiptId, "RETURNED_TO_SUPPLIER", "Đã trả lại NCC ngày 12/08");

        verify(importReceiptRepository).save(argThat(r ->
                "RETURNED_TO_SUPPLIER".equals(r.getResolution())
                        && "Đã trả lại NCC ngày 12/08".equals(r.getResolutionNote())
                        && userId.equals(r.getResolvedBy())
                        && r.getResolvedAt() != null));
    }

    @Test
    void resolve_nonRejectedReceipt_throws() {
        when(importReceiptRepository.findByIdForUpdate(receiptId)).thenReturn(Optional.of(receipt(ImportReceiptStatus.RECEIVED)));

        assertThrows(InvalidRequestException.class,
                () -> service.resolve(receiptId, "RETURNED_TO_SUPPLIER", null));
        verify(importReceiptRepository, never()).save(any());
    }

    @Test
    void resolve_invalidResolutionValue_throws() {
        when(securityPolicy.requireAuthenticated()).thenReturn(userId);
        when(importReceiptRepository.findByIdForUpdate(receiptId)).thenReturn(Optional.of(receipt(ImportReceiptStatus.REJECTED)));

        assertThrows(InvalidRequestException.class,
                () -> service.resolve(receiptId, "SOMETHING_ELSE", null));
        verify(importReceiptRepository, never()).save(any());
    }

    @Test
    void resolve_missingReceipt_throws() {
        when(importReceiptRepository.findByIdForUpdate(receiptId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> service.resolve(receiptId, "RETURNED_TO_SUPPLIER", null));
    }
}