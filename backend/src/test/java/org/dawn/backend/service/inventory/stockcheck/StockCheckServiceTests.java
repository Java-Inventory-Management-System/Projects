package org.dawn.backend.service.inventory.stockcheck;

import org.dawn.backend.config.security.SecurityPolicy;
import org.dawn.backend.constant.enums.inventory.ProductUnitStatus;
import org.dawn.backend.constant.enums.inventory.box.BoxStatus;
import org.dawn.backend.entity.inventory.Box;
import org.dawn.backend.entity.inventory.Location;
import org.dawn.backend.entity.inventory.ProductUnit;
import org.dawn.backend.repository.catalog.ProductRepository;
import org.dawn.backend.repository.inventory.LocationRepository;
import org.dawn.backend.repository.inventory.ProductUnitRepository;
import org.dawn.backend.repository.inventory.adjustments.StockAdjustmentRepository;
import org.dawn.backend.repository.inventory.box.BoxRepository;
import org.dawn.backend.repository.inventory.stockcheck.StockCheckItemHistoryRepository;
import org.dawn.backend.repository.inventory.stockcheck.StockCheckItemRepository;
import org.dawn.backend.repository.inventory.stockcheck.StockCheckRepository;
import org.dawn.backend.service.inventory.adjustments.AdjustmentUnitService;
import org.dawn.backend.shared.statemachine.StateMachine;
import org.dawn.backend.constant.enums.inventory.stockcheck.StockCheckStatus;
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
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StockCheckServiceTests {

    @Mock StockCheckRepository stockCheckRepository;
    @Mock StockCheckItemRepository stockCheckItemRepository;
    @Mock StockCheckItemHistoryRepository itemHistoryRepository;
    @Mock ProductUnitRepository productUnitRepository;
    @Mock LocationRepository locationRepository;
    @Mock ProductRepository productRepository;
    @Mock org.dawn.backend.repository.auth.UserRepository userRepository;
    @Mock StockAdjustmentRepository adjustmentRepository;
    @Mock AdjustmentUnitService adjustmentUnitService;
    @Mock BoxRepository boxRepository;
    @Mock SecurityPolicy securityPolicy;
    @Mock StateMachine<StockCheckStatus> stockCheckStateMachine;

    @InjectMocks StockCheckService stockCheckService;

    private ProductUnit unit(Long id, Long productId, Long locationId, Long boxId, String trackingType) {
        ProductUnit u = new ProductUnit();
        u.setId(id);
        u.setProductId(productId);
        u.setTrackingType(trackingType);
        u.setRemainingQuantity(trackingType.equals("BULK") ? BigDecimal.TEN : BigDecimal.ONE);
        u.setLocationId(locationId);
        u.setBoxId(boxId);
        u.setStatus(ProductUnitStatus.IN_STOCK);
        u.setImportedAt(Instant.now());
        return u;
    }

    private Location location(Long id) {
        Location l = new Location();
        l.setId(id);
        l.setZoneCode("A");
        return l;
    }

    @Test
    void boxScope_returnsUnitsOfBox() {
        var boxed = unit(7L, 2L, 1L, 3L, "SERIALIZED");
        when(productUnitRepository.findByBoxIdAndStatus(3L, ProductUnitStatus.IN_STOCK)).thenReturn(List.of(boxed));

        var ids = stockCheckService.resolveUnitIdsByScope("BOX", 3L);

        assertEquals(List.of(7L), ids);
    }

    @Test
    void zoneScope_includesUnitsWhoseBoxIsInZone_EvenWhenUnitLocationIsElsewhere() {
        var refLocation = new Location();
        refLocation.setId(1L);
        refLocation.setZoneCode("A");
        var zoneLocations = List.of(
                refLocation,
                location(2L),
                location(3L),
                location(4L));
        var looseUnit = unit(4L, 2L, 4L, null, "SERIALIZED");
        var boxInZone = new Box();
        boxInZone.setId(9L);
        boxInZone.setLocationId(2L);
        var staleLocationUnit = unit(34L, 2L, 34L, 9L, "SERIALIZED");

        when(locationRepository.findById(1L)).thenReturn(Optional.of(refLocation));
        when(locationRepository.findByZoneCode("A")).thenReturn(zoneLocations);
        when(productUnitRepository.findByLocationIdInAndStatus(List.of(1L, 2L, 3L, 4L), ProductUnitStatus.IN_STOCK))
                .thenReturn(List.of(looseUnit));
        when(boxRepository.findByLocationIdInAndStatus(List.of(1L, 2L, 3L, 4L), BoxStatus.SEALED)).thenReturn(List.of(boxInZone));
        when(productUnitRepository.findByBoxIdInAndStatus(List.of(9L), ProductUnitStatus.IN_STOCK))
                .thenReturn(List.of(staleLocationUnit));

        var ids = stockCheckService.resolveUnitIdsByScope("ZONE", 1L);

        assertEquals(2, ids.size());
        assertTrue(ids.contains(4L));
        assertTrue(ids.contains(34L));
    }

    @Test
    void productScope_returnsInStockUnitsOfProduct() {
        var u1 = unit(11L, 2L, 1L, null, "SERIALIZED");
        when(productUnitRepository.findByProductIdInAndStatus(List.of(2L), ProductUnitStatus.IN_STOCK))
                .thenReturn(List.of(u1));

        var ids = stockCheckService.resolveUnitIdsByScope("PRODUCT", 2L);

        assertEquals(List.of(11L), ids);
    }
}
