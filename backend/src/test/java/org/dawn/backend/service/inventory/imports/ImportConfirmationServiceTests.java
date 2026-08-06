package org.dawn.backend.service.inventory.imports;

import org.dawn.backend.constant.enums.inventory.ProductUnitStatus;
import org.dawn.backend.constant.enums.inventory.exports.ExportReason;
import org.dawn.backend.controller.inventory.request.ImportReceiptRequest;
import org.dawn.backend.controller.inventory.request.ImportReceiptRequest.ImportItemRequest;
import org.dawn.backend.entity.inventory.ExportReceipt;
import org.dawn.backend.entity.inventory.ImportReceipt;
import org.dawn.backend.entity.inventory.ImportReceiptItem;
import org.dawn.backend.entity.inventory.Location;
import org.dawn.backend.entity.inventory.ProductUnit;
import org.dawn.backend.entity.catalog.Product;
import org.dawn.backend.exception.type.InvalidRequestException;
import org.dawn.backend.config.security.SecurityPolicy;
import org.dawn.backend.repository.catalog.ProductRepository;
import org.dawn.backend.repository.inventory.LocationRepository;
import org.dawn.backend.repository.inventory.ProductUnitRepository;
import org.dawn.backend.repository.inventory.ProductUnitStatusLogRepository;
import org.dawn.backend.repository.inventory.exports.ExportReceiptItemUnitRepository;
import org.dawn.backend.repository.inventory.exports.ExportReceiptRepository;
import org.dawn.backend.repository.inventory.imports.ImportReceiptItemRepository;
import org.dawn.backend.repository.inventory.imports.ImportReceiptRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ImportConfirmationServiceTests {

    @Mock ImportReceiptRepository importReceiptRepository;
    @Mock ImportReceiptItemRepository importReceiptItemRepository;
    @Mock ProductUnitRepository productUnitRepository;
    @Mock ProductUnitStatusLogRepository statusLogRepository;
    @Mock ProductRepository productRepository;
    @Mock LocationRepository locationRepository;
    @Mock ExportReceiptRepository exportReceiptRepository;
    @Mock ExportReceiptItemUnitRepository exportReceiptItemUnitRepository;
    @Mock SecurityPolicy securityPolicy;
    @Mock ImportReceiptService importReceiptService;

    @InjectMocks ImportConfirmationService service;

    @Captor ArgumentCaptor<ProductUnit> puCaptor;

    private final Long userId = 1L;
    private final Long exportReceiptId = 50L;
    private final Long importReceiptId = 100L;

    private void stubReceiptSave() {
        when(importReceiptRepository.save(any())).thenAnswer(invocation -> {
            ImportReceipt r = invocation.getArgument(0);
            return ImportReceipt.builder()
                    .id(importReceiptId)
                    .receiptCode(r.getReceiptCode())
                    .supplierId(r.getSupplierId())
                    .purchaseOrderId(r.getPurchaseOrderId())
                    .originalWarrantyExportId(r.getOriginalWarrantyExportId())
                    .status(r.getStatus())
                    .note(r.getNote())
                    .createdBy(r.getCreatedBy())
                    .totalAmount(r.getTotalAmount())
                    .build();
        });
    }

    private void stubItemSave() {
        when(importReceiptItemRepository.save(any())).thenAnswer(invocation -> {
            ImportReceiptItem item = invocation.getArgument(0);
            if (item.getId() == null) {
                item.setId(200L);
            }
            return item;
        });
    }

    private void stubUnitSave() {
        when(productUnitRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    }

    private ExportReceipt exportReceipt(String reason) {
        return ExportReceipt.builder()
                .id(exportReceiptId)
                .receiptCode("EXP-001")
                .reason(reason)
                .build();
    }

    private ProductUnit sentUnit() {
        return ProductUnit.builder()
                .id(1L)
                .serialNumber("SN-1")
                .productId(20L)
                .trackingType("SERIALIZED")
                .status(ProductUnitStatus.SENT_TO_MANUFACTURER)
                .build();
    }

    private Product serializedProduct() {
        Product p = mock(Product.class);
        when(p.getTrackingType()).thenReturn("SERIALIZED");
        return p;
    }

    private Location location(Long id) {
        Location loc = mock(Location.class);
        when(loc.getId()).thenReturn(id);
        return loc;
    }

    private ImportReceiptRequest warrantyRequest(ImportItemRequest... items) {
        return new ImportReceiptRequest("IMP-001", 1L, null, exportReceiptId, "note", List.of(items));
    }

    private void stubWarrantyExport() {
        when(exportReceiptRepository.findById(exportReceiptId)).thenReturn(Optional.of(exportReceipt(ExportReason.WARRANTY_REPLACEMENT.name())));
        when(exportReceiptItemUnitRepository.findProductUnitIdsByReceiptId(exportReceiptId)).thenReturn(Set.of(1L));
        when(productUnitRepository.findAllById(Set.of(1L))).thenReturn(List.of(sentUnit()));
        Location staging = location(5L);
        Location waste = location(6L);
        when(locationRepository.findByFullCode("QC-01-03")).thenReturn(Optional.of(staging));
        when(locationRepository.findByFullCode("QC-01-04")).thenReturn(Optional.of(waste));
    }

    // ─── Warranty import: REPAIRED / REJECTED ────────────────

    @Test
    void warranty_repaired_movesUnitToStaging() {
        stubWarrantyExport();
        ProductUnit unit = sentUnit();
        when(productUnitRepository.findBySerialNumberIgnoreCase("SN-1")).thenReturn(Optional.of(unit));
        Product product = mock(Product.class);
        when(productRepository.findById(20L)).thenReturn(Optional.of(product));
        stubReceiptSave();
        stubItemSave();
        stubUnitSave();
        when(securityPolicy.requireAuthenticated()).thenReturn(userId);

        ImportReceiptRequest request = warrantyRequest(new ImportItemRequest(
                20L, BigDecimal.ONE, BigDecimal.valueOf(100), 12, "REPAIRED", List.of("SN-1"), null, null));

        service.createAndConfirm(request);

        assertEquals(ProductUnitStatus.RMA_REPAIRED_RETURNED, unit.getStatus());
        assertEquals(5L, unit.getLocationId());
        verify(statusLogRepository).save(argThat(log ->
                "IMPORT_RECEIPT".equals(log.getSourceType()) && "RMA_REPAIRED_RETURNED".equals(log.getToStatus())));
        verify(importReceiptItemRepository).save(argThat(item ->
                "REPAIRED".equals(item.getWarrantyResultType())));
    }

    @Test
    void warranty_rejected_movesUnitToWaste() {
        stubWarrantyExport();
        ProductUnit unit = sentUnit();
        when(productUnitRepository.findBySerialNumberIgnoreCase("SN-1")).thenReturn(Optional.of(unit));
        Product product = mock(Product.class);
        when(productRepository.findById(20L)).thenReturn(Optional.of(product));
        stubReceiptSave();
        stubItemSave();
        stubUnitSave();
        when(securityPolicy.requireAuthenticated()).thenReturn(userId);

        ImportReceiptRequest request = warrantyRequest(new ImportItemRequest(
                20L, BigDecimal.ONE, BigDecimal.ZERO, 0, "REJECTED", List.of("SN-1"), null, null));

        service.createAndConfirm(request);

        assertEquals(ProductUnitStatus.RMA_UNREPAIRABLE, unit.getStatus());
        assertEquals(6L, unit.getLocationId());
        verify(statusLogRepository).save(argThat(log -> "RMA_UNREPAIRABLE".equals(log.getToStatus())));
    }

    // ─── Warranty import: REPLACED ───────────────────────────

    @Test
    void warranty_replaced_oldUnitToSupplier_newUnitCreated() {
        stubWarrantyExport();
        ProductUnit oldUnit = sentUnit();
        when(productUnitRepository.findBySerialNumberIgnoreCase("SN-1")).thenReturn(Optional.of(oldUnit));
        when(productUnitRepository.findExistingSerialNumbers(List.of("NEW-1"))).thenReturn(Set.<String>of());
        Product product = serializedProduct();
        when(productRepository.findById(20L)).thenReturn(Optional.of(product));
        stubReceiptSave();
        stubItemSave();
        stubUnitSave();
        when(securityPolicy.requireAuthenticated()).thenReturn(userId);

        ImportReceiptRequest request = warrantyRequest(new ImportItemRequest(
                20L, BigDecimal.ONE, BigDecimal.valueOf(200), 24, "REPLACED",
                List.of("NEW-1"), List.of("SN-1"), null));

        service.createAndConfirm(request);

        assertEquals(ProductUnitStatus.RETURNED_TO_SUPPLIER, oldUnit.getStatus());
        verify(productUnitRepository, atLeastOnce()).save(puCaptor.capture());
        ProductUnit newUnit = puCaptor.getAllValues().stream()
                .filter(u -> "NEW-1".equals(u.getSerialNumber()))
                .findFirst()
                .orElseThrow(() -> new AssertionError("new unit not saved"));
        assertEquals(ProductUnitStatus.RMA_REPAIRED_RETURNED, newUnit.getStatus());
        assertEquals(5L, newUnit.getLocationId());
        assertNotNull(newUnit.getImportReceiptItemId());
    }

    @Test
    void warranty_replaced_sourceSerialsMismatch_fails() {
        stubWarrantyExport();
        Product product = mock(Product.class);
        when(productRepository.findById(20L)).thenReturn(Optional.of(product));
        stubReceiptSave();
        stubItemSave();
        when(securityPolicy.requireAuthenticated()).thenReturn(userId);

        ImportReceiptRequest request = warrantyRequest(new ImportItemRequest(
                20L, BigDecimal.valueOf(2), BigDecimal.valueOf(200), 24, "REPLACED",
                List.of("NEW-1", "NEW-2"), List.of("SN-1"), null));

        assertThrows(InvalidRequestException.class, () -> service.createAndConfirm(request));
    }

    // ─── Warranty import: guard failures ─────────────────────

    @Test
    void warranty_fail_exportNotReplacement() {
        when(exportReceiptRepository.findById(exportReceiptId))
                .thenReturn(Optional.of(exportReceipt(ExportReason.SALE.name())));
        stubReceiptSave();
        when(securityPolicy.requireAuthenticated()).thenReturn(userId);

        ImportReceiptRequest request = warrantyRequest(new ImportItemRequest(
                20L, BigDecimal.ONE, BigDecimal.ZERO, 0, "REPAIRED", List.of("SN-1"), null, null));

        assertThrows(InvalidRequestException.class, () -> service.createAndConfirm(request));
        verify(importReceiptItemRepository, never()).save(any());
    }

    @Test
    void warranty_fail_serialNotInExport() {
        stubWarrantyExport();
        Product product = mock(Product.class);
        when(productRepository.findById(20L)).thenReturn(Optional.of(product));
        stubReceiptSave();
        stubItemSave();
        when(securityPolicy.requireAuthenticated()).thenReturn(userId);

        ImportReceiptRequest request = warrantyRequest(new ImportItemRequest(
                20L, BigDecimal.ONE, BigDecimal.ZERO, 0, "REPAIRED", List.of("ZZZ"), null, null));

        assertThrows(InvalidRequestException.class, () -> service.createAndConfirm(request));
    }

    @Test
    void warranty_fail_unitNotSent() {
        stubWarrantyExport();
        ProductUnit unit = ProductUnit.builder()
                .id(1L)
                .serialNumber("SN-1")
                .productId(20L)
                .trackingType("SERIALIZED")
                .status(ProductUnitStatus.IN_STOCK)
                .build();
        when(productUnitRepository.findBySerialNumberIgnoreCase("SN-1")).thenReturn(Optional.of(unit));
        Product product = mock(Product.class);
        when(productRepository.findById(20L)).thenReturn(Optional.of(product));
        stubReceiptSave();
        stubItemSave();
        when(securityPolicy.requireAuthenticated()).thenReturn(userId);

        ImportReceiptRequest request = warrantyRequest(new ImportItemRequest(
                20L, BigDecimal.ONE, BigDecimal.ZERO, 0, "REPAIRED", List.of("SN-1"), null, null));

        assertThrows(InvalidRequestException.class, () -> service.createAndConfirm(request));
    }

    @Test
    void warranty_fail_invalidResult() {
        stubWarrantyExport();
        stubReceiptSave();
        when(securityPolicy.requireAuthenticated()).thenReturn(userId);

        ImportReceiptRequest request = warrantyRequest(new ImportItemRequest(
                20L, BigDecimal.ONE, BigDecimal.ZERO, 0, "FOO", List.of("SN-1"), null, null));

        assertThrows(InvalidRequestException.class, () -> service.createAndConfirm(request));
    }
}
