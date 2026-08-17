package org.dawn.backend.service.inventory.adjustments;

import org.dawn.backend.constant.enums.inventory.ProductUnitStatus;
import org.dawn.backend.constant.enums.inventory.SourceType;
import org.dawn.backend.constant.enums.inventory.adjustments.AdjustmentType;
import org.dawn.backend.constant.enums.inventory.box.BoxStatus;
import org.dawn.backend.entity.inventory.Box;
import org.dawn.backend.entity.inventory.Location;
import org.dawn.backend.entity.inventory.ProductUnit;
import org.dawn.backend.exception.type.InvalidRequestException;
import org.dawn.backend.repository.catalog.ProductRepository;
import org.dawn.backend.repository.inventory.LocationRepository;
import org.dawn.backend.repository.inventory.ProductUnitRepository;
import org.dawn.backend.repository.inventory.ProductUnitStatusLogRepository;
import org.dawn.backend.repository.inventory.box.BoxRepository;
import org.dawn.backend.repository.inventory.stockcheck.StockCheckItemRepository;
import org.dawn.backend.service.inventory.LocationCapacityValidator;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
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
    @Mock BoxRepository boxRepository;
    @Mock StockCheckItemRepository stockCheckItemRepository;

    @InjectMocks AdjustmentUnitService service;

    @Test
    void applyFoundRestore_qcHoldUnit_rejected() {
        ProductUnit pu = ProductUnit.builder()
                .id(1L)
                .productId(20L)
                .trackingType("SERIALIZED")
                .status(ProductUnitStatus.RETURN_QC_HOLD)
                .locationId(5L)
                .build();
        when(productUnitRepository.findById(1L)).thenReturn(Optional.of(pu));

        assertThrows(InvalidRequestException.class,
                () -> service.applyFoundRestore(1L, SourceType.STOCK_CHECK, 10L, 1L));
        assertEquals(ProductUnitStatus.RETURN_QC_HOLD, pu.getStatus());
        verify(statusLogRepository, never()).save(any());
    }

    @Test
    void applyFoundRestore_restorableStatus_restored() {
        ProductUnit pu = ProductUnit.builder()
                .id(2L)
                .productId(20L)
                .trackingType("SERIALIZED")
                .status(ProductUnitStatus.LOST)
                .locationId(6L)
                .build();
        when(productUnitRepository.findById(2L)).thenReturn(Optional.of(pu));

        service.applyFoundRestore(2L, SourceType.STOCK_CHECK, 10L, 1L);

        assertEquals(ProductUnitStatus.IN_STOCK, pu.getStatus());
        verify(statusLogRepository).save(any());
    }

    @Test
    void applyDamaged_manual_blocksSoldStatus() {
        ProductUnit pu = ProductUnit.builder()
                .id(1L)
                .productId(20L)
                .trackingType("SERIALIZED")
                .status(ProductUnitStatus.SOLD)
                .locationId(5L)
                .build();
        when(productUnitRepository.findById(1L)).thenReturn(Optional.of(pu));

        InvalidRequestException ex = assertThrows(InvalidRequestException.class,
                () -> service.applyDamaged(1L, SourceType.STOCK_ADJUSTMENT, 10L, 1L));

        assertTrue(ex.getMessage().contains("SOLD"));
        assertEquals(ProductUnitStatus.SOLD, pu.getStatus());
        verify(statusLogRepository, never()).save(any());
    }

    @Test
    void applyDamaged_manual_blocksSealedBox() {
        ProductUnit pu = ProductUnit.builder()
                .id(1L)
                .productId(20L)
                .trackingType("SERIALIZED")
                .status(ProductUnitStatus.IN_STOCK)
                .locationId(5L)
                .boxId(7L)
                .build();
        when(productUnitRepository.findById(1L)).thenReturn(Optional.of(pu));
        Location bin = mock(Location.class);
        when(bin.getZoneCode()).thenReturn("A");
        when(locationRepository.findById(5L)).thenReturn(Optional.of(bin));
        Box box = new Box();
        box.setId(7L);
        box.setStatus(BoxStatus.SEALED);
        when(boxRepository.findById(7L)).thenReturn(Optional.of(box));

        InvalidRequestException ex = assertThrows(InvalidRequestException.class,
                () -> service.applyDamaged(1L, SourceType.STOCK_ADJUSTMENT, 10L, 1L));

        assertTrue(ex.getMessage().contains("1"));
        assertEquals(ProductUnitStatus.IN_STOCK, pu.getStatus());
        verify(statusLogRepository, never()).save(any());
    }

    @Test
    void applyDamaged_manual_blocksQcZone() {
        ProductUnit pu = ProductUnit.builder()
                .id(1L)
                .productId(20L)
                .trackingType("SERIALIZED")
                .status(ProductUnitStatus.IN_STOCK)
                .locationId(5L)
                .build();
        when(productUnitRepository.findById(1L)).thenReturn(Optional.of(pu));
        Location qcBin = mock(Location.class);
        when(qcBin.getZoneCode()).thenReturn("QC");
        when(locationRepository.findById(5L)).thenReturn(Optional.of(qcBin));

        assertThrows(InvalidRequestException.class,
                () -> service.applyDamaged(1L, SourceType.STOCK_ADJUSTMENT, 10L, 1L));
        assertEquals(ProductUnitStatus.IN_STOCK, pu.getStatus());
        verify(statusLogRepository, never()).save(any());
    }

    @Test
    void applyDamaged_fromStockCheck_allowedInSealedBox() {
        ProductUnit pu = ProductUnit.builder()
                .id(1L)
                .productId(20L)
                .trackingType("SERIALIZED")
                .status(ProductUnitStatus.IN_STOCK)
                .locationId(5L)
                .boxId(7L)
                .build();
        when(productUnitRepository.findById(1L)).thenReturn(Optional.of(pu));

        service.applyDamaged(1L, SourceType.STOCK_CHECK, 10L, 1L);

        assertEquals(ProductUnitStatus.DAMAGED_IN_STORAGE, pu.getStatus());
        verify(statusLogRepository).save(any());
    }

    @Test
    void applyLost_manual_blocksSealedBox() {
        ProductUnit pu = ProductUnit.builder()
                .id(1L)
                .productId(20L)
                .trackingType("SERIALIZED")
                .status(ProductUnitStatus.IN_STOCK)
                .locationId(5L)
                .boxId(7L)
                .build();
        when(productUnitRepository.findById(1L)).thenReturn(Optional.of(pu));
        Location bin = mock(Location.class);
        when(bin.getZoneCode()).thenReturn("A");
        when(locationRepository.findById(5L)).thenReturn(Optional.of(bin));
        Box box = new Box();
        box.setId(7L);
        box.setStatus(BoxStatus.SEALED);
        when(boxRepository.findById(7L)).thenReturn(Optional.of(box));

        assertThrows(InvalidRequestException.class,
                () -> service.applyLost(1L, SourceType.STOCK_ADJUSTMENT, 10L, 1L));
        assertEquals(ProductUnitStatus.IN_STOCK, pu.getStatus());
        verify(statusLogRepository, never()).save(any());
    }

    @Test
    void applyBulkQuantity_lost_decrementsRemaining() {
        ProductUnit pu = ProductUnit.builder()
                .id(1L)
                .productId(20L)
                .trackingType("BULK")
                .status(ProductUnitStatus.IN_STOCK)
                .remainingQuantity(BigDecimal.valueOf(1000))
                .build();

        service.applyBulkQuantity(pu, SourceType.STOCK_ADJUSTMENT, AdjustmentType.LOST, BigDecimal.valueOf(100), 42L, 1L);

        assertEquals(0, BigDecimal.valueOf(900).compareTo(pu.getRemainingQuantity()));
        assertEquals(ProductUnitStatus.IN_STOCK, pu.getStatus());
        verify(statusLogRepository, never()).save(any());
    }

    @Test
    void applyBulkQuantity_lost_fullUnit_flipsToLost() {
        ProductUnit pu = ProductUnit.builder()
                .id(1L)
                .productId(20L)
                .trackingType("BULK")
                .status(ProductUnitStatus.IN_STOCK)
                .remainingQuantity(BigDecimal.valueOf(1000))
                .build();

        service.applyBulkQuantity(pu, SourceType.STOCK_ADJUSTMENT, AdjustmentType.LOST, BigDecimal.valueOf(1000), 42L, 1L);

        assertEquals(0, BigDecimal.ZERO.compareTo(pu.getRemainingQuantity()));
        assertEquals(ProductUnitStatus.LOST, pu.getStatus());
        verify(statusLogRepository).save(any());
    }

    @Test
    void applyBulkQuantity_found_incrementsRemaining() {
        ProductUnit pu = ProductUnit.builder()
                .id(1L)
                .productId(20L)
                .trackingType("BULK")
                .status(ProductUnitStatus.IN_STOCK)
                .remainingQuantity(BigDecimal.valueOf(1000))
                .build();

        service.applyBulkQuantity(pu, SourceType.STOCK_ADJUSTMENT, AdjustmentType.FOUND, BigDecimal.valueOf(50), 42L, 1L);

        assertEquals(0, BigDecimal.valueOf(1050).compareTo(pu.getRemainingQuantity()));
        assertEquals(ProductUnitStatus.IN_STOCK, pu.getStatus());
        verify(statusLogRepository, never()).save(any());
    }

    @Test
    void applyFoundRestore_manual_blocksSealedBox() {
        ProductUnit pu = ProductUnit.builder()
                .id(2L)
                .productId(20L)
                .trackingType("SERIALIZED")
                .status(ProductUnitStatus.LOST)
                .locationId(5L)
                .boxId(7L)
                .build();
        when(productUnitRepository.findById(2L)).thenReturn(Optional.of(pu));
        Box box = new Box();
        box.setId(7L);
        box.setStatus(BoxStatus.SEALED);
        when(boxRepository.findById(7L)).thenReturn(Optional.of(box));

        assertThrows(InvalidRequestException.class,
                () -> service.applyFoundRestore(2L, SourceType.STOCK_ADJUSTMENT, 10L, 1L));
        assertEquals(ProductUnitStatus.LOST, pu.getStatus());
        verify(statusLogRepository, never()).save(any());
    }
}
