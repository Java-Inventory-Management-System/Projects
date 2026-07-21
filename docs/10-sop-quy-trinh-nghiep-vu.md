# SOP Quy trình nghiệp vụ — Hệ thống Quản lý Kho Linh Kiện Máy Tính

> Tài liệu quy trình chuẩn (SOP) cho 7 luồng nghiệp vụ chính.
> Dùng để training nhân viên và làm căn cứ cho dev sửa hệ thống.
> Mọi quyết định nghiệp vụ dưới đây đã được chốt qua phân tích — không hỏi lại.

---

## Mục lục

1. [Tổng quan & Nguyên tắc chung](#1-tổng-quan--nguyên-tắc-chung)
2. [Nhập kho](#2-nhập-kho)
3. [Xuất kho](#3-xuất-kho)
4. [Kiểm kê](#4-kiểm-kê)
5. [Điều chỉnh tồn kho](#5-điều-chỉnh-tồn-kho)
6. [Bảo hành](#6-bảo-hành)
7. [Trả hàng khách](#7-trả-hàng-khách)
8. [Điều chỉnh giá nhập](#8-điều-chỉnh-giá-nhập)
9. [Cấu trúc dữ liệu tham chiếu](#9-cấu-trúc-dữ-liệu-tham-chiếu)
10. [Phạm vi loại trừ](#10-phạm-vi-loại-trừ)

---

## 1. Tổng quan & Nguyên tắc chung

### 1.1 Bối cảnh

- Shop bán lẻ linh kiện máy tính, **1 shop, 1 kho**.
- 4 role: **ADMIN**, **MANAGER (QL)**, **STOCK (NV kho)**, **SALES (NV bán hàng)**.
- Vị trí kho 3 cấp: `zone → shelf → bin`.
- Chưa go-live — không có tồn cũ, không cần migrate.
- Hàng nhập vào là sở hữu ngay (không ký gửi).
- Ship/giao hàng tách biệt — SOP này chỉ tính tới lúc hàng rời khỏi kho (`export_receipt` approved).

### 1.2 Nguyên tắc xuyên suốt

| Nguyên tắc | Mô tả |
|---|---|
| **4-eyes** | Người duyệt (`approved_by`) luôn khác người tạo (`created_by`). Áp dụng cho mọi luồng có duyệt. |
| **Separation of duties** | ADMIN chỉ giám sát, không khởi tạo giao dịch nghiệp vụ. QL duyệt, không tạo. NV/SALES tạo, không duyệt. |
| **Backup duyệt** | Khi QL vắng mặt, **Admin đảm nhiệm duyệt thay** mọi loại phiếu. |
| **Audit log** | Mọi thay đổi trạng thái `ProductUnit` đều ghi `ProductUnitStatusLog` (from → to, ai làm, lúc nào, nguồn nào). |
| **Không soft-delete** | Không hard-delete phiếu. Cancel/hủy = chuyển trạng thái terminal (`CANCELLED`, `REMOVED`, `DISPOSED`), giữ audit. |
| **warehouse_id** | Thiết kế có `warehouse_id` ngay từ đầu dù chỉ 1 kho, để sẵn cho mở rộng. |

### 1.3 Role & quyền hạn trong SOP

| Role | Viết tắt | Được làm | Không được làm |
|------|----------|----------|----------------|
| ADMIN | AD | Duyệt mọi phiếu (khi QL vắng), giám sát, xem báo cáo | Khởi tạo giao dịch nhập/xuất/kiểm kê |
| MANAGER | QL | Duyệt mọi phiếu, tạo phiếu kiểm kê, tạo điều chỉnh | Tự duyệt phiếu mình tạo |
| STOCK | NV | Tạo phiếu nhập/tạo phiếu xuất, thực hiện xuất hàng vật lý, kiểm kê thực tế | Duyệt bất kỳ phiếu nào |
| SALES | SL | Tạo phiếu xuất (bán hàng), in phiếu | Duyệt bất kỳ phiếu nào, nhập kho |

### 1.4 Tracking type (phân loại theo đơn vị tính)

| Tracking | Unit | Đặc điểm |
|----------|------|----------|
| **Serialized** | PIECE, BOX, SET | Mỗi đơn vị có serial number riêng, theo dõi từng cái |
| **Bulk** | METER, KG | Theo dõi theo số lượng tồn (`remaining_quantity`), không serial |

Mapping này hard-code trong Service layer, thêm UOM mới = sửa code (đã chốt chấp nhận).

---

## 2. Nhập kho

### 2.1 Flow tổng quát

```
SALES/STOCK tạo phiếu nhập (draft) ──┬──→ Huỷ bỏ draft
                                       │
                                       ↓
                            PENDING_APPROVAL
                                       │
                                       ├── QL duyệt → COMPLETED
                                       │
                                       └── QL từ chối → CANCELLED (units → REMOVED)
```

### 2.2 Các bước chi tiết

#### Bước 1: Tạo phiếu nhập (draft) — SALES / STOCK / QL

- Chọn nhà cung cấp (NCC) — validated: NCC phải tồn tại trong DB và đang `active`.
- Link `purchase_order_id` nếu có (tùy chọn). Nếu PO đã COMPLETED → **chặn link**, báo "PO đã hoàn thành".
- Nhập danh sách item (sản phẩm, số lượng, `unit_price`, `warranty_months`).
- Trạng thái khởi tạo: **`draft`** — cho phép sửa số lượng/giá/serial trước khi gửi duyệt.

> **Điểm mở**: Giá nhập lệch so với giá dự kiến trong PO — hiện tại cho nhập giá thực tế tự do, PO chỉ tham khảo. **Cần xác nhận lại với chủ shop** trước khi coi là chính thức.

#### Bước 2: Nhập serial — NV / QL

- Nếu tracking type = **serialized**: bắt buộc nhập đủ serial (`số lượng serial = số lượng`).
- Nhập bằng tay, scan barcode, hoặc upload file Excel.
- **Validate trong file Excel trước**: kiểm tra trùng lặp nội bộ file. Nếu phát hiện:
  - **>20% dòng lỗi** → chặn toàn bộ phiếu, yêu cầu sửa file và upload lại.
  - **≤20% dòng lỗi** → skip dòng lỗi, giữ dòng đúng, hiển thị danh sách dòng bị bỏ qua cho NV xác nhận.
- **Validate với DB**: kiểm tra serial đã tồn tại (case-insensitive — cả upper/lower).
- Nếu tracking type = **bulk**: không cần serial, chỉ cần số lượng.

**Edge case — Duplicate serial cùng file Excel:**
Kiểm tra trùng trong nội bộ file TRƯỚC khi validate với DB, tránh cả 2 dòng cùng pass validate riêng lẻ rồi vi phạm unique constraint.

**Edge case — Serial case-insensitive conflict:**
`"SN001"` và `"sn001"` được coi là trùng. Normalize về uppercase/khi check DB.

#### Bước 3: Gán vị trí kho — auto-assign (hệ thống) + override thủ công

- Hệ thống tự động gán location theo:
  1. Zone = mapping `category_id → zone_code` (bảng `category_zones`).
  2. Trong zone, ưu tiên bin đã chứa cùng `product_id` và còn dưới capacity (cảnh báo mềm, không chặn).
  3. Hết chỗ → bin trống, ưu tiên bin % dùng thấp nhất.
- NV có thể **đổi location thủ công** (kèm lý do nếu khác zone ưu tiên).
- Không chặn cứng nếu bin đầy — **cảnh báo mềm** (vì kích thước linh kiện đa dạng).

#### Bước 4: Xác nhận & gửi duyệt → PENDING_APPROVAL

- 1 transaction:
  - Tạo `ImportReceipt` + `ImportReceiptItem` + `ProductUnit` (status = `in_stock`).
  - Copy `warranty_months` từ `ImportReceiptItem` → `ProductUnit`.
  - Copy `cost_price` từ `ImportReceiptItem.unit_price` → `ProductUnit.cost_price`.
  - Nếu có link PO → cập nhật `received_quantity` (atomic `SET x = x + ?`).
- Chuyển phiếu từ `draft` → `pending_approval`.
- **Từ đây không sửa được nữa** (chỉ duyệt hoặc từ chối).

#### Bước 5: QL duyệt / từ chối — QL (khác người tạo)

| Hành động | Điều kiện | Kết quả |
|-----------|-----------|---------|
| Duyệt | `created_by ≠ approved_by` | → `COMPLETED`. Nếu có link PO → cập nhật PO status (PARTIAL / COMPLETED). |
| Từ chối | `created_by ≠ approved_by` | → `CANCELLED`. Tất cả `ProductUnit` → `REMOVED` (terminal). |

#### Bước 5b: Huỷ phiếu đã COMPLETED (hủy muộn)

- **Điều kiện**: 100% `ProductUnit` sinh từ phiếu đó chưa rời `in_stock`:
  - Serialized: chưa xuất hiện trong `export_receipt_item_units`.
  - Bulk: `remaining_quantity = initial_quantity`.
- **Hậu quả**: Tất cả unit → `REMOVED`. Nếu có link PO → rollback `received_quantity` + tính lại PO status.
- **Không thể khôi phục** — đây là thao tác terminal.

**Edge case — Race condition received_quantity:**
Khi 2 phiếu nhập cùng link 1 PO duyệt gần đồng thời, dùng `UPDATE received_quantity = received_quantity + ?` (atomic), không đọc-rồi-ghi.

**Edge case — NCC giao dư (over-receipt):**
Cho phép ghi nhận số lượng thực tế (có thể lớn hơn PO). Không tự động cộng vượt `received_quantity` của PO — chỉ ghi nhận số dư như nhập không PO.

### 2.3 Sơ đồ trạng thái ImportReceipt

```
draft → pending_approval → completed (terminal)
                         → cancelled (terminal, units → removed)
       completed → cancelled (terminal, chỉ khi 100% units chưa xuất)
```

---

## 3. Xuất kho

### 3.1 Flow tổng quát

```
SALES/STOCK tạo phiếu xuất (reason + items)
  → Hệ thống check tồn + FIFO chọn serial
  → NV có thể override serial (bắt buộc lý do)
  → PENDING_APPROVAL
     ├── QL duyệt → COMPLETED (units → sold, ghi warranty nếu sale)
     └── QL từ chối → CANCELLED (units giải phóng)
```

### 3.2 Các bước chi tiết

#### Bước 1: Tạo phiếu xuất — SALES / STOCK / QL

- Chọn lý do xuất (bắt buộc):

| Reason | Mô tả | Yêu cầu thêm |
|--------|-------|-------------|
| `SALE` | Bán cho khách | Bắt buộc `customer_id` (khách phải tồn tại trong DB, active) |
| `INTERNAL` | Sử dụng nội bộ (demo, gift, sample) | Không cần customer |
| `RETURN_SUPPLIER` | Trả NCC | Không cần customer |
| `DISPOSE` | Thanh lý/huỷ | Không cần customer |

- Chọn sản phẩm + số lượng cần xuất.
- Hệ thống kiểm tra tồn khả dụng ngay: `SUM(remaining_quantity WHERE status=in_stock)`.
  - Nếu thiếu → báo số lượng tối đa có thể xuất, cho xuất partial.
  - **Không cho phép tồn âm** với hàng serialized. Với bulk, mặc định chặn, có thể mở sau nếu có nhu cầu thực tế.

#### Bước 2: Hệ thống chọn serial theo FIFO + NV override

- Mặc định: `SELECT ... WHERE status='in_stock' ORDER BY imported_at ASC, id ASC`.
- **Tie-break**: nếu `imported_at` trùng millisecond → sort phụ theo `id ASC`.
- NV có thể **override serial** được chọn:
  - Chọn serial khác từ danh sách tồn của sản phẩm đó.
  - **Bắt buộc nhập lý do** override (ghi vào audit log của phiếu xuất).

#### Bước 3: Reserve (giữ chỗ) — transaction ngắn

- Trong 1 transaction ngắn:
  - `SELECT ... FOR UPDATE` (PESSIMISTIC_WRITE) các unit sẽ xuất.
  - Đổi status các unit đó từ `in_stock` → `reserved`.
  - Commit ngay — release lock.
- Phiếu → `pending_approval`.
- Các FIFO query sau tự động bỏ qua unit `reserved` (filter `status='in_stock'`).

#### Bước 4: QL duyệt / từ chối — QL (khác người tạo)

| Hành động | Điều kiện | Kết quả |
|-----------|-----------|---------|
| Duyệt | `created_by ≠ approved_by` | Unit → `sold`. Nếu `reason=SALE`: set `warranty_start_date=now`, `warranty_expires_at=now + warranty_months`. Nếu bulk: trừ `remaining_quantity`, về 0 thì → `sold`. |
| Từ chối | `created_by ≠ approved_by` | Unit → `in_stock` (giải phóng reserve). Xoá warranty dates nếu đã set. |

> ⚠ **Check status trước khi approve**: Nếu unit đã chuyển sang `damaged_in_storage`/`lost`/`under_repair` giữa lúc create→approve → **chặn**, báo lỗi "Unit không còn khả dụng", không tự động set SOLD ghi đè.

#### Bước 5: Thực hiện xuất hàng vật lý — STOCK

- STOCK xuống kho, lấy đúng serial/location theo phiếu.
- Nếu phát hiện thiếu hàng thực tế so với phiếu → theo **Flow xử lý xuất thiếu** dưới đây.

### 3.3 Flow xử lý xuất thiếu (tồn hệ thống ≠ tồn thực tế)

```
STOCK phát hiện thiếu (cần A, chỉ có B)
  → STOCK đánh dấu "phát hiện thiếu" trên màn hình xuất
  → Hệ thống tự tạo StockAdjustment (reason=LOST, link phiếu xuất gốc)
  → Phiếu xuất gốc chuyển trạng thái "exception" (tạm vướng)
  → QL duyệt adjustment (4-eyes) → tồn hệ thống sửa về B
  → Phiếu xuất gốc tự động sửa SL = B, xuất phần có sẵn
  → Phần thiếu (A-B): NV ghi chú thủ công ngoài hệ thống
```

### 3.4 Hủy phiếu xuất

- **Điều kiện**: Chỉ hủy được nếu phiếu đang `pending_approval` hoặc `exception`.
- Nếu unit đã chuyển sang `under_repair`/`sent_to_manufacturer`/`returned` → **chặn**, báo lỗi "Unit đã qua xử lý tiếp theo, không thể revert".
- Với bulk: trong cùng 1 transaction: cộng lại `remaining_quantity` + nếu `remaining_quantity > 0` thì đổi `sold → in_stock`.

### 3.5 Sơ đồ trạng thái ExportReceipt

```
pending_approval → completed (terminal)
                 → cancelled (terminal, units → in_stock)
                 → exception (chờ xử lý thiếu)
```

---

## 4. Kiểm kê

### 4.1 Flow tổng quát

```
QL tạo phiếu kiểm kê (zone cụ thể hoặc toàn kho)
  → PENDING (snapshot tồn hệ thống)
  → NV đếm thực tế → IN_PROGRESS
  → NV hoàn thành đếm → COMPLETED
  → QL/AD duyệt → APPROVED (áp dụng kết quả)
```

### 4.2 Các bước chi tiết

#### Bước 1: Tạo phiếu kiểm kê — QL

- Chọn phạm vi: 1 zone, nhiều zone, hoặc toàn kho.
- **Chặn tạo nếu zone đang có phiếu kiểm kê active** (IN_PROGRESS hoặc PENDING) — tránh chồng phạm vi.
- Hệ thống snapshot danh sách `ProductUnit` trong phạm vi + trạng thái/`remaining_quantity` hiện tại.
- Trạng thái: `PENDING`.

#### Bước 2: Đếm thực tế — NV

- NV đếm từng serial/vị trí, ghi nhận:
  - `actual_status`: IN_STOCK / LOST / DAMAGED_IN_STORAGE / ...
  - `counted_quantity`: cho bulk.
  - `note`: ghi chú nếu có.
- Hệ thống tự tính `difference`:
  - `actual = expected` → `MATCH`
  - `actual ≠ expected` và `actual = LOST / MISSING` → `MISSING`
  - `actual ≠ expected` và `actual ≠ LOST` → `UNEXPECTED`
- **PARTIAL_SHORTAGE**: dành cho bulk — khi `counted_quantity < expected_quantity` nhưng > 0.

**Edge case — Snapshot bị stale:**
Giới hạn tối đa 1 phiếu kiểm kê trong 1 ngày làm việc. Nếu quá thời gian → tự động đóng phiếu, yêu cầu tạo mới.

**Edge case — Serial đúng, sai vị trí:**
Tách nhánh riêng "sai lệch vị trí" — chỉ update `location_id`, không tạo `ProductUnit` mới, không tính là UNEXPECTED.

#### Bước 3: Kết thúc đếm → COMPLETED — NV

- NV xác nhận hoàn thành kiểm kê cho zone/phạm vi.
- Phiếu → `COMPLETED`.

#### Bước 4: Duyệt kết quả — QL / AD

- QL (khác NV tạo) duyệt:
  - **MISSING**: chuyển `ProductUnit.status` → `lost`. Tạo `ProductUnitStatusLog`.
  - **UNEXPECTED** (có serial trong DB): cập nhật `status` theo thực tế.
  - **UNEXPECTED** (serial mới, chưa trong DB): tạo `ProductUnit` mới, ghi `found during stock check`.
  - **Sai vị trí**: update `location_id`, không đổi status.
- QL từ chối → `REJECTED`, không áp dụng thay đổi nào.

**Edge case — Found nhiều hơn Lost trước đó:**
Nếu số lượng `FOUND` > tổng `LOST` trong cùng phiếu → **cảnh báo**, bắt buộc QL duyệt tay, không auto-approve.

### 4.3 Sơ đồ trạng thái StockCheck

```
pending → in_progress → completed → approved (terminal)
                                    → rejected (terminal)
```

---

## 5. Điều chỉnh tồn kho

### 5.1 Flow tổng quát

```
NV/QL tạo phiếu điều chỉnh (DAMAGED / LOST / FOUND)
  → PENDING
  → QL duyệt (4-eyes) → APPROVED (áp dụng thay đổi unit)
  → QL từ chối → REJECTED
```

### 5.2 Các bước chi tiết

#### Bước 1: Tạo phiếu — NV / QL

| Type | Bắt buộc | Mô tả |
|------|----------|-------|
| `DAMAGED` | `product_unit_id` | Unit → `damaged_in_storage` |
| `LOST` | `product_unit_id` | Unit → `lost` |
| `FOUND` | `product_unit_id` (nếu có) hoặc `product_id + quantity` (nếu không) | Unit → `in_stock`, hoặc tạo unit mới nếu không có serial |

- `reason` bắt buộc.
- `image_url` tùy chọn (ảnh minh chứng).

#### Bước 2: Duyệt — QL (khác người tạo)

- **Lưu ý**: `PESSIMISTIC_WRITE` khi đọc unit để apply — tránh xung đột với export approve trên cùng unit.
- 4-eyes bắt buộc (`created_by ≠ approved_by`).

| Loại | Tác động |
|------|----------|
| DAMAGED | `unit.status` → `damaged_in_storage` |
| LOST | `unit.status` → `lost` |
| FOUND (có unit) | `unit.status` → `in_stock` (chỉ nếu đang ở LOST/REMOVED/DAMAGED_IN_STORAGE) |
| FOUND (không unit) | Tạo `ProductUnit` mới với serial `FOUND-{adjust_code}` |

**Edge case — Found không thể restore:**
Nếu unit đang ở `sold`/`disposed`/`returned_to_supplier` — chặn, báo "Unit không thể khôi phục từ trạng thái này".

### 5.3 Sơ đồ trạng thái StockAdjustment

```
pending → approved (terminal, áp dụng thay đổi)
        → rejected (terminal, không thay đổi)
```

---

## 6. Bảo hành

### 6.1 Flow tổng quát

```
Khách báo lỗi → NV/SALES tạo warranty_request
  → STOCK nhận hàng + kiểm tra (xác nhận lỗi / từ chối)
  → QL duyệt resolution (REPAIR / REPLACE / REFUND / REJECT)
  → Thực thi resolution
```

### 6.2 Chính sách bảo hành

- **Bảo hành kích hoạt lúc xuất/bán**: `warranty_start_date = ngày duyệt phiếu xuất (reason=sale)`, không phải lúc nhập kho.
- **Kế thừa hạn BH khi đổi serial thay thế**: giữ nguyên `warranty_start_date` gốc, không reset.
- **Warranty khi unit trả về rồi bán lại lần 2**:
  - Khi `return_receipt` approved với `resulting_action=RESTOCK` → set `is_warranty_active=false` (giữ nguyên giá trị cũ để audit).
  - Khi bán lại (export mới) → set lại `warranty_start_date` mới.

### 6.3 Các bước chi tiết

#### Bước 1: Tiếp nhận — SALES

- Khách mang hàng + hoá đơn (hoặc tra cứu theo serial/đơn xuất).
- Check: serial có trong hệ thống? `status=sold`? Còn hạn BH (`warranty_expires_at > now`)?
- Nếu hết BH → từ chối tiếp nhận, hướng dẫn khách.

#### Bước 2: Nhận hàng + kiểm tra — STOCK

- STOCK nhận hàng từ khách, kiểm tra ngoại quan.
- Nhập kết quả kiểm tra:
  - `check_result`: CONFIRMED / REJECTED (không lỗi, không BH)
  - `check_note`
- Tạo `ProductUnitStatusLog`: `sold → under_repair` hoặc `sold → sent_to_manufacturer`.

#### Bước 3: Đề xuất resolution + duyệt — QL

| Resolution | Mô tả | Hậu quả |
|------------|-------|---------|
| `REPAIR` | Sửa tại kho (hoặc gửi NCC) | Unit giữ `under_repair`, khi xong → `in_stock`. Nếu gửi NCC: → `sent_to_manufacturer` |
| `REPLACE` | Đổi serial mới | Tạo export `reason=internal`, `sell_price=0`. Unit mới → `sold`. **Kế thừa `warranty_start_date` gốc** |
| `REFUND` | Hoàn tiền | Unit → `returned`. ExportReceipt có `refund_amount`. Liên quan `return_receipts` |
| `REJECT` | Từ chối BH | Unit → `sold`, trả về khách. Ghi rõ lý do |

#### Bước 4: Thực thi — STOCK

- REPAIR: sửa xong → chuyển `under_repair → in_stock`.
- REPLACE: lấy unit mới từ kho → xuất `internal` với `sell_price=0`, `warranty_start_date` kế thừa.
- REFUND: unit → `returned`. Khách nhận tiền.

**Edge case — Chuỗi đổi BH lặp:**
Cảnh báo (không chặn) nếu 1 serial gốc đã qua >2 lần đổi.

### 6.4 Sơ đồ trạng thái WarrantyRequest

```
pending → received → under_evaluation → resolved (terminal: repaired / replaced / refunded / rejected)
```

---

## 7. Trả hàng khách

### 7.1 Flow tổng quát

```
Khách muốn trả hàng (đổi ý / lỗi / sai hàng)
  → SALES tạo return_receipt (link đơn xuất gốc)
  → STOCK kiểm tra condition
  → QL duyệt (4-eyes) → COMPLETED (áp dụng tác động)
  → QL từ chối → CANCELLED
```

### 7.2 Các bước chi tiết

#### Bước 1: Tạo phiếu trả — SALES

- Chọn lý do trả:

| Reason | Mô tả | Điều kiện |
|--------|-------|-----------|
| `CHANGE_MIND` | Khách đổi ý, không lỗi | Trong vòng N ngày kể từ `export_receipt.approved_at` (số ngày cụ thể cần chốt với business) |
| `DEFECTIVE` | Hàng lỗi kỹ thuật | Còn hạn BH (warranty) |
| `WRONG_ITEM` | Giao sai hàng | Không giới hạn thời gian |

- Link `original_export_receipt_id` (bắt buộc).
- Trạng thái: `PENDING_APPROVAL`.

#### Bước 2: Kiểm tra condition — STOCK

| Condition | Mô tả | Hậu quả |
|-----------|-------|----------|
| `GOOD` | Hàng còn nguyên vẹn | → `RESTOCK`: unit → `in_stock`. Nếu đã có `is_warranty_active=true` → set `false`. |
| `DEFECTIVE` | Hàng có lỗi | → `SCRAP`: unit → `disposed`. Hoặc `WARRANTY_TRANSFER`: chuyển sang `warranty_requests`. |

#### Bước 3: Duyệt — QL (khác người tạo)

| Hành động | Tác động |
|-----------|----------|
| Duyệt | Áp dụng `resulting_action` (RESTOCK / SCRAP / WARRANTY_TRANSFER). Tạo `ProductUnitStatusLog`. |
| Từ chối | `CANCELLED`. Unit giữ nguyên `sold`. |

### 7.3 State machine ProductUnit (liên quan trả hàng)

```
sold → returned (return_receipt completed)
     → in_stock  (nếu GOOD + RESTOCK)
     → disposed  (nếu DEFECTIVE + SCRAP)
     → defective (nếu DEFECTIVE + WARRANTY_TRANSFER)
```

---

## 8. Điều chỉnh giá nhập

### 8.1 Flow tổng quát

```
NV/QL tạo price_adjustment (link import_receipt_item, ghi giá cũ→mới + lý do)
  → PENDING_APPROVAL
  → QL duyệt (4-eyes) → APPROVED: update cost_price cho unit còn in_stock
  → QL từ chối → REJECTED
```

### 8.2 Nguyên tắc

- **KHÔNG sửa trực tiếp** `import_receipt_items.unit_price` — luôn tạo adjustment record, duyệt xong mới áp dụng.
- Chỉ áp dụng cho `ProductUnit` còn `in_stock` (prospective, không hồi tố).
- Unit đã bán giữ nguyên `cost_price` cũ — COGS quá khứ không thay đổi.

### 8.3 Các bước chi tiết

#### Bước 1: Tạo phiếu — NV / QL

- Chọn `import_receipt_item_id` (dòng nhập gốc — không sửa được sau khi tạo).
- Hệ thống hiển thị `old_unit_price` từ dòng nhập.
- Nhập `new_unit_price` (phải khác giá cũ) + `reason` bắt buộc.
- Trạng thái: `PENDING_APPROVAL`.

#### Bước 2: Duyệt — QL (khác người tạo)

- Khi APPROVED:
  - Update `cost_price` của tất cả `ProductUnit` còn `in_stock` thuộc `import_receipt_item` đó.
  - Batch update: `UPDATE product_units SET cost_price = ? WHERE import_receipt_item_id = ? AND status = 'in_stock'`.
- Audit: `PRICE_ADJUSTMENT_APPROVED`.

### 8.4 Giá bán (sell_price) — không cần duyệt

- NV sửa `sell_price` trên sản phẩm bất kỳ lúc.
- Ghi vào `sell_price_history`: `product_id, old_price, new_price, changed_by, changed_at`.
- Không ảnh hưởng giá xuất đã xảy ra.

### 8.5 Sơ đồ trạng thái PriceAdjustment

```
pending_approval → approved (terminal, update cost_price in_stock units)
                 → rejected (terminal, không thay đổi)
```

---

## 9. Cấu trúc dữ liệu tham chiếu

### 9.1 Thêm/sửa so với domain model hiện tại

#### `warehouses`

```sql
CREATE TABLE warehouses (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL  -- "Kho chính"
);
```

Thêm `warehouse_id` (FK) vào: `locations`, `import_receipts`, `export_receipts`, `stock_adjustments`, `stock_checks`.

#### `price_adjustments` (giữ nguyên V10 nhưng bổ sung)

```sql
ALTER TABLE price_adjustments
  ADD COLUMN import_receipt_item_id BIGINT NOT NULL;
-- KHÔNG sửa trực tiếp import_receipt_items.unit_price khi approve
-- Chỉ update cost_price của ProductUnit còn in_stock
```

#### `sell_price_history` (bảng mới)

```sql
CREATE TABLE sell_price_history (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    product_id BIGINT NOT NULL,
    old_price DECIMAL(15,2) NOT NULL,
    new_price DECIMAL(15,2) NOT NULL,
    changed_by BIGINT NOT NULL,
    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

#### `return_receipts` + `return_receipt_items` (bảng mới)

```sql
CREATE TABLE return_receipts (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    receipt_code VARCHAR(32) NOT NULL UNIQUE,
    customer_id BIGINT NOT NULL,
    original_export_receipt_id BIGINT NOT NULL,
    reason VARCHAR(20) NOT NULL,          -- CHANGE_MIND / DEFECTIVE / WRONG_ITEM
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING_APPROVAL',
    created_by BIGINT NOT NULL,
    approved_by BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP
);

CREATE TABLE return_receipt_items (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    return_receipt_id BIGINT NOT NULL,
    product_unit_id BIGINT,
    quantity INT COMMENT 'cho bulk',
    condition VARCHAR(20) NOT NULL,       -- GOOD / DEFECTIVE
    resulting_action VARCHAR(20) NOT NULL -- RESTOCK / SCRAP / WARRANTY_TRANSFER
);
```

#### `import_receipt_items` — thêm field

```sql
ALTER TABLE import_receipt_items
  ADD COLUMN supplier_batch_no VARCHAR(100) COMMENT 'Mã lô NCC (tuỳ chọn)';
```

#### `ProductUnit` — thêm field

```sql
ALTER TABLE product_units
  ADD COLUMN cost_price DECIMAL(15,2) COMMENT 'Snapshot từ import_receipt_item.unit_price lúc nhập',
  ADD COLUMN is_warranty_active BOOLEAN DEFAULT TRUE;
```

#### `export_receipts` — thêm field

```sql
ALTER TABLE export_receipts
  ADD COLUMN total_cogs DECIMAL(15,2) COMMENT 'Tổng cost_price của unit thực xuất';
```

### 9.2 Phân quyền duyệt khi QL vắng

Không cần bảng/field mới — **Admin đảm nhiệm duyệt thay** mọi loại phiếu khi QL vắng mặt. Admin vốn đã có quyền duyệt theo RBAC.

---

## 10. Phạm vi loại trừ

Các mục sau **không thuộc phạm vi SOP này**:

- Multi-warehouse / chuyển kho (stock transfer) — để dành khi có kho thứ 2.
- Ký gửi (consignment) — không áp dụng.
- Giao hàng / ship — tính từ lúc hàng rời kho.
- Tồn đầu kỳ — không cần (chưa go-live).
- Tích hợp hoá đơn kế toán — sổ sách làm tách biệt ngoài hệ thống.
- Backorder tự động — chỉ ghi chú thủ công (xuất thiếu).
