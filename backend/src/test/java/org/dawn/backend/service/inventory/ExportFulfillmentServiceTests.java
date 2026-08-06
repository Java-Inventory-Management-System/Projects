package org.dawn.backend.service.inventory;

import org.dawn.backend.constant.enums.inventory.ProductUnitStatus;
import org.dawn.backend.constant.enums.inventory.exports.ExportReason;
import org.dawn.backend.constant.enums.inventory.exports.ExportReceiptStatus;
import org.dawn.backend.controller.inventory.request.FulfillExportRequest;
import org.dawn.backend.controller.inventory.request.FulfillExportRequest.FulfillItemRequest;
import org.dawn.backend.entity.catalog.Product;
import org.dawn.backend.entity.inventory.ExportReceipt;
import org.dawn.backend.entity.inventory.ExportReceiptItem;
import org.dawn.backend.entity.inventory.ProductUnit;
import org.dawn.backend.exception.type.InvalidRequestException;
import org.dawn.backend.config.security.SecurityPolicy;
import org.dawn.backend.repository.catalog.ProductRepository;
import org.dawn.backend.repository.inventory.ProductUnitRepository;
import org.dawn.backend.repository.inventory.ProductUnitStatusLogRepository;
import org.dawn.backend.repository.inventory.exports.ExportReceiptItemRepository;
import org.dawn.backend.repository.inventory.exports.ExportReceiptItemUnitRepository;
import org.dawn.backend.repository.inventory.exports.ExportReceiptRepository;
import org.dawn.backend.service.inventory.exports.ExportFulfillmentService;
import org.dawn.backend.service.inventory.exports.ExportReceiptService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ExportFulfillmentServiceTests {

    @Mock ExportReceiptRepository exportReceiptRepository;
    @Mock ExportReceiptItemRepository exportReceiptItemRepository;
    @Mock ExportReceiptItemUnitRepository exportReceiptItemUnitRepository;
    @Mock ProductUnitRepository productUnitRepository;
    @Mock ProductUnitStatusLogRepository statusLogRepository;
    @Mock ProductRepository productRepository;
    @Mock SecurityPolicy securityPolicy;
    @Mock ExportReceiptService exportReceiptService;
    @Mock org.dawn.backend.shared.statemachine.StateMachine<org.dawn.backend.constant.enums.inventory.exports.ExportReceiptStatus> exportReceiptStateMachine;
    @Mock org.dawn.backend.repository.inventory.exports.ExportReceiptStatusHistoryRepository statusHistoryRepository;
    @Mock org.dawn.backend.repository.inventory.stockcheck.StockCheckItemRepository stockCheckItemRepository;
    @Mock org.dawn.backend.repository.inventory.box.BoxRepository boxRepository;
    @Mock org.dawn.backend.repository.inventory.LocationRepository locationRepository;

    @InjectMocks ExportFulfillmentService service;

    private final Long userId = 1L;
    private final Long receiptId = 50L;
    private final Long itemId = 70L;
    private final Long productId = 20L;

    private void stubUnitSave() {
        when(productUnitRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    }

    private void stubUnitLookup(ProductUnit pu) {
        when(productUnitRepository.findBySerialNumber(pu.getSerialNumber())).thenReturn(Optional.of(pu));
        when(productUnitRepository.findByIdForUpdate(pu.getId())).thenReturn(Optional.of(pu));
    }

    private ExportReceipt receipt(String reason) {
        return ExportReceipt.builder()
                .id(receiptId)
                .receiptCode("EXP-001")
                .reason(reason)
                .status(ExportReceiptStatus.PENDING)
                .build();
    }

    private ExportReceiptItem item() {
        return ExportReceiptItem.builder()
                .id(itemId)
                .receiptId(receiptId)
                .productId(productId)
                .quantity(BigDecimal.ONE)
                .build();
    }

    private Product product(String unit) {
        Product p = mock(Product.class);
        when(p.getId()).thenReturn(productId);
        when(p.getUnit()).thenReturn(unit);
        return p;
    }

    private ProductUnit inStockUnit() {
        return ProductUnit.builder()
                .id(1L)
                .serialNumber("SN-1")
                .productId(productId)
                .trackingType("SERIALIZED")
                .status(ProductUnitStatus.IN_STOCK)
                .locationId(100L)
                .build();
    }

    private ProductUnit waitingRmaUnit() {
        return ProductUnit.builder()
                .id(2L)
                .serialNumber("SN-2")
                .productId(productId)
                .trackingType("SERIALIZED")
                .status(ProductUnitStatus.WAITING_RMA_EXPORT)
                .locationId(101L)
                .build();
    }

    private void stubFulfillContext(String reason, Product product) {
        when(exportReceiptRepository.findByIdForUpdate(receiptId)).thenReturn(Optional.of(receipt(reason)));
        when(exportReceiptItemRepository.findByReceiptId(receiptId)).thenReturn(List.of(item()));
        when(productRepository.findAllById(List.of(productId))).thenReturn(List.of(product));
    }

    private void stubReceiptSave() {
        when(exportReceiptRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void fulfill_warrantyReplacement_setsSentToManufacturer() {
        Product prod = product("PIECE");
        when(prod.getTrackingType()).thenReturn("SERIALIZED");
        stubFulfillContext(ExportReason.WARRANTY_REPLACEMENT.name(), prod);
        stubReceiptSave();
        ProductUnit pu = inStockUnit();
        stubUnitLookup(pu);
        stubUnitSave();
        when(securityPolicy.requireAuthenticated()).thenReturn(userId);

        FulfillExportRequest request = new FulfillExportRequest(
                List.of(new FulfillItemRequest(itemId, List.of("SN-1"), null)));

        service.fulfill(receiptId, request);

        assertEquals(ProductUnitStatus.SENT_TO_MANUFACTURER, pu.getStatus());
        assertNull(pu.getLocationId());
        verify(statusLogRepository).save(argThat(log ->
                "EXPORT_RECEIPT".equals(log.getSourceType()) && "SENT_TO_MANUFACTURER".equals(log.getToStatus())));
        verify(exportReceiptItemUnitRepository).save(argThat(eiu ->
                itemId.equals(eiu.getExportReceiptItemId()) && 1L == eiu.getProductUnitId()));
    }

    @Test
    void fulfill_warrantyReplacement_waitingRmaUnit_allowed() {
        Product prod = product("PIECE");
        when(prod.getTrackingType()).thenReturn("SERIALIZED");
        stubFulfillContext(ExportReason.WARRANTY_REPLACEMENT.name(), prod);
        stubReceiptSave();
        ProductUnit pu = waitingRmaUnit();
        stubUnitLookup(pu);
        stubUnitSave();
        when(securityPolicy.requireAuthenticated()).thenReturn(userId);

        FulfillExportRequest request = new FulfillExportRequest(
                List.of(new FulfillItemRequest(itemId, List.of("SN-2"), null)));

        service.fulfill(receiptId, request);

        assertEquals(ProductUnitStatus.SENT_TO_MANUFACTURER, pu.getStatus());
        assertNull(pu.getLocationId());
    }

    @Test
    void fulfill_nonWarrantyReason_waitingRmaUnit_rejected() {
        Product prod = product("PIECE");
        when(prod.getTrackingType()).thenReturn("SERIALIZED");
        stubFulfillContext(ExportReason.RETURN_SUPPLIER.name(), prod);
        ProductUnit pu = waitingRmaUnit();
        stubUnitLookup(pu);
        when(securityPolicy.requireAuthenticated()).thenReturn(userId);

        FulfillExportRequest request = new FulfillExportRequest(
                List.of(new FulfillItemRequest(itemId, List.of("SN-2"), null)));

        assertThrows(InvalidRequestException.class, () -> service.fulfill(receiptId, request));
        assertEquals(ProductUnitStatus.WAITING_RMA_EXPORT, pu.getStatus());
    }

    @Test
    void fulfill_returnSupplier_setsReturnedToSupplier() {
        Product prod = product("PIECE");
        when(prod.getTrackingType()).thenReturn("SERIALIZED");
        stubFulfillContext(ExportReason.RETURN_SUPPLIER.name(), prod);
        stubReceiptSave();
        ProductUnit pu = inStockUnit();
        stubUnitLookup(pu);
        stubUnitSave();
        when(securityPolicy.requireAuthenticated()).thenReturn(userId);

        FulfillExportRequest request = new FulfillExportRequest(
                List.of(new FulfillItemRequest(itemId, List.of("SN-1"), null)));

        service.fulfill(receiptId, request);

        assertEquals(ProductUnitStatus.RETURNED_TO_SUPPLIER, pu.getStatus());
    }

    @Test
    void fulfill_warrantyReplacement_bulk_fails() {
        stubFulfillContext(ExportReason.WARRANTY_REPLACEMENT.name(), product("METER"));
        when(securityPolicy.requireAuthenticated()).thenReturn(userId);

        FulfillExportRequest request = new FulfillExportRequest(
                List.of(new FulfillItemRequest(itemId, null, BigDecimal.ONE)));

        assertThrows(InvalidRequestException.class, () -> service.fulfill(receiptId, request));
        verify(productUnitRepository, never()).findBySerialNumber(anyString());
        verify(exportReceiptItemUnitRepository, never()).save(any());
    }
}
