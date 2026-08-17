package org.dawn.backend.service.inventory;

import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.dawn.backend.controller.inventory.response.BoxResponse;
import org.dawn.backend.service.inventory.box.BoxService;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ReceiptPrintServiceFileTest {

    private final BoxService boxService = mock(BoxService.class);
    private final ReceiptPrintService svc =
            new ReceiptPrintService(null, null, null, null, null, null, boxService, new ExcelPrintService());

    @Test
    void boxPrintPdfProducesPdfBytes() {
        when(boxService.findOne(1L)).thenReturn(box());
        ReceiptPrintService.PrintFile f = svc.printBoxFile(1L, "vi", "pdf");
        assertEquals("application/pdf", f.contentType());
        assertTrue(f.filename().endsWith(".pdf"));
        assertTrue(f.bytes().length > 1000, "PDF quá nhỏ");
        assertArrayEquals(new byte[]{'%', 'P', 'D', 'F'}, Arrays.copyOf(f.bytes(), 4));
    }

    @Test
    void boxPrintExcelProducesReadableXlsx() throws Exception {
        when(boxService.findOne(1L)).thenReturn(box());
        ReceiptPrintService.PrintFile f = svc.printBoxFile(1L, "vi", "excel");
        assertEquals("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", f.contentType());
        assertArrayEquals(new byte[]{'P', 'K'}, Arrays.copyOf(f.bytes(), 2));
        try (XSSFWorkbook wb = new XSSFWorkbook(new ByteArrayInputStream(f.bytes()))) {
            assertEquals(1, wb.getNumberOfSheets());
            assertEquals("NHÃN HỘP", wb.getSheetAt(0).getSheetName());
            assertEquals("SN123", wb.getSheetAt(0).getRow(1).getCell(2).getStringCellValue());
        }
    }

    private BoxResponse box() {
        return BoxResponse.builder()
                .id(1L).boxCode("BOX-001").status("SEALED")
                .sealedQuantity(BigDecimal.ONE)
                .units(List.of(BoxResponse.BoxUnitResponse.builder()
                        .productUnitId(1L).serialNumber("SN123")
                        .productName("iPhone 15").productSku("IP15")
                        .quantity(BigDecimal.ONE).build()))
                .build();
    }
}