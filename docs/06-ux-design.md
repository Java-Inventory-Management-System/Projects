# UX Design

> Tổng hợp UX đề xuất cho các luồng core.

---

## 1. UX đề xuất cho 6 luồng core

### 1.1 Nhập kho — 2 phase, 2 role, 1 route

**Route:** `/stock/imports/:id?`
- `id` rỗng → **Phase 1 (Manager)**: Wizard 2 bước — tạo phiếu → `PENDING`
- `id` có → **Phase 2 (Stock)**: Wizard 2 bước — nhập serial+QC+location → submit → `PENDING_APPROVAL`

#### Phase 1 — Manager: `/stock/imports`

Wizard 2 bước: **Chọn NCC/PO → Thêm SP+SL**.

- Bước 1: Chọn NCC + PO (nếu có) + ngày + số chứng từ. Sidebar hiển thị sản phẩm nhập gần đây, hàng sắp hết.
- Bước 2: Chọn sản phẩm + `expectedQuantity` + `unitPrice` + `warrantyMonths`. Cảnh báo mềm nếu giá lệch >10% so với PO.
- Nút "Tạo phiếu" → POST → `PENDING`.
- Không có serial, QC, location ở phase này.
- `useBlocker` bảo vệ form, không block sau mutation success.

#### Phase 2 — Stock: `/stock/imports/:id`

Wizard 2 bước: **Nhập serial + QC & xác nhận**.

- Banner readonly hiển thị NCC, ngày, danh sách sản phẩm + `expectedQuantity` — Stock đối chiếu với hàng thực tế.
- Location picker cho từng sản phẩm: hiển thị `fullCode + productCount/maxCapacity`, zone gợi ý theo category. Location đầy vẫn chọn được + warning mềm.

**Bước 3 — Nhập serial:**
- ChipInput (Enter/Tab thêm chip, Paste tự động tách, Backspace xoá).
- Progress `receivedQuantity / expectedQuantity` màu neutral (không đỏ/xanh).
- KHÔNG giới hạn số lượng — Stock nhập thực tế (thiếu/dư so với dự kiến đều được).
- Paste/import preview: badge xanh (OK), đỏ (lỗi trùng) — tooltip lý do.
- Item 0 serial: checkbox "Không nhận được hàng" (NOT_RECEIVED) + text lý do optional.
- Nút phụ "Ghi chú sản phẩm ngoài dự kiến": textarea bắt buộc nếu phát hiện hàng lạ (discrepancyNotes).

**Bước 4 — QC & xác nhận:**
- Checklist per-serial toggle Pass/Fail, progress bar "X/Y đã kiểm".
- Fail: input lý do (required nếu chọn Fail).
- QC records tự động sync với serials Step 3: xoá serial ở Step 3 → QC record tương ứng biến mất.
- Ghi chú phiếu (textarea).
- Nút "Xác nhận" → PUT submit → `PENDING_APPROVAL`. Chỉ enable khi MỌI item có ≥1 serial hoặc NOT_RECEIVED.

**Chống mất dữ liệu:** `useBlocker` cho cả Phase 1 và Phase 2. Phase 1 không block sau mutation success. Phase 2 không block sau submit success.

**UX location detail** (bổ sung cho `LocationsMapPage`, tab 3 của `/stock/units`):

- **Bin detail** (khi nhấp vào 1 bin) hiện dạng:
  ```
  Sản phẩm  15/50 đơn vị     ← productCount / maxCapacity
                                50% — thanh progress bar
  Trạng thái  Đang hoạt động
  ```
- **Bin color theo % capacity** (thay vì hardcode threshold cũ):

  | % capacity | Label | Màu |
  |---|---|---|
  | 0% | Trống | blue-50 |
  | 1–49% | Ít | blue-100 |
  | 50–89% | Có hàng | blue-200 |
  | ≥90% | Đầy | blue-300 |

  Fallback khi `maxCapacity = null`: threshold cũ (0, 10, 50).

- **Filter theo capacity** trên `LocationsMapPage`:

  | Filter | Ý nghĩa |
  |---|---|
  | Còn trống | `productCount = 0` |
  | Còn chỗ | `productCount > 0 && < maxCapacity` |
  | Gần đầy | `productCount >= 80% maxCapacity` |
  | Đầy | `productCount >= maxCapacity` |

- **Khi nhập kho — chọn location**: LocationPicker hiển thị `fullCode + productCount/maxCapacity` cho từng bin/location; shelf/bin optional — nếu zone chỉ có location cấp zone (không chia shelf/bin), cho phép chọn dừng ở cấp zone, không bắt buộc phải chọn tới bin. Location đầy vẫn chọn được nhưng hiện warning mềm "Vị trí đã đầy, cân nhắc chọn vị trí khác" (khớp SOP §2.2 Phase 2 — cảnh báo mềm, không chặn).

- **Zoom shelf**: click vào shelf header trong 1 zone → view phóng to chỉ show shelf đó, hiển thị tất cả bins thuộc shelf kèm capacity details. Có nút "← Về tổng quan" để quay lại map toàn kho.

- **Lối đi giữa các zone**: khoảng trống giữa các zone card được render với màu nền xám nhạt + label (vd "LỐI ĐI"), tạo cảm giác mặt bằng kho thật. Cửa vào/ra đánh dấu bằng icon trước zone đầu tiên.

- **Kéo thả relocate (edit mode)**: khi bật edit mode (toggle "Quản lý vị trí"), NV có thể kéo 1 bin tile thả vào bin khác **trong cùng zone** → confirm dialog → BE gọi API relocate (ghi `source_type=RELOCATE`). Edit mode tắt → view-only: chỉ click xem detail, không kéo thả được.

### 1.2 Xuất kho

**Luồng mới — 3 phase:**

| Phase | Route | Người thực hiện | Mô tả |
|-------|-------|----------------|-------|
| Tạo | `/stock/exports/new` | NV/SALES | Tạo phiếu, chọn reason + items, auto FIFO, override serial → `PENDING_APPROVAL` |
| Xử lý xuất | `/stock/exports/:id/fulfill` | NV/SALES | Chọn serial thực tế (serialized) hoặc nhập số lượng (bulk) → `APPROVED` (nếu cần duyệt) → `COMPLETED` |
| Duyệt | `/stock/exports/:id/review` | QL/AD | Duyệt (approve / reject kèm lý do) phiếu đã fulfill |

**Chi tiết từng phase:**

**Tạo (`/stock/exports/new`):** Giữ nguyên UX cũ (reason picker, customer-select, serial picker FIFO + override).

**Xử lý xuất (`/stock/exports/:id/fulfill`):**
- NV đến kho lấy hàng thực tế, nhập serial từng unit (serialized) hoặc số lượng thực tế (bulk).
- Serialized: chip input hỗ trợ paste/import `.txt`/`.csv`, highlight trùng.
- Hiển thị rõ số lượng cần xuất vs. đã nhập, progress bar.
- Submit → gọi `PUT /export-receipt/{id}/fulfill`.

**Duyệt (`/stock/exports/:id/review`):**
- QL/AD kiểm tra đối chiếu serial/số lượng thực tế với phiếu.
- **Approve**: xác nhận → phiếu `COMPLETED`, unit chuyển trạng thái.
- **Reject**: popup nhập lý do từ chối (required) → phiếu `CANCELLED`, unit giải phóng về `IN_STOCK`.
- Hiển thị thông tin người fulfill (`fulfilledBy`/`fulfilledAt`) và người reject (`rejectedBy`/`rejectedAt`/`rejectReason`).

**Lưu ý:** UI cần hiện rõ trạng thái "đang giữ chỗ" của serial trong lúc phiếu ở `PENDING_APPROVAL`, để NV khác không nhầm là còn trống.

- Modal chọn/override serial hỗ trợ: paste nhiều dòng cùng lúc (multi-line), import file `.txt`/`.csv`, highlight các dòng trùng lặp, progress bar dạng "12/50 đã chọn" khi số lượng lớn.

### 1.3 Kiểm kê lệch

Trang `StockCheckDetail` nên hiện bảng lệch **nổi bật ngay đầu trang** (highlight đỏ cho `MISSING`, xanh cho `UNEXPECTED`) thay vì lẫn trong danh sách toàn bộ items match.

Thêm nút **"Tạo phiếu điều chỉnh (N)"** áp dụng batch cho tất cả item lệch cùng lúc, thay vì phải tạo từng cái một — quan trọng vì tài liệu hiện mô tả tạo "manual" từng item, sẽ rất chậm nếu kiểm kê phát hiện 30-40 lệch cùng lúc.

### 1.4 Trả hàng khách

- Bắt buộc chọn export gốc **trước** (autocomplete theo mã phiếu xuất hoặc serial), sau đó mới hiện được `reason` (`CHANGE_MIND` / `DEFECTIVE` / `WRONG_ITEM`) — tránh SALES chọn reason trước rồi mới tìm export gốc, dễ chọn sai.
- Nếu `reason=CHANGE_MIND`: hiện rõ số ngày còn lại trong hạn 7 ngày (đếm từ `export_receipt.approved_at`) — chỉ là guide, FE không tự disable submit. BE validate và trả lỗi nếu quá 7 ngày.
- Bước kiểm tra condition (STOCK): 2 lựa chọn `GOOD` / `DEFECTIVE`, nếu DEFECTIVE chọn `SCRAP`.

### 1.5 Điều chỉnh giá nhập (price_adjustments)

Form: chọn item nhập (import_receipt_item) → nhập giá mới + lý do bắt buộc → **hiện rõ "giá cũ → giá mới" side-by-side** trước khi submit → QL/Admin duyệt (theo SOP §8).

### 1.6 Sửa giá bán (sell_price) — không cần duyệt

Form: chọn sản phẩm → nhập sell_price mới + lý do (không bắt buộc) → UI hiện "giá cũ → giá mới" → **lưu ngay, không qua approval workflow**, chỉ ghi vào `sell_price_history`.

### 1.7 Quản lý danh mục (catalog) — brand, category, product

- **Ảnh đại diện**: Brand và Category có 1 ảnh đại diện (`image_url`). Dùng lại `ImageUpload` component (kéo thả / click chọn) ở create/edit dialog. Ảnh hiển thị dạng thumbnail tròn (brand) / vuông bo góc (category) bên cạnh tên trong list page và form.
- **Product**: giữ nguyên thiết kế cũ (gallery 5 ảnh, `is_primary`).

### 1.8 Audit log

- **Filters**: 5 filter nằm trên cùng 1 hàng ngang:
  - Hành động: `<Select>` — Tất cả, LOGIN, CREATE, UPDATE, DELETE, APPROVE, REJECT, CANCEL, RESET_PASSWORD
  - Đối tượng: `<Select>` — Tất cả, USER, IMPORT_RECEIPT, EXPORT_RECEIPT, PRODUCT_UNIT, RETURN_RECEIPT, STOCK_CHECK, STOCK_ADJUSTMENT, PRICE_ADJUSTMENT, PURCHASE_ORDER, BRAND, CATEGORY, PRODUCT, SUPPLIER, LOCATION, CUSTOMER, SYSTEM_SETTINGS
  - Trạng thái: `<Select>` — Tất cả, Thành công, Thất bại
  - Từ ngày / Đến ngày: `<input type="date">`
- **User filter**: `<Select>` tìm kiếm được (searchable), load từ `GET /user`, chọn user để lọc theo `userId`. Có thể gõ tìm theo tên.
- **Bảng kết quả**: Thời gian | Người dùng | Hành động | Đối tượng | ID | IP | Trạng thái
- **Detail dialog**: click icon mắt → popup hiện `old_value` / `new_value` dạng JSON format + `error_msg` (nếu FAILED).

> **Cần thiết kế UI riêng cho luồng hủy phiếu xuất đã completed** — xem `02-sop-nghiep-vu.md §3.4.2`.
