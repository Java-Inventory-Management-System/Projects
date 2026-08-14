package org.dawn.backend.service.inventory.box;

import org.dawn.backend.config.security.SecurityPolicy;
import org.dawn.backend.config.web.response.ResponsePage;
import org.springframework.data.domain.PageRequest;
import org.dawn.backend.constant.enums.inventory.ProductUnitStatus;
import org.dawn.backend.constant.enums.inventory.box.BoxStatus;
import org.dawn.backend.constant.enums.inventory.box.BoxType;
import org.dawn.backend.controller.inventory.request.SealBoxRequest;
import org.dawn.backend.entity.catalog.Product;
import org.dawn.backend.entity.inventory.Box;
import org.dawn.backend.entity.inventory.ImportReceipt;
import org.dawn.backend.entity.inventory.ImportReceiptItem;
import org.dawn.backend.entity.inventory.Location;
import org.dawn.backend.entity.inventory.ProductUnit;
import org.dawn.backend.exception.type.InvalidRequestException;
import org.dawn.backend.repository.auth.UserRepository;
import org.dawn.backend.repository.catalog.ProductRepository;
import org.dawn.backend.repository.inventory.LocationRepository;
import org.dawn.backend.repository.inventory.ProductUnitRepository;
import org.dawn.backend.repository.inventory.box.BoxRepository;
import org.dawn.backend.repository.inventory.imports.ImportReceiptItemRepository;
import org.dawn.backend.repository.inventory.imports.ImportReceiptRepository;
import org.dawn.backend.repository.inventory.stockcheck.StockCheckItemRepository;
import org.dawn.backend.service.inventory.LocationCapacityValidator;
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
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BoxServiceTests {

    @Mock BoxRepository boxRepository;
    @Mock ProductUnitRepository productUnitRepository;
    @Mock LocationRepository locationRepository;
    @Mock ProductRepository productRepository;
    @Mock UserRepository userRepository;
    @Mock ImportReceiptItemRepository importReceiptItemRepository;
    @Mock ImportReceiptRepository importReceiptRepository;
    @Mock StockCheckItemRepository stockCheckItemRepository;
    @Mock SecurityPolicy securityPolicy;
    @Mock LocationCapacityValidator capacityValidator;
    @Mock BoxCapacity boxCapacity;

    @InjectMocks BoxService boxService;

    private final Location location = Location.builder().id(1L).zoneCode("A").fullCode("A-01-01").build();

    private ProductUnit bulkUnit(Long id, BigDecimal remaining) {
        return ProductUnit.builder()
                .id(id)
                .productId(2L)
                .trackingType("BULK")
                .initialQuantity(remaining)
                .remainingQuantity(remaining)
                .importReceiptItemId(3L)
                .locationId(1L)
                .status(ProductUnitStatus.IN_STOCK)
                .importedAt(Instant.now())
                .costPrice(new BigDecimal("10"))
                .build();
    }

    private void stubBase(Long userId, List<ProductUnit> lockedUnits) {
        when(securityPolicy.requireAuthenticated()).thenReturn(userId);
        when(locationRepository.findById(1L)).thenReturn(Optional.of(location));
        when(productUnitRepository.findByIdsForUpdate(anyList())).thenReturn(lockedUnits);
        java.util.List<ImportReceiptItem> items = new java.util.ArrayList<>();
        for (var u : lockedUnits) {
            items.add(ImportReceiptItem.builder().id(u.getImportReceiptItemId()).receiptId(7L).productId(2L).build());
        }
        when(importReceiptItemRepository.findAllById(any())).thenReturn(items);
        when(importReceiptRepository.findAllById(any())).thenReturn(List.of(
                ImportReceipt.builder().id(7L).receiptCode("IMP-0001").build()));
        when(boxRepository.existsByBoxCode(anyString())).thenReturn(false);
        when(boxRepository.save(any())).thenAnswer(inv -> {
            Box b = inv.getArgument(0);
            b.setId(99L);
            return b;
        });
        when(productUnitRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(locationRepository.findAllById(anyList())).thenReturn(List.of(location));
        when(userRepository.findAllById(anyList())).thenReturn(List.of());
        when(productRepository.findAllById(any())).thenReturn(List.of(Product.builder()
                .id(2L).name("Cable").sku("CBL").build()));
    }

    private void stubGuard() {
        when(securityPolicy.requireAuthenticated()).thenReturn(1L);
        when(locationRepository.findById(1L)).thenReturn(Optional.of(location));
    }

    @Test
    void findAll_boxWithoutImportAndUserIds_noNpe() {
        var box = Box.builder()
                .id(7L)
                .boxCode("BOX-0001")
                .locationId(1L)
                .status(org.dawn.backend.constant.enums.inventory.box.BoxStatus.UNSEALED)
                .build();
        when(boxRepository.findAll(org.mockito.ArgumentMatchers.any(org.springframework.data.domain.Pageable.class)))
                .thenReturn(new org.springframework.data.domain.PageImpl<>(List.of(box), PageRequest.of(0, 20), 1));
        when(productUnitRepository.findByBoxIdInAndStatus(anyList(), any()))
                .thenReturn(List.of());
        when(locationRepository.findAllById(anyList())).thenReturn(List.of(location));
        when(userRepository.findAllById(anyList())).thenReturn(List.of());

        var responses = boxService.findAll(null, null, PageRequest.of(0, 20));

        assertEquals(1, responses.getContent().size());
        assertNull(responses.getContent().get(0).importReceiptCode());
        assertNull(responses.getContent().get(0).sealedByName());
        assertNull(responses.getContent().get(0).createdByName());
    }

    @Test
    void seal_withPartialBulkQuantity_splitsRow_keepsLooseRemainder() {
        var bulk = bulkUnit(5L, new BigDecimal("50"));
        stubBase(1L, List.of(bulk));

        var response = boxService.seal(new SealBoxRequest(
                List.of(5L),
                List.of(new SealBoxRequest.SealBoxItem(5L, new BigDecimal("30"))),
                1L,
                "half",
                null));

        assertEquals(new BigDecimal("30"), response.sealedQuantity());
        verify(productUnitRepository).findByIdsForUpdate(List.of(5L));

        ArgumentCaptor<ProductUnit> captor = ArgumentCaptor.forClass(ProductUnit.class);
        verify(productUnitRepository, org.mockito.Mockito.times(2)).save(captor.capture());
        var boxed = captor.getAllValues().stream().filter(u -> u.getId() == null).findFirst().orElseThrow();
        var original = captor.getAllValues().stream().filter(u -> u.getId() != null).findFirst().orElseThrow();
        assertNull(boxed.getSerialNumber());
        assertEquals(new BigDecimal("30"), boxed.getRemainingQuantity());
        assertEquals(99L, boxed.getBoxId());
        assertEquals(new BigDecimal("20"), original.getRemainingQuantity());
        assertNull(original.getBoxId());
    }

    @Test
    void seal_quantityExceedingRemaining_rejected() {
        var bulk = bulkUnit(5L, new BigDecimal("50"));
        stubGuard();
        when(productUnitRepository.findByIdsForUpdate(anyList())).thenReturn(List.of(bulk));

        assertThrows(InvalidRequestException.class, () -> boxService.seal(new SealBoxRequest(
                List.of(5L),
                List.of(new SealBoxRequest.SealBoxItem(5L, new BigDecimal("60"))),
                1L,
                null,
                null)));
    }

    @Test
    void seal_unitNotInStock_rejected() {
        var unit = bulkUnit(5L, new BigDecimal("50"));
        unit.setStatus(ProductUnitStatus.DAMAGED_IN_STORAGE);
        stubGuard();
        when(productUnitRepository.findByIdsForUpdate(anyList())).thenReturn(List.of(unit));

        assertThrows(InvalidRequestException.class, () -> boxService.seal(new SealBoxRequest(
                List.of(5L), null, 1L, null, null)));
    }

    @Test
    void seal_unitAlreadyInBox_rejected() {
        var unit = bulkUnit(5L, new BigDecimal("50"));
        unit.setBoxId(8L);
        stubGuard();
        when(productUnitRepository.findByIdsForUpdate(anyList())).thenReturn(List.of(unit));

        assertThrows(InvalidRequestException.class, () -> boxService.seal(new SealBoxRequest(
                List.of(5L), null, 1L, null, null)));
    }

    @Test
    void seal_unitWithoutImportSource_rejected() {
        var unit = bulkUnit(5L, new BigDecimal("50"));
        unit.setImportReceiptItemId(null);
        stubGuard();
        when(productUnitRepository.findByIdsForUpdate(anyList())).thenReturn(List.of(unit));

        assertThrows(InvalidRequestException.class, () -> boxService.seal(new SealBoxRequest(
                List.of(5L), null, 1L, null, null)));
    }

    @Test
    void seal_unitsFromDifferentImports_rejected() {
        var unitA = bulkUnit(5L, new BigDecimal("50"));
        var unitB = bulkUnit(6L, new BigDecimal("50"));
        unitB.setImportReceiptItemId(4L);
        stubGuard();
        when(productUnitRepository.findByIdsForUpdate(anyList())).thenReturn(List.of(unitA, unitB));
        when(importReceiptItemRepository.findAllById(any())).thenReturn(List.of(
                ImportReceiptItem.builder().id(3L).receiptId(7L).productId(2L).build(),
                ImportReceiptItem.builder().id(4L).receiptId(8L).productId(2L).build()));

        assertThrows(InvalidRequestException.class, () -> boxService.seal(new SealBoxRequest(
                List.of(5L, 6L), null, 1L, null, null)));
    }

    @Test
    void seal_overMaxUnitsForBoxType_rejected() {
        var bulk = bulkUnit(5L, new BigDecimal("500"));
        stubGuard();
        when(productUnitRepository.findByIdsForUpdate(anyList())).thenReturn(List.of(bulk));

        assertThrows(InvalidRequestException.class, () -> boxService.seal(new SealBoxRequest(
                List.of(5L), null, 1L, null, BoxType.SMALL)));
    }

    @Test
    void seal_withinMaxUnits_defaultType_accepted() {
        var bulk = bulkUnit(5L, new BigDecimal("30"));
        stubBase(1L, List.of(bulk));

        var response = boxService.seal(new SealBoxRequest(
                List.of(5L), null, 1L, null, null));

        assertEquals(new BigDecimal("30"), response.sealedQuantity());
    }

    @Test
    void seal_persistsImportReceiptAndBoxType() {
        var bulk = bulkUnit(5L, new BigDecimal("30"));
        stubBase(1L, List.of(bulk));

        boxService.seal(new SealBoxRequest(
                List.of(5L), null, 1L, null, BoxType.LARGE));

        ArgumentCaptor<Box> captor = ArgumentCaptor.forClass(Box.class);
        verify(boxRepository).save(captor.capture());
        assertEquals(7L, captor.getValue().getImportReceiptId());
        assertEquals(BoxType.LARGE, captor.getValue().getBoxType());
    }

    @Test
    void reclose_flipsUnsealedBoxToSealed_keepsUnitsUntouched() {
        var box = Box.builder().id(3L).boxCode("BOX-3").status(BoxStatus.UNSEALED).unsealedBy(5L).build();
        when(boxRepository.findByIdForUpdate(3L)).thenReturn(Optional.of(box));
        when(boxRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        boxService.reclose(3L);

        assertEquals(BoxStatus.SEALED, box.getStatus());
        assertEquals(5L, box.getSealedBy());
        verify(productUnitRepository, org.mockito.Mockito.never())
                .save(any(ProductUnit.class));
    }

    @Test
    void reclose_ignoresBoxNotUnsealed() {
        var box = Box.builder().id(3L).boxCode("BOX-3").status(BoxStatus.SEALED).build();
        when(boxRepository.findByIdForUpdate(3L)).thenReturn(Optional.of(box));

        boxService.reclose(3L);

        verify(boxRepository, org.mockito.Mockito.never()).save(any());
    }
}
