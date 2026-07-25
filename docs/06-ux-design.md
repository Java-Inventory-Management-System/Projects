# UX Design

> Tổng hợp UX đề xuất cho các luồng core và thiết kế chi tiết luồng Bảo hành.

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

Giữ nguyên luồng hiện tại (người dùng không yêu cầu đổi UX), chỉ lưu ý gắn liền với bug double-booking — UI cần hiện rõ trạng thái "đang giữ chỗ" của serial trong lúc phiếu ở `pending_approval`, để NV khác không nhầm là còn trống.

- Modal chọn/override serial hỗ trợ: paste nhiều dòng cùng lúc (multi-line), import file `.txt`/`.csv`, highlight các dòng trùng lặp, progress bar dạng "12/50 đã chọn" khi số lượng lớn.

### 1.3 Kiểm kê lệch

Trang `StockCheckDetail` nên hiện bảng lệch **nổi bật ngay đầu trang** (highlight đỏ cho `MISSING`, xanh cho `UNEXPECTED`) thay vì lẫn trong danh sách toàn bộ items match.

Thêm nút **"Tạo phiếu điều chỉnh (N)"** áp dụng batch cho tất cả item lệch cùng lúc, thay vì phải tạo từng cái một — quan trọng vì tài liệu hiện mô tả tạo "manual" từng item, sẽ rất chậm nếu kiểm kê phát hiện 30-40 lệch cùng lúc.

### 1.4 Trả hàng khách

- Bắt buộc chọn export gốc **trước** (autocomplete theo mã phiếu xuất hoặc serial), sau đó mới hiện được `reason` (`CHANGE_MIND` / `DEFECTIVE` / `WRONG_ITEM`) — tránh SALES chọn reason trước rồi mới tìm export gốc, dễ chọn sai.
- Nếu `reason=CHANGE_MIND`: hiện rõ số ngày còn lại trong hạn 7 ngày (đếm từ `export_receipt.approved_at`) — chỉ là guide, FE không tự disable submit. BE validate và trả lỗi nếu quá 7 ngày.
- Bước kiểm tra condition (STOCK): 2 lựa chọn `GOOD` / `DEFECTIVE`, nếu DEFECTIVE thêm lựa chọn con `SCRAP` hay `WARRANTY_TRANSFER` (**WARRANTY_TRANSFER chỉ hiện khi unit gốc là serialized**; bulk chỉ hiện SCRAP).

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
  - Đối tượng: `<Select>` — Tất cả, USER, IMPORT_RECEIPT, EXPORT_RECEIPT, PRODUCT_UNIT, WARRANTY_REQUEST, RETURN_RECEIPT, STOCK_CHECK, STOCK_ADJUSTMENT, PRICE_ADJUSTMENT, PURCHASE_ORDER, BRAND, CATEGORY, PRODUCT, SUPPLIER, LOCATION, CUSTOMER, SYSTEM_SETTINGS
  - Trạng thái: `<Select>` — Tất cả, Thành công, Thất bại
  - Từ ngày / Đến ngày: `<input type="date">`
- **User filter**: `<Select>` tìm kiếm được (searchable), load từ `GET /user`, chọn user để lọc theo `userId`. Có thể gõ tìm theo tên.
- **Bảng kết quả**: Thời gian | Người dùng | Hành động | Đối tượng | ID | IP | Trạng thái
- **Detail dialog**: click icon mắt → popup hiện `old_value` / `new_value` dạng JSON format + `error_msg` (nếu FAILED).

---

## 2. UX Bảo hành (Warranty)

> Thiết kế UI/UX chi tiết cho 3 route: `/warranty`, `/warranty/new`, `/warranty/:id`.
> Căn cứ nghiệp vụ: `02-sop-nghiep-vu.md §6`.
> Tất cả câu hỏi mở đã được chốt với business ngày 24/07/2026 và tích hợp vào các file living docs tương ứng.

### 2.0 Bản đồ trạng thái ↔ actor ↔ màn hình

```
PENDING ──────→ RECEIVED ──────→ UNDER_EVALUATION ──────→ RESOLVED
(SALES/STOCK tạo) (STOCK nhận      (QL duyệt              (STOCK thực thi
                 + kiểm tra)      resolution)             resolution)
```

| State | Ai thao tác tiếp | Component chính hiện ra trên Detail page |
|---|---|---|---|
| `PENDING` | STOCK | Nút "Xác nhận đã nhận hàng" |
| `RECEIVED` | STOCK | Form kiểm tra: CONFIRMED / REJECTED |
| `UNDER_EVALUATION` | QL | 4 Resolution Card: REPAIR/REPLACE/REFUND/REJECT |
| `RESOLVED` | STOCK (thực thi) rồi terminal | Panel thực thi theo resolution đã chọn |

Toàn bộ Detail page dùng chung 1 **WarrantyTimeline** (dọc) làm neo thị giác, phần thân bên dưới đổi theo state + role hiện tại — không tách thành nhiều page riêng, tránh mất ngữ cảnh khi refresh/duyệt sau vài ngày.

### 2.1 `/warranty` — WarrantyListPage

**Bố cục:**

```
┌─────────────────────────────────────────────────────────┐
│ [Tất cả] [Chờ tiếp nhận] [Đang kiểm tra] [Chờ QL duyệt]  │  ← tabs = filter theo status
│ [Đang xử lý] [Hoàn tất]                                   │
├─────────────────────────────────────────────────────────┤
│ 🔍 Tìm theo serial / SĐT khách / mã phiếu     [+ Tiếp nhận mới] │
├─────────────────────────────────────────────────────────┤
│ Mã phiếu │ Serial │ Sản phẩm │ Khách │ Ngày nhận │ Trạng thái │ Resolution │
└─────────────────────────────────────────────────────────┘
```

**Chi tiết:**

- **Tabs** map trực tiếp 4 status, tab "Tất cả" mặc định. Đếm số lượng trên mỗi tab (badge số) — đặc biệt tab "Chờ QL duyệt" cần nổi bật vì đó là bottleneck thường gặp (QL bận).
- **Cột trạng thái**: dùng `WarrantyStatusBadge` (màu riêng từng state).
- **Cột cảnh báo**: icon ⚠ nhỏ cạnh serial nếu unit gốc đã qua **>2 lần đổi BH** — hiện ngay ở list, không phải đợi vào detail mới thấy.
- **Search** chấp nhận cả serial lẫn SĐT khách — vì khách thường không nhớ mã phiếu, chỉ nhớ SĐT lúc mua.
- Nút **"+ Tiếp nhận mới"** — hiện với SALES/STOCK (theo phân quyền chung), dẫn tới `/warranty/new`.
- Dùng chung `PaginationBar` như các list page khác.

### 2.2 `/warranty/new` — WarrantyCreatePage (SALES/STOCK)

Nguyên tắc thiết kế: **tra cứu trước, nhập tay sau** — không cho nhập mô tả lỗi trước khi biết chắc sản phẩm này đủ điều kiện BH, tránh SALES làm cả form rồi mới phát hiện hết hạn.

**Giai đoạn A — Tra cứu**

```
┌───────────────────────────────────────────┐
│  Quét hoặc nhập số serial...       [Tìm]   │  ← autofocus, hỗ trợ scan
└───────────────────────────────────────────┘
```

Sau khi tìm thấy, hiện **Serial Info Card**:

```
┌─────────────────────────────────────────────────────────┐
│ [ảnh SP]  RTX 4070 Super — SN: ABC123XYZ                │
│           Khách: Nguyễn Văn A · 0901234567               │
│           Mua ngày 12/03/2026 · Phiếu xuất #EXP-0234     │
│                                                           │
│           ██████████████░░░░░░  còn 4 tháng 12 ngày BH   │  ← progress bar
│           Tem BH: ✅ Đã xác thực (WSC-88213)             │
│           Lịch sử đổi BH: 1 lần (18/06/2026)             │
└─────────────────────────────────────────────────────────┘
```

- **Progress bar hạn BH**: xanh khi còn >30 ngày, vàng khi ≤30 ngày, đỏ + khóa form khi đã hết hạn.
- **Dòng tem BH**: 3 trạng thái hiển thị —
  - ✅ Đã xác thực (`warranty_seal_code` khớp DB)
  - ⚠️ Không có / không xác thực được — hiện nút "Khách nói mất tem" (chuyển sang REPAIR/SENT_TO_MANUFACTURER, mất quyền REPLACE nhanh tại shop)
  - — Không áp dụng (shop không dùng tem riêng — ẩn dòng này hoàn toàn nếu `system_settings.warranty_seal_enabled = false`)
- **Lịch sử đổi BH**: nếu >2 lần → dòng này đổi màu cam + icon ⚠, không chặn nhưng nhắc SALES cân nhắc kỹ khi đề xuất.
- **Không tìm thấy serial** → thông báo rõ: *"Không tìm thấy sản phẩm với serial này trong hệ thống. Kiểm tra lại serial hoặc xác nhận khách có mua tại đây không."* Không có form nào hiện thêm bên dưới.
- **Hết hạn BH** → Serial Info Card vẫn hiện đầy đủ (để SALES thấy rõ tại sao từ chối) nhưng toàn bộ Giai đoạn B bị khóa, thay bằng banner đỏ: *"Sản phẩm đã hết hạn bảo hành từ [ngày]. Không thể tiếp nhận theo diện BH shop."* + nút phụ **"Vẫn tạo phiếu (ngoài BH, tính phí)"** — nếu shop có dịch vụ sửa ngoài BH thì đây là lối thoát hợp lý, không bắt SALES phải nói không hoàn toàn với khách.

**Giai đoạn B — Nhập thông tin lỗi** (chỉ hiện khi còn hạn BH)

```
Mô tả lỗi khách báo *          [textarea]
Ảnh/video minh chứng (tuỳ chọn) [upload — tái dùng component upload ảnh SP]
                                          [Hủy]  [Tiếp nhận →]
```

Submit → tạo `warranty_request` status=`PENDING`, in ngay **phiếu biên nhận** (khách cầm về, có mã tra cứu) — nút "In biên nhận" xuất hiện ngay sau khi tạo thành công, trước khi điều hướng sang Detail page.

### 2.3 `/warranty/:id` — WarrantyDetailPage

**Khung sườn chung (mọi state)**

```
┌──────────────────────────────────────────────────────────┐
│ #WR-0042          RTX 4070 Super — SN: ABC123XYZ          │
│                                                            │
│  ●───────●───────●───────○                                │
│ Tiếp nhận  Đã nhận  Đang đánh giá  Hoàn tất                │
│ 21/07 09:12  21/07 10:30  —          —                     │  ← WarrantyTimeline
│ SALES: Lan   STOCK: Minh                                   │
├──────────────────────────────────────────────────────────┤
│ [Thông tin khách/SP — luôn hiện, thu gọn được]             │
├──────────────────────────────────────────────────────────┤
│ [Panel động theo state]                                    │
└──────────────────────────────────────────────────────────┘
```

- Timeline **luôn hiện đủ 4 mốc**, mốc chưa tới hiện mờ (○), mốc đã qua hiện đặc + timestamp + tên người thực hiện.
- Panel động bên dưới chỉ hiện **action phù hợp với role đang đăng nhập**.

**State `PENDING` — STOCK nhận hàng**

```
Khách đã gửi hàng chưa nhận vào kho.
[✓ Xác nhận đã nhận hàng]
```

Bấm xong → chuyển ngay sang form kiểm tra của state `RECEIVED` (không tách 2 lần load trang).

**State `RECEIVED` — STOCK kiểm tra**

```
Kết quả kiểm tra ngoại quan / lỗi:
  ( ) Xác nhận có lỗi (CONFIRMED)       ( ) Không lỗi / không thuộc BH (REJECTED)

Ghi chú kiểm tra:  [textarea]  ← bắt buộc nếu chọn REJECTED
                                      [Lưu kết quả →]
```

- REJECTED bắt buộc note (validate chặn submit nếu để trống).
- CONFIRMED → chuyển `UNDER_EVALUATION` (chưa đổi status unit — transition thật xảy ra ở bước QL duyệt resolution).
- REJECTED → phiếu chuyển thẳng `RESOLVED` với `resolution=REJECT` (không cần qua QL duyệt riêng).

**State `UNDER_EVALUATION` — QL duyệt resolution**

4 **Resolution Card** thay vì dropdown, bổ sung cảnh báo ngữ cảnh ngay trên từng card:

```
┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│  🔧 REPAIR    │ │  🔄 REPLACE   │ │  💰 REFUND    │ │  ✕ REJECT     │
│               │ │               │ │               │ │               │
│ Sửa tại kho   │ │ Đổi serial    │ │ Hoàn tiền cho │ │ Từ chối yêu   │
│ hoặc gửi NCC. │ │ mới, giữ nguyên│ │ khách, unit   │ │ cầu bảo hành. │
│ Unit vẫn giữ  │ │ hạn BH gốc.   │ │ → returned.   │ │ Unit trả về   │
│ nguyên serial.│ │               │ │               │ │ khách nguyên  │
│               │ │ ⚠ Còn 2 serial│ │               │ │ trạng.        │
│               │ │ cùng loại tồn │ │               │ │               │
│               │ │ kho           │ │               │ │               │
│  [Chọn]       │ │  [Chọn]       │ │  [Chọn]       │ │  [Chọn]       │
└───────────────┘ └───────────────┘ └───────────────┘ └───────────────┘
```

- Mỗi card có **1 dòng mô tả hậu quả ngắn**.
- **Card REPLACE** hiện số lượng serial cùng sản phẩm đang `IN_STOCK` — nếu = 0, đổi cảnh báo thành đỏ *"Hết hàng để đổi"* và **không khóa** nút chọn (QL vẫn có thể chọn REPLACE để giữ trạng thái chờ).
- Nếu unit gốc đã qua >2 lần đổi → thêm dòng cảnh báo cam ngay trên card, không chặn chọn.
- Bấm "Chọn" → **confirm dialog** trước khi submit thật:
  ```
  Xác nhận chọn REPLACE cho phiếu #WR-0042?
  Hệ thống sẽ tạo phiếu xuất nội bộ, giá 0đ, kế thừa hạn BH gốc.
  [Hủy]  [Xác nhận]
  ```
- Chỉ QL mới thấy panel này; SALES/STOCK xem phiếu ở state này chỉ thấy dòng "Đang chờ QL duyệt hướng xử lý".

**State `RESOLVED` — STOCK thực thi**

Panel đổi nội dung theo `resolution` đã chọn:

**REPAIR:**
```
Hướng xử lý: Sửa tại kho / Gửi NCC
[ ] Sửa xong, trả khách               [ ] Đã gửi NCC (chuyển sent_to_manufacturer)
```
Khi tick "Sửa xong" → unit `UNDER_REPAIR → SOLD`, phiếu → terminal.

**REPLACE (còn hàng):**
```
Chọn serial thay thế:  [🔍 tìm serial...]  ← gợi ý mặc định serial FIFO cùng SP
Serial được chọn: SN: DEF456 (nhập 15/07/2026)
                                     [Xác nhận đổi hàng →]
```
Sau xác nhận → tạo export nội bộ `sell_price=0`, unit mới `→ SOLD`, kế thừa `warranty_start_date` gốc.

**REPLACE (hết hàng):**
```
⏳ Đang chờ nhập hàng để đổi. Đã chờ N ngày (SLA: 7 ngày làm việc).
[Đánh dấu đã có hàng để đổi]   [Chuyển sang REFUND] (chỉ QL thấy nút này)
```
(Ghi chú: nút "Chuyển sang REFUND" chỉ QL được bấm; STOCK chỉ thực thi sau khi QL đã đổi hướng.)

**REFUND:**
```
Số tiền hoàn: [___________] đ  (mặc định = giá bán lúc xuất, sửa được)
                                     [Xác nhận hoàn tiền →]
```
Xác nhận → unit `→ RETURNED`, phiếu terminal.

**REJECT:**
```
Lý do từ chối: [hiện lại ghi chú từ bước kiểm tra, read-only]
[In biên bản từ chối cho khách]
```

### 2.4 Thành phần dùng chung (component tái sử dụng)

| Component | Dùng ở đâu | Ghi chú |
|---|---|---|
| `WarrantyStatusBadge` | List, Detail header | 4 màu cố định theo state |
| `WarrantyTimeline` | Detail (đầu trang) | Vertical, luôn hiện đủ 4 mốc |
| `SerialLookupWidget` | Create (bước 1), Replace (bước thực thi) | Input + scan + kết quả card |
| `ResolutionCard` | Detail (`UNDER_EVALUATION`) | 4 card, prop `disabled`/`warningText` động |
| `WarrantySealBadge` | Create, Detail | 3 trạng thái tem — ẩn nếu shop tắt tem |

### 2.5 Bảng màu trạng thái

| Status | Màu | Label hiển thị |
|---|---|---|---|
| `PENDING` | xám xanh (slate) | Chờ tiếp nhận |
| `RECEIVED` | xanh dương | Đang kiểm tra |
| `UNDER_EVALUATION` | vàng cam | Chờ QL duyệt |
| `RESOLVED` (REPAIRED/REPLACED) | xanh lá | Đã xử lý |
| `RESOLVED` (REJECTED) | đỏ nhạt | Đã từ chối |
| `RESOLVED` (REFUNDED) | tím | Đã hoàn tiền |

### 2.6 Phân quyền hiển thị action

| State | SALES thấy gì | STOCK thấy gì | QL/ADMIN thấy gì |
|---|---|---|---|---|
| `PENDING` | Read-only | Nút "Xác nhận đã nhận" | Read-only |
| `RECEIVED` | Read-only | Form CONFIRMED/REJECTED | Read-only |
| `UNDER_EVALUATION` | Read-only | Read-only | 4 Resolution Card |
| `RESOLVED` | Read-only + nút in | Panel thực thi (nếu chưa xong) | Read-only |

Ghi đè chung: **ADMIN chỉ duyệt thay khi QL vắng** — UI nên thêm 1 dòng nhắc nhỏ *"Đang duyệt thay QL"* để việc backup-approval không bị lẫn với việc ADMIN thường trực xử lý nghiệp vụ (tránh vi phạm ngầm Separation of Duties).

### 2.7 Các quyết định đã chốt

1. ✅ **Mất tem BH** — đã chốt hướng (a). §2.2 đã cập nhật.
2. ✅ **SLA chờ khi hết serial đổi** — đã chốt 7 ngày + nút "Chuyển sang REFUND" cho QL. §2.3 đã cập nhật.
3. ✅ **REJECT có cần QL xác nhận lần 2 không** — đã chốt: không cần, giữ auto-resolve + bắt buộc check_note.

Phần còn lại có thể code thẳng theo thiết kế này vì đã khớp `02-sop-nghiep-vu.md §6`.

> **Cần thiết kế UI riêng cho luồng hủy phiếu xuất đã completed** — xem `02-sop-nghiep-vu.md §3.4.2`.
