# Warehouse Flow — Quy trình nghiệp vụ

## 1. Tổng quan vòng đời sản phẩm

```
PO ──→ Nhập kho ──→ Trong kho ──→ Xuất kho ──→ Hết
                         │
                    Kiểm kê ──→ Lệch? ──→ Điều chỉnh ──→ Cập nhật lại kho
```

Mỗi sản phẩm khi vào kho được track dưới dạng **ProductUnit** (đơn vị tồn kho):
- **SERIALIZED**: mỗi unit có serial riêng (điện thoại, máy tính,...)
- **BULK**: không có serial, chỉ track số lượng (vật tư, linh kiện nhỏ)

Khi import được duyệt, BE tạo ProductUnits từ items:
- SERIALIZED: mỗi serial → 1 ProductUnit (riêng biệt)
- BULK: 1 ProductUnit với `remainingQuantity = quantity`

---

## 2. State Machine

### ImportReceipt

```
                    ┌──────────────────┐
                    │     PENDING      │  ← Vừa tạo, chờ xử lý
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │ PENDING_APPROVAL │  ← Chờ duyệt
                    └────────┬─────────┘
                            / \
                          /     \
                ┌────────▼─┐   ┌─▼─────────┐
                │ COMPLETED │   │ CANCELLED │
                └───────────┘   └───────────┘
```

- **PENDING → CANCELLED**: user cancel, ko ảnh hưởng stock
- **PENDING → PENDING_APPROVAL**: gửi duyệt
- **PENDING_APPROVAL → COMPLETED**: duyệt → **tạo ProductUnits, tăng stock**
- **PENDING_APPROVAL → CANCELLED**: hủy trước khi duyệt, ko ảnh hưởng
- **COMPLETED → CANCELLED**: hủy phiếu đã duyệt → **xóa ProductUnits, giảm stock**
- **PENDING → COMPLETED (auto)**: nếu ko cần duyệt (giá trị nhỏ / role được phép)

### ExportReceipt

```
                ┌──────────────────────┐
                │  PENDING_APPROVAL    │  ← Vừa tạo, cần duyệt
                └──────────┬───────────┘
                          / \
                        /     \
              ┌────────▼─┐   ┌─▼─────────┐
              │ COMPLETED │   │ CANCELLED │
              └───────────┘   └───────────┘
```

- **PENDING_APPROVAL → COMPLETED**: duyệt → **giảm stock, set ProductUnit status = SOLD/REMOVED**
- **PENDING_APPROVAL → CANCELLED**: hủy trước duyệt, ko ảnh hưởng
- **COMPLETED → CANCELLED**: hủy phiếu đã xuất → **tăng stock lại, restore ProductUnit status**

### PO — PurchaseOrder

```
               ┌───────────┐
               │   DRAFT   │
               └─────┬─────┘
                     │
               ┌─────▼──────┐
               │   PARTIAL  │ ← đã nhập 1 phần
               └─────┬──────┘
                    / \
                  /     \
        ┌────────▼─┐   ┌─▼─────────┐
        │ COMPLETED │   │ CANCELLED │
        └───────────┘   └───────────┘
```

- **DRAFT → PARTIAL**: nhập lần đầu (có import receipt link)
- **PARTIAL → PARTIAL**: nhập thêm lần nữa
- **PARTIAL → COMPLETED**: tổng received = ordered
- **→ CANCELLED**: hủy toàn bộ

### StockCheck

```
             ┌───────────┐
             │  PENDING  │  ← Vừa tạo, chưa đếm
             └─────┬─────┘
                   │
             ┌─────▼────────┐
             │  IN_PROGRESS │  ← Đang đếm (nhập kết quả)
             └─────┬────────┘
                   │
             ┌─────▼──────────┐
             │  COMPLETED     │  ← Đã đếm xong, ghi nhận lệch
             └─────┬──────────┘
                   │
             ┌─────▼──────┐
             │  APPROVED  │  ← Manager xác nhận kết quả
             └────────────┘
```

- **COMPLETED → APPROVED**: manager xác nhận kết quả
- Sau APPROVED, StockCheckDetailPage hiển thị nút "Tạo phiếu điều chỉnh (N)" với reason pre-filled

### Adjustment

```
         ┌───────────┐
         │  PENDING  │  ← Chờ duyệt
         └─────┬─────┘
              / \
            /     \
   ┌───────▼─┐   ┌─▼─────────┐
   │ APPROVED │   │ REJECTED  │
   └──────────┘   └───────────┘
```

- **PENDING → APPROVED**: áp dụng adjustment → stock thay đổi
- **PENDING → REJECTED**: từ chối, stock giữ nguyên
- **APPROVED** LOST/DAMAGED: stock giảm (ProductUnit xóa hoặc set status = LOST/DAMAGED)
- **APPROVED** FOUND: stock tăng (tạo ProductUnit mới)

---

## 3. PO → Nhập kho

### Flow

```
Manager tạo PO
  │  - Chọn NCC, ngày dự kiến, danh sách SP + SL
  ▼
Kho nhận hàng → Tạo phiếu nhập
  │  - Liên kết với PO (qua poId) hoặc nhập tự do
  │  - Nhập 1 lần: hết SL trong PO → PO → COMPLETED
  │  - Nhập nhiều lần: partial → PO → PARTIAL
  ▼
Duyệt phiếu nhập → tạo ProductUnits, tăng stock, PO cập nhật received qty
```

### Import — Nhập 1 hay nhiều SP?

| Số lượng | Cách nhập | UX |
|----------|-----------|-----|
| 1-20 SP | Form UI: Select → Add từng cái | Select searchable + số lượng |
| >20 SP | Excel/CSV file upload | Upload → parse → preview → submit |

### Case: Partial PO Receipt

Khi nhập từ PO:
- PO có: SP A (100), SP B (50)
- Lần 1: Nhập A(60) + B(20) → PO còn A(40) + B(30) → PO status = PARTIAL
- Lần 2: Nhập nốt A(40) + B(30) → PO status = COMPLETED

UI cần hiển thị remaining qty bên cạnh mỗi item được pre-fill từ PO.

### Validation khi nhập

- Supplier bắt buộc
- Mỗi item: quantity >= 1
- SERIALIZED items: số serial phải khớp số lượng (số serial được nhập = quantity)
- BULK items: không cần serial
- Warranty: optional, default từ product config

### createdUnits — khi import được duyệt

Khi ImportReceipt → COMPLETED:
- Với mỗi item:
  - SERIALIZED: tạo N ProductUnits (N = quantity), mỗi unit 1 serial, status = IN_STOCK
  - BULK: tạo 1 ProductUnit với remainingQuantity = quantity, status = IN_STOCK
- Trường `createdUnits` trong ImportReceiptItem ghi lại số ProductUnit đã tạo

---

## 4. Xuất kho

### Flow

```
Tạo phiếu xuất
  │  - Lý do: Bán hàng / Nội bộ / Trả NCC / Hủy
  ▼
Chọn sản phẩm + số lượng
  │  - Hệ thống đề xuất serial FIFO (nhập trước xuất trước)
  │  - User có thể override: chọn serial cụ thể để xuất
  ▼
Duyệt → giảm stock, set ProductUnit status (SOLD / REMOVED / ...)
```

### Serial selection

- Mặc định: FIFO (items nhập sớm nhất được xuất trước)
- User được phép:
  - Bỏ chọn serial mặc định
  - Chọn serial khác từ danh sách tồn kho
  - Chọn số lượng tổng, để hệ thống auto chọn
- Serial modal hỗ trợ paste multi-line, import file .txt/.csv, highlight trùng + progress bar

### Validation khi xuất

- Lý do bắt buộc
- SALE: customer bắt buộc
- Mỗi item: quantity <= tồn kho hiện tại
- SERIALIZED: phải chọn đúng serial, ko thể xuất số lượng > số serial

---

## 5. Quản lý vị trí kho (Location)

### Cấu trúc

```
Kho (Warehouse)
  └── Zone (khu vực)           VD: A, B, C
       └── Shelf (kệ)           VD: A-01, A-02
            └── Bin (ô/ngăn)    VD: A-01-01, A-01-02
```

Mỗi Bin là 1 đơn vị lưu trữ vật lý nhỏ nhất — nơi hàng được đặt.

### Dữ liệu hiện tại

`LocationMapData` API trả về:
```typescript
interface Bin {
  id: number
  binCode: string
  fullCode: string    // VD: "A-01-01"
  productCount: number // Số ProductUnit hiện có trong bin (read-only)
}
```

**Chưa có:** `capacity` (sức chứa tối đa) — BE chưa support.

### Giới hạn số lượng — Capacity

Hiện tại BE không có khái niệm capacity. `productCount` cho biết "có bao nhiêu" nhưng ko có "tối đa bao nhiêu".

**Capacity được xác định từ:**
- **Người dùng (Manager) tự đặt giá trị** trên mỗi Bin khi tạo/sửa — là con số thủ công, dựa trên không gian vật lý thực tế của kệ/ngăn
- **Không tự động tính** từ kích thước — ko yêu cầu nhập kích thước SP

**productCount từ BE là số ProductUnit, không phân biệt type.**
Cả SERIALIZED và BULK đều đếm là 1:

| Type | Cách tính | Ví dụ |
|------|-----------|-------|
| SERIALIZED | 1 ProductUnit = 1 | 50 CPU trong bin → productCount = 50 |
| BULK | 1 ProductUnit = 1 | 1 thùng ốc vít (qty=500) → productCount = 1 |

Lý do: 1 thùng ốc vít chiếm 1 ô kệ về mặt vật lý, ko khác gì 1 hộp CPU.
`remainingQuantity` chỉ có ý nghĩa cho stock counting, ko ảnh hưởng capacity.

| Concept | Hiện tại | Cần thêm? |
|---------|----------|-----------|
| productCount | ✅ Có | — |
| maxCapacity | ❌ Chưa | Optional, do Manager nhập tay, cho biết bin chứa được tối đa |
| isFull | ❌ Chưa | Tính từ productCount vs maxCapacity |

**Không có capacity thì:**
- Nhập kho vẫn cho phép nhập vào bin dù đã đầy
- Chỉ có `productCount` để tham khảo, không block

**Khi nào cần capacity:**
- Kho có kệ/ngăn giới hạn kích thước
- Cần cảnh báo "Bin sắp đầy" khi productCount gần capacity
- Cần chặn nhập vào bin đã đầy

### Location assignment — khi nhập

1. **Mặc định**: hệ thống gợi ý bin có % capacity thấp nhất
   - (future: `category → zone` map — hiện chưa có, có thể thêm sau)
2. **User override**: user chọn bin khác thủ công qua LocationPicker
3. **Khi import được duyệt**: ProductUnit được gắn locationId tương ứng

### Location assignment — khi xuất

1. Hệ thống chọn serial theo FIFO, mỗi serial đã biết location (từ khi nhập)
2. User thấy serial nào ở bin nào qua thông tin location trong danh sách serial
3. Khi xuất duyệt: ProductUnit status thay đổi, location được giải phóng

### Location — trong kiểm kê

1. Kiểm kê có thể filter theo zone (chỉ kiểm 1 khu vực)
2. Khi đếm, user đếm số lượng thực tế tại từng bin
3. ProductUnit nào ở bin nào đã biết trước, chỉ cần xác nhận số lượng

### Thao tác cụ thể

#### 1. Tạo bin với capacity

Khi Manager bật chế độ **"Quản lý vị trí"** → thêm khu/kệ/ngăn mới:

- `maxCapacity` là field optional trên `LocationResponse` và `LocationMapData.Bin`
- FE đã support type + mapper + service param, **cần BE trả về** `maxCapacity` mới hoạt động
- Khi BE chưa có: `maxCapacity = null`, FE fallback về hardcode threshold (0, 10, 50)
- `maxCapacity` do Manager tự đặt dựa vào kích thước kệ thực tế
- VD: 1 ngăn chứa được 30 hộp CPU → `maxCapacity = 30`
- VD: 1 ngăn chứa được 100 hộp ốc vít → `maxCapacity = 100`

#### 2. Bin detail — hiển thị capacity

Khi nhấp vào 1 bin → Sheet chi tiết hiện:
```
Sản phẩm  15/50 đơn vị     ← productCount / maxCapacity
                               50% — thanh progress bar
Trạng thái  Đang hoạt động
```

#### 3. Bin color — dựa trên % capacity

Khi có `maxCapacity`, `binColor()` dùng % thay vì hardcode:

| % capacity | Label | Màu |
|-----------|-------|-----|
| 0% | Trống | blue‑50 |
| 1–49% | Ít | blue‑100 |
| 50–89% | Có hàng | blue‑200 |
| ≥90% | Đầy | blue‑300 |

Fallback khi `maxCapacity = null`: threshold cũ (0, 10, 50).

#### 4. Filter

Khi có capacity, filter mở rộng thêm:

| Filter | Ý nghĩa |
|--------|---------|
| Còn trống | `productCount = 0` |
| Còn chỗ | `productCount > 0 && < maxCapacity` |
| Gần đầy | `productCount >= 80% maxCapacity` |
| Đầy | `productCount >= maxCapacity` |

#### 5. Khi nhập kho — chọn bin

Bước chọn location trong form import:
- Hệ thống gợi ý bin: ưu tiên **bin có % capacity thấp nhất** trong zone của category
- Bin đã `productCount >= maxCapacity` → bị **khoá** (ko chọn được)
- LocationPicker hiển thị `fullCode + productCount/maxCapacity` cho từng bin
- User có thể override, nhưng nếu chọn bin đầy → cảnh báo

### Location map UI

Hiện tại có `LocationsMapPage` (tab 3 của `/stock/units`):
- Hiển thị sơ đồ kho dạng zone → shelf → bin
- Mỗi bin hiển thị fullCode + productCount (+ capacity nếu có)
- Cho phép CRUD location (thêm/sửa/xoá bin)
- LocationPicker dùng popover với tree view từ map data

---

## 6. Kiểm kê (Stock Check)

### Flow

```
Tạo phiếu kiểm kê → PENDING
  │  - Chọn khu vực / toàn kho
  │  - Hệ thống snapshot danh sách SP + SL hiện tại
  ▼
Đếm thực tế → IN_PROGRESS
  │  Kết quả mỗi item:
  │  - MATCH: đếm = hệ thống
  │  - MISSING: đếm < hệ thống (thiếu)
  │  - UNEXPECTED: đếm > hệ thống (thừa)
  │  - PARTIAL_SHORTAGE: 1 phần lệch (SERIALIZED)
  ▼
Kết thúc kiểm kê → COMPLETED
  │  Ghi nhận kết quả cho tất cả items
  ▼
Manager xác nhận → APPROVED
  │  Sau APPROVED, item lệch được ghi nhận chính thức
  │  Chỉ item lệch mới cần Adjustment
  ▼
Manager tạo Adjustment từng item lệch (manual)
```

### Lệch → Adjustment

Kiểm kê KHÔNG tự động sửa kho. Chỉ ghi nhận lệch.
Trên StockCheckDetailPage, tab "Hành động", khi phiếu đã APPROVED và có chênh lệch,
Manager nhấn "Tạo phiếu điều chỉnh (N)" → navigate đến AdjustmentCreatePage với reason pre-filled.

| Loại lệch | Adjustment type | Tác động khi APPROVED |
|-----------|----------------|-----------------------|
| MISSING | LOST | Xóa ProductUnit / set status = LOST → stock giảm |
| MISSING | DAMAGED | Set status = DAMAGED_IN_STORAGE → stock giảm |
| UNEXPECTED | FOUND | Tạo ProductUnit mới → stock tăng |

### Approval rules cho Adjustment

| Type | Ai duyệt? | Ghi chú |
|------|-----------|---------|
| LOST | Manager + Admin | Cần xác nhận mất thật |
| DAMAGED | Manager | Cần ảnh minh chứng |
| FOUND | Manager | Phát hiện thừa, dễ duyệt |

---

## 7. Ai duyệt cái gì? (Role-based Approval)

| Entity | Action | Ai được làm? |
|--------|--------|-------------|
| ImportReceipt | Tạo | STOCK, MANAGER, ADMIN |
| ImportReceipt | Duyệt (→ COMPLETED) | MANAGER, ADMIN |
| ImportReceipt | Cancel | MANAGER, ADMIN |
| ExportReceipt | Tạo | STOCK, MANAGER, ADMIN |
| ExportReceipt | Duyệt (→ COMPLETED) | MANAGER, ADMIN |
| ExportReceipt | Cancel | MANAGER, ADMIN |
| StockCheck | Tạo | STOCK, MANAGER, ADMIN |
| StockCheck | Xác nhận (→ APPROVED) | MANAGER, ADMIN |
| StockCheck | Nhập kết quả đếm | STOCK (người tạo) |
| Adjustment | Tạo | MANAGER, ADMIN |
| Adjustment LOST | Duyệt | ADMIN |
| Adjustment DAMAGED | Duyệt | MANAGER, ADMIN |
| Adjustment FOUND | Duyệt | MANAGER, ADMIN |
| PO | Tạo/Sửa | MANAGER, ADMIN |
| PO | Cancel | MANAGER, ADMIN |

### Phân biệt form nhập theo role

Form tạo phiếu nhập (`ImportCreatePage`) show **fields khác nhau** tuỳ role:

| Field | STOCK | MANAGER/ADMIN | Ghi chú |
|-------|-------|---------------|---------|
| Nhà cung cấp | ✅ Xem/chọn | ✅ | NCC giao hàng |
| Ngày nhập | ✅ | ✅ | Ngày hàng về |
| Số chứng từ | ✅ | ✅ | Hoá đơn NCC |
| Sản phẩm + Số lượng | ✅ | ✅ | Việc chính của STOCK |
| **Đơn giá** | ❌ Ẩn | ✅ | Tài chính, chỉ Manager |
| **Bảo hành (tháng)** | ❌ Ẩn | ✅ | Chính sách BH |
| Vị trí kho | ✅ | ✅ | STOCK xếp hàng |
| Serial | ✅ | ✅ | STOCK nhập serial |
| Ghi chú | ✅ | ✅ |

**Cơ chế:**
- Mặc định unitPrice, warrantyMonths được ẩn với STOCK role
- Khi tạo từ PO: unitPrice + warrantyMonths được pre-fill từ PO, STOCK vẫn ẩn
- MANAGER khi duyệt có thể sửa các field này trước khi COMPLETED

---

## 8. Draft state — Unsaved Work

Hiện tại chưa có draft cho create forms:
- User nhập 10 items, thoát giữa chừng → mất hết
- Giải pháp ngắn hạn: `useBlocker` (cảnh báo) — đã có cho import
- Giải pháp dài hạn: lưu draft vào localStorage, hỏi "Khôi phục?" khi vào lại form

---

## 9. Các case đặc biệt

### Nhập không có PO

Supplier giao hàng không qua PO → tạo phiếu nhập tự do (không link PO).
Flow giống nhập có PO nhưng bỏ qua bước pre-fill.

### Xuất không có customer

Lý do INTERNAL / RETURN_SUPPLIER / DISPOSE → không cần chọn customer.

### Hàng bị hỏng trong kho

1. Phát hiện → ghi nhận
2. Kiểm kê ghi DAMAGED_IN_STORAGE / MISSING
3. Adjustment type DAMAGED hoặc LOST → duyệt → xóa khỏi kho

### Hàng trả NCC

1. Tạo phiếu xuất lý do RETURN_SUPPLIER
2. Chọn serial cần trả
3. Xuất kho → hàng giảm, ProductUnit status = RETURNED_TO_SUPPLIER
4. (Tùy chọn) Tạo PO mới cho hàng thay thế

---

## 10. Routes & UI Mapping

| Route | Page | Mô tả |
|-------|------|-------|
| `/stock/imports` | ImportListPage | Danh sách phiếu nhập |
| `/stock/imports/new` | ImportCreatePage | Tạo phiếu nhập |
| `/stock/imports/:id` | ImportDetailPage | Chi tiết phiếu nhập + In phiếu + CSV |
| `/stock/exports` | ExportListPage | Danh sách phiếu xuất |
| `/stock/exports/new` | ExportCreatePage | Tạo phiếu xuất |
| `/stock/exports/:id` | ExportDetailPage | Chi tiết phiếu xuất + In phiếu + CSV (xuất hóa đơn) |
| `/stock/checks` | StockCheckListPage | Danh sách kiểm kê |
| `/stock/checks/new` | StockCheckCreatePage | Tạo phiếu kiểm kê |
| `/stock/checks/:id` | StockCheckDetailPage | Chi tiết + nhập kết quả, filter, tạo Adjustment từ chênh lệch |
| `/stock/adjustments` | StockAdjustmentListPage | Danh sách điều chỉnh |
| `/stock/adjustments/new` | StockAdjustmentCreatePage | Tạo điều chỉnh |
| `/stock/adjustments/:id` | StockAdjustmentDetailPage | Chi tiết điều chỉnh |

---

## 11. Page Size & Data Export

### Page size selector

Trên các trang danh sách có phân trang (imports, exports, checks, adjustments, products, ...),
`PaginationBar` hiển thị dropdown chọn số kết quả mỗi trang:

| Tuỳ chọn | Mô tả |
|----------|-------|
| 10 | Mặc định |
| 20 | Phù hợp màn hình vừa |
| 50 | Data-dense |
| 100 | Xem toàn bộ gần đúng |

Khi đổi page size, page tự reset về 0.
Hiện đã áp dụng cho: danh sách nhập/xuất (receipt-list-page), danh sách ProductUnit.

### CSV Export

Nút **CSV** (icon FileDown) xuất hiện trên:
- **ImportDetailPage**, **ExportDetailPage**: xuất danh sách sản phẩm trong phiếu ra file CSV (UTF-8 BOM, mở được bằng Excel)
- **Dashboard**: mỗi tab dạng bảng (Theo danh mục, Sắp hết hàng, Giá trị tồn, Hoạt động) đều có nút CSV ở góc phải

Cơ chế: `downloadCsv()` trong `utils/download-csv.ts` — tạo Blob + URL.createObjectURL + click ẩn, revoke sau khi download.

---

## 12. Future improvements

- **Bulk import via Excel**: Upload file → map columns → preview → submit
- **Export serial override**: Cho phép user chọn serial thay vì auto FIFO
- **PO balance tracking**: Hiển thị remaining qty khi nhập từ PO
- **Wave picking**: Gom nhiều phiếu xuất thành 1 đợt lấy hàng
- **Mobile scanning**: Quét barcode bằng camera khi nhập/xuất/kiểm kê
- **Draft save**: Lưu tạm form create vào localStorage
