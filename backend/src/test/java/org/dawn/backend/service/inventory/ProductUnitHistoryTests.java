package org.dawn.backend.service.inventory;

import org.dawn.backend.controller.inventory.response.ProductUnitHistoryResponse;
import org.dawn.backend.entity.auth.User;
import org.dawn.backend.entity.inventory.ExportReceipt;
import org.dawn.backend.entity.inventory.ImportReceipt;
import org.dawn.backend.entity.inventory.ImportReceiptItem;
import org.dawn.backend.entity.inventory.ProductUnit;
import org.dawn.backend.entity.inventory.ProductUnitStatusLog;
import org.dawn.backend.repository.auth.UserRepository;
import org.dawn.backend.repository.catalog.ProductRepository;
import org.dawn.backend.repository.inventory.LocationRepository;
import org.dawn.backend.repository.inventory.ProductUnitRepository;
import org.dawn.backend.repository.inventory.ProductUnitStatusLogRepository;
import org.dawn.backend.repository.inventory.adjustments.StockAdjustmentRepository;
import org.dawn.backend.repository.inventory.exports.ExportReceiptRepository;
import org.dawn.backend.repository.inventory.imports.ImportReceiptItemRepository;
import org.dawn.backend.repository.inventory.imports.ImportReceiptRepository;
import org.dawn.backend.repository.inventory.returns.ReturnReceiptRepository;
import org.dawn.backend.repository.inventory.stockcheck.StockCheckRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProductUnitHistoryTests {

    @Mock ProductUnitRepository productUnitRepository;
    @Mock ProductRepository productRepository;
    @Mock LocationRepository locationRepository;
    @Mock ProductUnitStatusLogRepository statusLogRepository;
    @Mock ImportReceiptItemRepository importReceiptItemRepository;
    @Mock ImportReceiptRepository importReceiptRepository;
    @Mock ExportReceiptRepository exportReceiptRepository;
    @Mock StockCheckRepository stockCheckRepository;
    @Mock StockAdjustmentRepository stockAdjustmentRepository;
    @Mock ReturnReceiptRepository returnReceiptRepository;
    @Mock UserRepository userRepository;

    @InjectMocks ProductUnitService productUnitService;

    private ProductUnit unit(Long id, Long importReceiptItemId) {
        ProductUnit u = new ProductUnit();
        u.setId(id);
        u.setImportReceiptItemId(importReceiptItemId);
        u.setImportedAt(Instant.parse("2026-01-10T08:00:00Z"));
        return u;
    }

    private ProductUnitStatusLog log(Long id, String from, String to, String sourceType, Long sourceId, Long changedBy,
                                     Instant createdAt) {
        ProductUnitStatusLog l = new ProductUnitStatusLog();
        l.setId(id);
        l.setProductUnitId(1L);
        l.setFromStatus(from);
        l.setToStatus(to);
        l.setSourceType(sourceType);
        l.setSourceId(sourceId);
        l.setChangedBy(changedBy);
        l.setCreatedAt(createdAt);
        return l;
    }

    @Test
    void findHistory_returnsImportInfoAndEventsWithSourceCodesSortedDesc() {
        ProductUnit unit = unit(1L, 10L);
        when(productUnitRepository.findById(1L)).thenReturn(Optional.of(unit));

        ProductUnitStatusLog importLog = log(1L, null, "IN_STOCK", "IMPORT_RECEIPT", 5L, 1L,
                Instant.parse("2026-01-10T08:00:00Z"));
        ProductUnitStatusLog exportLog = log(2L, "IN_STOCK", "SOLD", "EXPORT_RECEIPT", 7L, 2L,
                Instant.parse("2026-03-05T10:00:00Z"));
        when(statusLogRepository.findByProductUnitIdOrderByCreatedAtDesc(1L))
                .thenReturn(List.of(exportLog, importLog));

        ImportReceiptItem item = new ImportReceiptItem();
        item.setId(10L);
        item.setReceiptId(5L);
        when(importReceiptItemRepository.findById(10L)).thenReturn(Optional.of(item));

        ImportReceipt receipt = new ImportReceipt();
        receipt.setId(5L);
        receipt.setReceiptCode("NH-00005");
        receipt.setCreatedAt(Instant.parse("2026-01-10T07:00:00Z"));
        when(importReceiptRepository.findById(5L)).thenReturn(Optional.of(receipt));
        when(importReceiptRepository.findAllById(List.of(5L))).thenReturn(List.of(receipt));

        ExportReceipt export = new ExportReceipt();
        export.setId(7L);
        export.setReceiptCode("XH-00007");
        when(exportReceiptRepository.findAllById(List.of(7L))).thenReturn(List.of(export));

        User u1 = new User();
        u1.setId(1L);
        u1.setFullName("Kho A");
        User u2 = new User();
        u2.setId(2L);
        u2.setFullName("Bán hàng");
        when(userRepository.findAllById(anyList())).thenReturn(List.of(u1, u2));

        ProductUnitHistoryResponse res = productUnitService.findHistory(1L);

        assertEquals("NH-00005", res.importInfo().receiptCode());
        assertEquals(Instant.parse("2026-01-10T08:00:00Z"), res.importInfo().importedAt());
        assertEquals(2, res.events().size());
        assertEquals("EXPORT_RECEIPT", res.events().get(0).sourceType());
        assertEquals("XH-00007", res.events().get(0).sourceCode());
        assertEquals("Bán hàng", res.events().get(0).changedByName());
        assertEquals("IMPORT_RECEIPT", res.events().get(1).sourceType());
        assertEquals("NH-00005", res.events().get(1).sourceCode());
    }

    @Test
    void findHistory_relocateEventHasNoSourceCodeAndNoImportInfo() {
        ProductUnit unit = unit(2L, null);
        when(productUnitRepository.findById(2L)).thenReturn(Optional.of(unit));

        ProductUnitStatusLog relocateLog = log(3L, "IN_STOCK", "IN_STOCK", "RELOCATE", 99L, 1L,
                Instant.parse("2026-02-01T09:00:00Z"));
        when(statusLogRepository.findByProductUnitIdOrderByCreatedAtDesc(2L)).thenReturn(List.of(relocateLog));

        User u1 = new User();
        u1.setId(1L);
        u1.setFullName("Kho A");
        when(userRepository.findAllById(List.of(1L))).thenReturn(List.of(u1));

        ProductUnitHistoryResponse res = productUnitService.findHistory(2L);

        assertNull(res.importInfo());
        assertEquals(1, res.events().size());
        assertEquals("RELOCATE", res.events().get(0).sourceType());
        assertNull(res.events().get(0).sourceCode());
        assertEquals("Kho A", res.events().get(0).changedByName());
    }
}