package org.dawn.backend.service.inventory;

import org.dawn.backend.constant.inventory.ProductUnitStatus;
import org.dawn.backend.constant.inventory.WarrantyRequestStatus;
import org.dawn.backend.controller.inventory.request.CompleteWarrantyRequest;
import org.dawn.backend.controller.inventory.request.CreateWarrantyRequest;
import org.dawn.backend.controller.inventory.request.ResolveWarrantyRequest;
import org.dawn.backend.entity.inventory.Customer;
import org.dawn.backend.entity.inventory.ExportReceipt;
import org.dawn.backend.entity.inventory.ExportReceiptItem;
import org.dawn.backend.entity.inventory.ProductUnit;
import org.dawn.backend.entity.inventory.WarrantyRequest;
import org.dawn.backend.repository.auth.UserRepository;
import org.dawn.backend.repository.catalog.ProductRepository;
import org.dawn.backend.repository.inventory.CustomerRepository;
import org.dawn.backend.repository.inventory.ExportReceiptItemRepository;
import org.dawn.backend.repository.inventory.ExportReceiptItemUnitRepository;
import org.dawn.backend.repository.inventory.ExportReceiptRepository;
import org.dawn.backend.repository.inventory.ProductUnitRepository;
import org.dawn.backend.repository.inventory.ProductUnitStatusLogRepository;
import org.dawn.backend.repository.inventory.WarrantyRequestRepository;
import org.dawn.backend.utils.SecurityUtils;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WarrantyRequestServiceTests {

    @Mock WarrantyRequestRepository warrantyRequestRepository;
    @Mock ProductUnitRepository productUnitRepository;
    @Mock ProductRepository productRepository;
    @Mock CustomerRepository customerRepository;
    @Mock UserRepository userRepository;
    @Mock ProductUnitStatusLogRepository statusLogRepository;
    @Mock ExportReceiptRepository exportReceiptRepository;
    @Mock ExportReceiptItemRepository exportReceiptItemRepository;
    @Mock ExportReceiptItemUnitRepository exportReceiptItemUnitRepository;

    @InjectMocks WarrantyRequestService warrantyRequestService;

    @Test
    void createAcceptsSoldUnitWithValidWarranty() {
        ProductUnit unit = soldUnit(1L, "SN-001", 10L);
        Customer customer = Customer.builder().id(5L).name("Customer").build();
        when(productUnitRepository.findBySerialNumberIgnoreCase("SN-001")).thenReturn(Optional.of(unit));
        when(customerRepository.findById(5L)).thenReturn(Optional.of(customer));
        when(warrantyRequestRepository.save(any(WarrantyRequest.class))).thenAnswer(invocation -> {
            WarrantyRequest saved = invocation.getArgument(0);
            saved.setId(100L);
            return saved;
        });
        when(productUnitRepository.findById(1L)).thenReturn(Optional.of(unit));

        try (MockedStatic<SecurityUtils> security = mockStatic(SecurityUtils.class)) {
            security.when(SecurityUtils::getCurrentUserId).thenReturn(9L);

            var response = warrantyRequestService.create(
                    new CreateWarrantyRequest("SN-001", 5L, "No display", null, false));

            assertEquals(100L, response.id());
            assertEquals(WarrantyRequestStatus.PENDING.name(), response.status());
            assertEquals(1L, response.productUnitId());
            verify(warrantyRequestRepository).existsByProductUnitIdAndStatus(
                    1L, WarrantyRequestStatus.PENDING);
        }
    }

    @Test
    void replaceCompletesRequestAndInheritsOriginalExpiry() {
        Instant originalExpiry = Instant.now().plusSeconds(30L * 24 * 60 * 60);
        ProductUnit original = soldUnit(1L, "OLD-001", 10L);
        original.setWarrantyExpiresAt(originalExpiry);
        ProductUnit replacement = ProductUnit.builder()
                .id(2L)
                .serialNumber("NEW-001")
                .productId(10L)
                .trackingType("SERIALIZED")
                .status(ProductUnitStatus.IN_STOCK)
                .importedAt(Instant.now())
                .build();
        WarrantyRequest warranty = WarrantyRequest.builder()
                .id(100L)
                .requestCode("WR-TEST")
                .productUnitId(1L)
                .status(WarrantyRequestStatus.PENDING)
                .issueDescription("Defective")
                .handledBy(8L)
                .build();

        when(warrantyRequestRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(warranty));
        when(productUnitRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(original));
        when(productUnitRepository.findByIdForUpdate(2L)).thenReturn(Optional.of(replacement));
        when(warrantyRequestRepository.save(any(WarrantyRequest.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(exportReceiptRepository.save(any(ExportReceipt.class))).thenAnswer(invocation -> {
            ExportReceipt receipt = invocation.getArgument(0);
            receipt.setId(200L);
            return receipt;
        });
        when(exportReceiptItemRepository.save(any(ExportReceiptItem.class))).thenAnswer(invocation -> {
            ExportReceiptItem item = invocation.getArgument(0);
            item.setId(300L);
            return item;
        });
        when(productUnitRepository.findById(1L)).thenReturn(Optional.of(original));
        when(productUnitRepository.findById(2L)).thenReturn(Optional.of(replacement));

        try (MockedStatic<SecurityUtils> security = mockStatic(SecurityUtils.class)) {
            security.when(SecurityUtils::getCurrentUserId).thenReturn(9L);

            var response = warrantyRequestService.resolve(100L,
                    new ResolveWarrantyRequest("replace", 2L, null, null, null, "Replaced"));

            assertEquals(ProductUnitStatus.DEFECTIVE, original.getStatus());
            assertEquals(ProductUnitStatus.SOLD, replacement.getStatus());
            assertEquals(originalExpiry, replacement.getWarrantyExpiresAt());
            assertNotNull(replacement.getWarrantyStartDate());
            assertEquals(WarrantyRequestStatus.COMPLETED.name(), response.status());
            assertEquals(2L, response.replacementUnitId());
            verify(statusLogRepository, times(2)).save(any());
            verify(exportReceiptRepository).save(any(ExportReceipt.class));
            verify(exportReceiptItemUnitRepository).save(any());
        }
    }

    @Test
    void completeRepairReturnsUnitToSold() {
        ProductUnit unit = soldUnit(1L, "SN-001", 10L);
        unit.setStatus(ProductUnitStatus.UNDER_REPAIR);
        WarrantyRequest warranty = WarrantyRequest.builder()
                .id(100L)
                .requestCode("WR-TEST")
                .productUnitId(1L)
                .resolutionType("REPAIR")
                .status(WarrantyRequestStatus.PENDING)
                .issueDescription("No display")
                .build();

        when(warrantyRequestRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(warranty));
        when(productUnitRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(unit));
        when(warrantyRequestRepository.save(any(WarrantyRequest.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(productUnitRepository.findById(1L)).thenReturn(Optional.of(unit));

        try (MockedStatic<SecurityUtils> security = mockStatic(SecurityUtils.class)) {
            security.when(SecurityUtils::getCurrentUserId).thenReturn(9L);

            var response = warrantyRequestService.complete(
                    100L, new CompleteWarrantyRequest("repaired", "Returned to customer"));

            assertEquals(ProductUnitStatus.SOLD, unit.getStatus());
            assertEquals(WarrantyRequestStatus.COMPLETED.name(), response.status());
            assertNotNull(response.completedAt());
            assertTrue(response.note().contains("Returned to customer"));
            verify(statusLogRepository).save(any());
        }
    }

    private ProductUnit soldUnit(Long id, String serial, Long productId) {
        return ProductUnit.builder()
                .id(id)
                .serialNumber(serial)
                .productId(productId)
                .trackingType("SERIALIZED")
                .status(ProductUnitStatus.SOLD)
                .importedAt(Instant.now().minusSeconds(60L * 24 * 60 * 60))
                .warrantyStartDate(Instant.now().minusSeconds(10L * 24 * 60 * 60))
                .warrantyExpiresAt(Instant.now().plusSeconds(300L * 24 * 60 * 60))
                .build();
    }
}
