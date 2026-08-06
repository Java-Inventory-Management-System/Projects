package org.dawn.backend.service.inventory.adjustments;

import org.dawn.backend.constant.enums.inventory.ProductUnitStatus;
import org.dawn.backend.constant.enums.inventory.SourceType;
import org.dawn.backend.entity.inventory.Location;
import org.dawn.backend.entity.inventory.ProductUnit;
import org.dawn.backend.exception.type.InvalidRequestException;
import org.dawn.backend.repository.catalog.ProductRepository;
import org.dawn.backend.repository.inventory.LocationRepository;
import org.dawn.backend.repository.inventory.ProductUnitRepository;
import org.dawn.backend.repository.inventory.ProductUnitStatusLogRepository;
import org.dawn.backend.service.inventory.LocationCapacityValidator;
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
class AdjustmentUnitServiceTests {

    @Mock ProductUnitRepository productUnitRepository;
    @Mock ProductUnitStatusLogRepository statusLogRepository;
    @Mock ProductRepository productRepository;
    @Mock LocationCapacityValidator capacityValidator;
    @Mock LocationRepository locationRepository;

    @InjectMocks AdjustmentUnitService service;

    @Test
    void applyFoundRestore_unitInQcZone_rejected() {
        ProductUnit pu = ProductUnit.builder()
                .id(1L)
                .productId(20L)
                .trackingType("SERIALIZED")
                .status(ProductUnitStatus.DAMAGED_IN_STORAGE)
                .locationId(5L)
                .build();
        when(productUnitRepository.findById(1L)).thenReturn(Optional.of(pu));
        Location qcBin = mock(Location.class);
        when(qcBin.getZoneCode()).thenReturn("QC");
        when(locationRepository.findById(5L)).thenReturn(Optional.of(qcBin));

        assertThrows(InvalidRequestException.class,
                () -> service.applyFoundRestore(1L, SourceType.STOCK_CHECK, 10L, 1L));
        assertEquals(ProductUnitStatus.DAMAGED_IN_STORAGE, pu.getStatus());
        verify(statusLogRepository, never()).save(any());
    }

    @Test
    void applyFoundRestore_unitNotInQcZone_restored() {
        ProductUnit pu = ProductUnit.builder()
                .id(2L)
                .productId(20L)
                .trackingType("SERIALIZED")
                .status(ProductUnitStatus.LOST)
                .locationId(6L)
                .build();
        when(productUnitRepository.findById(2L)).thenReturn(Optional.of(pu));
        Location bin = mock(Location.class);
        when(bin.getZoneCode()).thenReturn("A");
        when(locationRepository.findById(6L)).thenReturn(Optional.of(bin));

        service.applyFoundRestore(2L, SourceType.STOCK_CHECK, 10L, 1L);

        assertEquals(ProductUnitStatus.IN_STOCK, pu.getStatus());
        verify(statusLogRepository).save(any());
    }
}
