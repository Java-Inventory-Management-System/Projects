package org.dawn.backend.service.inventory;

import org.dawn.backend.constant.inventory.*;
import org.dawn.backend.controller.inventory.request.ReturnReceiptRequest;
import org.dawn.backend.controller.inventory.request.ReturnReceiptRequest.ReturnItemRequest;
import org.dawn.backend.entity.inventory.ExportReceipt;
import org.dawn.backend.entity.inventory.ProductUnit;
import org.dawn.backend.entity.inventory.ReturnReceipt;
import org.dawn.backend.entity.inventory.ReturnReceiptItem;
import org.dawn.backend.exception.wrapper.InvalidRequestException;
import org.dawn.backend.exception.wrapper.ResourceNotFoundException;
import org.dawn.backend.repository.auth.UserRepository;
import org.dawn.backend.repository.inventory.*;
import org.dawn.backend.utils.ReceiptCodeGenerator;
import org.dawn.backend.utils.SecurityUtils;
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
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReturnReceiptServiceTests {

    @Mock ReturnReceiptRepository returnReceiptRepository;
    @Mock ReturnReceiptItemRepository returnReceiptItemRepository;
    @Mock ExportReceiptRepository exportReceiptRepository;
    @Mock ProductUnitRepository productUnitRepository;
    @Mock ProductUnitStatusLogRepository statusLogRepository;
    @Mock CustomerRepository customerRepository;
    @Mock UserRepository userRepository;

    @InjectMocks ReturnReceiptService returnReceiptService;

    @Captor ArgumentCaptor<ProductUnit> puCaptor;

    private final Long userId = 1L;
    private final Long receiptId = 100L;
    private final Long exportReceiptId = 50L;
    private final Long customerId = 10L;
    private final Long productUnitId = 1L;

    private void stubSave() {
        when(returnReceiptRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    }

    private void stubEnrich() {
        when(returnReceiptItemRepository.findByReturnReceiptId(anyLong())).thenReturn(List.of());
        when(customerRepository.findById(anyLong())).thenReturn(Optional.empty());
        when(userRepository.findById(anyLong())).thenReturn(Optional.empty());
    }

    // ─── Create: guard tests ─────────────────────────────────

    @Test
    void create_fail_itemsEmpty() {
        ReturnReceiptRequest request = new ReturnReceiptRequest(
                customerId, exportReceiptId, ReturnReason.DEFECTIVE.name(), null, List.of()
        );
        try (MockedStatic<SecurityUtils> security = mockStatic(SecurityUtils.class)) {
            security.when(SecurityUtils::getCurrentUserId).thenReturn(userId);
            assertThrows(InvalidRequestException.class, () -> returnReceiptService.create(request));
        }
    }

    @Test
    void create_fail_reasonBlank() {
        ReturnReceiptRequest request = new ReturnReceiptRequest(
                customerId, exportReceiptId, "", null,
                List.of(new ReturnItemRequest(null, 20L, BigDecimal.ONE, ReturnCondition.GOOD.name(), ResultingAction.RESTOCK.name()))
        );
        try (MockedStatic<SecurityUtils> security = mockStatic(SecurityUtils.class)) {
            security.when(SecurityUtils::getCurrentUserId).thenReturn(userId);
            assertThrows(InvalidRequestException.class, () -> returnReceiptService.create(request));
        }
    }

    @Test
    void create_fail_exportRequired() {
        ReturnReceiptRequest request = new ReturnReceiptRequest(
                customerId, null, ReturnReason.DEFECTIVE.name(), null,
                List.of(new ReturnItemRequest(null, 20L, BigDecimal.ONE, ReturnCondition.GOOD.name(), ResultingAction.RESTOCK.name()))
        );
        try (MockedStatic<SecurityUtils> security = mockStatic(SecurityUtils.class)) {
            security.when(SecurityUtils::getCurrentUserId).thenReturn(userId);
            assertThrows(InvalidRequestException.class, () -> returnReceiptService.create(request));
        }
    }

    @Test
    void create_fail_customerRequired() {
        ReturnReceiptRequest request = new ReturnReceiptRequest(
                null, exportReceiptId, ReturnReason.DEFECTIVE.name(), null,
                List.of(new ReturnItemRequest(null, 20L, BigDecimal.ONE, ReturnCondition.GOOD.name(), ResultingAction.RESTOCK.name()))
        );
        try (MockedStatic<SecurityUtils> security = mockStatic(SecurityUtils.class)) {
            security.when(SecurityUtils::getCurrentUserId).thenReturn(userId);
            assertThrows(InvalidRequestException.class, () -> returnReceiptService.create(request));
        }
    }

    @Test
    void create_fail_exportNotFound() {
        ReturnReceiptRequest request = new ReturnReceiptRequest(
                customerId, exportReceiptId, ReturnReason.DEFECTIVE.name(), null,
                List.of(new ReturnItemRequest(null, 20L, BigDecimal.ONE, ReturnCondition.GOOD.name(), ResultingAction.RESTOCK.name()))
        );
        when(exportReceiptRepository.findById(exportReceiptId)).thenReturn(Optional.empty());
        try (MockedStatic<SecurityUtils> security = mockStatic(SecurityUtils.class)) {
            security.when(SecurityUtils::getCurrentUserId).thenReturn(userId);
            assertThrows(ResourceNotFoundException.class, () -> returnReceiptService.create(request));
        }
    }

    @Test
    void create_fail_unitNotSold() {
        ReturnReceiptRequest request = new ReturnReceiptRequest(
                customerId, exportReceiptId, ReturnReason.DEFECTIVE.name(), null,
                List.of(new ReturnItemRequest(productUnitId, 20L, BigDecimal.ONE, ReturnCondition.GOOD.name(), ResultingAction.RESTOCK.name()))
        );
        var exportReceipt = mock(ExportReceipt.class);
        var pu = mock(ProductUnit.class);
        when(exportReceiptRepository.findById(exportReceiptId)).thenReturn(Optional.of(exportReceipt));
        when(productUnitRepository.findById(productUnitId)).thenReturn(Optional.of(pu));
        when(pu.getStatus()).thenReturn(ProductUnitStatus.IN_STOCK.name());

        try (MockedStatic<SecurityUtils> security = mockStatic(SecurityUtils.class);
             MockedStatic<ReceiptCodeGenerator> gen = mockStatic(ReceiptCodeGenerator.class)) {
            security.when(SecurityUtils::getCurrentUserId).thenReturn(userId);
            gen.when(() -> ReceiptCodeGenerator.generate(eq("RET-"), any())).thenReturn("RET-001");
            stubSave();

            assertThrows(InvalidRequestException.class, () -> returnReceiptService.create(request));
        }
    }

    @Test
    void create_success() {
        ReturnReceiptRequest request = new ReturnReceiptRequest(
                customerId, exportReceiptId, ReturnReason.DEFECTIVE.name(), "note",
                List.of(new ReturnItemRequest(productUnitId, 20L, BigDecimal.ONE, ReturnCondition.GOOD.name(), ResultingAction.RESTOCK.name()))
        );

        var exportReceipt = mock(ExportReceipt.class);
        var pu = mock(ProductUnit.class);
        when(exportReceiptRepository.findById(exportReceiptId)).thenReturn(Optional.of(exportReceipt));
        when(productUnitRepository.findById(productUnitId)).thenReturn(Optional.of(pu));
        when(pu.getStatus()).thenReturn(ProductUnitStatus.SOLD.name());
        // save returns a receipt with ID (simulates DB generation)
        when(returnReceiptRepository.save(any())).thenAnswer(invocation -> {
            ReturnReceipt r = invocation.getArgument(0);
            return ReturnReceipt.builder()
                    .id(receiptId)
                    .receiptCode(r.getReceiptCode())
                    .customerId(r.getCustomerId())
                    .originalExportReceiptId(r.getOriginalExportReceiptId())
                    .reason(r.getReason())
                    .status(r.getStatus())
                    .note(r.getNote())
                    .createdBy(r.getCreatedBy())
                    .build();
        });
        when(returnReceiptItemRepository.findByReturnReceiptId(anyLong())).thenReturn(List.of());
        when(customerRepository.findById(anyLong())).thenReturn(Optional.empty());
        when(userRepository.findById(anyLong())).thenReturn(Optional.empty());

        try (MockedStatic<SecurityUtils> security = mockStatic(SecurityUtils.class);
             MockedStatic<ReceiptCodeGenerator> gen = mockStatic(ReceiptCodeGenerator.class)) {
            security.when(SecurityUtils::getCurrentUserId).thenReturn(userId);
            gen.when(() -> ReceiptCodeGenerator.generate(eq("RET-"), any())).thenReturn("RET-001");

            returnReceiptService.create(request);

            verify(returnReceiptRepository).save(any());
            verify(returnReceiptItemRepository).save(any());
        }
    }

    // ─── Approve: action → status mapping ────────────────────

    @Test
    void approve_success_restock() {
        ReturnReceipt receipt = pendingReceipt(ReturnReason.DEFECTIVE.name());
        ReturnReceiptItem item = returnItem(receiptId, productUnitId, ResultingAction.RESTOCK.name());
        ProductUnit pu = serializedUnit(productUnitId, ProductUnitStatus.SOLD, BigDecimal.TEN);

        when(returnReceiptRepository.findById(receiptId)).thenReturn(Optional.of(receipt));
        stubSave();
        stubEnrich();
        when(returnReceiptItemRepository.findByReturnReceiptId(receiptId)).thenReturn(List.of(item));
        when(productUnitRepository.findByIdForUpdate(productUnitId)).thenReturn(Optional.of(pu));

        try (MockedStatic<SecurityUtils> security = mockStatic(SecurityUtils.class)) {
            security.when(SecurityUtils::getCurrentUserId).thenReturn(userId);

            returnReceiptService.approve(receiptId);

            assertEquals(ProductUnitStatus.RETURNED.name(), pu.getStatus());
            assertEquals(ReturnReceiptStatus.COMPLETED.name(), receipt.getStatus());
            assertEquals(userId, receipt.getApprovedBy());
        }
    }

    @Test
    void approve_success_scrap() {
        ReturnReceipt receipt = pendingReceipt(ReturnReason.DEFECTIVE.name());
        ReturnReceiptItem item = returnItem(receiptId, productUnitId, ResultingAction.SCRAP.name());
        ProductUnit pu = serializedUnit(productUnitId, ProductUnitStatus.SOLD, BigDecimal.TEN);

        when(returnReceiptRepository.findById(receiptId)).thenReturn(Optional.of(receipt));
        stubSave();
        stubEnrich();
        when(returnReceiptItemRepository.findByReturnReceiptId(receiptId)).thenReturn(List.of(item));
        when(productUnitRepository.findByIdForUpdate(productUnitId)).thenReturn(Optional.of(pu));

        try (MockedStatic<SecurityUtils> security = mockStatic(SecurityUtils.class)) {
            security.when(SecurityUtils::getCurrentUserId).thenReturn(userId);

            returnReceiptService.approve(receiptId);

            assertEquals(ProductUnitStatus.DISPOSED.name(), pu.getStatus());
        }
    }

    @Test
    void approve_success_warrantyTransfer() {
        ReturnReceipt receipt = pendingReceipt(ReturnReason.DEFECTIVE.name());
        ReturnReceiptItem item = returnItem(receiptId, productUnitId, ResultingAction.WARRANTY_TRANSFER.name());
        ProductUnit pu = serializedUnit(productUnitId, ProductUnitStatus.SOLD, BigDecimal.TEN);

        when(returnReceiptRepository.findById(receiptId)).thenReturn(Optional.of(receipt));
        stubSave();
        stubEnrich();
        when(returnReceiptItemRepository.findByReturnReceiptId(receiptId)).thenReturn(List.of(item));
        when(productUnitRepository.findByIdForUpdate(productUnitId)).thenReturn(Optional.of(pu));

        try (MockedStatic<SecurityUtils> security = mockStatic(SecurityUtils.class)) {
            security.when(SecurityUtils::getCurrentUserId).thenReturn(userId);

            returnReceiptService.approve(receiptId);

            assertEquals(ProductUnitStatus.DEFECTIVE.name(), pu.getStatus());
        }
    }

    @Test
    void approve_fail_creator() {
        ReturnReceipt receipt = pendingReceipt(ReturnReason.DEFECTIVE.name());
        receipt.setCreatedBy(userId);

        when(returnReceiptRepository.findById(receiptId)).thenReturn(Optional.of(receipt));

        try (MockedStatic<SecurityUtils> security = mockStatic(SecurityUtils.class)) {
            security.when(SecurityUtils::getCurrentUserId).thenReturn(userId);
            assertThrows(InvalidRequestException.class, () -> returnReceiptService.approve(receiptId));
        }
    }

    @Test
    void approve_fail_notPending() {
        ReturnReceipt receipt = pendingReceipt(ReturnReason.DEFECTIVE.name());
        receipt.setStatus(ReturnReceiptStatus.COMPLETED.name());

        when(returnReceiptRepository.findById(receiptId)).thenReturn(Optional.of(receipt));

        try (MockedStatic<SecurityUtils> security = mockStatic(SecurityUtils.class)) {
            security.when(SecurityUtils::getCurrentUserId).thenReturn(userId);
            assertThrows(InvalidRequestException.class, () -> returnReceiptService.approve(receiptId));
        }
    }

    // ─── Cancel tests ────────────────────────────────────────

    @Test
    void cancel_success() {
        ReturnReceipt receipt = pendingReceipt(ReturnReason.DEFECTIVE.name());

        when(returnReceiptRepository.findById(receiptId)).thenReturn(Optional.of(receipt));
        stubEnrich();
        stubSave();

        returnReceiptService.cancel(receiptId);

        assertEquals(ReturnReceiptStatus.CANCELLED.name(), receipt.getStatus());
    }

    @Test
    void cancel_fail_alreadyCancelled() {
        ReturnReceipt receipt = pendingReceipt(ReturnReason.DEFECTIVE.name());
        receipt.setStatus(ReturnReceiptStatus.CANCELLED.name());

        when(returnReceiptRepository.findById(receiptId)).thenReturn(Optional.of(receipt));

        assertThrows(InvalidRequestException.class, () -> returnReceiptService.cancel(receiptId));
    }

    @Test
    void cancel_fail_alreadyCompleted() {
        ReturnReceipt receipt = pendingReceipt(ReturnReason.DEFECTIVE.name());
        receipt.setStatus(ReturnReceiptStatus.COMPLETED.name());

        when(returnReceiptRepository.findById(receiptId)).thenReturn(Optional.of(receipt));

        assertThrows(InvalidRequestException.class, () -> returnReceiptService.cancel(receiptId));
    }

    // ─── Helpers ─────────────────────────────────────────────

    private ReturnReceipt pendingReceipt(String reason) {
        return ReturnReceipt.builder()
                .id(receiptId)
                .receiptCode("RET-TEST")
                .customerId(customerId)
                .originalExportReceiptId(exportReceiptId)
                .reason(reason)
                .status(ReturnReceiptStatus.PENDING_APPROVAL.name())
                .createdBy(99L)
                .build();
    }

    private ReturnReceiptItem returnItem(Long returnReceiptId, Long productUnitId, String action) {
        return ReturnReceiptItem.builder()
                .id(200L)
                .returnReceiptId(returnReceiptId)
                .productUnitId(productUnitId)
                .productId(20L)
                .quantity(BigDecimal.ONE)
                .condition(ReturnCondition.GOOD.name())
                .resultingAction(action)
                .build();
    }

    private ProductUnit serializedUnit(Long id, ProductUnitStatus status, BigDecimal remaining) {
        return ProductUnit.builder()
                .id(id)
                .serialNumber("SN-" + id)
                .productId(20L)
                .trackingType("SERIALIZED")
                .status(status.name())
                .remainingQuantity(remaining)
                .importedAt(Instant.now())
                .build();
    }
}
