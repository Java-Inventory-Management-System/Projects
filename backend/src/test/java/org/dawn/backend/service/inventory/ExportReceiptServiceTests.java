package org.dawn.backend.service.inventory;

import org.dawn.backend.shared.statemachine.StateMachine;
import org.dawn.backend.constant.enums.inventory.exports.ExportReason;
import org.dawn.backend.constant.enums.inventory.exports.ExportReceiptStatus;
import org.dawn.backend.constant.enums.inventory.ProductUnitStatus;
import org.dawn.backend.controller.inventory.request.ExportReceiptRequest;
import org.dawn.backend.controller.inventory.request.ExportReceiptRequest.ExportItemRequest;
import org.dawn.backend.entity.catalog.Product;
import org.dawn.backend.entity.inventory.Customer;
import org.dawn.backend.entity.inventory.ExportReceipt;
import org.dawn.backend.entity.inventory.ExportReceiptItem;
import org.dawn.backend.entity.inventory.ExportReceiptItemUnit;
import org.dawn.backend.entity.inventory.ProductUnit;
import org.dawn.backend.exception.type.InvalidRequestException;
import org.dawn.backend.exception.type.ResourceNotFoundException;
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
import org.dawn.backend.shared.util.ReceiptCodeGenerator;
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
    @Mock org.dawn.backend.repository.catalog.SupplierRepository supplierRepository;
    @Mock org.dawn.backend.repository.inventory.LocationRepository locationRepository;
    @Mock ExportReceiptService exportReceiptServiceMock;

    @InjectMocks ExportWorkflowService exportWorkflowService;
    @InjectMocks ExportReceiptService exportReceiptService;

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

        when(exportReceiptRepository.findByIdForUpdate(receiptId)).thenReturn(Optional.of(receipt));
        when(securityPolicy.requireAuthenticated()).thenReturn(userId);
        stubSave();

        exportWorkflowService.cancel(receiptId);

        assertEquals(ExportReceiptStatus.CANCELLED, receipt.getStatus());
    }

    @Test
    void cancel_fail_alreadyCancelled() {
        ExportReceipt receipt = pendingReceipt(ExportReason.SALE.name(), 99L);
        receipt.setStatus(ExportReceiptStatus.CANCELLED);

        when(exportReceiptRepository.findByIdForUpdate(receiptId)).thenReturn(Optional.of(receipt));
        when(securityPolicy.requireAuthenticated()).thenReturn(userId);
        doThrow(new InvalidRequestException("invalid transition"))
                .when(exportReceiptStateMachine).validate(any(), eq(ExportReceiptStatus.CANCELLED));

        assertThrows(InvalidRequestException.class, () -> exportWorkflowService.cancel(receiptId));
    }

    @Test
    void cancel_fail_notPendingApproval() {
        ExportReceipt receipt = pendingReceipt(ExportReason.SALE.name(), 99L);
        receipt.setStatus(ExportReceiptStatus.COMPLETED);

        when(exportReceiptRepository.findByIdForUpdate(receiptId)).thenReturn(Optional.of(receipt));
        when(securityPolicy.requireAuthenticated()).thenReturn(userId);
        doThrow(new InvalidRequestException("invalid transition"))
                .when(exportReceiptStateMachine).validate(any(), eq(ExportReceiptStatus.CANCELLED));

        assertThrows(InvalidRequestException.class, () -> exportWorkflowService.cancel(receiptId));
    }

    @Test
    void create_warrantyReplacement_countsWaitingRmaUnits_notInStock() {
        Product prod = mock(Product.class);
        when(prod.getId()).thenReturn(10L);
        when(prod.getUnit()).thenReturn("PIECE");
        when(productRepository.findById(10L)).thenReturn(Optional.of(prod));
        when(exportReceiptRepository.existsByReceiptCode(anyString())).thenReturn(false);
        when(exportReceiptRepository.sumCommittedQuantityByProductIdAndStatusIn(eq(10L), any())).thenReturn(BigDecimal.ZERO);
        when(productUnitRepository.countByProductIdAndStatusAndBoxIdIsNull(10L, ProductUnitStatus.WAITING_RMA_EXPORT))
                .thenReturn(2L);
        when(supplierRepository.existsById(1L)).thenReturn(true);
        when(exportReceiptRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(exportReceiptItemRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(securityPolicy.requireAuthenticated()).thenReturn(userId);

        try (MockedStatic<ReceiptCodeGenerator> gen = mockStatic(ReceiptCodeGenerator.class)) {
            gen.when(() -> ReceiptCodeGenerator.generate(eq("EXP-"), any())).thenReturn("EXP-001");

            exportReceiptService.create(new ExportReceiptRequest(
                    ExportReason.WARRANTY_REPLACEMENT.name(), null, 1L, "note", null,
                    List.of(new ExportItemRequest(10L, BigDecimal.ONE, BigDecimal.ZERO))));
        }

        verify(productUnitRepository)
                .countByProductIdAndStatusAndBoxIdIsNull(10L, ProductUnitStatus.WAITING_RMA_EXPORT);
        verify(productUnitRepository, never())
                .countByProductIdAndStatusAndBoxIdIsNull(10L, ProductUnitStatus.IN_STOCK);
    }

    @Test
    void create_saleReason_countsInStockUnits() {
        Product prod = mock(Product.class);
        when(prod.getId()).thenReturn(10L);
        when(prod.getUnit()).thenReturn("PIECE");
        when(productRepository.findById(10L)).thenReturn(Optional.of(prod));
        when(exportReceiptRepository.existsByReceiptCode(anyString())).thenReturn(false);
        when(exportReceiptRepository.sumCommittedQuantityByProductIdAndStatusIn(eq(10L), any())).thenReturn(BigDecimal.ZERO);
        when(productUnitRepository.countByProductIdAndStatusAndBoxIdIsNull(10L, ProductUnitStatus.IN_STOCK))
                .thenReturn(1L);
        when(exportReceiptRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(exportReceiptItemRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(securityPolicy.requireAuthenticated()).thenReturn(userId);
        Customer customer = mock(Customer.class);
        when(customer.getIsActive()).thenReturn(true);
        when(customerRepository.findById(99L)).thenReturn(Optional.of(customer));

        try (MockedStatic<ReceiptCodeGenerator> gen = mockStatic(ReceiptCodeGenerator.class)) {
            gen.when(() -> ReceiptCodeGenerator.generate(eq("EXP-"), any())).thenReturn("EXP-001");

            exportReceiptService.create(new ExportReceiptRequest(
                    ExportReason.SALE.name(), 99L, null, "note", null,
                    List.of(new ExportItemRequest(10L, BigDecimal.ONE, BigDecimal.ZERO))));
        }

        verify(productUnitRepository)
                .countByProductIdAndStatusAndBoxIdIsNull(10L, ProductUnitStatus.IN_STOCK);
    }

    @Test
    void create_saleReason_customerNotFound_rejected() {
        when(securityPolicy.requireAuthenticated()).thenReturn(userId);

        ExportReceiptRequest request = new ExportReceiptRequest(
                ExportReason.SALE.name(), 999L, null, "note", null,
                List.of(new ExportItemRequest(10L, BigDecimal.ONE, BigDecimal.ZERO)));

        assertThrows(ResourceNotFoundException.class, () -> exportReceiptService.create(request));
        verify(exportReceiptRepository, never()).save(any());
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
