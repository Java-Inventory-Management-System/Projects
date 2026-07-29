package org.dawn.backend.service.inventory;

import org.dawn.backend.shared.statemachine.StateMachine;
import org.dawn.backend.constant.enums.inventory.exports.ExportReason;
import org.dawn.backend.constant.enums.inventory.exports.ExportReceiptStatus;
import org.dawn.backend.constant.enums.inventory.ProductUnitStatus;
import org.dawn.backend.entity.inventory.ExportReceipt;
import org.dawn.backend.entity.inventory.ExportReceiptItem;
import org.dawn.backend.entity.inventory.ExportReceiptItemUnit;
import org.dawn.backend.entity.inventory.ProductUnit;
import org.dawn.backend.exception.type.InvalidRequestException;
import org.dawn.backend.repository.auth.UserRepository;
import org.dawn.backend.repository.catalog.ProductRepository;
import org.dawn.backend.repository.inventory.CustomerRepository;
import org.dawn.backend.repository.inventory.exports.ExportReceiptItemRepository;
import org.dawn.backend.repository.inventory.exports.ExportReceiptItemUnitRepository;
import org.dawn.backend.repository.inventory.exports.ExportReceiptRepository;
import org.dawn.backend.repository.inventory.exports.ExportReceiptStatusHistoryRepository;
import org.dawn.backend.repository.inventory.ProductUnitRepository;
import org.dawn.backend.repository.inventory.ProductUnitStatusLogRepository;
import org.dawn.backend.service.inventory.exports.ExportReceiptService;
import org.dawn.backend.service.inventory.exports.ExportWorkflowService;
import org.dawn.backend.shared.util.SecurityUtils;
import org.dawn.backend.config.security.SecurityPolicy;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ExportReceiptServiceTests {

    @Mock ExportReceiptRepository exportReceiptRepository;
    @Mock ExportReceiptStatusHistoryRepository statusHistoryRepository;
    @Mock ExportReceiptItemRepository exportReceiptItemRepository;
    @Mock ExportReceiptItemUnitRepository exportReceiptItemUnitRepository;
    @Mock ProductUnitRepository productUnitRepository;
    @Mock ProductUnitStatusLogRepository statusLogRepository;
    @Mock ProductRepository productRepository;
    @Mock CustomerRepository customerRepository;
    @Mock UserRepository userRepository;
    @Mock StateMachine<ExportReceiptStatus> exportReceiptStateMachine;
    @Mock SecurityPolicy securityPolicy;
    @Mock ExportReceiptService exportReceiptService;

    @InjectMocks ExportWorkflowService exportWorkflowService;

    @Captor ArgumentCaptor<ExportReceipt> receiptCaptor;

    private final Long userId = 1L;
    private final Long receiptId = 100L;

    private void stubSave() {
        when(exportReceiptRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    }

    private void stubToResponse() {
        when(exportReceiptItemRepository.findByReceiptId(anyLong())).thenReturn(List.of());
        when(userRepository.findById(anyLong())).thenReturn(Optional.empty());
    }

    @Test
    void cancel_success() {
        ExportReceipt receipt = pendingReceipt(ExportReason.SALE.name(), 99L);

        when(exportReceiptRepository.findById(receiptId)).thenReturn(Optional.of(receipt));
        stubSave();
        stubToResponse();

        exportWorkflowService.cancel(receiptId);

        assertEquals(ExportReceiptStatus.CANCELLED, receipt.getStatus());
    }

    @Test
    void cancel_fail_alreadyCancelled() {
        ExportReceipt receipt = pendingReceipt(ExportReason.SALE.name(), 99L);
        receipt.setStatus(ExportReceiptStatus.CANCELLED);

        when(exportReceiptRepository.findById(receiptId)).thenReturn(Optional.of(receipt));

        assertThrows(InvalidRequestException.class, () -> exportWorkflowService.cancel(receiptId));
    }

    @Test
    void cancel_fail_notPendingApproval() {
        ExportReceipt receipt = pendingReceipt(ExportReason.SALE.name(), 99L);
        receipt.setStatus(ExportReceiptStatus.COMPLETED);

        when(exportReceiptRepository.findById(receiptId)).thenReturn(Optional.of(receipt));

        assertThrows(InvalidRequestException.class, () -> exportWorkflowService.cancel(receiptId));
    }

    private ExportReceipt pendingReceipt(String reason, Long createdBy) {
        return ExportReceipt.builder()
                .id(receiptId)
                .receiptCode("EXP-TEST")
                .reason(reason)
                .status(ExportReceiptStatus.PENDING)
                .createdBy(createdBy)
                .build();
    }

    private ExportReceiptItem exportItem(Long receiptId, Long productId) {
        return ExportReceiptItem.builder()
                .id(200L)
                .receiptId(receiptId)
                .productId(productId)
                .quantity(BigDecimal.ONE)
                .unitPrice(new BigDecimal("100.00"))
                .totalPrice(new BigDecimal("100.00"))
                .build();
    }

    private ExportReceiptItemUnit exportItemUnit(Long itemId, Long unitId, BigDecimal qty) {
        return ExportReceiptItemUnit.builder()
                .id(300L)
                .exportReceiptItemId(itemId)
                .productUnitId(unitId)
                .quantity(qty)
                .sellPrice(new BigDecimal("100.00"))
                .build();
    }

    private ProductUnit serializedUnit(Long id, ProductUnitStatus status, BigDecimal remaining) {
        return ProductUnit.builder()
                .id(id)
                .serialNumber("SN-" + id)
                .productId(10L)
                .trackingType("SERIALIZED")
                .status(status)
                .remainingQuantity(remaining)
                .importedAt(Instant.now())
                .warrantyMonths(12)
                .build();
    }
}
