# Rà soát lệch dữ liệu Frontend – Backend

> Tài liệu này so sánh danh sách trạng thái (enum/status) mà **màn hình** (frontend) đang hiểu so với **hệ thống** (backend) thực tế trả về. Khi hai bên lệch nhau, màn hình sẽ hiển thị nhãn sai, bộ lọc không ra kết quả, hoặc trạng thái "lạ" không ai nhận ra.
> Mức độ: 🔴 **Nghiêm trọng** = đang xảy ra trong vận hành · 🟠 **Nên xử lý** · 🟡 **Nhỏ**.
> Nguyên tắc sửa: backend là nguồn duy nhất (1 nguồn thật), frontend đồng bộ theo — không sửa ngược.
> Cập nhật: 2026-08-08 · Đối chiếu lại: 2026-08-09 (mục ✅ đã xử lý, 🟠 còn một phần) · Sửa lần cuối: 2026-08-09 (toàn bộ mục đã xử lý)

---

## 1. Đơn đặt hàng nhà cung cấp (PO)

1. ✅ **Trạng thái đơn đặt hàng mới — đã xử lý** — Hệ thống đổi: đơn tạo mới bắt đầu ở `OPEN`, màn hình còn dùng `DRAFT`.
   - Hệ thống (BE): `OPEN, PARTIAL, COMPLETED, CANCELLED`
   - Màn hình (FE): hằng số trạng thái đã có `OPEN`; type union `PurchaseOrderStatus` đã đổi `DRAFT` → `OPEN` (2026-08-09).

## 2. Trạng thái máy/hàng hóa (ProductUnit)

2. ✅ **Màn hình còn dùng trạng thái đã bỏ, thiếu trạng thái thật — đã xử lý** — Đã thêm `PENDING_QC`, `EXPORTED`; bỏ `QUARANTINED`, `WARRANTY`, `WARRANTY_DONE`, `WARRANTY_REPLACED` khỏi hằng số và type union (2026-08-09). `REMOVED` đã có sẵn ở cả FE lẫn BE.
   - Hệ thống (BE, hiện tại): `PENDING_QC, IN_STOCK, RESERVED, SOLD, EXPORTED, DEFECTIVE, DAMAGED_IN_STORAGE, LOST, REMOVED, DISPOSED, UNDER_REPAIR, SENT_TO_MANUFACTURER, RETURNED_TO_SUPPLIER, RETURN_QC_HOLD, WAITING_RMA_EXPORT, RMA_REPAIRED_RETURNED, RMA_UNREPAIRABLE, REJECTED_RETURN, PENDING_DISPOSAL` (+ `RETURNED` deprecated, đã ngừng gán)
   - Ghi chú: `RETURNED_TO_SUPPLIER` hiện tồn tại ở BE (dùng trong dispose-confirm trả NCC) — danh sách cũ trong tài liệu này ghi thiếu.

## 3. Phiếu kiểm kho

3. ✅ **Thiếu trạng thái "quá hạn" — đã xử lý** — Hệ thống có trạng thái `EXPIRED` (phiếu kiểm kho treo quá 1 ngày bị tự đóng), màn hình không nhận biết. Đã thêm `EXPIRED` vào type, hằng số, bộ lọc và nhãn hiển thị (2026-08-09).

## 4. Phiếu điều chỉnh tồn kho

4. ✅ **Thiếu trạng thái "đã hủy" — đã xử lý** — Hệ thống có `CANCELLED`, màn hình `ADJUSTMENT_STATUS` đã có sẵn `CANCELLED`.

## 5. Phiếu nhập kho

5. ✅ **Màn hình còn trạng thái cũ `PENDING` — đã xử lý** — Hệ thống chỉ dùng `DRAFT, PENDING_APPROVAL, COMPLETED, CANCELLED`; type union `ImportReceiptStatus` đã bỏ `PENDING` (2026-08-09).
   - Lưu ý: `DRAFT`/`PENDING_APPROVAL` ở màn hình và hệ thống là khớp nhau — chỉ `PENDING` là thừa.

## 6. Quyền hiển thị nút "xuất hàng" (fulfill) trên phiếu xuất

6. ✅ **Nút "xuất hàng" hiện cho quản trị viên nhưng hệ thống chặn — đã xử lý** — Màn hình chi tiết phiếu xuất (`view-export-modal.tsx`, `export-detail-page.tsx`) đã bỏ `ADMIN` khỏi điều kiện hiện nút — giờ khớp hệ thống: chỉ `STOCK, MANAGER` (2026-08-09).
   - Sửa ở đâu: màn hình — bỏ `ADMIN` khỏi điều kiện hiện nút (khớp hệ thống), hoặc nếu muốn quản trị viên được xuất hàng thì sửa ở hệ thống (xem `domain-gap-analysis.md` §13 câu hỏi phân quyền).

---

## Tóm tắt cần sửa

| # | Nơi lệch | Sửa ở đâu | Mức độ | Trạng thái |
|---|---|---|---|---|
| 1 | PO: FE type union còn `DRAFT`, thiếu `OPEN` | FE — type `PurchaseOrderStatus` theo hằng số | 🔴 | ✅ Đã xong |
| 2 | ProductUnit: FE thừa `QUARANTINED`, thiếu `REMOVED` | FE — bỏ QUARANTINED, thêm REMOVED | 🟠 | ✅ Đã xong |
| 3 | StockCheck: FE thiếu `EXPIRED` | FE — thêm `EXPIRED` | 🟡 | ✅ Đã xong |
| 4 | Adjustment: FE thiếu `CANCELLED` | FE — thêm `CANCELLED` | 🟡 | ✅ Đã xong |
| 5 | Import: FE thừa `PENDING` | FE — xóa `PENDING` | 🟡 | ✅ Đã xong |
| 6 | Fulfill: FE hiện nút cho ADMIN, BE chặn | FE (bỏ ADMIN) hoặc BE (xem §13) | 🟠 | ✅ Đã xong |
