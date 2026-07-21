package org.dawn.backend.service.inventory;

import org.dawn.backend.config.web.response.ResponsePage;
import org.dawn.backend.constant.inventory.ExportReason;
import org.dawn.backend.constant.inventory.ExportReceiptStatus;
import org.dawn.backend.constant.inventory.ProductUnitStatus;
import org.dawn.backend.constant.inventory.SourceType;
import org.dawn.backend.controller.inventory.request.ExportReceiptRequest;
import org.dawn.backend.controller.inventory.request.ExportReceiptRequest.ExportItemRequest;
import org.dawn.backend.entity.catalog.Product;
import org.dawn.backend.entity.inventory.ExportReceipt;
import org.dawn.backend.entity.inventory.ExportReceiptItem;
import org.dawn.backend.entity.inventory.ExportReceiptItemUnit;
import org.dawn.backend.entity.inventory.ProductUnit;
import org.dawn.backend.exception.wrapper.InvalidRequestException;
import org.dawn.backend.exception.wrapper.ResourceNotFoundException;
import org.dawn.backend.repository.auth.UserRepository;
import org.dawn.backend.repository.catalog.ProductRepository;
import org.dawn.backend.repository.inventory.CustomerRepository;
import org.dawn.backend.repository.inventory.ExportReceiptItemRepository;
import org.dawn.backend.repository.inventory.ExportReceiptItemUnitRepository;
import org.dawn.backend.repository.inventory.ExportReceiptRepository;
import org.dawn.backend.repository.inventory.ProductUnitRepository;
import org.dawn.backend.repository.inventory.ProductUnitStatusLogRepository;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ExportReceiptServiceTests {

    @Mock ExportReceiptRepository exportReceiptRepository;
    @Mock ExportReceiptItemRepository exportReceiptItemRepository;
    @Mock ExportReceiptItemUnitRepository exportReceiptItemUnitRepository;
    @Mock ProductUnitRepository productUnitRepository;
    @Mock ProductUnitStatusLogRepository statusLogRepository;
    @Mock ProductRepository productRepository;
    @Mock CustomerRepository customerRepository;
    @Mock UserRepository userRepository;

    @InjectMocks ExportReceiptService exportReceiptService;

    @Captor ArgumentCaptor<ExportReceipt> receiptCaptor;

    private final Long userId = 1L;
    private final Long receiptId = 100L;

    // ─── Approve tests ───────────────────────────────────────

    private void stubSave() {
        when(exportReceiptRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    }

    private void stubToResponse() {
        when(exportReceiptItemRepository.findByReceiptId(anyLong())).thenReturn(List.of());
        when(userRepository.findById(anyLong())).thenReturn(Optional.empty());
    }

    @Test
    void approve_SALE_setsSoldAndWarranty() {
        ExportReceipt receipt = pendingReceipt(ExportReason.SALE.name(), 99L);
        var item = exportItem(receiptId, 10L);
        var eiu = exportItemUnit(item.getId(), 1L, BigDecimal.ONE);
        ProductUnit pu = serializedUnit(1L, ProductUnitStatus.IN_STOCK, BigDecimal.TEN);

        when(exportReceiptRepository.findById(receiptId)).thenReturn(Optional.of(receipt));
        stubSave();
        stubToResponse();
        when(exportReceiptItemRepository.findByReceiptId(receiptId)).thenReturn(List.of(item));
        when(exportReceiptItemUnitRepository.findByExportReceiptItemId(item.getId())).thenReturn(List.of(eiu));
        when(productUnitRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(pu));

        try (MockedStatic<SecurityUtils> security = mockStatic(SecurityUtils.class)) {
            security.when(SecurityUtils::getCurrentUserId).thenReturn(userId);

            exportReceiptService.approve(receiptId);

            assertEquals(ProductUnitStatus.SOLD.name(), pu.getStatus());
            assertNotNull(pu.getWarrantyStartDate());
            assertNotNull(pu.getWarrantyExpiresAt());
            assertEquals(ExportReceiptStatus.COMPLETED.name(), receipt.getStatus());
            assertEquals(userId, receipt.getApprovedBy());
            verify(statusLogRepository).save(any());
        }
    }

    @Test
    void approve_RETURN_SUPPLIER_setsReturnedToSupplier() {
        ExportReceipt receipt = pendingReceipt(ExportReason.RETURN_SUPPLIER.name(), 99L);
        var item = exportItem(receiptId, 10L);
        var eiu = exportItemUnit(item.getId(), 1L, BigDecimal.ONE);
        ProductUnit pu = serializedUnit(1L, ProductUnitStatus.IN_STOCK, BigDecimal.TEN);

        when(exportReceiptRepository.findById(receiptId)).thenReturn(Optional.of(receipt));
        stubSave();
        stubToResponse();
        when(exportReceiptItemRepository.findByReceiptId(receiptId)).thenReturn(List.of(item));
        when(exportReceiptItemUnitRepository.findByExportReceiptItemId(item.getId())).thenReturn(List.of(eiu));
        when(productUnitRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(pu));

        try (MockedStatic<SecurityUtils> security = mockStatic(SecurityUtils.class)) {
            security.when(SecurityUtils::getCurrentUserId).thenReturn(userId);
            exportReceiptService.approve(receiptId);
            assertEquals(ProductUnitStatus.RETURNED_TO_SUPPLIER.name(), pu.getStatus());
            assertNull(pu.getWarrantyStartDate());
        }
    }

    @Test
    void approve_DISPOSE_setsDisposed() {
        ExportReceipt receipt = pendingReceipt(ExportReason.DISPOSE.name(), 99L);
        var item = exportItem(receiptId, 10L);
        var eiu = exportItemUnit(item.getId(), 1L, BigDecimal.ONE);
        ProductUnit pu = serializedUnit(1L, ProductUnitStatus.DAMAGED_IN_STORAGE, BigDecimal.TEN);

        when(exportReceiptRepository.findById(receiptId)).thenReturn(Optional.of(receipt));
        stubSave();
        stubToResponse();
        when(exportReceiptItemRepository.findByReceiptId(receiptId)).thenReturn(List.of(item));
        when(exportReceiptItemUnitRepository.findByExportReceiptItemId(item.getId())).thenReturn(List.of(eiu));
        when(productUnitRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(pu));

        try (MockedStatic<SecurityUtils> security = mockStatic(SecurityUtils.class)) {
            security.when(SecurityUtils::getCurrentUserId).thenReturn(userId);
            exportReceiptService.approve(receiptId);
            assertEquals(ProductUnitStatus.DISPOSED.name(), pu.getStatus());
        }
    }

    @Test
    void approve_DISPOSE_fail_notDamaged() {
        ExportReceipt receipt = pendingReceipt(ExportReason.DISPOSE.name(), 99L);
        var item = exportItem(receiptId, 10L);
        var eiu = exportItemUnit(item.getId(), 1L, BigDecimal.ONE);
        ProductUnit pu = serializedUnit(1L, ProductUnitStatus.IN_STOCK, BigDecimal.TEN);

        when(exportReceiptRepository.findById(receiptId)).thenReturn(Optional.of(receipt));
        when(exportReceiptItemRepository.findByReceiptId(receiptId)).thenReturn(List.of(item));
        when(exportReceiptItemUnitRepository.findByExportReceiptItemId(item.getId())).thenReturn(List.of(eiu));
        when(productUnitRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(pu));

        try (MockedStatic<SecurityUtils> security = mockStatic(SecurityUtils.class)) {
            security.when(SecurityUtils::getCurrentUserId).thenReturn(userId);
            assertThrows(InvalidRequestException.class, () -> exportReceiptService.approve(receiptId));
        }
    }

    @Test
    void approve_INTERNAL_tracksCogs() {
        ExportReceipt receipt = pendingReceipt(ExportReason.INTERNAL.name(), 99L);
        var item = exportItem(receiptId, 10L);
        var eiu = exportItemUnit(item.getId(), 1L, BigDecimal.ONE);
        ProductUnit pu = serializedUnit(1L, ProductUnitStatus.IN_STOCK, BigDecimal.TEN);
        pu.setCostPrice(new BigDecimal("150.00"));

        when(exportReceiptRepository.findById(receiptId)).thenReturn(Optional.of(receipt));
        stubSave();
        stubToResponse();
        when(exportReceiptItemRepository.findByReceiptId(receiptId)).thenReturn(List.of(item));
        when(exportReceiptItemUnitRepository.findByExportReceiptItemId(item.getId())).thenReturn(List.of(eiu));
        when(productUnitRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(pu));

        try (MockedStatic<SecurityUtils> security = mockStatic(SecurityUtils.class)) {
            security.when(SecurityUtils::getCurrentUserId).thenReturn(userId);
            exportReceiptService.approve(receiptId);
            assertEquals(new BigDecimal("150.00"), receipt.getTotalCogs());
        }
    }

    @Test
    void approve_fail_creatorCannotApprove() {
        ExportReceipt receipt = pendingReceipt(ExportReason.SALE.name(), userId);

        when(exportReceiptRepository.findById(receiptId)).thenReturn(Optional.of(receipt));

        try (MockedStatic<SecurityUtils> security = mockStatic(SecurityUtils.class)) {
            security.when(SecurityUtils::getCurrentUserId).thenReturn(userId);
            assertThrows(InvalidRequestException.class, () -> exportReceiptService.approve(receiptId));
        }
    }

    @Test
    void approve_fail_notPendingApproval() {
        ExportReceipt receipt = pendingReceipt(ExportReason.SALE.name(), 99L);
        receipt.setStatus(ExportReceiptStatus.COMPLETED.name());

        when(exportReceiptRepository.findById(receiptId)).thenReturn(Optional.of(receipt));

        try (MockedStatic<SecurityUtils> security = mockStatic(SecurityUtils.class)) {
            security.when(SecurityUtils::getCurrentUserId).thenReturn(userId);
            assertThrows(InvalidRequestException.class, () -> exportReceiptService.approve(receiptId));
        }
    }

    // ─── Cancel tests ────────────────────────────────────────

    @Test
    void cancel_success() {
        ExportReceipt receipt = pendingReceipt(ExportReason.SALE.name(), 99L);

        when(exportReceiptRepository.findById(receiptId)).thenReturn(Optional.of(receipt));
        stubSave();
        stubToResponse();

        exportReceiptService.cancel(receiptId);

        assertEquals(ExportReceiptStatus.CANCELLED.name(), receipt.getStatus());
    }

    @Test
    void cancel_fail_alreadyCancelled() {
        ExportReceipt receipt = pendingReceipt(ExportReason.SALE.name(), 99L);
        receipt.setStatus(ExportReceiptStatus.CANCELLED.name());

        when(exportReceiptRepository.findById(receiptId)).thenReturn(Optional.of(receipt));

        assertThrows(InvalidRequestException.class, () -> exportReceiptService.cancel(receiptId));
    }

    @Test
    void cancel_fail_notPendingApproval() {
        ExportReceipt receipt = pendingReceipt(ExportReason.SALE.name(), 99L);
        receipt.setStatus(ExportReceiptStatus.COMPLETED.name());

        when(exportReceiptRepository.findById(receiptId)).thenReturn(Optional.of(receipt));

        assertThrows(InvalidRequestException.class, () -> exportReceiptService.cancel(receiptId));
    }

    // ─── Helpers ─────────────────────────────────────────────

    private ExportReceipt pendingReceipt(String reason, Long createdBy) {
        return ExportReceipt.builder()
                .id(receiptId)
                .receiptCode("EXP-TEST")
                .reason(reason)
                .status(ExportReceiptStatus.PENDING_APPROVAL.name())
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
                .status(status.name())
                .remainingQuantity(remaining)
                .importedAt(Instant.now())
                .warrantyMonths(12)
                .build();
    }
}
