package org.dawn.backend.service.inventory.returns;

import org.dawn.backend.constant.enums.inventory.ProductUnitStatus;
import org.dawn.backend.entity.inventory.Location;
import org.dawn.backend.entity.inventory.ProductUnit;
import org.dawn.backend.exception.type.InvalidRequestException;
import org.dawn.backend.config.security.SecurityPolicy;
import org.dawn.backend.repository.inventory.LocationRepository;
import org.dawn.backend.repository.inventory.ProductUnitRepository;
import org.dawn.backend.repository.inventory.ProductUnitStatusLogRepository;
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
class QcPassServiceTests {

    @Mock ProductUnitRepository productUnitRepository;
    @Mock ProductUnitStatusLogRepository statusLogRepository;
    @Mock LocationRepository locationRepository;
    @Mock SecurityPolicy securityPolicy;

    @InjectMocks QcPassService service;

    private final Long userId = 1L;

    private Location loc(Long id, String zone, boolean active) {
        return Location.builder()
                .id(id)
                .zoneCode(zone)
                .shelfCode("A")
                .binCode("1")
                .fullCode(zone + "-A-1")
                .isActive(active)
                .build();
    }

    private void stubQcZoneAndSellableShelf() {
        when(productUnitRepository.usageByLocation()).thenReturn(java.util.Map.of());
        when(locationRepository.findById(anyLong()))
                .thenReturn(Optional.of(loc(5L, "QC", true)));
        when(locationRepository.findAllByOrderByZoneCodeAscShelfCodeAscBinCodeAsc())
                .thenReturn(List.of(loc(10L, "A", true)));
    }

    private ProductUnit unit(Long id, ProductUnitStatus status, Long locationId, Long productId) {
        return ProductUnit.builder()
                .id(id)
                .serialNumber("SN-" + id)
                .productId(productId)
                .trackingType("SERIALIZED")
                .status(status)
                .locationId(locationId)
                .build();
    }

    @Test
    void confirm_restockHold_movesToInStock() {
        ProductUnit pu = unit(1L, ProductUnitStatus.RETURN_QC_HOLD, 5L, 20L);
        when(productUnitRepository.findByIdsForUpdate(List.of(1L))).thenReturn(List.of(pu));
        when(securityPolicy.requireAuthenticated()).thenReturn(userId);
        stubQcZoneAndSellableShelf();

        service.confirm(List.of(1L));

        assertEquals(ProductUnitStatus.IN_STOCK, pu.getStatus());
        assertEquals(10L, pu.getLocationId());
        verify(statusLogRepository).save(argThat(log ->
                "QC_PROCESSING".equals(log.getSourceType())
                        && "RETURN_QC_HOLD".equals(log.getFromStatus())
                        && "IN_STOCK".equals(log.getToStatus())));
    }

    @Test
    void confirm_rmaRepairedReturned_movesToInStock() {
        ProductUnit pu = unit(2L, ProductUnitStatus.RMA_REPAIRED_RETURNED, 7L, 20L);
        when(productUnitRepository.findByIdsForUpdate(List.of(2L))).thenReturn(List.of(pu));
        when(securityPolicy.requireAuthenticated()).thenReturn(userId);
        stubQcZoneAndSellableShelf();

        service.confirm(List.of(2L));

        assertEquals(ProductUnitStatus.IN_STOCK, pu.getStatus());
        assertEquals(10L, pu.getLocationId());
    }

    @Test
    void confirm_bulkRow_treatedAsUnit() {
        ProductUnit pu = ProductUnit.builder()
                .id(3L)
                .serialNumber(null)
                .productId(20L)
                .trackingType("BULK")
                .initialQuantity(new java.math.BigDecimal("5"))
                .remainingQuantity(new java.math.BigDecimal("5"))
                .status(ProductUnitStatus.RETURN_QC_HOLD)
                .locationId(5L)
                .build();
        when(productUnitRepository.findByIdsForUpdate(List.of(3L))).thenReturn(List.of(pu));
        when(securityPolicy.requireAuthenticated()).thenReturn(userId);
        stubQcZoneAndSellableShelf();

        service.confirm(List.of(3L));

        assertEquals(ProductUnitStatus.IN_STOCK, pu.getStatus());
        assertEquals(10L, pu.getLocationId());
        verify(statusLogRepository).save(argThat(log ->
                "IN_STOCK".equals(log.getToStatus())));
    }

    @Test
    void confirm_wrongStatus_rejected() {
        ProductUnit pu = unit(4L, ProductUnitStatus.WAITING_RMA_EXPORT, 6L, 20L);
        when(productUnitRepository.findByIdsForUpdate(List.of(4L))).thenReturn(List.of(pu));
        when(securityPolicy.requireAuthenticated()).thenReturn(userId);
        when(productUnitRepository.usageByLocation()).thenReturn(java.util.Map.of());

        assertThrows(InvalidRequestException.class, () -> service.confirm(List.of(4L)));
        verify(statusLogRepository, never()).save(any());
    }

    @Test
    void confirm_emptyIds_rejected() {
        when(securityPolicy.requireAuthenticated()).thenReturn(userId);

        assertThrows(InvalidRequestException.class, () -> service.confirm(List.of()));
        verify(productUnitRepository, never()).findAllById(any());
    }
}
