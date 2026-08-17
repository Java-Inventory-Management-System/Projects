package org.dawn.backend.service.inventory.returns;

import org.dawn.backend.config.security.SecurityPolicy;
import org.dawn.backend.constant.enums.inventory.ProductUnitStatus;
import org.dawn.backend.constant.enums.inventory.exports.ExportReceiptStatus;
import org.dawn.backend.constant.enums.inventory.returns.ReturnCondition;
import org.dawn.backend.constant.enums.inventory.returns.ReturnReceiptStatus;
import org.dawn.backend.controller.inventory.request.WarrantyExchangeRequest;
import org.dawn.backend.entity.catalog.DefectCategory;
import org.dawn.backend.entity.catalog.Product;
import org.dawn.backend.entity.inventory.ExportReceipt;
import org.dawn.backend.entity.inventory.ExportReceiptItemUnit;
import org.dawn.backend.entity.inventory.ProductUnit;
import org.dawn.backend.entity.inventory.ReturnReceipt;
import org.dawn.backend.entity.inventory.ReturnReceiptItem;
import org.dawn.backend.exception.type.InvalidRequestException;
import org.dawn.backend.repository.catalog.DefectCategoryRepository;
import org.dawn.backend.repository.catalog.ProductRepository;
import org.dawn.backend.repository.inventory.ProductUnitRepository;
import org.dawn.backend.repository.inventory.ProductUnitStatusLogRepository;
import org.dawn.backend.repository.inventory.returns.ReturnReceiptItemRepository;
import org.dawn.backend.repository.inventory.returns.ReturnReceiptRepository;
import org.dawn.backend.repository.inventory.exports.ExportReceiptItemRepository;
import org.dawn.backend.repository.inventory.exports.ExportReceiptItemUnitRepository;
import org.dawn.backend.repository.inventory.exports.ExportReceiptRepository;
import org.dawn.backend.repository.inventory.exports.ExportReceiptStatusHistoryRepository;
import org.dawn.backend.shared.util.ReceiptCodeGenerator;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WarrantyExchangeServiceTests {

    private static final long RETURN_RECEIPT_ID = 1L;
    private static final long ORIGINAL_EXPORT_ID = 2L;
    private static final long ORIGINAL_UNIT_ID = 3L;
    private static final long REPLACEMENT_UNIT_ID = 4L;
    private static final long DEFECT_ID = 99L;
    private static final long USER_ID = 10L;

    @Mock private ReturnReceiptRepository returnReceiptRepository;
    @Mock private ReturnReceiptItemRepository returnReceiptItemRepository;
    @Mock private DefectCategoryRepository defectCategoryRepository;
    @Mock private ProductUnitRepository productUnitRepository;
    @Mock private ProductUnitStatusLogRepository statusLogRepository;
    @Mock private ProductRepository productRepository;
    @Mock private ExportReceiptRepository exportReceiptRepository;
    @Mock private ExportReceiptItemRepository exportReceiptItemRepository;
    @Mock private ExportReceiptItemUnitRepository exportReceiptItemUnitRepository;
    @Mock private ExportReceiptStatusHistoryRepository exportReceiptStatusHistoryRepository;
    @Mock private SecurityPolicy securityPolicy;

    @InjectMocks private WarrantyExchangeService warrantyExchangeService;

    private Instant future() {
        return Instant.now().plusSeconds(365L * 86400L);
    }

    private ReturnReceiptItem stubDefectiveItem() {
        var item = mock(ReturnReceiptItem.class);
        when(item.getCondition()).thenReturn(ReturnCondition.DEFECTIVE.name());
        when(item.getDefectCategoryId()).thenReturn(DEFECT_ID);
        when(item.getProductUnitId()).thenReturn(ORIGINAL_UNIT_ID);
        return item;
    }

    private void stubCommon(ReturnReceipt receipt, ReturnReceiptItem item, DefectCategory defect,
                            ProductUnit originalUnit, ProductUnit replacement, Product product) {
        when(returnReceiptRepository.findById(RETURN_RECEIPT_ID)).thenReturn(Optional.of(receipt));
        when(returnReceiptItemRepository.findByReturnReceiptId(RETURN_RECEIPT_ID)).thenReturn(List.of(item));
        when(defectCategoryRepository.findById(DEFECT_ID)).thenReturn(Optional.ofNullable(defect));
        when(productUnitRepository.findById(ORIGINAL_UNIT_ID)).thenReturn(Optional.of(originalUnit));
        when(productUnitRepository.findByIdInWithLock(anyList())).thenReturn(List.of(replacement));
        when(productRepository.findById(20L)).thenReturn(Optional.of(product));
        when(securityPolicy.requireAuthenticated()).thenReturn(USER_ID);
    }

    @Test
    void exchange_success_chargesPriceDiffAndCopiesWarranty() {
        var receipt = mock(ReturnReceipt.class);
        when(receipt.getStatus()).thenReturn(ReturnReceiptStatus.PENDING_APPROVAL);
        when(receipt.getId()).thenReturn(RETURN_RECEIPT_ID);
        when(receipt.getOriginalExportReceiptId()).thenReturn(ORIGINAL_EXPORT_ID);
        var item = stubDefectiveItem();

        var defect = mock(DefectCategory.class);
        when(defect.getIsReplaceable()).thenReturn(true);

        var originalUnit = mock(ProductUnit.class);
        when(originalUnit.getId()).thenReturn(ORIGINAL_UNIT_ID);
        when(originalUnit.getWarrantyExpiresAt()).thenReturn(future());
        Instant inheritedStart = Instant.parse("2025-01-01T00:00:00Z");
        when(originalUnit.getWarrantyStartDate()).thenReturn(inheritedStart);

        var replacement = mock(ProductUnit.class);
        when(replacement.getId()).thenReturn(REPLACEMENT_UNIT_ID);
        when(replacement.getStatus()).thenReturn(ProductUnitStatus.IN_STOCK);
        when(replacement.getBoxId()).thenReturn(null);
        when(replacement.getProductId()).thenReturn(20L);
        when(replacement.getWarrantyMonths()).thenReturn(null);
        when(replacement.getSerialNumber()).thenReturn("SN-REPL-1");

        var product = mock(Product.class);
        when(product.getId()).thenReturn(20L);
        when(product.getSellPrice()).thenReturn(new BigDecimal("15000000"));

        var originalSale = mock(ExportReceiptItemUnit.class);
        when(originalSale.getSellPrice()).thenReturn(new BigDecimal("10000000"));
        when(exportReceiptItemUnitRepository.findByProductUnitId(ORIGINAL_UNIT_ID))
                .thenReturn(List.of(originalSale));

        var originalExport = mock(ExportReceipt.class);
        when(originalExport.getCustomerId()).thenReturn(77L);
        when(exportReceiptRepository.findById(ORIGINAL_EXPORT_ID)).thenReturn(Optional.of(originalExport));
        when(exportReceiptRepository.existsBySourceReturnReceiptId(RETURN_RECEIPT_ID)).thenReturn(false);
        when(exportReceiptRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(exportReceiptItemRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        stubCommon(receipt, item, defect, originalUnit, replacement, product);

        try (MockedStatic<ReceiptCodeGenerator> gen = mockStatic(ReceiptCodeGenerator.class)) {
            gen.when(() -> ReceiptCodeGenerator.generate(eq("EXP-"), any())).thenReturn("EXP-EXCH-1");

            var response = warrantyExchangeService.exchange(RETURN_RECEIPT_ID,
                    new WarrantyExchangeRequest(REPLACEMENT_UNIT_ID, new BigDecimal("1000000"), null));

            assertEquals(new BigDecimal("4000000"), response.chargeAmount());
            assertEquals("SN-REPL-1", response.replacementSerial());
            verify(replacement).setStatus(ProductUnitStatus.EXPORTED);
            verify(replacement).setWarrantyStartDate(inheritedStart);
            verify(replacement).setWarrantyExpiresAt(originalUnit.getWarrantyExpiresAt());
            verify(exportReceiptRepository).save(any());
            verify(exportReceiptItemRepository).save(any());
            verify(exportReceiptItemUnitRepository).save(any());
            verify(statusLogRepository).save(any());
        }
    }

    @Test
    void exchange_fail_alreadyPerformed() {
        var receipt = mock(ReturnReceipt.class);
        when(receipt.getStatus()).thenReturn(ReturnReceiptStatus.PENDING_APPROVAL);
        when(returnReceiptRepository.findById(RETURN_RECEIPT_ID)).thenReturn(Optional.of(receipt));
        when(exportReceiptRepository.existsBySourceReturnReceiptId(RETURN_RECEIPT_ID)).thenReturn(true);

        assertThrows(InvalidRequestException.class, () -> warrantyExchangeService.exchange(RETURN_RECEIPT_ID,
                new WarrantyExchangeRequest(REPLACEMENT_UNIT_ID, null, null)));
    }

    @Test
    void exchange_fail_cancelledReceipt() {
        var receipt = mock(ReturnReceipt.class);
        when(receipt.getStatus()).thenReturn(ReturnReceiptStatus.CANCELLED);
        when(returnReceiptRepository.findById(RETURN_RECEIPT_ID)).thenReturn(Optional.of(receipt));

        assertThrows(InvalidRequestException.class, () -> warrantyExchangeService.exchange(RETURN_RECEIPT_ID,
                new WarrantyExchangeRequest(REPLACEMENT_UNIT_ID, null, null)));
    }

    @Test
    void exchange_fail_defectNotReplaceable() {
        var receipt = mock(ReturnReceipt.class);
        when(receipt.getStatus()).thenReturn(ReturnReceiptStatus.PENDING_APPROVAL);
        var item = mock(ReturnReceiptItem.class);
        when(item.getCondition()).thenReturn(ReturnCondition.DEFECTIVE.name());
        when(item.getDefectCategoryId()).thenReturn(DEFECT_ID);
        var defect = mock(DefectCategory.class);
        when(defect.getIsReplaceable()).thenReturn(false);
        when(returnReceiptRepository.findById(RETURN_RECEIPT_ID)).thenReturn(Optional.of(receipt));
        when(receipt.getId()).thenReturn(RETURN_RECEIPT_ID);
        when(returnReceiptItemRepository.findByReturnReceiptId(RETURN_RECEIPT_ID)).thenReturn(List.of(item));
        when(defectCategoryRepository.findById(DEFECT_ID)).thenReturn(Optional.of(defect));
        when(exportReceiptRepository.existsBySourceReturnReceiptId(RETURN_RECEIPT_ID)).thenReturn(false);

        assertThrows(InvalidRequestException.class, () -> warrantyExchangeService.exchange(RETURN_RECEIPT_ID,
                new WarrantyExchangeRequest(REPLACEMENT_UNIT_ID, null, null)));
    }

    @Test
    void exchange_fail_warrantyExpired() {
        var receipt = mock(ReturnReceipt.class);
        when(receipt.getStatus()).thenReturn(ReturnReceiptStatus.PENDING_APPROVAL);
        var item = stubDefectiveItem();
        var defect = mock(DefectCategory.class);
        when(defect.getIsReplaceable()).thenReturn(true);
        var originalUnit = mock(ProductUnit.class);
        when(originalUnit.getWarrantyExpiresAt()).thenReturn(Instant.now().minusSeconds(60));
        when(returnReceiptRepository.findById(RETURN_RECEIPT_ID)).thenReturn(Optional.of(receipt));
        when(receipt.getId()).thenReturn(RETURN_RECEIPT_ID);
        when(returnReceiptItemRepository.findByReturnReceiptId(RETURN_RECEIPT_ID)).thenReturn(List.of(item));
        when(defectCategoryRepository.findById(DEFECT_ID)).thenReturn(Optional.of(defect));
        when(productUnitRepository.findById(ORIGINAL_UNIT_ID)).thenReturn(Optional.of(originalUnit));
        when(exportReceiptRepository.existsBySourceReturnReceiptId(RETURN_RECEIPT_ID)).thenReturn(false);

        assertThrows(InvalidRequestException.class, () -> warrantyExchangeService.exchange(RETURN_RECEIPT_ID,
                new WarrantyExchangeRequest(REPLACEMENT_UNIT_ID, null, null)));
    }

    @Test
    void exchange_fail_replacementNotAvailableWhenBoxed() {
        var receipt = mock(ReturnReceipt.class);
        when(receipt.getStatus()).thenReturn(ReturnReceiptStatus.PENDING_APPROVAL);
        var item = stubDefectiveItem();
        var defect = mock(DefectCategory.class);
        when(defect.getIsReplaceable()).thenReturn(true);
        var originalUnit = mock(ProductUnit.class);
        when(originalUnit.getWarrantyExpiresAt()).thenReturn(future());
        var replacement = mock(ProductUnit.class);
        when(replacement.getId()).thenReturn(REPLACEMENT_UNIT_ID);
        when(replacement.getStatus()).thenReturn(ProductUnitStatus.IN_STOCK);
        when(replacement.getBoxId()).thenReturn(5L);
        when(returnReceiptRepository.findById(RETURN_RECEIPT_ID)).thenReturn(Optional.of(receipt));
        when(receipt.getId()).thenReturn(RETURN_RECEIPT_ID);
        when(returnReceiptItemRepository.findByReturnReceiptId(RETURN_RECEIPT_ID)).thenReturn(List.of(item));
        when(defectCategoryRepository.findById(DEFECT_ID)).thenReturn(Optional.of(defect));
        when(productUnitRepository.findById(ORIGINAL_UNIT_ID)).thenReturn(Optional.of(originalUnit));
        when(productUnitRepository.findByIdInWithLock(anyList())).thenReturn(List.of(replacement));
        when(exportReceiptRepository.existsBySourceReturnReceiptId(RETURN_RECEIPT_ID)).thenReturn(false);

        assertThrows(InvalidRequestException.class, () -> warrantyExchangeService.exchange(RETURN_RECEIPT_ID,
                new WarrantyExchangeRequest(REPLACEMENT_UNIT_ID, null, null)));
    }

    @Test
    void exchange_fail_discountNegative() {
        var receipt = mock(ReturnReceipt.class);
        when(receipt.getStatus()).thenReturn(ReturnReceiptStatus.PENDING_APPROVAL);
        when(returnReceiptRepository.findById(RETURN_RECEIPT_ID)).thenReturn(Optional.of(receipt));
        when(exportReceiptRepository.existsBySourceReturnReceiptId(RETURN_RECEIPT_ID)).thenReturn(false);

        assertThrows(InvalidRequestException.class, () -> warrantyExchangeService.exchange(RETURN_RECEIPT_ID,
                new WarrantyExchangeRequest(REPLACEMENT_UNIT_ID, new BigDecimal("-1"), null)));
    }

    @Test
    void info_returnsReplaceableStatus() {
        var receipt = mock(ReturnReceipt.class);
        var item = stubDefectiveItem();
        when(item.getProductId()).thenReturn(20L);
        var defect = mock(DefectCategory.class);
        when(defect.getName()).thenReturn("Hỏng màn hình");
        when(defect.getIsReplaceable()).thenReturn(true);
        var originalUnit = mock(ProductUnit.class);
        when(originalUnit.getId()).thenReturn(ORIGINAL_UNIT_ID);
        when(originalUnit.getSerialNumber()).thenReturn("SN-OLD-1");
        when(originalUnit.getWarrantyExpiresAt()).thenReturn(future());
        var product = mock(Product.class);
        when(product.getName()).thenReturn("Laptop X");
        when(returnReceiptRepository.findById(RETURN_RECEIPT_ID)).thenReturn(Optional.of(receipt));
        when(receipt.getId()).thenReturn(RETURN_RECEIPT_ID);
        when(returnReceiptItemRepository.findByReturnReceiptId(RETURN_RECEIPT_ID)).thenReturn(List.of(item));
        when(defectCategoryRepository.findById(DEFECT_ID)).thenReturn(Optional.of(defect));
        when(productUnitRepository.findById(ORIGINAL_UNIT_ID)).thenReturn(Optional.of(originalUnit));
        when(productRepository.findById(20L)).thenReturn(Optional.of(product));
        when(exportReceiptItemUnitRepository.findByProductUnitId(ORIGINAL_UNIT_ID)).thenReturn(List.of());

        var info = warrantyExchangeService.info(RETURN_RECEIPT_ID);

        assertEquals("SN-OLD-1", info.serialNumber());
        assertEquals("Hỏng màn hình", info.defectName());
        assertEquals(true, info.replaceable());
        assertEquals(BigDecimal.ZERO, info.originalSellPrice());
    }
}