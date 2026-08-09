package org.dawn.backend.service.inventory;

import org.dawn.backend.constant.enums.inventory.adjustments.*;
import org.dawn.backend.constant.enums.inventory.exports.*;
import org.dawn.backend.constant.enums.inventory.imports.*;
import org.dawn.backend.constant.enums.inventory.returns.*;
import org.dawn.backend.constant.enums.inventory.*;
import org.dawn.backend.controller.inventory.request.ReturnReceiptRequest;
import org.dawn.backend.controller.inventory.request.ReturnReceiptRequest.ReturnItemRequest;
import org.dawn.backend.entity.catalog.Product;
import org.dawn.backend.entity.inventory.ExportReceipt;
import org.dawn.backend.entity.inventory.ProductUnit;
import org.dawn.backend.entity.inventory.ProductUnitStatusLog;
import org.dawn.backend.entity.inventory.ReturnReceipt;
import org.dawn.backend.entity.inventory.ReturnReceiptItem;
import org.dawn.backend.exception.type.InvalidRequestException;
import org.dawn.backend.exception.type.ResourceNotFoundException;
import org.dawn.backend.config.security.SecurityPolicy;
import org.dawn.backend.repository.auth.UserRepository;
import org.dawn.backend.repository.catalog.ProductRepository;
import org.dawn.backend.repository.inventory.exports.ExportReceiptItemUnitRepository;
import org.dawn.backend.shared.statemachine.StateMachine;
import org.dawn.backend.repository.inventory.CustomerRepository;
import org.dawn.backend.repository.inventory.ProductUnitRepository;
import org.dawn.backend.repository.inventory.ProductUnitStatusLogRepository;
import org.dawn.backend.repository.inventory.exports.ExportReceiptRepository;
import org.dawn.backend.repository.inventory.returns.ReturnReceiptItemRepository;
import org.dawn.backend.repository.inventory.returns.ReturnReceiptRepository;
import org.dawn.backend.service.inventory.returns.ReturnReceiptService;
import org.dawn.backend.shared.util.ReceiptCodeGenerator;
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
    @Mock ProductRepository productRepository;
    @Mock ExportReceiptItemUnitRepository exportReceiptItemUnitRepository;
    @Mock org.dawn.backend.repository.inventory.LocationRepository locationRepository;
    @Mock StateMachine<ReturnReceiptStatus> returnReceiptStateMachine;
    @Mock SecurityPolicy securityPolicy;

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
        {
            when(securityPolicy.requireAuthenticated()).thenReturn(userId);
            assertThrows(InvalidRequestException.class, () -> returnReceiptService.create(request));
        }
    }

    @Test
    void create_fail_reasonBlank() {
        ReturnReceiptRequest request = new ReturnReceiptRequest(
                customerId, exportReceiptId, "", null,
                List.of(new ReturnItemRequest(null, 20L, BigDecimal.ONE, ReturnCondition.GOOD.name(), ResultingAction.RESTOCK.name(), null, null))
        );
        {
            when(securityPolicy.requireAuthenticated()).thenReturn(userId);
            assertThrows(InvalidRequestException.class, () -> returnReceiptService.create(request));
        }
    }

    @Test
    void create_fail_exportRequired() {
        ReturnReceiptRequest request = new ReturnReceiptRequest(
                customerId, null, ReturnReason.DEFECTIVE.name(), null,
                List.of(new ReturnItemRequest(null, 20L, BigDecimal.ONE, ReturnCondition.GOOD.name(), ResultingAction.RESTOCK.name(), null, null))
        );
        {
            when(securityPolicy.requireAuthenticated()).thenReturn(userId);
            assertThrows(InvalidRequestException.class, () -> returnReceiptService.create(request));
        }
    }

    @Test
    void create_fail_customerRequired() {
        ReturnReceiptRequest request = new ReturnReceiptRequest(
                null, exportReceiptId, ReturnReason.DEFECTIVE.name(), null,
                List.of(new ReturnItemRequest(null, 20L, BigDecimal.ONE, ReturnCondition.GOOD.name(), ResultingAction.RESTOCK.name(), null, null))
        );
        {
            when(securityPolicy.requireAuthenticated()).thenReturn(userId);
            assertThrows(InvalidRequestException.class, () -> returnReceiptService.create(request));
        }
    }

    @Test
    void create_fail_exportNotFound() {
        ReturnReceiptRequest request = new ReturnReceiptRequest(
                customerId, exportReceiptId, ReturnReason.DEFECTIVE.name(), null,
                List.of(new ReturnItemRequest(null, 20L, BigDecimal.ONE, ReturnCondition.GOOD.name(), ResultingAction.RESTOCK.name(), null, null))
        );
        when(exportReceiptRepository.findById(exportReceiptId)).thenReturn(Optional.empty());
        {
            when(securityPolicy.requireAuthenticated()).thenReturn(userId);
            assertThrows(ResourceNotFoundException.class, () -> returnReceiptService.create(request));
        }
    }

    @Test
    void create_fail_unitNotSold() {
        ReturnReceiptRequest request = new ReturnReceiptRequest(
                customerId, exportReceiptId, ReturnReason.DEFECTIVE.name(), null,
                List.of(new ReturnItemRequest(productUnitId, 20L, BigDecimal.ONE, ReturnCondition.GOOD.name(), ResultingAction.RESTOCK.name(), null, null))
        );
        var exportReceipt = mock(ExportReceipt.class);
        var pu = mock(ProductUnit.class);
        when(exportReceiptRepository.findById(exportReceiptId)).thenReturn(Optional.of(exportReceipt));
        when(exportReceipt.getCustomerId()).thenReturn(customerId);
        when(productUnitRepository.findById(productUnitId)).thenReturn(Optional.of(pu));
        when(pu.getStatus()).thenReturn(ProductUnitStatus.IN_STOCK);

        try (MockedStatic<ReceiptCodeGenerator> gen = mockStatic(ReceiptCodeGenerator.class)) {
            when(securityPolicy.requireAuthenticated()).thenReturn(userId);
            gen.when(() -> ReceiptCodeGenerator.generate(eq("RET-"), any())).thenReturn("RET-001");
            stubSave();

            assertThrows(InvalidRequestException.class, () -> returnReceiptService.create(request));
        }
    }

    @Test
    void create_success() {
        ReturnReceiptRequest request = new ReturnReceiptRequest(
                customerId, exportReceiptId, ReturnReason.DEFECTIVE.name(), "note",
                List.of(new ReturnItemRequest(productUnitId, 20L, BigDecimal.ONE, ReturnCondition.GOOD.name(), ResultingAction.RESTOCK.name(), null, null))
        );

        var exportReceipt = mock(ExportReceipt.class);
        var pu = mock(ProductUnit.class);
        when(exportReceiptRepository.findById(exportReceiptId)).thenReturn(Optional.of(exportReceipt));
        when(exportReceipt.getCustomerId()).thenReturn(customerId);
        when(productUnitRepository.findById(productUnitId)).thenReturn(Optional.of(pu));
        when(pu.getStatus()).thenReturn(ProductUnitStatus.EXPORTED);
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

        try (MockedStatic<ReceiptCodeGenerator> gen = mockStatic(ReceiptCodeGenerator.class)) {
            when(securityPolicy.requireAuthenticated()).thenReturn(userId);
            gen.when(() -> ReceiptCodeGenerator.generate(eq("RET-"), any())).thenReturn("RET-001");

            returnReceiptService.create(request);

            verify(returnReceiptRepository).save(any());
            verify(returnReceiptItemRepository).save(any());
        }
    }

    @Test
    void create_fail_evidenceMissingForDefective() {
        ReturnReceiptRequest request = new ReturnReceiptRequest(
                customerId, exportReceiptId, ReturnReason.DEFECTIVE.name(), null,
                List.of(new ReturnItemRequest(productUnitId, 20L, BigDecimal.ONE,
                        ReturnCondition.DEFECTIVE.name(), ResultingAction.WARRANTY_TRANSFER.name(), null, "img-1.jpg"))
        );
        var exportReceipt = mock(ExportReceipt.class);
        when(exportReceiptRepository.findById(exportReceiptId)).thenReturn(Optional.of(exportReceipt));
        when(exportReceipt.getCustomerId()).thenReturn(customerId);
        stubSave();

        try (MockedStatic<ReceiptCodeGenerator> gen = mockStatic(ReceiptCodeGenerator.class)) {
            when(securityPolicy.requireAuthenticated()).thenReturn(userId);
            gen.when(() -> ReceiptCodeGenerator.generate(eq("RET-"), any())).thenReturn("RET-001");

            assertThrows(InvalidRequestException.class, () -> returnReceiptService.create(request));
        }
    }

    @Test
    void create_fail_evidenceImageMissingForDefective() {
        ReturnReceiptRequest request = new ReturnReceiptRequest(
                customerId, exportReceiptId, ReturnReason.DEFECTIVE.name(), null,
                List.of(new ReturnItemRequest(productUnitId, 20L, BigDecimal.ONE,
                        ReturnCondition.DEFECTIVE.name(), ResultingAction.WARRANTY_TRANSFER.name(), "hỏng màn hình", null))
        );
        var exportReceipt = mock(ExportReceipt.class);
        when(exportReceiptRepository.findById(exportReceiptId)).thenReturn(Optional.of(exportReceipt));
        when(exportReceipt.getCustomerId()).thenReturn(customerId);
        stubSave();

        try (MockedStatic<ReceiptCodeGenerator> gen = mockStatic(ReceiptCodeGenerator.class)) {
            when(securityPolicy.requireAuthenticated()).thenReturn(userId);
            gen.when(() -> ReceiptCodeGenerator.generate(eq("RET-"), any())).thenReturn("RET-001");

            assertThrows(InvalidRequestException.class, () -> returnReceiptService.create(request));
        }
    }

    @Test
    void create_success_defectiveWithEvidence() {
        ReturnReceiptRequest request = new ReturnReceiptRequest(
                customerId, exportReceiptId, ReturnReason.DEFECTIVE.name(), "note",
                List.of(new ReturnItemRequest(productUnitId, 20L, BigDecimal.ONE,
                        ReturnCondition.DEFECTIVE.name(), ResultingAction.WARRANTY_TRANSFER.name(),
                        "hỏng màn hình", "img-1.jpg"))
        );

        var exportReceipt = mock(ExportReceipt.class);
        var pu = mock(ProductUnit.class);
        when(exportReceiptRepository.findById(exportReceiptId)).thenReturn(Optional.of(exportReceipt));
        when(exportReceipt.getCustomerId()).thenReturn(customerId);
        when(productUnitRepository.findById(productUnitId)).thenReturn(Optional.of(pu));
        when(pu.getStatus()).thenReturn(ProductUnitStatus.EXPORTED);
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

        try (MockedStatic<ReceiptCodeGenerator> gen = mockStatic(ReceiptCodeGenerator.class)) {
            when(securityPolicy.requireAuthenticated()).thenReturn(userId);
            gen.when(() -> ReceiptCodeGenerator.generate(eq("RET-"), any())).thenReturn("RET-001");

            returnReceiptService.create(request);

            verify(returnReceiptRepository).save(any());
            verify(returnReceiptItemRepository).save(argThat(item ->
                    "hỏng màn hình".equals(item.getDescription()) && "img-1.jpg".equals(item.getEvidenceImage())));
        }
    }

    // ─── Approve: action → status mapping ────────────────────

    @Test
    void approve_success_restock() {
        ReturnReceipt receipt = pendingReceipt(ReturnReason.DEFECTIVE.name());
        ReturnReceiptItem item = returnItem(receiptId, productUnitId, ResultingAction.RESTOCK.name());
        ProductUnit pu = serializedUnit(productUnitId, ProductUnitStatus.EXPORTED, BigDecimal.TEN);

        when(returnReceiptRepository.findByIdForUpdate(receiptId)).thenReturn(Optional.of(receipt));
        stubSave();
        stubEnrich();
        when(returnReceiptItemRepository.findByReturnReceiptId(receiptId)).thenReturn(List.of(item), List.of());
        when(productUnitRepository.findByIdForUpdate(productUnitId)).thenReturn(Optional.of(pu));
        when(locationRepository.findByFullCode(anyString())).thenReturn(Optional.empty());

        {
            when(securityPolicy.requireAuthenticated()).thenReturn(userId);

            returnReceiptService.approve(receiptId);

            assertEquals(ProductUnitStatus.RETURN_QC_HOLD, pu.getStatus());
            assertEquals(ReturnReceiptStatus.COMPLETED, receipt.getStatus());
            assertEquals(userId, receipt.getApprovedBy());
        }
    }

    @Test
    void approve_success_scrap() {
        ReturnReceipt receipt = pendingReceipt(ReturnReason.DEFECTIVE.name());
        ReturnReceiptItem item = returnItem(receiptId, productUnitId, ResultingAction.SCRAP.name());
        ProductUnit pu = serializedUnit(productUnitId, ProductUnitStatus.EXPORTED, BigDecimal.TEN);

        when(returnReceiptRepository.findByIdForUpdate(receiptId)).thenReturn(Optional.of(receipt));
        stubSave();
        stubEnrich();
        when(returnReceiptItemRepository.findByReturnReceiptId(receiptId)).thenReturn(List.of(item), List.of());
        when(productUnitRepository.findByIdForUpdate(productUnitId)).thenReturn(Optional.of(pu));

        {
            when(securityPolicy.requireAuthenticated()).thenReturn(userId);

            returnReceiptService.approve(receiptId);

            assertEquals(ProductUnitStatus.PENDING_DISPOSAL, pu.getStatus());
        }
    }

    @Test
    void approve_success_reject() {
        ReturnReceipt receipt = pendingReceipt(ReturnReason.DEFECTIVE.name());
        ReturnReceiptItem item = returnItem(receiptId, productUnitId, ResultingAction.REJECT.name());
        ProductUnit pu = serializedUnit(productUnitId, ProductUnitStatus.EXPORTED, BigDecimal.TEN);

        when(returnReceiptRepository.findByIdForUpdate(receiptId)).thenReturn(Optional.of(receipt));
        stubSave();
        stubEnrich();
        when(returnReceiptItemRepository.findByReturnReceiptId(receiptId)).thenReturn(List.of(item), List.of());
        when(productUnitRepository.findByIdForUpdate(productUnitId)).thenReturn(Optional.of(pu));
        when(locationRepository.findByFullCode(anyString())).thenReturn(Optional.empty());

        {
            when(securityPolicy.requireAuthenticated()).thenReturn(userId);

            returnReceiptService.approve(receiptId);

            assertEquals(ProductUnitStatus.PENDING_DISPOSAL, pu.getStatus());
            verify(statusLogRepository).save(argThat(log ->
                    "RETURN_RECEIPT".equals(log.getSourceType())
                            && "PENDING_DISPOSAL".equals(log.getToStatus())
                            && receiptId.equals(log.getSourceId())));
        }
    }

    @Test
    void approve_success_warrantyTransfer() {
        ReturnReceipt receipt = pendingReceipt(ReturnReason.DEFECTIVE.name());
        ReturnReceiptItem item = returnItem(receiptId, productUnitId, ResultingAction.WARRANTY_TRANSFER.name());
        ProductUnit pu = serializedUnit(productUnitId, ProductUnitStatus.EXPORTED, BigDecimal.TEN);

        when(returnReceiptRepository.findByIdForUpdate(receiptId)).thenReturn(Optional.of(receipt));
        stubSave();
        stubEnrich();
        when(returnReceiptItemRepository.findByReturnReceiptId(receiptId)).thenReturn(List.of(item), List.of());
        when(productUnitRepository.findByIdForUpdate(productUnitId)).thenReturn(Optional.of(pu));
        when(locationRepository.findByFullCode(anyString())).thenReturn(Optional.empty());

        {
            when(securityPolicy.requireAuthenticated()).thenReturn(userId);

            returnReceiptService.approve(receiptId);

            assertEquals(ProductUnitStatus.WAITING_RMA_EXPORT, pu.getStatus());
        }
    }

    @Test
    void approve_fail_creator() {
        ReturnReceipt receipt = pendingReceipt(ReturnReason.DEFECTIVE.name());
        receipt.setCreatedBy(userId);

        when(returnReceiptRepository.findByIdForUpdate(receiptId)).thenReturn(Optional.of(receipt));
        doThrow(new InvalidRequestException("creator")).when(securityPolicy).requireNotCreator(userId);

        {
            when(securityPolicy.requireAuthenticated()).thenReturn(userId);
            assertThrows(InvalidRequestException.class, () -> returnReceiptService.approve(receiptId));
        }
    }

    @Test
    void approve_fail_notPending() {
        ReturnReceipt receipt = pendingReceipt(ReturnReason.DEFECTIVE.name());
        receipt.setStatus(ReturnReceiptStatus.COMPLETED);

        when(returnReceiptRepository.findByIdForUpdate(receiptId)).thenReturn(Optional.of(receipt));
        doThrow(new InvalidRequestException("invalid transition")).when(returnReceiptStateMachine).validate(ReturnReceiptStatus.COMPLETED, ReturnReceiptStatus.COMPLETED);

        {
            when(securityPolicy.requireAuthenticated()).thenReturn(userId);
            assertThrows(InvalidRequestException.class, () -> returnReceiptService.approve(receiptId));
        }
    }

    // ─── Approve: bulk unit (không có productUnitId) ─────────

    @Test
    void approve_fail_bulkQuantityNonPositive() {
        ReturnReceipt receipt = pendingReceipt(ReturnReason.DEFECTIVE.name());
        ReturnReceiptItem item = returnItem(receiptId, null, ResultingAction.RESTOCK.name());
        item.setQuantity(BigDecimal.ZERO);

        when(returnReceiptRepository.findByIdForUpdate(receiptId)).thenReturn(Optional.of(receipt));
        when(returnReceiptItemRepository.findByReturnReceiptId(receiptId)).thenReturn(List.of(item));

        {
            when(securityPolicy.requireAuthenticated()).thenReturn(userId);
            assertThrows(InvalidRequestException.class, () -> returnReceiptService.approve(receiptId));
            verify(returnReceiptRepository, never()).save(any());
        }
    }

    @Test
    void approve_success_bulkUnitCreated() {
        ReturnReceipt receipt = pendingReceipt(ReturnReason.DEFECTIVE.name());
        ReturnReceiptItem item = returnItem(receiptId, null, ResultingAction.RESTOCK.name());
        item.setQuantity(new BigDecimal("5"));

        Product product = mock(Product.class);
        when(product.getTrackingType()).thenReturn("BULK");

        when(returnReceiptRepository.findByIdForUpdate(receiptId)).thenReturn(Optional.of(receipt));
        stubSave();
        stubEnrich();
        when(returnReceiptItemRepository.findByReturnReceiptId(receiptId)).thenReturn(List.of(item), List.of());
        when(productRepository.findById(20L)).thenReturn(Optional.of(product));
        when(productUnitRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        {
            when(securityPolicy.requireAuthenticated()).thenReturn(userId);

            returnReceiptService.approve(receiptId);

            assertEquals(ReturnReceiptStatus.COMPLETED, receipt.getStatus());
            verify(productUnitRepository).save(puCaptor.capture());
            ProductUnit bulk = puCaptor.getValue();
            assertEquals("BULK", bulk.getTrackingType());
            assertEquals(0, new BigDecimal("5").compareTo(bulk.getRemainingQuantity()));
            assertEquals(ProductUnitStatus.RETURN_QC_HOLD, bulk.getStatus());
            verify(statusLogRepository).save(argThat(log ->
                    "RETURN_RECEIPT".equals(log.getSourceType())
                            && "RETURN_QC_HOLD".equals(log.getToStatus())
                            && receiptId.equals(log.getSourceId())));
        }
    }

    // ─── Cancel tests ────────────────────────────────────────

    @Test
    void cancel_success() {
        ReturnReceipt receipt = pendingReceipt(ReturnReason.DEFECTIVE.name());

        when(returnReceiptRepository.findByIdForUpdate(receiptId)).thenReturn(Optional.of(receipt));
        stubEnrich();
        stubSave();

        returnReceiptService.cancel(receiptId);

        assertEquals(ReturnReceiptStatus.CANCELLED, receipt.getStatus());
    }

    @Test
    void cancel_fail_alreadyCancelled() {
        ReturnReceipt receipt = pendingReceipt(ReturnReason.DEFECTIVE.name());
        receipt.setStatus(ReturnReceiptStatus.CANCELLED);

        when(returnReceiptRepository.findByIdForUpdate(receiptId)).thenReturn(Optional.of(receipt));
        doThrow(new InvalidRequestException("invalid transition")).when(returnReceiptStateMachine).validate(any(), eq(ReturnReceiptStatus.CANCELLED));

        assertThrows(InvalidRequestException.class, () -> returnReceiptService.cancel(receiptId));
    }

    @Test
    void cancel_fail_alreadyCompleted() {
        ReturnReceipt receipt = pendingReceipt(ReturnReason.DEFECTIVE.name());
        receipt.setStatus(ReturnReceiptStatus.COMPLETED);

        when(returnReceiptRepository.findByIdForUpdate(receiptId)).thenReturn(Optional.of(receipt));
        doThrow(new InvalidRequestException("invalid transition")).when(returnReceiptStateMachine).validate(any(), eq(ReturnReceiptStatus.CANCELLED));

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
                .status(ReturnReceiptStatus.PENDING_APPROVAL)
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
                .status(status)
                .remainingQuantity(remaining)
                .importedAt(Instant.now())
                .build();
    }
}
