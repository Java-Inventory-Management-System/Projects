package org.dawn.backend.service.inventory;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

@Service
public class ExcelPrintService {

    public byte[] build(String sheetName, List<String> headers, List<List<String>> rows) {
        try (XSSFWorkbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet(sheetName == null ? "Phiếu" : sheetName);
            CellStyle headStyle = wb.createCellStyle();
            Font headFont = wb.createFont();
            headFont.setBold(true);
            headStyle.setFont(headFont);

            Row head = sheet.createRow(0);
            for (int i = 0; i < headers.size(); i++) {
                Cell c = head.createCell(i);
                c.setCellValue(headers.get(i));
                c.setCellStyle(headStyle);
            }
            int r = 1;
            for (List<String> row : rows) {
                Row xr = sheet.createRow(r++);
                for (int i = 0; i < row.size(); i++) {
                    String v = row.get(i);
                    if (v != null && !v.isBlank()) xr.createCell(i).setCellValue(v);
                }
            }
            for (int i = 0; i < headers.size(); i++) {
                sheet.autoSizeColumn(i);
            }
            wb.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException("Không thể tạo file Excel", e);
        }
    }
}