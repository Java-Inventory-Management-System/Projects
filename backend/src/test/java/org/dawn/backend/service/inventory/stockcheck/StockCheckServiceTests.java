package org.dawn.backend.service.inventory.stockcheck;

import com.fasterxml.jackson.databind.ObjectMapper;
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
import org.dawn.backend.controller.inventory.request.CreateStockCheckRequest;
import org.dawn.backend.entity.inventory.StockCheck;
import org.dawn.backend.entity.inventory.StockCheckItem;
import org.dawn.backend.exception.type.InvalidRequestException;
import org.dawn.backend.repository.inventory.stockcheck.StockCheckItemHistoryRepository;
import org.dawn.backend.repository.inventory.stockcheck.StockCheckItemRepository;
import org.dawn.backend.repository.inventory.stockcheck.StockCheckRepository;
import org.dawn.backend.constant.enums.inventory.adjustments.AdjustmentStatus;
import org.dawn.backend.constant.enums.inventory.adjustments.AdjustmentType;
import org.dawn.backend.controller.inventory.request.StockCheckItemRequest;
import org.dawn.backend.entity.inventory.StockAdjustment;
import org.dawn.backend.service.inventory.box.BoxService;
import org.dawn.backend.shared.statemachine.StateMachine;
import org.dawn.backend.constant.enums.inventory.stockcheck.StockCheckScopeType;
import org.dawn.backend.constant.enums.inventory.stockcheck.StockCheckStatus;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
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
    @Mock BoxRepository boxRepository;
    @Mock BoxService boxService;
    @Mock SecurityPolicy securityPolicy;
    @Mock StateMachine<StockCheckStatus> stockCheckStateMachine;
    @Spy ObjectMapper objectMapper = new ObjectMapper();

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

        var ids = stockCheckService.resolveUnitIdsByScope(StockCheckScopeType.ZONE, 1L, null);

        assertEquals(2, ids.size());
        assertTrue(ids.contains(4L));
        assertTrue(ids.contains(34L));
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

    private void stubResponseDeps() {
        when(productRepository.findAllById(anyList())).thenReturn(List.of());
        when(userRepository.findById(100L)).thenReturn(Optional.of(new org.dawn.backend.entity.auth.User()));
    }

    @Test
    void complete_marksUntouchedAsUnverified() {
        var sc = inProgressCheck();
        sc.setScopeType("CATEGORY");
        var item = countedItem(1L);
        item.setActualStatus(null);
        item.setDifference(null);
        when(stockCheckRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(sc));
        when(stockCheckItemRepository.findByStockCheckId(1L)).thenReturn(List.of(item));
        when(securityPolicy.requireAuthenticated()).thenReturn(10L);
        when(adjustmentRepository.existsBySourceTypeAndSourceId(any(), any())).thenReturn(false);
        when(stockCheckRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        stubResponseDeps();

        var response = stockCheckService.complete(1L);

        assertEquals("COMPLETED", response.status());
        assertEquals("UNVERIFIED", item.getActualStatus());
        assertNull(item.getDifference());
        assertNull(item.getCountedQuantity());
        assertNotNull(item.getTouchedAt());
        verify(stockCheckItemRepository).save(item);
        verify(adjustmentRepository, never()).save(any());
    }

    @Test
    void complete_restoresSealedBoxesFromSnapshotOnly() {
        var sc = inProgressCheck();
        sc.setScopeType("CATEGORY");
        sc.setBoxStatusSnapshot("{\"9\":\"SEALED\",\"8\":\"UNSEALED\"}");
        var item = countedItem(1L);
        when(stockCheckRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(sc));
        when(stockCheckItemRepository.findByStockCheckId(1L)).thenReturn(List.of(item));
        when(securityPolicy.requireAuthenticated()).thenReturn(10L);
        when(adjustmentRepository.existsBySourceTypeAndSourceId(any(), any())).thenReturn(false);
        when(stockCheckRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        stubResponseDeps();

        stockCheckService.complete(1L);

        verify(boxService).reclose(9L);
        verify(boxService, never()).reclose(8L);
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
                        List.of(new StockCheckItemRequest(1L, "BANANAS", null, null, null, null, null)))));

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
                () -> stockCheckService.create(new CreateStockCheckRequest("ZONE", 1L, null, null)));

        assertTrue(ex.getMessage().contains("11"));
        verify(stockCheckRepository, never()).save(any());
    }

    @Test
    void reopen_returnsCompletedCheckToInProgress_AndDeletesPendingAdjustments() {
        var sc = inProgressCheck();
        sc.setStatus(StockCheckStatus.COMPLETED);
        when(stockCheckRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(sc));
        when(stockCheckItemRepository.findByStockCheckId(1L)).thenReturn(List.of(countedItem(1L)));
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

    @Test
    void addExtraItem_rejectsUnknownSku() {
        var sc = inProgressCheck();
        sc.setScopeType("ZONE");
        sc.setScopeId(1L);
        when(stockCheckRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(sc));
        when(securityPolicy.requireAuthenticated()).thenReturn(10L);
        when(productRepository.findBySku("NO-SKU")).thenReturn(Optional.empty());

        InvalidRequestException ex = assertThrows(InvalidRequestException.class,
                () -> stockCheckService.addExtraItem(1L,
                        new StockCheckItemRequest.ExtraItemRequest("NO-SKU", null, null, null, null)));

        assertTrue(ex.getMessage().contains("NO-SKU"));
        verify(productUnitRepository, never()).save(any());
    }

    @Test
    void addExtraItem_rejectsSerialOutsideScope() {
        var sc = inProgressCheck();
        sc.setScopeType("ZONE");
        sc.setScopeId(1L);
        var product = new org.dawn.backend.entity.catalog.Product();
        product.setId(10L);
        product.setTrackingType("SERIALIZED");
        var outsideUnit = unit(99L, 10L, 999L, null, "SERIALIZED");
        when(stockCheckRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(sc));
        when(securityPolicy.requireAuthenticated()).thenReturn(10L);
        when(productRepository.findBySku("SKU-1")).thenReturn(Optional.of(product));
        when(locationRepository.findById(1L)).thenReturn(Optional.of(location(1L)));
        when(locationRepository.findByZoneCode("A")).thenReturn(List.of(location(1L)));
        when(productUnitRepository.findBySerialNumberIgnoreCase("SN-999")).thenReturn(Optional.of(outsideUnit));

        InvalidRequestException ex = assertThrows(InvalidRequestException.class,
                () -> stockCheckService.addExtraItem(1L,
                        new StockCheckItemRequest.ExtraItemRequest("SKU-1", "SN-999", null, null, null)));

        assertTrue(ex.getMessage().contains("SN-999"));
        verify(stockCheckItemRepository, never()).save(any());
    }

    @Test
    void addExtraItem_serialized_createsUnitAndSurplusItem_thenCompleteCreatesFoundAdjustment() {
        var sc = inProgressCheck();
        sc.setScopeType("ZONE");
        sc.setScopeId(1L);
        var product = new org.dawn.backend.entity.catalog.Product();
        product.setId(10L);
        product.setTrackingType("SERIALIZED");
        var newUnit = unit(50L, 10L, 1L, null, "SERIALIZED");
        when(stockCheckRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(sc));
        when(securityPolicy.requireAuthenticated()).thenReturn(10L);
        when(productRepository.findBySku("SKU-1")).thenReturn(Optional.of(product));
        when(locationRepository.findById(1L)).thenReturn(Optional.of(location(1L)));
        when(locationRepository.findByZoneCode("A")).thenReturn(List.of(location(1L)));
        when(productUnitRepository.findBySerialNumberIgnoreCase("SN-NEW")).thenReturn(Optional.empty());
        when(productUnitRepository.save(any())).thenReturn(newUnit);
        when(stockCheckItemRepository.findByStockCheckId(1L)).thenReturn(List.of());
        stubResponseDeps();

        var response = stockCheckService.addExtraItem(1L,
                new StockCheckItemRequest.ExtraItemRequest("SKU-1", "SN-NEW", null, "found it", null));

        assertEquals("IN_PROGRESS", response.status());
        ArgumentCaptor<StockCheckItem> itemCaptor = ArgumentCaptor.forClass(StockCheckItem.class);
        verify(stockCheckItemRepository).save(itemCaptor.capture());
        StockCheckItem saved = itemCaptor.getValue();
        assertEquals(50L, saved.getProductUnitId());
        assertEquals("SURPLUS", saved.getDifference());
        assertEquals("IN_STOCK", saved.getActualStatus());
        assertEquals(0, BigDecimal.ONE.compareTo(saved.getCountedQuantity()));
    }

    @Test
    void addExtraItem_bulk_requiresPositiveQuantity() {
        var sc = inProgressCheck();
        sc.setScopeType("ZONE");
        sc.setScopeId(1L);
        var product = new org.dawn.backend.entity.catalog.Product();
        product.setId(10L);
        product.setTrackingType("BULK");
        when(stockCheckRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(sc));
        when(securityPolicy.requireAuthenticated()).thenReturn(10L);
        when(productRepository.findBySku("SKU-BULK")).thenReturn(Optional.of(product));
        when(locationRepository.findById(1L)).thenReturn(Optional.of(location(1L)));
        when(locationRepository.findByZoneCode("A")).thenReturn(List.of(location(1L)));

        assertThrows(InvalidRequestException.class,
                () -> stockCheckService.addExtraItem(1L,
                        new StockCheckItemRequest.ExtraItemRequest("SKU-BULK", null, BigDecimal.ZERO, null, null)));
        verify(productUnitRepository, never()).save(any());
    }
}