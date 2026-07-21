# Bổ sung lần 2 — Rà soát cuối

> File này là bản rà soát cuối cùng, đối chiếu từng mục (1-28) của `08-inventory-analysis.md` để đảm bảo không còn sót. Đọc cùng 2 file trước, không thay thế.

---

## 1. Bug/gap còn sót từ `08-inventory-analysis.md`

| # | Vấn đề | Nguồn (mục trong 08) | Chi tiết |
|---|---|---|---|
| 1 | **Field mismatch `productId` vs `id`** — P0, latent type error | 21.1 | Backend `InventoryItemResponse` trả `productId` (không có `id`). Frontend `InventoryItem` khai báo `id: number`. Hiện tại `inventory-page.tsx` **không dùng `item.id`** nên chưa crash, nhưng là latent bug — nếu component nào đó access `item.id` sẽ undefined. Cần align (thêm `id` vào backend hoặc xóa khỏi FE type) |
| 2 | **Không validate supplier tồn tại khi tạo phiếu nhập** | 15.1 | `ImportReceiptService.createAndConfirm()` không check `supplier_id` có thật trong DB hay không |
| 3 | **Không sửa được phiếu nhập ở trạng thái `pending_approval`** | 15.1 | Khác Draft (chỉ lưu tạm chưa gửi duyệt) — đây là nhu cầu sửa số lượng/giá của phiếu ĐÃ gửi duyệt nhưng CHƯA được QL duyệt. Hiện chỉ có approve/cancel, không có update |
| 4 | **Partial PO import bị chặn ở UI dù backend đã hỗ trợ** | 15.1 | `updatePOProgress` đã handle `PARTIAL` status, nhưng form nhập từ PO ở UI không cho nhập 1 phần (VD PO 100, muốn nhập 60 trước) |
| 5 | **Thiếu endpoint `GET /export-receipt/{id}/units`** | 15.2 | Import có endpoint tương đương, export thì không — bất đối xứng API, gây khó khi cần hiển thị chi tiết units đã xuất |
| 6 | **Không có soft-delete cho phiếu nhập/xuất** | 15.3 | Cancel là cách duy nhất để "xóa" — nếu tạo nhầm phiếu hoàn toàn (chưa ai động vào), không có cách xóa sạch khỏi danh sách, phiếu cancelled vẫn tồn tại mãi trong list |
| 7 | **`export_receipts` thiếu `purchase_order_id`** | 15.3 | Import có link PO để trace nguồn gốc, export thì không — khi làm sales return (khách trả hàng), không link ngược được về PO gốc của lô hàng đó |
| 8 | **Không có notification/alert chủ động cho low-stock** | 2 | Hiện chỉ có endpoint report thụ động (`/report/low-stock`), người dùng phải tự vào xem. Thiếu `@Scheduled` job + bảng `notifications` để báo chủ động khi tồn dưới `min_stock` |
| 9 | **Cần tách `SellPriceHistory` khỏi `price_adjustments`** | 12 | `price_adjustments` (đã có trong code) là flow CÓ DUYỆT dành cho giá vốn nhập. Đổi giá bán (`sell_price`) là hành động thường xuyên, không cần duyệt, nhưng vẫn cần audit trail thụ động riêng (ai đổi, lúc nào, giá cũ→mới) — nếu dùng chung `price_adjustments` sẽ ép giá bán phải qua duyệt không cần thiết |
| 10 | **Customer deduplication** | 14 | Không có unique constraint `phone`/`email`, không check trùng khi tạo mới, chỉ search theo tên → dễ tạo trùng khách hàng, sai lệch báo cáo sales-by-customer |
| 11 | **Batch operations cho xuất kho còn thiếu** | 8 | Export chỉ add từng sản phẩm một (single Select, import đã có multi-select), không có bulk approve/cancel nhiều phiếu, không có Excel upload cho export (import đã có) |
| 12 | **Barcode/RFID hoàn toàn chưa có** | 13 | Không có barcode generation (EAN-13/Code128), không scanning, `ProductUnit` không có field barcode riêng — ảnh hưởng trực tiếp tốc độ nhập serial/kiểm kê thủ công |

---

## 2. Mâu thuẫn mới phát hiện — quan trọng hơn các bug ở trên

**Thời điểm kích hoạt bảo hành: `08` tự mâu thuẫn với domain-model gốc**

- Domain-model gốc (`01/02`): `warranty_start_date` được kích hoạt lúc XUẤT/bán — "nếu `reason=sale` → set `warranty_start_date` = ngày duyệt xuất". Đây là quyết định nghiệp vụ rõ ràng: BH tính từ lúc khách nhận hàng, không phải lúc hàng về kho.
- `08` mục 28.2 lại tự đề xuất: set `warrantyStartDate = importDate` lúc NHẬP kho, với lý do "không thể biết BH bắt đầu từ khi nào nếu chỉ nhập mà chưa xuất".

→ Đây là 2 triết lý nghiệp vụ khác nhau, không phải chỉ thiếu 1 field kỹ thuật. Nếu làm theo `08`, một sản phẩm nằm kho 6 tháng chưa bán sẽ mất 6 tháng bảo hành "oan" trước khi đến tay khách — sai với cách vận hành BH thông thường của ngành bán lẻ. **Khuyến nghị giữ đúng domain-model gốc** (kích hoạt lúc bán). Lưu ý: `warrantyMonths` (thời hạn, không phải ngày bắt đầu) **đã được copy** sang `ProductUnit` lúc nhập ở code hiện tại (xem `ImportReceiptService.java:165,181,223` và `ImportReceiptMappingHelper.java:44`) — giữ nguyên, không cần sửa.

---

## 3. Xác nhận phạm vi — các mục ĐÃ ĐƯỢC LOẠI CÓ CHỦ ĐÍCH

Các mục sau trong `08-inventory-analysis.md` bị bỏ qua có chủ đích vì không thuộc phạm vi "flow nghiệp vụ nhập/xuất/kiểm kê/điều chỉnh giá" mà nằm ở tầng hạ tầng/kỹ thuật thuần túy:

- **Mục 1** (Multi-warehouse), **9** (Stock transfer), **11** (Multi-currency) — kiến trúc lớn, phụ thuộc quyết định có >1 kho hay không
- **Mục 10** (Reports/Analytics nâng cao: turnover, ABC analysis) — thuộc báo cáo, không phải flow giao dịch
- **Mục 20** (Frontend issues: staleTime, token refresh queue) — kỹ thuật frontend thuần túy
- **Mục 22** (Configuration/DevOps: hardcoded credentials, .env committed) — hạ tầng, không phải nghiệp vụ
- **Mục 23** (Testing coverage) — quy trình phát triển, không phải nghiệp vụ
- **Mục 26** (Migration numbering gaps) — vận hành DB thuần túy
- **Mục 27.1** (Audit log dùng reflection lấy ID) — chi tiết implementation nội bộ

Đây là điểm dừng cuối cùng sau khi đối chiếu đầy đủ cả 28 mục của `08` với 3 file đã tạo.
