package org.dawn.backend.service.inventory.imports;

import org.dawn.backend.constant.enums.inventory.ProductUnitStatus;
import org.dawn.backend.constant.enums.inventory.imports.ImportReceiptStatus;
import org.dawn.backend.controller.inventory.request.ConfirmImportRequest;
import org.dawn.backend.controller.inventory.request.ConfirmImportRequest.SerialAssignment;
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
import org.dawn.backend.repository.inventory.PurchaseOrderItemRepository;
import org.dawn.backend.repository.inventory.PurchaseOrderRepository;
import org.dawn.backend.repository.inventory.exports.ExportReceiptItemUnitRepository;
import org.dawn.backend.repository.inventory.exports.ExportReceiptRepository;
import org.dawn.backend.repository.inventory.imports.ImportReceiptItemRepository;
import org.dawn.backend.repository.inventory.imports.ImportReceiptRepository;
import org.dawn.backend.service.inventory.LocationCapacityValidator;
import org.dawn.backend.shared.statemachine.StateMachine;
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
    @Mock LocationCapacityValidator capacityValidator;
    @Mock StateMachine<ImportReceiptStatus> importReceiptStateMachine;
    @Mock PurchaseOrderRepository purchaseOrderRepository;
    @Mock PurchaseOrderItemRepository purchaseOrderItemRepository;
    @Mock ImportWorkflowService importWorkflowService;

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
        when(exportReceiptRepository.findById(exportReceiptId)).thenReturn(Optional.of(exportReceipt("WARRANTY_REPLACEMENT")));
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
                .thenReturn(Optional.of(exportReceipt("SALE")));
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

    // ─── Confirm 2 bước: số lượng khớp đủ ───────────────────

    private ImportReceipt draftReceipt() {
        return ImportReceipt.builder()
                .id(importReceiptId)
                .receiptCode("IMP-001")
                .supplierId(1L)
                .status(ImportReceiptStatus.DRAFT)
                .createdBy(userId)
                .build();
    }

    private ImportReceiptItem receiptItem(Long id, Long productId, BigDecimal qty) {
        return ImportReceiptItem.builder()
                .id(id)
                .receiptId(importReceiptId)
                .productId(productId)
                .quantity(qty)
                .warrantyMonths(12)
                .build();
    }

    private Product bulkProduct(String unit) {
        Product p = mock(Product.class);
        lenient().when(p.getId()).thenReturn(20L);
        lenient().when(p.getUnit()).thenReturn(unit);
        lenient().when(p.getTrackingType()).thenReturn("BULK");
        return p;
    }

    private Product serializedProduct(Long id) {
        Product p = mock(Product.class);
        lenient().when(p.getId()).thenReturn(id);
        lenient().when(p.getTrackingType()).thenReturn("SERIALIZED");
        return p;
    }

    private void stubConfirmContext(ImportReceipt receipt, List<ImportReceiptItem> items, Product... products) {
        lenient().when(importReceiptRepository.findByIdForUpdate(importReceiptId)).thenReturn(Optional.of(receipt));
        lenient().when(importReceiptItemRepository.findByReceiptId(importReceiptId)).thenReturn(items);
        for (Product p : products) {
            lenient().when(productRepository.findById(p.getId())).thenReturn(Optional.of(p));
        }
        lenient().when(importReceiptRepository.save(any())).thenReturn(receipt);
        lenient().when(importReceiptService.toResponse(any())).thenReturn(null);
        lenient().when(productUnitRepository.findExistingSerialNumbers(anyList())).thenReturn(Set.of());
        lenient().when(securityPolicy.requireAuthenticated()).thenReturn(userId);
    }

    @SuppressWarnings("unchecked")
    private List<ProductUnit> capturedSavedUnits() {
        ArgumentCaptor<List<ProductUnit>> captor = ArgumentCaptor.forClass(List.class);
        verify(productUnitRepository).saveAll(captor.capture());
        return captor.getValue();
    }

    @Test
    void confirm_twoStep_bulkAndSerialized_bothEnterStock() {
        ImportReceiptItem bulkItem = receiptItem(200L, 20L, new BigDecimal("5.5"));
        ImportReceiptItem serialItem = receiptItem(201L, 21L, BigDecimal.valueOf(2));
        stubConfirmContext(draftReceipt(), List.of(bulkItem, serialItem),
                bulkProduct("METER"), serializedProduct(21L));

        service.confirm(importReceiptId,
                new ConfirmImportRequest(importReceiptId,
                        List.of(
                                new SerialAssignment(200L, null, 10L, null),
                                new SerialAssignment(201L, List.of("SN-1", "SN-2"), 11L, null))));

        List<ProductUnit> saved = capturedSavedUnits();
        assertEquals(3, saved.size());
        ProductUnit bulk = saved.stream()
                .filter(u -> u.getImportReceiptItemId().equals(200L))
                .findFirst().orElseThrow();
        assertEquals("BULK", bulk.getTrackingType());
        assertEquals(0, new BigDecimal("5.5").compareTo(bulk.getRemainingQuantity()));
        assertEquals(10L, bulk.getLocationId());
        assertTrue(saved.stream().anyMatch(u -> "SN-1".equals(u.getSerialNumber()) && 11L == u.getLocationId()));
        assertTrue(saved.stream().anyMatch(u -> "SN-2".equals(u.getSerialNumber())));
        verify(importReceiptRepository).save(argThat(r ->
                ImportReceiptStatus.RECEIVED.equals(r.getStatus())));
    }

    @Test
    void confirm_persistsNote() {
        ImportReceiptItem item = receiptItem(200L, 20L, BigDecimal.ONE);
        stubConfirmContext(draftReceipt(), List.of(item), bulkProduct("METER"));

        service.confirm(importReceiptId, new ConfirmImportRequest(importReceiptId,
                List.of(new SerialAssignment(200L, null, 10L, null)), "Hàng đủ, nhập OK"));

        verify(importReceiptRepository).save(argThat(r ->
                "Hàng đủ, nhập OK".equals(r.getNote())));
    }

    @Test
    void confirm_tubeUnit_treatedAsBulk() {
        ImportReceiptItem item = receiptItem(200L, 20L, new BigDecimal("3"));
        stubConfirmContext(draftReceipt(), List.of(item), bulkProduct("TUBE"));

        service.confirm(importReceiptId, new ConfirmImportRequest(importReceiptId,
                List.of(new SerialAssignment(200L, null, 10L, null))));

        ProductUnit unit = capturedSavedUnits().get(0);
        assertEquals("BULK", unit.getTrackingType());
        assertEquals(0, new BigDecimal("3").compareTo(unit.getRemainingQuantity()));
    }

    @Test
    void confirm_serialCountLessThanQuantity_acceptsShortfall() {
        ImportReceiptItem item = receiptItem(200L, 21L, BigDecimal.valueOf(3));
        stubConfirmContext(draftReceipt(), List.of(item), serializedProduct(21L));

        ConfirmImportRequest request = new ConfirmImportRequest(importReceiptId,
                List.of(new SerialAssignment(200L, List.of("SN-1", "SN-2"), 10L, null)));

        service.confirm(importReceiptId, request);

        List<ProductUnit> saved = capturedSavedUnits();
        assertEquals(2, saved.size());
        assertEquals("SN-1", saved.get(0).getSerialNumber());
        assertEquals("SN-2", saved.get(1).getSerialNumber());
        verify(importReceiptRepository).save(argThat(r -> ImportReceiptStatus.RECEIVED.equals(r.getStatus())));
        verify(importReceiptItemRepository).saveAll(argThat(items ->
                BigDecimal.valueOf(2).compareTo(((ImportReceiptItem) ((List<?>) items).get(0)).getReceivedQuantity()) == 0));
    }

    @Test
    void confirm_serialCountMoreThanQuantity_throws() {
        ImportReceiptItem item = receiptItem(200L, 21L, BigDecimal.valueOf(2));
        stubConfirmContext(draftReceipt(), List.of(item), serializedProduct(21L));

        ConfirmImportRequest request = new ConfirmImportRequest(importReceiptId,
                List.of(new SerialAssignment(200L, List.of("SN-1", "SN-2", "SN-3"), 10L, null)));

        assertThrows(InvalidRequestException.class, () -> service.confirm(importReceiptId, request));
        verify(productUnitRepository, never()).saveAll(anyList());
    }

    @Test
    void confirm_itemNotInReceipt_throws() {
        stubConfirmContext(draftReceipt(), List.of(), bulkProduct("METER"));

        ConfirmImportRequest request = new ConfirmImportRequest(importReceiptId,
                List.of(new SerialAssignment(999L, null, 10L, null)));

        assertThrows(InvalidRequestException.class, () -> service.confirm(importReceiptId, request));
        verify(productUnitRepository, never()).saveAll(anyList());
    }

    @Test
    void confirm_missingReceiptItem_throws() {
        ImportReceiptItem bulkItem = receiptItem(200L, 20L, BigDecimal.ONE);
        ImportReceiptItem serialItem = receiptItem(201L, 21L, BigDecimal.ONE);
        stubConfirmContext(draftReceipt(), List.of(bulkItem, serialItem),
                bulkProduct("METER"), serializedProduct(21L));

        ConfirmImportRequest request = new ConfirmImportRequest(importReceiptId,
                List.of(new SerialAssignment(200L, null, 10L, null)));

        assertThrows(InvalidRequestException.class, () -> service.confirm(importReceiptId, request));
        verify(productUnitRepository, never()).saveAll(anyList());
    }

    @Test
    void confirm_locationRequired_throws() {
        ImportReceiptItem item = receiptItem(200L, 21L, BigDecimal.ONE);
        stubConfirmContext(draftReceipt(), List.of(item), serializedProduct(21L));

        ConfirmImportRequest request = new ConfirmImportRequest(importReceiptId,
                List.of(new SerialAssignment(200L, List.of("SN-1"), null, null)));

        assertThrows(InvalidRequestException.class, () -> service.confirm(importReceiptId, request));
        verify(productUnitRepository, never()).saveAll(anyList());
    }

    @Test
    void confirm_bulkZeroQuantity_throws() {
        ImportReceiptItem item = receiptItem(200L, 20L, BigDecimal.ZERO);
        stubConfirmContext(draftReceipt(), List.of(item), bulkProduct("METER"));

        ConfirmImportRequest request = new ConfirmImportRequest(importReceiptId,
                List.of(new SerialAssignment(200L, null, 10L, null)));

        assertThrows(InvalidRequestException.class, () -> service.confirm(importReceiptId, request));
        verify(productUnitRepository, never()).saveAll(anyList());
    }

    // ─── Confirm 2 bước: chia nhiều bin (allocations) ────

    private ConfirmImportRequest.SerialAssignment.Allocation alloc(Long locationId, String qty, String... serials) {
        return new ConfirmImportRequest.SerialAssignment.Allocation(
                locationId, new BigDecimal(qty), List.of(serials));
    }

    @Test
    void confirm_serializedAllocations_spreadAcrossBins() {
        ImportReceiptItem item = receiptItem(200L, 21L, BigDecimal.valueOf(3));
        stubConfirmContext(draftReceipt(), List.of(item), serializedProduct(21L));

        ConfirmImportRequest request = new ConfirmImportRequest(importReceiptId,
                List.of(new SerialAssignment(200L, List.of("SN-1", "SN-2", "SN-3"), null,
                        List.of(alloc(10L, "2", "SN-1", "SN-2"), alloc(11L, "1", "SN-3")))));

        service.confirm(importReceiptId, request);

        List<ProductUnit> saved = capturedSavedUnits();
        assertEquals(3, saved.size());
        assertEquals(10L, saved.stream().filter(u -> "SN-1".equals(u.getSerialNumber())).findFirst().orElseThrow().getLocationId());
        assertEquals(10L, saved.stream().filter(u -> "SN-2".equals(u.getSerialNumber())).findFirst().orElseThrow().getLocationId());
        assertEquals(11L, saved.stream().filter(u -> "SN-3".equals(u.getSerialNumber())).findFirst().orElseThrow().getLocationId());
    }

    @Test
    void confirm_serializedAllocationDuplicateSerial_throws() {
        ImportReceiptItem item = receiptItem(200L, 21L, BigDecimal.valueOf(2));
        stubConfirmContext(draftReceipt(), List.of(item), serializedProduct(21L));

        ConfirmImportRequest request = new ConfirmImportRequest(importReceiptId,
                List.of(new SerialAssignment(200L, List.of("SN-1", "SN-1"), null,
                        List.of(alloc(10L, "1", "SN-1"), alloc(11L, "1", "SN-1")))));

        assertThrows(InvalidRequestException.class, () -> service.confirm(importReceiptId, request));
        verify(productUnitRepository, never()).saveAll(anyList());
    }

    @Test
    void confirm_serializedAllocationSerialCountMismatch_throws() {
        ImportReceiptItem item = receiptItem(200L, 21L, BigDecimal.valueOf(2));
        stubConfirmContext(draftReceipt(), List.of(item), serializedProduct(21L));

        ConfirmImportRequest request = new ConfirmImportRequest(importReceiptId,
                List.of(new SerialAssignment(200L, List.of("SN-1"), null,
                        List.of(alloc(10L, "2", "SN-1")))));

        assertThrows(InvalidRequestException.class, () -> service.confirm(importReceiptId, request));
        verify(productUnitRepository, never()).saveAll(anyList());
    }

    @Test
    void confirm_serializedAllocationMissingLocation_throws() {
        ImportReceiptItem item = receiptItem(200L, 21L, BigDecimal.ONE);
        stubConfirmContext(draftReceipt(), List.of(item), serializedProduct(21L));

        ConfirmImportRequest request = new ConfirmImportRequest(importReceiptId,
                List.of(new SerialAssignment(200L, List.of("SN-1"), null,
                        List.of(alloc(null, "1", "SN-1")))));

        assertThrows(InvalidRequestException.class, () -> service.confirm(importReceiptId, request));
        verify(productUnitRepository, never()).saveAll(anyList());
    }

    @Test
    void confirm_bulkAllocations_splitAcrossBins() {
        ImportReceiptItem item = receiptItem(200L, 20L, new BigDecimal("5.5"));
        stubConfirmContext(draftReceipt(), List.of(item), bulkProduct("METER"));

        ConfirmImportRequest request = new ConfirmImportRequest(importReceiptId,
                List.of(new SerialAssignment(200L, null, null,
                        List.of(alloc(10L, "3"), alloc(11L, "2.5")))));

        service.confirm(importReceiptId, request);

        List<ProductUnit> saved = capturedSavedUnits();
        assertEquals(2, saved.size());
        assertEquals(10L, saved.get(0).getLocationId());
        assertEquals(0, new BigDecimal("3").compareTo(saved.get(0).getRemainingQuantity()));
        assertEquals(11L, saved.get(1).getLocationId());
    }

    @Test
    void confirm_bulkAllocations_qtySumMismatch_throws() {
        ImportReceiptItem item = receiptItem(200L, 20L, new BigDecimal("5.5"));
        stubConfirmContext(draftReceipt(), List.of(item), bulkProduct("METER"));

        ConfirmImportRequest request = new ConfirmImportRequest(importReceiptId,
                List.of(new SerialAssignment(200L, null, null,
                        List.of(alloc(10L, "3"), alloc(11L, "3")))));

        assertThrows(InvalidRequestException.class, () -> service.confirm(importReceiptId, request));
        verify(productUnitRepository, never()).saveAll(anyList());
    }

    @Test
    void confirm_bulkAllocationSerialNotAllowed_throws() {
        ImportReceiptItem item = receiptItem(200L, 20L, BigDecimal.ONE);
        stubConfirmContext(draftReceipt(), List.of(item), bulkProduct("METER"));

        ConfirmImportRequest request = new ConfirmImportRequest(importReceiptId,
                List.of(new SerialAssignment(200L, List.of("SN-1"), null,
                        List.of(alloc(10L, "1")))));

        assertThrows(InvalidRequestException.class, () -> service.confirm(importReceiptId, request));
        verify(productUnitRepository, never()).saveAll(anyList());
    }

    // ─── QC: serial lỗi → không nhập kho (không tạo unit) ────

    @Test
    void confirm_rejectedSerial_excludedFromStock() {
        ImportReceiptItem item = receiptItem(200L, 21L, BigDecimal.valueOf(2));
        stubConfirmContext(draftReceipt(), List.of(item), serializedProduct(21L));

        ConfirmImportRequest request = new ConfirmImportRequest(importReceiptId,
                List.of(new SerialAssignment(200L, List.of("SN-1", "SN-2"), 10L, null)),
                null,
                List.of(new ConfirmImportRequest.RejectedSerial("SN-2", "Trầy xước")),
                null);

        service.confirm(importReceiptId, request);

        List<ProductUnit> saved = capturedSavedUnits();
        assertEquals(1, saved.size());
        assertEquals("SN-1", saved.get(0).getSerialNumber());
        verify(importReceiptItemRepository).saveAll(argThat(items ->
                BigDecimal.ONE.compareTo(((ImportReceiptItem) ((List<?>) items).get(0)).getReceivedQuantity()) == 0));
    }

    @Test
    void confirm_rejectedSerialNotInEnteredList_throws() {
        ImportReceiptItem item = receiptItem(200L, 21L, BigDecimal.valueOf(2));
        stubConfirmContext(draftReceipt(), List.of(item), serializedProduct(21L));

        ConfirmImportRequest request = new ConfirmImportRequest(importReceiptId,
                List.of(new SerialAssignment(200L, List.of("SN-1", "SN-2"), 10L, null)),
                null,
                List.of(new ConfirmImportRequest.RejectedSerial("SN-999", "Lỗi")),
                null);

        assertThrows(InvalidRequestException.class, () -> service.confirm(importReceiptId, request));
        verify(productUnitRepository, never()).saveAll(anyList());
    }

    @Test
    void confirm_notReceivedItem_allowedAndZeroReceived() {
        ImportReceiptItem bulkItem = receiptItem(200L, 20L, BigDecimal.ONE);
        ImportReceiptItem serialItem = receiptItem(201L, 21L, BigDecimal.ONE);
        stubConfirmContext(draftReceipt(), List.of(bulkItem, serialItem),
                bulkProduct("METER"), serializedProduct(21L));

        ConfirmImportRequest request = new ConfirmImportRequest(importReceiptId,
                List.of(new SerialAssignment(200L, null, 10L, null)),
                null, null,
                List.of(201L));

        service.confirm(importReceiptId, request);

        List<ProductUnit> saved = capturedSavedUnits();
        assertEquals(1, saved.size());
        verify(importReceiptItemRepository).saveAll(argThat(items ->
                BigDecimal.ZERO.compareTo(((ImportReceiptItem) ((List<?>) items).get(1)).getReceivedQuantity()) == 0));
    }
}
