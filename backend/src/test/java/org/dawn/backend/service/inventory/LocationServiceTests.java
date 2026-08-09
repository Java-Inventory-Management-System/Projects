package org.dawn.backend.service.inventory;

import org.dawn.backend.config.security.SecurityPolicy;
import org.dawn.backend.constant.enums.inventory.ProductUnitStatus;
import org.dawn.backend.constant.enums.inventory.box.BoxStatus;
import org.dawn.backend.controller.inventory.request.RelocateRequest;
import org.dawn.backend.entity.inventory.Box;
import org.dawn.backend.entity.inventory.Location;
import org.dawn.backend.entity.inventory.ProductUnit;
import org.dawn.backend.repository.catalog.ProductRepository;
import org.dawn.backend.repository.inventory.LocationRepository;
import org.dawn.backend.repository.inventory.ProductUnitRepository;
import org.dawn.backend.repository.inventory.ProductUnitStatusLogRepository;
import org.dawn.backend.repository.inventory.box.BoxRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LocationServiceTests {

    @Mock LocationRepository locationRepository;
    @Mock ProductUnitRepository productUnitRepository;
    @Mock ProductRepository productRepository;
    @Mock ProductUnitStatusLogRepository productUnitStatusLogRepository;
    @Mock SecurityPolicy securityPolicy;
    @Mock LocationCapacityValidator capacityValidator;
    @Mock BoxRepository boxRepository;

    @InjectMocks LocationService locationService;

    private Location source;
    private Location dest;

    @BeforeEach
    void setUp() {
        source = new Location();
        source.setId(1L);
        dest = new Location();
        dest.setId(2L);
        when(locationRepository.findById(1L)).thenReturn(Optional.of(source));
        when(locationRepository.findById(2L)).thenReturn(Optional.of(dest));
        when(securityPolicy.requireAuthenticated()).thenReturn(7L);
    }

    private ProductUnit unit(Long id, Long boxId) {
        ProductUnit u = new ProductUnit();
        u.setId(id);
        u.setProductId(1L);
        u.setTrackingType("SERIALIZED");
        u.setRemainingQuantity(BigDecimal.ONE);
        u.setLocationId(1L);
        u.setBoxId(boxId);
        u.setStatus(ProductUnitStatus.IN_STOCK);
        u.setImportedAt(Instant.now());
        return u;
    }

    @Test
    void relocate_movesWholeSealedBoxWithItsUnits() {
        ProductUnit u1 = unit(11L, 9L);
        ProductUnit u2 = unit(12L, 9L);
        ProductUnit u3 = unit(13L, null);
        Box box = new Box();
        box.setId(9L);
        box.setBoxCode("BOX-9");
        box.setLocationId(1L);
        box.setStatus(BoxStatus.SEALED);

        when(productUnitRepository.findByLocationIdInAndStatusWithLock(List.of(1L), ProductUnitStatus.IN_STOCK))
                .thenReturn(List.of(u1, u2, u3));
        when(productUnitRepository.findByBoxIdInAndStatus(List.of(9L), ProductUnitStatus.IN_STOCK))
                .thenReturn(List.of(u1, u2));
        when(boxRepository.findByIdsForUpdate(List.of(9L))).thenReturn(List.of(box));

        locationService.relocate(new RelocateRequest(1L, 2L, 1));

        assertEquals(2L, u1.getLocationId());
        assertEquals(2L, u2.getLocationId());
        assertEquals(1L, u3.getLocationId());
        assertEquals(2L, box.getLocationId());
        verify(boxRepository).findByIdsForUpdate(List.of(9L));
        verify(productUnitRepository).saveAll(eq(List.of(u1, u2)));
    }

    @Test
    void relocate_readsSourceUnitsWithPessimisticLock() {
        ProductUnit u1 = unit(11L, null);
        when(productUnitRepository.findByLocationIdInAndStatusWithLock(List.of(1L), ProductUnitStatus.IN_STOCK))
                .thenReturn(List.of(u1));

        locationService.relocate(new RelocateRequest(1L, 2L, null));

        verify(productUnitRepository).findByLocationIdInAndStatusWithLock(List.of(1L), ProductUnitStatus.IN_STOCK);
        verify(productUnitRepository, never()).findByLocationIdInAndStatus(anyList(), any());
    }

    @Test
    void relocate_withoutBoxes_doesNotTouchBoxRepository() {
        ProductUnit u1 = unit(11L, null);
        ProductUnit u2 = unit(12L, null);
        when(productUnitRepository.findByLocationIdInAndStatusWithLock(List.of(1L), ProductUnitStatus.IN_STOCK))
                .thenReturn(List.of(u1, u2));

        locationService.relocate(new RelocateRequest(1L, 2L, null));

        verify(boxRepository, never()).findByIdsForUpdate(anyList());
        assertEquals(2L, u1.getLocationId());
        assertEquals(2L, u2.getLocationId());
    }
}
