package org.dawn.backend.service.inventory.adjustments;

import org.dawn.backend.config.security.SecurityPolicy;
import org.dawn.backend.constant.enums.inventory.ProductUnitStatus;
import org.dawn.backend.constant.enums.inventory.SourceType;
import org.dawn.backend.constant.enums.inventory.adjustments.AdjustmentStatus;
import org.dawn.backend.constant.enums.inventory.adjustments.AdjustmentType;
import org.dawn.backend.controller.inventory.request.ApproveAdjustmentRequest;
import org.dawn.backend.controller.inventory.request.CreateStockAdjustmentRequest;
import org.dawn.backend.entity.catalog.Product;
import org.dawn.backend.entity.inventory.Location;
import org.dawn.backend.entity.inventory.ProductUnit;
import org.dawn.backend.entity.inventory.StockAdjustment;
import org.dawn.backend.exception.type.InvalidRequestException;
import org.dawn.backend.exception.type.ResourceNotFoundException;
import org.dawn.backend.repository.auth.UserRepository;
import org.dawn.backend.repository.catalog.ProductRepository;
import org.dawn.backend.repository.inventory.LocationRepository;
import org.dawn.backend.repository.inventory.ProductUnitRepository;
import org.dawn.backend.repository.inventory.adjustments.StockAdjustmentRepository;
import org.dawn.backend.shared.statemachine.StateMachine;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StockAdjustmentServiceTests {

    @Mock StockAdjustmentRepository adjustmentRepository;
    @Mock ProductUnitRepository productUnitRepository;
    @Mock ProductRepository productRepository;
    @Mock LocationRepository locationRepository;
    @Mock UserRepository userRepository;
    @Mock AdjustmentUnitService adjustmentUnitService;
    @Mock StateMachine<AdjustmentStatus> adjustmentStateMachine;
    @Mock SecurityPolicy securityPolicy;

    @InjectMocks StockAdjustmentService service;

    private ProductUnit unit(Long id, ProductUnitStatus status) {
        return ProductUnit.builder()
                .id(id)
                .productId(20L)
                .trackingType("SERIALIZED")
                .status(status)
                .remainingQuantity(BigDecimal.ONE)
                .build();
    }

    private StockAdjustment pendingAdjustment(Long id, String type, String sourceType, Long productUnitId,
                                              BigDecimal quantity, Long createdBy) {
        StockAdjustment adj = new StockAdjustment();
        adj.setId(id);
        adj.setType(type);
        adj.setSourceType(sourceType);
        adj.setProductUnitId(productUnitId);
        adj.setQuantity(quantity);
        adj.setStatus(AdjustmentStatus.PENDING);
        adj.setCreatedBy(createdBy);
        return adj;
    }

    @Test
    void create_lost_callsManualAdjustableGate() {
        var unit = unit(5L, ProductUnitStatus.IN_STOCK);
        when(securityPolicy.requireAuthenticated()).thenReturn(1L);
        when(productUnitRepository.findById(5L)).thenReturn(Optional.of(unit));
        when(adjustmentRepository.existsByProductUnitIdAndStatus(5L, AdjustmentStatus.PENDING)).thenReturn(false);
        when(adjustmentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.create(new CreateStockAdjustmentRequest(
                "LOST", 5L, null, BigDecimal.ONE, "reason", null, null, null, null, null));

        verify(adjustmentUnitService).assertManualAdjustable(unit, "lost");
    }

    @Test
    void create_foundRestore_validatesRestorableAndSealedBox() {
        var unit = unit(5L, ProductUnitStatus.LOST);
        when(securityPolicy.requireAuthenticated()).thenReturn(1L);
        when(productUnitRepository.findById(5L)).thenReturn(Optional.of(unit));
        when(adjustmentRepository.existsByProductUnitIdAndStatus(5L, AdjustmentStatus.PENDING)).thenReturn(false);
        when(adjustmentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.create(new CreateStockAdjustmentRequest(
                "FOUND", 5L, null, null, "reason", null, null, null, null, null));

        verify(adjustmentUnitService).assertRestorable(unit);
        verify(adjustmentUnitService).assertNotInSealedBox(unit);
    }

    @Test
    void create_foundNew_blocksDuplicateSerial() {
        var product = new Product();
        product.setId(20L);
        var location = new Location();
        location.setId(7L);
        var existing = unit(9L, ProductUnitStatus.IN_STOCK);
        when(securityPolicy.requireAuthenticated()).thenReturn(1L);
        when(productRepository.findById(20L)).thenReturn(Optional.of(product));
        when(locationRepository.findById(7L)).thenReturn(Optional.of(location));
        when(productUnitRepository.findBySerialNumberIgnoreCase("ABC-123")).thenReturn(Optional.of(existing));

        InvalidRequestException ex = assertThrows(InvalidRequestException.class,
                () -> service.create(new CreateStockAdjustmentRequest(
                        "FOUND", null, 20L, null, "reason", null, null, null, "ABC-123", 7L)));

        assertEquals(true, ex.getMessage().contains("ABC-123"));
        verify(adjustmentRepository, never()).save(any());
    }

    @Test
    void create_foundNew_blocksMissingProduct() {
        when(securityPolicy.requireAuthenticated()).thenReturn(1L);
        when(productRepository.findById(20L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> service.create(new CreateStockAdjustmentRequest(
                        "FOUND", null, 20L, null, "reason", null, null, null, "ABC-123", 7L)));
        verify(adjustmentRepository, never()).save(any());
    }

    @Test
    void approve_bulkLost_appliesBulkQuantity() {
        var adj = pendingAdjustment(1L, "LOST", "MANUAL", 5L, BigDecimal.valueOf(100), 1L);
        var unit = ProductUnit.builder()
                .id(5L)
                .productId(20L)
                .trackingType("BULK")
                .status(ProductUnitStatus.IN_STOCK)
                .remainingQuantity(BigDecimal.valueOf(1000))
                .build();
        when(securityPolicy.requireAuthenticated()).thenReturn(2L);
        when(adjustmentRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(adj));
        when(productUnitRepository.findById(5L)).thenReturn(Optional.of(unit));
        when(adjustmentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.approve(1L, new ApproveAdjustmentRequest("ok"));

        verify(adjustmentUnitService).applyBulkQuantity(
                unit, SourceType.STOCK_ADJUSTMENT, AdjustmentType.LOST, BigDecimal.valueOf(100), 2L);
        verify(adjustmentUnitService, never()).applyLost(any(), any(), any(), any());
    }

    @Test
    void approve_checkSourcedRestore_passesStockCheckSource() {
        var adj = pendingAdjustment(1L, "FOUND", "STOCK_CHECK", 5L, BigDecimal.ONE, 1L);
        var unit = unit(5L, ProductUnitStatus.LOST);
        when(securityPolicy.requireAuthenticated()).thenReturn(2L);
        when(adjustmentRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(adj));
        when(productUnitRepository.findById(5L)).thenReturn(Optional.of(unit));
        when(adjustmentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.approve(1L, new ApproveAdjustmentRequest("ok"));

        verify(adjustmentUnitService).applyFoundRestore(5L, SourceType.STOCK_CHECK, 1L, 2L);
    }
}
