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
import org.dawn.backend.controller.inventory.request.ConfirmStockCheckBoxesRequest;
import org.dawn.backend.entity.inventory.StockCheck;
import org.dawn.backend.entity.inventory.StockCheckBoxConfirm;
import org.dawn.backend.entity.inventory.StockCheckItem;
import org.dawn.backend.exception.type.InvalidRequestException;
import org.dawn.backend.repository.inventory.stockcheck.StockCheckBoxConfirmRepository;
import org.dawn.backend.repository.inventory.stockcheck.StockCheckItemHistoryRepository;
import org.dawn.backend.repository.inventory.stockcheck.StockCheckItemRepository;
import org.dawn.backend.repository.inventory.stockcheck.StockCheckRepository;
import org.dawn.backend.constant.enums.inventory.adjustments.AdjustmentStatus;
import org.dawn.backend.constant.enums.inventory.adjustments.AdjustmentType;
import org.dawn.backend.controller.inventory.request.CreateStockCheckRequest;
import org.dawn.backend.controller.inventory.request.StockCheckItemRequest;
import org.dawn.backend.entity.inventory.StockAdjustment;
import org.dawn.backend.shared.statemachine.StateMachine;
import org.dawn.backend.constant.enums.inventory.stockcheck.StockCheckScopeType;
import org.dawn.backend.constant.enums.inventory.stockcheck.StockCheckStatus;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StockCheckServiceTests {

    @Mock StockCheckRepository stockCheckRepository;
    @Mock StockCheckItemRepository stockCheckItemRepository;
    @Mock StockCheckItemHistoryRepository itemHistoryRepository;
    @Mock StockCheckBoxConfirmRepository boxConfirmRepository;
    @Mock ProductUnitRepository productUnitRepository;
    @Mock LocationRepository locationRepository;
    @Mock ProductRepository productRepository;
    @Mock org.dawn.backend.repository.auth.UserRepository userRepository;
    @Mock StockAdjustmentRepository adjustmentRepository;
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
        var box = new Box();
        box.setId(3L);
        box.setBoxCode("BOX-3");
        box.setStatus(BoxStatus.UNSEALED);
        when(boxRepository.findById(3L)).thenReturn(Optional.of(box));
        when(productUnitRepository.findByBoxIdAndStatus(3L, ProductUnitStatus.IN_STOCK)).thenReturn(List.of(boxed));

        var ids = stockCheckService.resolveUnitIdsByScope(StockCheckScopeType.BOX, 3L);

        assertEquals(List.of(7L), ids);
    }

    @Test
    void boxScope_returnsUnitsOfSealedBox() {
        var boxed = unit(7L, 2L, 1L, 3L, "SERIALIZED");
        var box = sealedBox(3L, "BOX-3");
        when(boxRepository.findById(3L)).thenReturn(Optional.of(box));
        when(productUnitRepository.findByBoxIdAndStatus(3L, ProductUnitStatus.IN_STOCK)).thenReturn(List.of(boxed));

        var ids = stockCheckService.resolveUnitIdsByScope(StockCheckScopeType.BOX, 3L);

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

        var ids = stockCheckService.resolveUnitIdsByScope(StockCheckScopeType.ZONE, 1L);

        assertEquals(2, ids.size());
        assertTrue(ids.contains(4L));
        assertTrue(ids.contains(34L));
    }

    @Test
    void productScope_returnsInStockUnitsOfProduct() {
        var u1 = unit(11L, 2L, 1L, null, "SERIALIZED");
        when(productUnitRepository.findByProductIdInAndStatus(List.of(2L), ProductUnitStatus.IN_STOCK))
                .thenReturn(List.of(u1));

        var ids = stockCheckService.resolveUnitIdsByScope(StockCheckScopeType.CATEGORY, 2L);

        assertEquals(List.of(11L), ids);
    }

    private StockCheck inProgressCheck() {
        StockCheck sc = new StockCheck();
        sc.setId(1L);
        sc.setCheckCode("SC-1");
        sc.setStatus(StockCheckStatus.IN_PROGRESS);
        sc.setCreatedBy(100L);
        return sc;
    }

    private StockCheckItem countedItem(Long productUnitId) {
        StockCheckItem item = new StockCheckItem();
        item.setStockCheckId(1L);
        item.setProductUnitId(productUnitId);
        item.setTrackingType("SERIALIZED");
        item.setExpectedStatus("IN_STOCK");
        item.setActualStatus("IN_STOCK");
        item.setCountedQuantity(BigDecimal.ONE);
        item.setDifference("MATCH");
        return item;
    }

    private Box sealedBox(Long id, String code) {
        Box box = new Box();
        box.setId(id);
        box.setBoxCode(code);
        box.setStatus(BoxStatus.SEALED);
        return box;
    }

    private void stubSealedBoxInCheck(StockCheck sc, List<StockCheckItem> items, ProductUnit unit, Box box) {
        when(stockCheckRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(sc));
        when(stockCheckItemRepository.findByStockCheckId(1L)).thenReturn(items);
        when(productUnitRepository.findAllById(any())).thenReturn(List.of(unit));
        when(boxRepository.findAllById(any())).thenReturn(List.of(box));
    }

    private void stubResponseDeps() {
        when(productRepository.findAllById(anyList())).thenReturn(List.of());
        when(userRepository.findById(100L)).thenReturn(Optional.of(new org.dawn.backend.entity.auth.User()));
    }

    @Test
    void confirmBoxes_persistsConfirmationForSealedBoxInScope() {
        var sc = inProgressCheck();
        var item = countedItem(1L);
        var unit = unit(1L, 2L, 1L, 9L, "SERIALIZED");
        var box = sealedBox(9L, "BOX-9");
        stubSealedBoxInCheck(sc, List.of(item), unit, box);
        stubResponseDeps();
        when(securityPolicy.requireAuthenticated()).thenReturn(10L);
        when(boxConfirmRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        stockCheckService.confirmBoxes(1L, new ConfirmStockCheckBoxesRequest(List.of(9L)));

        ArgumentCaptor<StockCheckBoxConfirm> captor = ArgumentCaptor.forClass(StockCheckBoxConfirm.class);
        verify(boxConfirmRepository).save(captor.capture());
        assertEquals(1L, captor.getValue().getStockCheckId());
        assertEquals(9L, captor.getValue().getBoxId());
        assertEquals(10L, captor.getValue().getConfirmedBy());
    }

    @Test
    void confirmBoxes_rejectsBoxOutsideScope() {
        var sc = inProgressCheck();
        var item = countedItem(1L);
        var unit = unit(1L, 2L, 1L, 9L, "SERIALIZED");
        var box = sealedBox(9L, "BOX-9");
        stubSealedBoxInCheck(sc, List.of(item), unit, box);
        when(securityPolicy.requireAuthenticated()).thenReturn(10L);

        assertThrows(InvalidRequestException.class,
                () -> stockCheckService.confirmBoxes(1L, new ConfirmStockCheckBoxesRequest(List.of(99L))));
        verify(boxConfirmRepository, never()).save(any());
    }

    @Test
    void complete_failsWhenSealedBoxNotConfirmed() {
        var sc = inProgressCheck();
        var item = countedItem(1L);
        var unit = unit(1L, 2L, 1L, 9L, "SERIALIZED");
        var box = sealedBox(9L, "BOX-9");
        stubSealedBoxInCheck(sc, List.of(item), unit, box);
        when(boxConfirmRepository.findByStockCheckId(1L)).thenReturn(List.of());

        InvalidRequestException ex = assertThrows(InvalidRequestException.class,
                () -> stockCheckService.complete(1L));

        assertTrue(ex.getMessage().contains("BOX-9"));
    }

    @Test
    void complete_succeedsWhenAllSealedBoxesConfirmed() {
        var sc = inProgressCheck();
        var item = countedItem(1L);
        var unit = unit(1L, 2L, 1L, 9L, "SERIALIZED");
        var box = sealedBox(9L, "BOX-9");
        stubSealedBoxInCheck(sc, List.of(item), unit, box);
        stubResponseDeps();
        StockCheckBoxConfirm confirm = new StockCheckBoxConfirm();
        confirm.setStockCheckId(1L);
        confirm.setBoxId(9L);
        when(boxConfirmRepository.findByStockCheckId(1L)).thenReturn(List.of(confirm));
        when(adjustmentRepository.existsBySourceTypeAndSourceId(any(), any())).thenReturn(false);
        when(stockCheckRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var response = stockCheckService.complete(1L);

        assertEquals("COMPLETED", response.status());
        assertEquals(StockCheckStatus.COMPLETED, sc.getStatus());
    }

    @Test
    void complete_createsPendingAdjustmentForMissingSerializedUnit() {
        var sc = inProgressCheck();
        var item = countedItem(1L);
        item.setExpectedStatus("IN_STOCK");
        item.setActualStatus("LOST");
        item.setDifference("MISSING");
        var unit = unit(1L, 2L, 1L, null, "SERIALIZED");
        when(stockCheckRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(sc));
        when(stockCheckItemRepository.findByStockCheckId(1L)).thenReturn(List.of(item));
        when(productUnitRepository.findAllById(any())).thenReturn(List.of(unit));
        when(securityPolicy.requireAuthenticated()).thenReturn(10L);
        when(adjustmentRepository.existsBySourceTypeAndSourceId(any(), any())).thenReturn(false);
        when(adjustmentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(stockCheckRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(productRepository.findAllById(anyList())).thenReturn(List.of());
        when(userRepository.findById(100L)).thenReturn(Optional.of(new org.dawn.backend.entity.auth.User()));

        stockCheckService.complete(1L);

        ArgumentCaptor<StockAdjustment> captor = ArgumentCaptor.forClass(StockAdjustment.class);
        verify(adjustmentRepository).save(captor.capture());
        StockAdjustment adj = captor.getValue();
        assertEquals(AdjustmentType.LOST.name(), adj.getType());
        assertEquals(AdjustmentStatus.PENDING, adj.getStatus());
        assertNull(adj.getApprovedBy());
        assertEquals(0, BigDecimal.ONE.compareTo(adj.getQuantity()));
    }

    @Test
    void complete_bulkShortage_createsLostAdjustmentWithRealQuantity() {
        var sc = inProgressCheck();
        var item = countedItem(1L);
        item.setTrackingType("BULK");
        item.setExpectedQuantity(BigDecimal.valueOf(1000));
        item.setCountedQuantity(BigDecimal.valueOf(900));
        item.setActualStatus("IN_STOCK");
        item.setDifference("MISSING");
        var unit = unit(1L, 2L, 1L, null, "BULK");
        when(stockCheckRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(sc));
        when(stockCheckItemRepository.findByStockCheckId(1L)).thenReturn(List.of(item));
        when(productUnitRepository.findAllById(any())).thenReturn(List.of(unit));
        when(securityPolicy.requireAuthenticated()).thenReturn(10L);
        when(adjustmentRepository.existsBySourceTypeAndSourceId(any(), any())).thenReturn(false);
        when(adjustmentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(stockCheckRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(productRepository.findAllById(anyList())).thenReturn(List.of());
        when(userRepository.findById(100L)).thenReturn(Optional.of(new org.dawn.backend.entity.auth.User()));

        stockCheckService.complete(1L);

        ArgumentCaptor<StockAdjustment> captor = ArgumentCaptor.forClass(StockAdjustment.class);
        verify(adjustmentRepository).save(captor.capture());
        StockAdjustment adj = captor.getValue();
        assertEquals(AdjustmentType.LOST.name(), adj.getType());
        assertEquals(0, BigDecimal.valueOf(100).compareTo(adj.getQuantity()));
        assertEquals(AdjustmentStatus.PENDING, adj.getStatus());
        assertNull(adj.getApprovedBy());
    }

    @Test
    void complete_bulkSurplus_createsFoundAdjustment() {
        var sc = inProgressCheck();
        var item = countedItem(1L);
        item.setTrackingType("BULK");
        item.setExpectedQuantity(BigDecimal.valueOf(1000));
        item.setCountedQuantity(BigDecimal.valueOf(1100));
        item.setActualStatus("IN_STOCK");
        item.setDifference("UNEXPECTED");
        var unit = unit(1L, 2L, 1L, null, "BULK");
        when(stockCheckRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(sc));
        when(stockCheckItemRepository.findByStockCheckId(1L)).thenReturn(List.of(item));
        when(productUnitRepository.findAllById(any())).thenReturn(List.of(unit));
        when(securityPolicy.requireAuthenticated()).thenReturn(10L);
        when(adjustmentRepository.existsBySourceTypeAndSourceId(any(), any())).thenReturn(false);
        when(adjustmentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(stockCheckRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(productRepository.findAllById(anyList())).thenReturn(List.of());
        when(userRepository.findById(100L)).thenReturn(Optional.of(new org.dawn.backend.entity.auth.User()));

        stockCheckService.complete(1L);

        ArgumentCaptor<StockAdjustment> captor = ArgumentCaptor.forClass(StockAdjustment.class);
        verify(adjustmentRepository).save(captor.capture());
        StockAdjustment adj = captor.getValue();
        assertEquals(AdjustmentType.FOUND.name(), adj.getType());
        assertEquals(0, BigDecimal.valueOf(100).compareTo(adj.getQuantity()));
        assertEquals(AdjustmentStatus.PENDING, adj.getStatus());
        assertNull(adj.getApprovedBy());
    }

    @Test
    void recordItems_rejectsInvalidActualStatus() {
        var sc = inProgressCheck();
        var item = countedItem(1L);
        when(stockCheckRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(sc));
        when(stockCheckItemRepository.findByStockCheckId(1L)).thenReturn(List.of(item));
        when(securityPolicy.requireAuthenticated()).thenReturn(10L);

        InvalidRequestException ex = assertThrows(InvalidRequestException.class,
                () -> stockCheckService.recordItems(1L, new StockCheckItemRequest.BatchRequest(
                        List.of(new StockCheckItemRequest(1L, "BANANAS", null, null, null)))));

        assertTrue(ex.getMessage().contains("BANANAS"));
        verify(stockCheckItemRepository, never()).save(any());
    }

    @Test
    void create_rejectsUnitsAlreadyInAnotherActiveCheck() {
        when(securityPolicy.requireAuthenticated()).thenReturn(10L);
        when(locationRepository.findById(1L)).thenReturn(Optional.of(location(1L)));
        when(locationRepository.findByZoneCode("A")).thenReturn(List.of(location(1L)));
        var unit1 = unit(11L, 2L, 1L, null, "SERIALIZED");
        when(productUnitRepository.findByLocationIdInAndStatus(anyList(), eq(ProductUnitStatus.IN_STOCK)))
                .thenReturn(List.of(unit1));
        when(boxRepository.findByLocationIdInAndStatus(anyList(), eq(BoxStatus.SEALED))).thenReturn(List.of());
        when(stockCheckItemRepository.existsByProductUnitIdInActiveCheck(11L)).thenReturn(true);

        InvalidRequestException ex = assertThrows(InvalidRequestException.class,
                () -> stockCheckService.create(new CreateStockCheckRequest("ZONE", 1L, null)));

        assertTrue(ex.getMessage().contains("11"));
        verify(stockCheckRepository, never()).save(any());
    }

    @Test
    void reopen_returnsCompletedCheckToInProgress_AndDeletesPendingAdjustments() {
        var sc = inProgressCheck();
        sc.setStatus(StockCheckStatus.COMPLETED);
        when(stockCheckRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(sc));
        when(securityPolicy.requireAuthenticated()).thenReturn(10L);
        StockAdjustment pending = new StockAdjustment();
        pending.setStatus(AdjustmentStatus.PENDING);
        when(adjustmentRepository.findBySourceTypeAndSourceId(any(), any())).thenReturn(List.of(pending));
        when(stockCheckRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        stubResponseDeps();

        var response = stockCheckService.reopen(1L);

        assertEquals("IN_PROGRESS", response.status());
        assertEquals(StockCheckStatus.IN_PROGRESS, sc.getStatus());
        verify(adjustmentRepository).delete(pending);
    }

    @Test
    void reopen_rejectsWhenApprovedAdjustmentsExist() {
        var sc = inProgressCheck();
        sc.setStatus(StockCheckStatus.COMPLETED);
        when(stockCheckRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(sc));
        when(securityPolicy.requireAuthenticated()).thenReturn(10L);
        StockAdjustment approved = new StockAdjustment();
        approved.setStatus(AdjustmentStatus.APPROVED);
        when(adjustmentRepository.findBySourceTypeAndSourceId(any(), any())).thenReturn(List.of(approved));

        assertThrows(InvalidRequestException.class, () -> stockCheckService.reopen(1L));
        verify(adjustmentRepository, never()).delete(any());
    }
}
