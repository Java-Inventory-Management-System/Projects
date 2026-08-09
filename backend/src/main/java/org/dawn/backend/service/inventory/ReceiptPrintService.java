package org.dawn.backend.service.inventory;

import lombok.RequiredArgsConstructor;
import org.dawn.backend.controller.inventory.response.ExportReceiptResponse;
import org.dawn.backend.controller.inventory.response.ImportReceiptResponse;
import org.dawn.backend.controller.inventory.response.PurchaseOrderResponse;
import org.dawn.backend.controller.inventory.response.ReturnReceiptResponse;
import org.dawn.backend.controller.inventory.response.StockCheckResponse;
import org.dawn.backend.controller.inventory.response.BoxResponse;
import org.dawn.backend.entity.inventory.ExportReceipt;
import org.dawn.backend.service.inventory.box.BoxService;
import org.dawn.backend.service.inventory.exports.ExportReceiptService;
import org.dawn.backend.service.inventory.imports.ImportReceiptService;
import org.dawn.backend.service.inventory.returns.ReturnReceiptService;
import org.dawn.backend.service.inventory.stockcheck.StockCheckService;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.text.DecimalFormat;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ReceiptPrintService {

    private final ImportReceiptService importReceiptService;
    private final ExportReceiptService exportReceiptService;
    private final org.dawn.backend.repository.inventory.exports.ExportReceiptRepository exportReceiptRepository;
    private final ReturnReceiptService returnReceiptService;
    private final PurchaseOrderService purchaseOrderService;
    private final StockCheckService stockCheckService;
    private final BoxService boxService;

    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter DT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm").withZone(ZONE);
    private static final DateTimeFormatter D = DateTimeFormatter.ofPattern("dd/MM/yyyy").withZone(ZONE);
    private static final DecimalFormat NUM = new DecimalFormat("#,##0.##");

    private static final Map<String, String> STATUS_VI = Map.ofEntries(
            Map.entry("DRAFT", "NHÁP"),
            Map.entry("PENDING", "CHỜ DUYỆT"),
            Map.entry("PENDING_APPROVAL", "CHỜ DUYỆT"),
            Map.entry("APPROVED", "ĐÃ DUYỆT"),
            Map.entry("COMPLETED", "HOÀN THÀNH"),
            Map.entry("CANCELLED", "ĐÃ HUỶ"),
            Map.entry("OPEN", "MỞ"),
            Map.entry("PARTIAL", "NHẬN MỘT PHẦN"),
            Map.entry("IN_PROGRESS", "ĐANG KIỂM KÊ"),
            Map.entry("EXPIRED", "HẾT HẠN"),
            Map.entry("REJECTED", "TỪ CHỐI"),
            Map.entry("SEALED", "ĐÃ ĐÓNG"),
            Map.entry("UNSEALED", "ĐÃ MỞ"),
            Map.entry("IN_STOCK", "Có hàng"),
            Map.entry("MISSING", "Thiếu"),
            Map.entry("UNEXPECTED", "Dư"),
            Map.entry("GOOD", "Tốt"),
            Map.entry("DEFECTIVE", "Lỗi"),
            Map.entry("LOST", "Mất"),
            Map.entry("DAMAGED_IN_STORAGE", "Hư trong kho"),
            Map.entry("PENDING_QC", "Chờ kiểm"),
            Map.entry("DISPOSED", "Đã hủy"),
            Map.entry("RETURNED_TO_SUPPLIER", "Đã trả NCC"));
    private static final Map<String, String> STATUS_EN = Map.ofEntries(
            Map.entry("DRAFT", "Draft"),
            Map.entry("PENDING", "Pending"),
            Map.entry("PENDING_APPROVAL", "Pending Approval"),
            Map.entry("APPROVED", "Approved"),
            Map.entry("COMPLETED", "Completed"),
            Map.entry("CANCELLED", "Cancelled"),
            Map.entry("OPEN", "Open"),
            Map.entry("PARTIAL", "Partially Received"),
            Map.entry("IN_PROGRESS", "In Progress"),
            Map.entry("EXPIRED", "Expired"),
            Map.entry("REJECTED", "Rejected"),
            Map.entry("SEALED", "SEALED"),
            Map.entry("UNSEALED", "UNSEALED"));

    private static final Map<String, String> DIFF_VI = Map.of(
            "MATCH", "Khớp", "MISSING", "Thiếu", "UNEXPECTED", "Dư", "PARTIAL_SHORTAGE", "Thiếu một phần");
    private static final Map<String, String> DIFF_EN = Map.of(
            "MATCH", "Match", "MISSING", "Missing", "UNEXPECTED", "Unexpected", "PARTIAL_SHORTAGE", "Partial shortage");

    private static final Map<String, String> COND_VI = Map.of("GOOD", "Tốt", "DEFECTIVE", "Lỗi");
    private static final Map<String, String> COND_EN = Map.of("GOOD", "Good", "DEFECTIVE", "Defective");

    private static final Map<String, String> ACTION_VI = Map.of(
            "RESTOCK", "Nhập lại kho", "SCRAP", "Hủy", "WARRANTY_TRANSFER", "Chuyển bảo hành", "REJECT", "Từ chối");
    private static final Map<String, String> ACTION_EN = Map.of(
            "RESTOCK", "Restock", "SCRAP", "Scrap", "WARRANTY_TRANSFER", "Warranty transfer", "REJECT", "Reject");

    private record L(String importTitle, String exportTitle, String returnTitle, String poTitle, String stockCheckTitle,
                     String boxTitle, String location, String unsealedBy, String date, String creator, String approver, String fulfilledBy, String supplier, String customer,
                     String poCode, String originExport, String reason, String externalRef, String expectedDate,
                     String product, String qty, String unitPrice, String subtotal, String warranty, String receivedQty,
                     String serial, String condition, String resultingAction, String expected, String actual, String difference,
                     String total, String note, String footer, String signCreator, String signStock, String signApprover,
                     String stockCheckSummary, String importReceipt, String boxType) {}

    private L labels(String lang) {
        boolean en = "en".equalsIgnoreCase(lang);
        return new L(
                en ? "IMPORT RECEIPT" : "PHIẾU NHẬP KHO",
                en ? "EXPORT RECEIPT" : "PHIẾU XUẤT KHO",
                en ? "RETURN RECEIPT" : "PHIẾU TRẢ HÀNG",
                en ? "PURCHASE ORDER" : "PHIẾU ĐẶT HÀNG (PO)",
                en ? "STOCK CHECK SHEET" : "PHIẾU KIỂM KÊ",
                en ? "BOX LABEL" : "NHÃN HỘP",
                en ? "Location" : "Vị trí",
                en ? "Unsealed by {0} at {1}" : "Mở hộp bởi {0} lúc {1}",
                en ? "Date" : "Ngày",
                en ? "Created by" : "Người lập",
                en ? "Approved by" : "Người duyệt",
                en ? "Fulfilled by" : "Người xuất",
                en ? "Supplier" : "Nhà cung cấp",
                en ? "Customer" : "Khách hàng",
                en ? "PO Code" : "Mã PO",
                en ? "Original export" : "Phiếu xuất gốc",
                en ? "Reason" : "Lý do",
                en ? "External reference" : "Tham chiếu ngoài",
                en ? "Expected date" : "Ngày nhận dự kiến",
                en ? "Product" : "Sản phẩm",
                en ? "Qty" : "Số lượng",
                en ? "Unit price" : "Đơn giá",
                en ? "Subtotal" : "Thành tiền",
                en ? "Warranty" : "Bảo hành",
                en ? "Received qty" : "SL đã nhận",
                en ? "Serial" : "Serial",
                en ? "Condition" : "Tình trạng",
                en ? "Result" : "Kết quả",
                en ? "Expected" : "Kỳ vọng",
                en ? "Actual" : "Thực tế",
                en ? "Difference" : "Lệch",
                en ? "TOTAL" : "TỔNG CỘNG",
                en ? "Note" : "Ghi chú",
                en ? "Warehouse management system - printed at {0}" : "Hệ thống quản lý kho - in lúc {0}",
                en ? "Prepared by" : "Người lập phiếu",
                en ? "Stock keeper" : "Thủ kho",
                en ? "Approved by" : "Người duyệt",
                 en ? "Items: {0} | Match: {1} | Missing: {2} | Unexpected: {3} | Auto-filled: {4}" : "Mục: {0} | Khớp: {1} | Thiếu: {2} | Dư: {3} | Tự điền: {4}",
                 en ? "Import receipt" : "Đơn nhập",
                 en ? "Box type" : "Loại hộp");
    }

    public String printImport(Long id, String lang) {
        ImportReceiptResponse r = importReceiptService.findOne(id);
        L l = labels(lang);
        StringBuilder rows = new StringBuilder();
        int i = 1;
        for (var it : r.items()) {
            rows.append(tr(
                    num(i++),
                    esc(it.productName()) + sku(it.productSku()),
                    num(it.quantity()),
                    money(it.unitPrice()),
                    money(it.quantity().multiply(it.unitPrice() == null ? BigDecimal.ZERO : it.unitPrice())),
                    it.warrantyMonths() == null ? "-" : it.warrantyMonths() + " th"));
        }
        String meta = metaRow(l.date, fmt(r.createdAt()))
                + metaRow(l.creator, esc(r.createdByName()))
                + metaRow(l.approver, esc(r.approvedByName()))
                + metaRow(l.supplier, esc(r.supplierName()))
                + metaRow(l.poCode, esc(r.poCode()));
        return page(l, l.importTitle, r.receiptCode(), status(lang, r.status()), meta,
                th(l.product, l.qty, l.unitPrice, l.subtotal, l.warranty), rows.toString(),
                total(l, r.totalAmount()), esc(r.note()), null);
    }

    public String printExport(Long id, String lang) {
        ExportReceiptResponse r = exportReceiptService.findOne(id);
        L l = labels(lang);
        StringBuilder rows = new StringBuilder();
        int i = 1;
        for (var it : r.items()) {
            rows.append(tr(
                    num(i++),
                    esc(it.productName()) + sku(it.productSku()),
                    num(it.quantity()),
                    money(it.unitPrice()),
                    money(it.quantity().multiply(it.unitPrice() == null ? BigDecimal.ZERO : it.unitPrice()))));
        }
        String meta = metaRow(l.date, fmt(r.createdAt()))
                + metaRow(l.creator, esc(r.createdByName()))
                + metaRow(l.approver, esc(r.approvedByName()))
                + metaRow(l.fulfilledBy, esc(r.fulfilledByName()))
                + metaRow(l.customer, esc(r.customerName()))
                + metaRow(l.reason, esc(r.reason()))
                + metaRow(l.externalRef, esc(r.externalReference()));
        return page(l, l.exportTitle, r.receiptCode(), status(lang, r.status()), meta,
                th(l.product, l.qty, l.unitPrice, l.subtotal), rows.toString(),
                total(l, r.totalAmount()), esc(r.note()), null);
    }

    public String printReturn(Long id, String lang) {
        ReturnReceiptResponse r = returnReceiptService.findOne(id);
        L l = labels(lang);
        boolean en = "en".equalsIgnoreCase(lang);
        StringBuilder rows = new StringBuilder();
        int i = 1;
        for (var it : r.items()) {
            rows.append(tr(
                    num(i++),
                    esc(it.productName()) + sku(it.productSku()),
                    it.serialNumber() == null ? "-" : "<span class=\"mono\">" + esc(it.serialNumber()) + "</span>",
                    num(it.quantity()),
                    val(en ? COND_EN : COND_VI, it.condition()),
                    val(en ? ACTION_EN : ACTION_VI, it.resultingAction())));
        }
        String meta = metaRow(l.date, fmt(r.createdAt()))
                + metaRow(l.creator, esc(r.createdByName()))
                + metaRow(l.approver, esc(r.approvedByName()))
                + metaRow(l.customer, esc(r.customerName()))
                + metaRow(l.originExport, esc(r.originalExportReceiptId() == null ? "-"
                        : exportReceiptRepository.findById(r.originalExportReceiptId())
                                .map(ExportReceipt::getReceiptCode)
                                .orElse(String.valueOf(r.originalExportReceiptId()))))
                + metaRow(l.reason, esc(r.reason()));
        return page(l, l.returnTitle, r.receiptCode(), status(lang, r.status()), meta,
                th(l.product, l.serial, l.qty, l.condition, l.resultingAction), rows.toString(),
                null, esc(r.note()), null);
    }

    public String printPo(Long id, String lang) {
        PurchaseOrderResponse r = purchaseOrderService.findOne(id);
        L l = labels(lang);
        StringBuilder rows = new StringBuilder();
        int i = 1;
        for (var it : r.items()) {
            rows.append(tr(
                    num(i++),
                    esc(it.productName()) + sku(it.productSku()),
                    num(it.quantity()),
                    money(it.unitPrice()),
                    money(it.quantity().multiply(it.unitPrice() == null ? BigDecimal.ZERO : it.unitPrice())),
                    num(it.receivedQuantity())));
        }
        String meta = metaRow(l.date, fmt(r.createdAt()))
                + metaRow(l.creator, esc(r.createdByName()))
                + metaRow(l.supplier, esc(r.supplierName()))
                + metaRow(l.expectedDate, r.expectedDate() == null ? "-" : D.format(r.expectedDate().atStartOfDay(ZONE).toInstant()));
        return page(l, l.poTitle, r.poCode(), status(lang, r.status()), meta,
                th(l.product, l.qty, l.unitPrice, l.subtotal, l.receivedQty), rows.toString(),
                total(l, r.totalAmount()), esc(r.note()), null);
    }

    public String printStockCheck(Long id, String lang) {
        StockCheckResponse r = stockCheckService.findOne(id);
        L l = labels(lang);
        boolean en = "en".equalsIgnoreCase(lang);
        StringBuilder rows = new StringBuilder();
        int i = 1;
        for (var it : r.items()) {
            rows.append(tr(
                    num(i++),
                    esc(it.productName()) + sku(it.productSku()),
                    it.serialNumber() == null ? "-" : "<span class=\"mono\">" + esc(it.serialNumber()) + "</span>",
                    it.expectedStatus() == null ? "-" : val(en ? STATUS_EN : STATUS_VI, it.expectedStatus()),
                    it.actualStatus() == null ? "-" : val(en ? STATUS_EN : STATUS_VI, it.actualStatus()),
                    val(en ? DIFF_EN : DIFF_VI, it.difference())));
        }
        String summary = "<div class=\"summary\">" + esc(fmtLabel(l.stockCheckSummary, r.totalItems(), r.matchCount(), r.missingCount(), r.unexpectedCount(), r.autoFilledCount())) + "</div>";
        String meta = metaRow(l.date, fmt(r.createdAt()))
                + metaRow(l.creator, esc(r.createdByName()))
                + metaRow(l.approver, esc(r.approvedByName()))
                + metaRow(l.note, esc(r.note()));
        return page(l, l.stockCheckTitle, r.checkCode(), status(lang, r.status()), meta,
                th(l.product, l.serial, l.expected, l.actual, l.difference), rows.toString(),
                null, summary, null);
    }

    public String printBox(Long id, String lang) {
        BoxResponse r = boxService.findOne(id);
        L l = labels(lang);
        StringBuilder rows = new StringBuilder();
        int i = 1;
        for (var u : r.units()) {
            rows.append(tr(
                    num(i++),
                    esc(u.productName()) + sku(u.productSku()),
                    u.serialNumber() == null ? "-" : "<span class=\"mono\">" + esc(u.serialNumber()) + "</span>",
                    num(u.quantity())));
        }
        String meta = metaRow(l.location, esc(r.locationCode()))
                + metaRow(l.qty, num(r.sealedQuantity()))
                + metaRow(l.date, fmt(r.sealedAt()))
                + metaRow(l.creator, esc(r.sealedByName()))
                + (r.importReceiptCode() == null ? "" : metaRow(l.importReceipt, esc(r.importReceiptCode())))
                + (r.boxType() == null ? "" : metaRow(l.boxType, esc(r.boxType())))
                + (r.note() == null || r.note().isBlank() ? "" : metaRow(l.note, esc(r.note())));
        String extra = r.unsealedAt() == null ? ""
                : "<div class=\"unsealed\">" + esc(fmtLabel(l.unsealedBy, r.unsealedByName(), fmt(r.unsealedAt()))) + "</div>";
        return labelPage(l.boxTitle, r.boxCode(), status(lang, r.status()), meta,
                th(l.product, l.serial, l.qty), rows.toString(), extra);
    }

    private String labelPage(String title, String code, String status, String meta, String head, String rows, String extra) {
        String extraHtml = extra == null ? "" : extra;
        return "<!DOCTYPE html>\n<html><head><meta charset=\"utf-8\"><title>" + esc(code) + "</title><style>"
                + LABEL_CSS
                + "</style></head><body>"
                + "<div class=\"label\">"
                + "<div class=\"ltitle\">" + esc(title) + "</div>"
                + "<div class=\"lcode\">" + esc(code) + "</div>"
                + "<div class=\"lstatus\">" + esc(status) + "</div>"
                + "<table class=\"meta\">" + meta + "</table>"
                + "<table class=\"items\"><thead>" + head + "</thead><tbody>" + rows + "</tbody></table>"
                + extraHtml
                + "</div>"
                + "<script>window.onload = function() { window.print() } <\\/script>"
                + "</body></html>";
    }

    // ---------- HTML helpers ----------

    private String page(L l, String title, String code, String status, String meta, String head, String rows, String total, String note, String extra) {
        String noteHtml = (note == null || note.isBlank()) ? "" : "<div class=\"note\"><strong>" + esc(l.note) + ":</strong> " + note + "</div>";
        String totalHtml = total == null ? "" : "<div class=\"total\">" + esc(l.total) + " " + total + "</div>";
        String signHtml = "<div class=\"sign\">"
                + signBox(l.signCreator) + signBox(l.signStock) + signBox(l.signApprover)
                + "</div>";
        String extraHtml = extra == null ? "" : extra;
        return "<!DOCTYPE html>\n<html><head><meta charset=\"utf-8\"><title>" + esc(code) + "</title><style>"
                + CSS
                + "</style></head><body>"
                + "<h1>" + esc(title) + "</h1>"
                + "<div class=\"code\">" + esc(code) + "</div>"
                + "<div class=\"status\">" + esc(status) + "</div>"
                + "<table class=\"meta\">" + meta + "</table>"
                + "<table class=\"items\"><thead>" + head + "</thead><tbody>" + rows + "</tbody></table>"
                + totalHtml
                + noteHtml
                + extraHtml
                + signHtml
                + "<div class=\"footer\">" + esc(fmtLabel(l.footer, DT.format(Instant.now()))) + "</div>"
                + "<script>window.onload = function() { window.print() } <\\/script>"
                + "</body></html>";
    }

    private static final String CSS = """
            @page { margin: 14mm }
            * { box-sizing: border-box }
            body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 12px; color: #111; margin: 0 }
            h1 { text-align: center; font-size: 16px; letter-spacing: 3px; margin: 0 0 4px }
            .code { text-align: center; font-size: 13px; font-weight: bold; margin-bottom: 4px }
            .status { text-align: center; font-size: 11px; font-weight: bold; color: #1d4ed8; letter-spacing: 2px; margin-bottom: 14px }
            .meta { width: 100%; border-collapse: collapse; margin-bottom: 14px }
            .meta td { padding: 2px 0; vertical-align: top }
            .meta td.k { width: 140px; color: #555 }
            table.items { width: 100%; border-collapse: collapse }
            table.items th { border-top: 2px solid #111; border-bottom: 1px solid #111; padding: 5px 6px; text-align: left; font-size: 11px }
            table.items td { padding: 4px 6px; border-bottom: 1px solid #ddd; vertical-align: top }
            table.items tbody tr:last-child td { border-bottom: none }
            .r { text-align: right !important }
            .sku { font-size: 10px; color: #666 }
            .mono { font-family: 'Courier New', monospace; font-size: 11px }
            .total { text-align: right; font-weight: bold; font-size: 14px; margin: 12px 0 }
            .summary { margin-top: 12px; padding: 8px 10px; border: 1px solid #999; font-weight: bold; font-size: 11px }
            .note { border-top: 1px solid #999; margin-top: 12px; padding-top: 8px; font-size: 11px }
            .sign { display: flex; justify-content: space-between; margin-top: 44px; gap: 24px }
            .sign .box { flex: 1; text-align: center; font-size: 11px }
            .sign .box .line { margin-top: 42px; border-top: 1px solid #111; padding-top: 4px }
            .footer { text-align: center; margin-top: 24px; font-size: 10px; color: #888 }
            """;

    private static final String LABEL_CSS = """
            @page { size: A4; margin: 10mm }
            * { box-sizing: border-box }
            body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 12px; color: #111; margin: 0 }
            .label { border: 2px solid #111; border-radius: 8px; padding: 18px 22px }
            .ltitle { text-align: center; font-size: 10px; letter-spacing: 4px; color: #555; margin-bottom: 2px }
            .lcode { text-align: center; font-size: 34px; font-weight: 800; letter-spacing: 2px; margin: 4px 0 6px }
            .lstatus { text-align: center; font-size: 12px; font-weight: bold; letter-spacing: 4px; padding: 4px 0; border-top: 1px solid #111; border-bottom: 1px solid #111; margin-bottom: 12px }
            .meta { width: 100%; border-collapse: collapse; margin-bottom: 12px }
            .meta td { padding: 2px 0; vertical-align: top }
            .meta td.k { width: 150px; color: #555 }
            .meta td.v { font-weight: 600 }
            table.items { width: 100%; border-collapse: collapse }
            table.items th { border-top: 1px solid #111; border-bottom: 1px solid #111; padding: 4px 6px; text-align: left; font-size: 10px }
            table.items td { padding: 3px 6px; border-bottom: 1px solid #ddd; vertical-align: top; font-size: 11px }
            table.items tbody tr:last-child td { border-bottom: none }
            .sku { font-size: 9px; color: #666 }
            .mono { font-family: 'Courier New', monospace; font-size: 11px }
            .unsealed { margin-top: 12px; padding: 6px 8px; border: 1px dashed #999; font-size: 11px; color: #333 }
            """;

    private String metaRow(String k, String v) {
        return "<tr><td class=\"k\">" + esc(k) + "</td><td>" + (v == null ? "" : v) + "</td></tr>";
    }

    private String th(String... cols) {
        StringBuilder sb = new StringBuilder("<tr>");
        for (int i = 0; i < cols.length; i++) {
            sb.append("<th>").append(esc(cols[i])).append("</th>");
        }
        return sb.append("</tr>").toString();
    }

    private String tr(String... cells) {
        StringBuilder sb = new StringBuilder("<tr>");
        for (int i = 0; i < cells.length; i++) {
            sb.append("<td").append(i > 0 && i < cells.length - 1 ? "" : "").append(">").append(cells[i]).append("</td>");
        }
        return sb.append("</tr>").toString();
    }

    private String sku(String sku) {
        return sku == null || sku.isBlank() ? "" : "<br/><span class=\"sku\">" + esc(sku) + "</span>";
    }

    private String signBox(String label) {
        return "<div class=\"box\"><div class=\"line\">" + esc(label) + "</div></div>";
    }

    private String total(L l, BigDecimal amount) {
        return amount == null ? "" : money(amount) + " ₫";
    }

    private String status(String lang, String status) {
        Map<String, String> map = "en".equalsIgnoreCase(lang) ? STATUS_EN : STATUS_VI;
        return map.getOrDefault(status == null ? "" : status, status == null ? "" : status);
    }

    private String val(Map<String, String> map, String key) {
        return key == null ? "-" : map.getOrDefault(key, key);
    }

    private String fmt(Instant t) {
        return t == null ? "-" : DT.format(t);
    }

    private String num(Object v) {
        return v == null ? "-" : "<span class=\"r\">" + NUM.format(v) + "</span>";
    }

    private String money(Object v) {
        return v == null ? "-" : "<span class=\"r\">" + NUM.format(v) + " ₫</span>";
    }

    private String fmtLabel(String template, Object... args) {
        String s = template;
        for (int i = 0; i < args.length; i++) {
            s = s.replace("{" + i + "}", String.valueOf(args[i]));
        }
        return s;
    }

    private String esc(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                .replace("\"", "&quot;").replace("'", "&#39;");
    }
}
