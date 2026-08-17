package org.dawn.backend.service.inventory.returns;

import org.dawn.backend.constant.enums.inventory.ProductUnitStatus;
import org.dawn.backend.entity.inventory.ProductUnit;
import org.dawn.backend.exception.type.InvalidRequestException;
import org.dawn.backend.exception.type.ResourceNotFoundException;
import org.dawn.backend.config.security.SecurityPolicy;
import org.dawn.backend.repository.catalog.ProductRepository;
import org.dawn.backend.repository.catalog.SupplierRepository;
import org.dawn.backend.repository.inventory.ProductUnitRepository;
import org.dawn.backend.repository.inventory.ProductUnitStatusLogRepository;
import org.dawn.backend.repository.inventory.exports.ExportReceiptItemRepository;
import org.dawn.backend.repository.inventory.exports.ExportReceiptItemUnitRepository;
import org.dawn.backend.repository.inventory.exports.ExportReceiptRepository;
import org.dawn.backend.repository.inventory.exports.ExportReceiptStatusHistoryRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DisposeConfirmServiceTests {

    @Mock ProductUnitRepository productUnitRepository;
    @Mock ProductUnitStatusLogRepository statusLogRepository;
    @Mock ProductRepository productRepository;
    @Mock ExportReceiptRepository exportReceiptRepository;
    @Mock ExportReceiptItemRepository exportReceiptItemRepository;
    @Mock ExportReceiptItemUnitRepository exportReceiptItemUnitRepository;
    @Mock ExportReceiptStatusHistoryRepository exportReceiptStatusHistoryRepository;
    @Mock SupplierRepository supplierRepository;
    @Mock SecurityPolicy securityPolicy;

    @InjectMocks DisposeConfirmService service;

    private final Long userId = 1L;

    private ProductUnit unit(Long id, ProductUnitStatus status, Long locationId) {
        return ProductUnit.builder()
                .id(id)
                .serialNumber("SN-" + id)
                .productId(20L)
                .trackingType("SERIALIZED")
                .status(status)
                .locationId(locationId)
                .build();
    }

    @Test
    void confirm_pendingDisposal_toDisposed() {
        ProductUnit pu = unit(1L, ProductUnitStatus.PENDING_DISPOSAL, 8L);
        when(productUnitRepository.findByIdsForUpdate(List.of(1L))).thenReturn(List.of(pu));
        when(securityPolicy.requireAuthenticated()).thenReturn(userId);

        service.confirm(List.of(1L), "DISPOSED", null, null);

        assertEquals(ProductUnitStatus.DISPOSED, pu.getStatus());
        assertNull(pu.getLocationId());
        verify(statusLogRepository).save(argThat(log ->
                "QC_PROCESSING".equals(log.getSourceType()) && "DISPOSED".equals(log.getToStatus())));
    }

    @Test
    void confirm_pendingDisposal_toRejectedReturn() {
        ProductUnit pu = unit(2L, ProductUnitStatus.PENDING_DISPOSAL, 8L);
        when(productUnitRepository.findByIdsForUpdate(List.of(2L))).thenReturn(List.of(pu));
        when(securityPolicy.requireAuthenticated()).thenReturn(userId);

        service.confirm(List.of(2L), "REJECTED_RETURN", null, null);

        assertEquals(ProductUnitStatus.REJECTED_RETURN, pu.getStatus());
        assertNull(pu.getLocationId());
    }

    @Test
    void confirm_rmaUnrepairable_toReturnedToSupplier() {
        ProductUnit pu = unit(3L, ProductUnitStatus.RMA_UNREPAIRABLE, 8L);
        when(productUnitRepository.findByIdsForUpdate(List.of(3L))).thenReturn(List.of(pu));
        when(securityPolicy.requireAuthenticated()).thenReturn(userId);
        when(productRepository.findAllById(anySet())).thenReturn(List.of());
        when(exportReceiptRepository.existsByReceiptCode(anyString())).thenReturn(false);
        when(exportReceiptRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(exportReceiptItemRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(exportReceiptItemUnitRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(exportReceiptStatusHistoryRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        service.confirm(List.of(3L), "RETURNED_TO_SUPPLIER", null, null);

        assertEquals(ProductUnitStatus.RETURNED_TO_SUPPLIER, pu.getStatus());
        assertNull(pu.getLocationId());
        verify(exportReceiptRepository).save(argThat(receipt ->
                "RETURN_SUPPLIER".equals(receipt.getReason())));
    }

    @Test
    void confirm_rmaUnrepairable_toDisposed() {
        ProductUnit pu = unit(4L, ProductUnitStatus.RMA_UNREPAIRABLE, 8L);
        when(productUnitRepository.findByIdsForUpdate(List.of(4L))).thenReturn(List.of(pu));
        when(securityPolicy.requireAuthenticated()).thenReturn(userId);

        service.confirm(List.of(4L), "DISPOSED", null, null);

        assertEquals(ProductUnitStatus.DISPOSED, pu.getStatus());
        assertNull(pu.getLocationId());
    }

    @Test
    void confirm_wrongPair_rejected() {
        ProductUnit pu = unit(5L, ProductUnitStatus.RMA_UNREPAIRABLE, 8L);
        when(productUnitRepository.findByIdsForUpdate(List.of(5L))).thenReturn(List.of(pu));
        when(securityPolicy.requireAuthenticated()).thenReturn(userId);

        assertThrows(InvalidRequestException.class, () -> service.confirm(List.of(5L), "REJECTED_RETURN", null, null));
        assertEquals(ProductUnitStatus.RMA_UNREPAIRABLE, pu.getStatus());
        verify(statusLogRepository, never()).save(any());
    }

    @Test
    void confirm_wrongStatus_rejected() {
        ProductUnit pu = unit(6L, ProductUnitStatus.RETURN_QC_HOLD, 5L);
        when(productUnitRepository.findByIdsForUpdate(List.of(6L))).thenReturn(List.of(pu));
        when(securityPolicy.requireAuthenticated()).thenReturn(userId);

        assertThrows(InvalidRequestException.class, () -> service.confirm(List.of(6L), "DISPOSED", null, null));
        verify(statusLogRepository, never()).save(any());
    }

    @Test
    void confirm_invalidAction_rejected() {
        ProductUnit pu = unit(7L, ProductUnitStatus.PENDING_DISPOSAL, 8L);
        when(productUnitRepository.findByIdsForUpdate(List.of(7L))).thenReturn(List.of(pu));
        when(securityPolicy.requireAuthenticated()).thenReturn(userId);

        assertThrows(InvalidRequestException.class, () -> service.confirm(List.of(7L), "IN_STOCK", null, null));
        verify(statusLogRepository, never()).save(any());
    }

    @Test
    void confirm_emptyIds_rejected() {
        when(securityPolicy.requireAuthenticated()).thenReturn(userId);

        assertThrows(InvalidRequestException.class, () -> service.confirm(List.of(), "DISPOSED", null, null));
        verify(productUnitRepository, never()).findByIdsForUpdate(any());
    }

    @Test
    void confirm_withSupplierId_usesProvidedSupplier() {
        ProductUnit pu = unit(8L, ProductUnitStatus.RMA_UNREPAIRABLE, 8L);
        when(productUnitRepository.findByIdsForUpdate(List.of(8L))).thenReturn(List.of(pu));
        when(securityPolicy.requireAuthenticated()).thenReturn(userId);
        when(supplierRepository.existsById(42L)).thenReturn(true);
        when(productRepository.findAllById(anySet())).thenReturn(List.of());
        when(exportReceiptRepository.existsByReceiptCode(anyString())).thenReturn(false);
        when(exportReceiptRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(exportReceiptItemRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(exportReceiptItemUnitRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(exportReceiptStatusHistoryRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        service.confirm(List.of(8L), "RETURNED_TO_SUPPLIER", 42L, null);

        assertEquals(ProductUnitStatus.RETURNED_TO_SUPPLIER, pu.getStatus());
        assertNull(pu.getLocationId());
        verify(exportReceiptRepository).save(argThat(receipt ->
                42L == receipt.getSupplierId() && "RETURN_SUPPLIER".equals(receipt.getReason())));
    }

    @Test
    void confirm_withUnknownSupplier_rejected() {
        when(securityPolicy.requireAuthenticated()).thenReturn(userId);
        when(supplierRepository.existsById(99L)).thenReturn(false);

        assertThrows(ResourceNotFoundException.class,
                () -> service.confirm(List.of(9L), "RETURNED_TO_SUPPLIER", 99L, null));
        verify(productUnitRepository, never()).findByIdsForUpdate(any());
    }
}
