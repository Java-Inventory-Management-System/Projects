# SOP Quy trình nghiệp vụ — Hệ thống Quản lý Kho Linh Kiện Máy Tính

> Tài liệu quy trình chuẩn (SOP) cho 7 luồng nghiệp vụ chính.
> Dùng để training nhân viên và làm căn cứ cho dev sửa hệ thống.
> Mọi quyết định nghiệp vụ dưới đây đã được chốt qua phân tích — không hỏi lại.

---

> **Ký hiệu trong sơ đồ ASCII:** UPPERCASE trong box (vd `PENDING_APPROVAL → COMPLETED`) khớp với giá trị enum trong `01-domain-model.md` §1 ERD. Tất cả enum status đều lưu dạng UPPERCASE trong DB.

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
- Vị trí kho 3 cấp: `zone → shelf → bin`. Quy ước zone: 1 ký tự A–E (mở rộng A–Z), shelf 2 số, bin 3 ký tự.
- Chưa go-live — không có tồn cũ, không cần migrate. ADMIN seed warehouse + danh mục + users đầu tiên.
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

### 1.3.1 Bảng phân quyền chi tiết theo chức năng

> Bảng tóm lược ở trên là bản rút gọn theo luồng nghiệp vụ. Bảng dưới đây liệt kê đầy đủ theo từng chức năng cụ thể, bao gồm cả các chức năng ngoài 7 luồng chính (quản lý user, cấu hình hệ thống, xem audit log...).

> **Cập nhật:** Admin được tách thành vai trò *giám sát + quản trị hệ thống*. Ở phạm vi **setup infra** (warehouse, location, danh mục, người dùng, cấu hình), ADMIN có toàn quyền (✅). Ở phạm vi **nghiệp vụ** (nhập/xuất/kiểm kê/BH/trả hàng...), ADMIN chỉ giám sát, không khởi tạo giao dịch (❌). Các dòng có dấu `*` áp dụng ràng buộc `created_by ≠ approved_by` — người duyệt không được là người đã tạo phiếu, bất kể role.

| Chức năng | ADMIN | MANAGER | STOCK | SALES |
|-----------|-------|---------|-------|-------|
| Quản lý người dùng | ✅ CRUD | ❌ | ❌ | ❌ |
| Xem audit log | ✅ Tất cả (giám sát) | ✅ Vận hành trong ca của mình | ❌ | ❌ |
| Cấu hình hệ thống (ngưỡng dead-stock, tồn âm) | ✅ | ❌ | ❌ | ❌ |
| CRUD danh mục (SP, DM, NCC) | ✅ (setup infra) | ✅ (vận hành) | ❌ | ❌ |
| Quản lý warehouse | ✅ (setup infra) | ✅ (vận hành) | ❌ | ❌ |
| Quản lý vị trí kho | ✅ (setup infra) | ✅ (vận hành) | ❌ | ❌ |
| Quản lý khách hàng | ❌ | ✅ | ✅ Xem + thêm | ✅ Xem + thêm |
| Tạo phiếu nhập | ❌ | ✅ | ✅ | ❌ |
| Duyệt phiếu nhập * | ✅ (escalation) | ✅ * | ❌ | ❌ |
| Sửa serial sau nhập | ❌ | ✅ | ❌ | ❌ |
| Tạo phiếu xuất | ❌ | ✅ | ✅ | ✅ |
| Duyệt phiếu xuất * | ✅ (escalation) | ✅ * | ❌ | ❌ |
| Hủy phiếu nhập/xuất | ✅ (backup) | ✅ | ❌ | ❌ |
| Xem tồn kho | ✅ | ✅ | ✅ | ✅ |
| Điều chỉnh min_stock | ✅ (cấu hình) | ✅ | ❌ | ❌ |
| Sửa giá bán (sell_price) | ❌ | ✅ | ✅ | ✅ |
| Tạo phiếu kiểm kê | ❌ | ✅ | ❌ | ❌ |
| Duyệt kiểm kê lệch * | ✅ (escalation) | ✅ * | ❌ | ❌ |
| Tạo phiếu điều chỉnh tồn thủ công | ❌ | ✅ | ✅ (cần duyệt) | ❌ |
| Duyệt phiếu điều chỉnh tồn thủ công * | ✅ (escalation) | ✅ * | ❌ | ❌ |
| Tra cứu bảo hành | ✅ | ✅ | ✅ | ✅ |
| Xử lý bảo hành (đổi/sửa/từ chối) | ❌ | ✅ | ✅ (tiếp nhận, kiểm tra) | ✅ (tiếp nhận) |
| Dashboard & Báo cáo | ✅ (chỉ xem) | ✅ | ❌ | ❌ |
| Tạo phiếu trả hàng | ❌ | ❌ | ❌ | ✅ |
| Duyệt phiếu trả hàng * | ✅ (escalation) | ✅ * | ❌ | ❌ |
| Tạo phiếu điều chỉnh giá nhập | ❌ | ✅ | ✅ | ❌ |
| Duyệt phiếu điều chỉnh giá nhập * | ✅ (escalation) | ✅ * | ❌ | ❌ |
| Tạo/Sửa PO | ❌ | ✅ | ❌ | ❌ |
| Hủy PO | ❌ | ✅ | ❌ | ❌ |

> **Lưu ý phạm vi — quyền ADMIN "Điều chỉnh min_stock":** Dòng "Điều chỉnh min_stock" là ngoại lệ có chủ đích — ADMIN chỉ được sửa duy nhất field `min_stock` (ngưỡng cảnh báo), KHÔNG được sửa các field catalog khác của `products` (tên, giá, mô tả, tracking_type...). Service layer cần enforce field-level, không mở rộng thành quyền CRUD product đầy đủ cho ADMIN.

**\*** Ràng buộc `created_by ≠ approved_by`: nếu Manager là người tạo phiếu, họ không được tự duyệt phiếu đó — hệ thống tự động escalate lên Admin. Nếu doanh nghiệp có từ 2 Manager trở lên, một Manager khác cũng có thể duyệt thay cho nhau, không bắt buộc phải là Admin.

### 1.4 Tracking type (phân loại theo đơn vị tính)

| Tracking | Unit | Đặc điểm |
|----------|------|----------|
| **Serialized** | PIECE, BOX, SET | Mỗi đơn vị có serial number riêng, theo dõi từng cái |
| **Bulk** | METER, KG | Theo dõi theo số lượng tồn (`remaining_quantity`), không serial |

Mapping này hard-code trong Service layer, thêm UOM mới = sửa code (đã chốt chấp nhận).

---

## 2. Nhập kho

### 2.1 Flow tổng quát — 2 phase, 2 role

```
PHASE 1 — MANAGER (Bước 1-2)
  Tạo phiếu (NCC, SP, SL, giá) → POST /import-receipt → PENDING

PHASE 2 — STOCK (Bước 3-4)
  Nhập serial + QC + location → PUT /import-receipts/{id}/submit → PENDING_APPROVAL

APPROVAL — MANAGER
  ├── Duyệt → COMPLETED (cộng tồn kho = qcPassQuantity)
  └── Từ chối → PENDING (Stock sửa lại, kèm lý do từ chối)

HUỶ (MANAGER/ADMIN)
  PENDING / PENDING_APPROVAL → CANCELLED (huỷ thủ công, units → REMOVED)
  COMPLETED → CANCELLED (hủy muộn, chỉ khi 100% units chưa xuất)
```

### 2.2 Các bước chi tiết

#### PHASE 1 — MANAGER: Bước 1-2

**Route:** `/stock/imports` (không id) — Step 1-2, Wizard 2 bước.

##### Bước 1: Nhà cung cấp & chứng từ

- Chọn NCC — validated: NCC phải tồn tại trong DB và đang `ACTIVE`.
- Link `purchase_order_id` nếu có (tùy chọn). Nếu PO đã COMPLETED → **chặn link**, báo "PO đã hoàn thành".
- Nhập ngày nhập, số chứng từ (hoá đơn NCC).
- Sidebar hiển thị sản phẩm nhập gần đây, hàng sắp hết.

##### Bước 2: Chọn sản phẩm & số lượng

- Chọn sản phẩm (tìm kiếm/dropdown), nhập:
  - `quantity` — số lượng dự kiến
  - `unit_price` — giá nhập (Manager field)
  - `warranty_months` — tháng BH (Manager field)
- **Cho phép nhiều dòng cùng 1 `product_id`** trong cùng phiếu (nhiều đợt hàng phụ cùng SP với giá vốn khác nhau).
- Nút **"Tạo phiếu"** → `POST /import-receipt` → status `PENDING`.
  - Payload KHÔNG gửi serial, KHÔNG gửi QC — đây là dữ liệu Phase 2.
  - **Giá nhập lệch so với PO**: cảnh báo mềm (không chặn) nếu lệch >10% so với `purchase_order_items.unit_price`, bắt buộc ghi note khi lệch.
- Sau khi tạo thành công → navigate về danh sách (Manager thấy phiếu vừa tạo).

**Manager có thể in phiếu từ detail page** — phiếu in chỉ hiển thị sản phẩm + số lượng (không serial), Stock cầm giấy đối chiếu khi nhận hàng.

#### PHASE 2 — STOCK: Bước 3-4

**Route:** `/stock/imports/:id` (có id) — load receipt `PENDING`, Wizard 2 bước.

Hiển thị banner readonly thông tin phiếu (NCC, ngày, sản phẩm + số lượng dự kiến) — Stock đối chiếu với hàng thực tế.

##### Bước 3: Nhập serial

- Mỗi item hiển thị dòng với: tên sản phẩm, `expectedQuantity` (số lượng dự kiến), progress `receivedQuantity / expectedQuantity` màu neutral (vàng/cam).
- Dùng **ChipInput**: Enter/Tab thêm chip, Backspace xóa, Paste tự động tách.
- File upload hỗ trợ validate:
  - **>20% dòng lỗi** (trùng nội bộ + DB) → chặn toàn bộ, yêu cầu sửa file.
  - **≤20%** → skip dòng lỗi, giữ dòng đúng, hiển thị danh sách bị bỏ qua.
- **KHÔNG giới hạn số serial nhập** — Stock nhập đúng số thực tế, có thể thiếu hoặc dư so với expectedQuantity (xem Case 1+2 bên dưới).
- **0 serial cho 1 item**: Stock phải chủ động đánh dấu `itemStatus = NOT_RECEIVED` (optional text lý do) — nếu không, block submit.
- **Nút "Ghi chú sản phẩm ngoài dự kiến"**: mở textarea nhập `discrepancyNotes` — mô tả + số lượng ước tính (bắt buộc nếu phát hiện hàng lạ). Không tạo serial, không tạo item chính thức.
- Location picker: Stock chọn vị trí kho cho từng sản phẩm (hoặc để auto-assign sau submit).

##### Bước 4: Kiểm tra chất lượng (QC) & xác nhận

- Mỗi serial có 3 kết quả QC:
  - **Pass** → `IN_STOCK` (vào tồn khả dụng sau approve).
  - **FAIL_HARDWARE** (lỗi phần cứng — chết chip, lỗi nguồn) → `DEFECTIVE`, ghi chú `"DOA - phát hiện lúc nhập"`, đi nhánh trả NCC nhanh.
  - **FAIL_ACCESSORY** (thiếu phụ kiện — ốc, cáp, IO shield) → giữ trạng thái, chờ bổ sung rồi re-QC, không chuyển DEFECTIVE.
- QC records **tự động sync với serials Step 3**: nếu Stock quay lại Step 3 xoá serial → khi vào lại Step 4, QC record tương ứng bị xoá.
- **Item 0 serial + đánh dấu NOT_RECEIVED**: không có QC record cho item đó, không block submit.
- Progress hiển thị: `qcPassQuantity / receivedQuantity` từng item.
- Nút **"Xác nhận"** → `PUT /import-receipts/{id}/submit`
  - Validate: MỌI item phải thoả 1 trong 2: (a) có ≥1 serial, (b) đã chọn NOT_RECEIVED.
  - Chỉ gửi danh sách serial thực tế + kết quả QC — không gửi expectedQuantity.
  - Ghi `discrepancyNotes` nếu có (phát hiện hàng ngoài phiếu).
- Sau submit → navigate về danh sách, phiếu chuyển `PENDING_APPROVAL`.

### 2.3 Xử lý lệch số lượng

#### Case 1+2: Giao thiếu / giao dư (actual khác expected, cùng product)
- ChipInput KHÔNG giới hạn số lượng nhập.
- Progress "đã nhập / dự kiến" màu neutral (không đỏ).
- Submit gửi danh sách serial thực tế (BE tự đếm `receivedQuantity`).
- Manager approve KHÔNG block dù lệch số — tự quyết định.

#### Case 3a: Lẫn sản phẩm trong danh sách đã chọn
- Stock nhập đúng serial vào ChipInput của item tương ứng. Không cần xử lý đặc biệt.

#### Case 3b: Giao sản phẩm KHÔNG có trong phiếu
- Stock KHÔNG được tự thêm item mới vào receipt.
- **Bắt buộc** ghi `discrepancyNotes` qua nút phụ "Ghi chú sản phẩm ngoài dự kiến".
- Hiển thị banner cảnh báo cho Manager lúc approve.
- Xử lý tiếp (trả hàng, tạo phiếu bổ sung) là flow riêng.

#### Case 4: Serial trùng lặp
- Client-side: ChipInput chặn ngay khi gõ/paste serial đã có trong danh sách hiện tại.
- Server-side (lúc submit): validate serial không trùng với DB (case-insensitive). Trả lỗi cụ thể kèm receiptId + ngày.

#### Case 5: 0 serial cho 1 sản phẩm
- Stock phải chủ động chọn `itemStatus = NOT_RECEIVED` (optional lý do).
- Submit block nếu có item 0 serial chưa đánh dấu.

### 2.4 Phân biệt form nhập theo role

| Field | MANAGER (Phase 1) | STOCK (Phase 2) |
|-------|-------------------|-----------------|
| Nhà cung cấp | ✅ Xem/chọn | ❌ Đọc (banner readonly) |
| Ngày nhập / Số chứng từ | ✅ | ❌ Đọc |
| Sản phẩm + Số lượng dự kiến | ✅ | ❌ Đọc |
| Đơn giá | ✅ | ❌ Ẩn |
| Bảo hành (tháng) | ✅ | ❌ Ẩn |
| Vị trí kho | ❌ (chưa nhập) | ✅ Gán |
| Serial | ❌ (Phase 2) | ✅ Nhập |
| QC | ❌ (Phase 2) | ✅ Kiểm tra |
| Ghi chú | ✅ | ✅ |
| Xác nhận nhận đủ (NOT_RECEIVED) | ❌ | ✅ |
| discrepancyNotes | ❌ | ✅ |

### 2.5 Data model — 4 field số lượng trên ImportReceiptItem

Mỗi item chứa 4 field tách biệt (không gộp):

| Field | Mô tả | Set khi |
|-------|-------|---------|
| `expected_quantity` | Số lượng dự kiến Manager nhập | Phase 1 create |
| `received_quantity` | = count(serials) thực tế | Phase 2 submit (BE tự tính) |
| `qc_pass_quantity` | = count(serials có QC = Pass) | Phase 2 submit |
| `qc_fail_quantity` | = count(serials có QC = Fail) | Phase 2 submit |

**Cộng tồn kho lúc approve (COMPLETED) CHỈ dùng `qc_pass_quantity`, không dùng 3 field còn lại.**

### 2.6 Sơ đồ trạng thái ImportReceipt

```
PENDING → PENDING_APPROVAL → COMPLETED (terminal, cộng tồn = qc_pass_quantity)
                           → PENDING (Manager từ chối, kèm lý do)
PENDING / PENDING_APPROVAL → CANCELLED (huỷ thủ công, units → REMOVED)
COMPLETED → CANCELLED (hủy muộn, chỉ khi 100% units chưa xuất)
```

### 2.7 Điều kiện duyệt / từ chối

| Hành động | Điều kiện | Kết quả |
|-----------|-----------|---------|
| Duyệt (→ COMPLETED) | `created_by ≠ approved_by` | Cộng tồn = `qc_pass_quantity`. Nếu có PO → cập nhật `received_quantity` (atomic). |
| Từ chối (→ PENDING) | `created_by ≠ approved_by`, kèm `reject_reason` | Serial + QC đã nhập giữ nguyên — Stock sửa lại và resubmit. |
| Huỷ thủ công (→ CANCELLED) | MANAGER hoặc ADMIN | Tất cả `ProductUnit` → `REMOVED` (terminal). |

### 2.8 Huỷ phiếu đã COMPLETED (hủy muộn)

- **Điều kiện**: 100% `ProductUnit` sinh từ phiếu đó đang ở `IN_STOCK` (chưa xuất):
  - Serialized: chưa xuất hiện trong `export_receipt_item_units`.
  - Bulk: `remaining_quantity = initial_quantity`.
- **Hậu quả**: Tất cả unit → `REMOVED`. Nếu có link PO → rollback `received_quantity` + tính lại PO status.
- **Không thể khôi phục** — thao tác terminal.

**Edge case — Race condition received_quantity:**
Khi 2 phiếu nhập cùng link 1 PO duyệt gần đồng thời, dùng `UPDATE received_quantity = received_quantity + ?` (atomic), không đọc-rồi-ghi.

**Edge case — NCC giao dư (over-receipt):**
Cho phép ghi nhận số lượng thực tế (có thể lớn hơn PO). Không tự động cộng vượt `received_quantity` của PO — chỉ ghi nhận số dư như nhập không PO.

---

## 3. Xuất kho

### 3.1 Flow tổng quát

```
SALES/STOCK tạo phiếu xuất (reason + items)
  → Hệ thống check tồn + FIFO chọn serial
  → NV có thể override serial (bắt buộc lý do)
  → PENDING_APPROVAL
     ├── QL duyệt → COMPLETED (units → SOLD, ghi warranty nếu sale)
     └── QL từ chối → CANCELLED (units giải phóng)
```

### 3.2 Các bước chi tiết

#### Bước 1: Tạo phiếu xuất — SALES / STOCK / QL

- Chọn lý do xuất (bắt buộc):

| Reason | Mô tả | Yêu cầu thêm |
|--------|-------|-------------|
| `SALE` | Bán cho khách | Bắt buộc `customer_id` (khách phải tồn tại trong DB, active) |
| `INTERNAL` | Sử dụng nội bộ (demo, gift, sample) | Không cần customer |
| `RETURN_SUPPLIER` | Trả NCC | Không cần customer. Xem mục 3.7 để biết theo dõi hậu trả NCC. |
| `DISPOSE` | Thanh lý/huỷ | Không cần customer |

- Chọn sản phẩm + số lượng cần xuất.
- Hệ thống kiểm tra tồn khả dụng ngay: `SUM(remaining_quantity WHERE status='IN_STOCK')`.
  - Nếu thiếu → báo số lượng tối đa có thể xuất, cho xuất partial.
  - **Không cho phép tồn âm** với hàng serialized. Với bulk, giữ chặn cứng — không mở ở phase 1.

#### Bước 2: Hệ thống chọn serial theo FIFO + NV override

- Mặc định: `SELECT ... WHERE status='IN_STOCK' ORDER BY imported_at ASC, id ASC`.
- **Tie-break**: nếu `imported_at` trùng millisecond → sort phụ theo `id ASC`.
- NV có thể **override serial** được chọn:
  - Chọn serial khác từ danh sách tồn của sản phẩm đó.
  - **Bắt buộc nhập lý do** override (ghi vào audit log của phiếu xuất).

#### Bước 3: Reserve (giữ chỗ) — transaction ngắn

- Trong 1 transaction ngắn:
  - `SELECT ... FOR UPDATE` (PESSIMISTIC_WRITE) các unit sẽ xuất.
  - **Serialized:** đổi status từ `IN_STOCK` → `RESERVED`.
  - **Bulk:** cộng dồn `reserved_quantity` (không đổi status). Tồn khả dụng cho FIFO = `remaining_quantity - reserved_quantity`.
  - **Bắt buộc atomic ở tầng DB**: thao tác kiểm tra tồn khả dụng và cộng `reserved_quantity` cho bulk phải nằm trong **cùng 1 câu lệnh UPDATE có điều kiện**, không tách thành "SELECT kiểm tra → UPDATE cộng" (2 câu riêng). Ví dụ:
    ```sql
    UPDATE product_units
    SET reserved_quantity = reserved_quantity + :qty
    WHERE id = :unitId
      AND remaining_quantity - reserved_quantity >= :qty
    ```
    Nếu số dòng ảnh hưởng = 0 → coi như hết tồn khả dụng, báo lỗi cho NV chọn số lượng khác. Đây là điều kiện bắt buộc để tránh double-booking cho bulk — tương tự bug double-booking serialized đã fix ở trên, chỉ khác cơ chế (không dùng `PESSIMISTIC_WRITE` mà dùng UPDATE điều kiện vì bulk không có 1 row/unit riêng để lock).
  - Commit ngay — release lock.
- Phiếu → `PENDING_APPROVAL`.
- Các FIFO query sau tự động bỏ qua:
  - Serialized: filter `status NOT IN ('RESERVED', ...)`.
  - Bulk: filter `(remaining_quantity - reserved_quantity) > 0`.

#### Bước 4: QL duyệt / từ chối — QL (khác người tạo)

| Reason | Hành động | Điều kiện | Kết quả |
|--------|-----------|-----------|---------|
| SALE / INTERNAL | Duyệt | `created_by ≠ approved_by` | Unit → `SOLD`. Nếu `reason=SALE`: set `warranty_start_date=now`, `warranty_expires_at=now + warranty_months`. |
| SALE / INTERNAL | Từ chối | `created_by ≠ approved_by` | Unit → `IN_STOCK` (giải phóng reserve). Xoá warranty dates nếu đã set. |
| RETURN_SUPPLIER | Duyệt | `created_by ≠ approved_by` | Unit → `RETURNED_TO_SUPPLIER` (terminal). |
| RETURN_SUPPLIER | Từ chối | `created_by ≠ approved_by` | Unit → `IN_STOCK` (giải phóng reserve). |
| DISPOSE | Duyệt | `created_by ≠ approved_by`. Unit phải đang ở `DAMAGED_IN_STORAGE` — **chặn nếu unit đang `IN_STOCK`** (không cho thanh lý hàng còn tốt; nếu muốn thanh lý hàng còn tốt → điều chỉnh `DAMAGED_IN_STORAGE` trước, rồi xuất thanh lý). | Unit → `DISPOSED` (terminal). |
| DISPOSE | Từ chối | `created_by ≠ approved_by` | Unit → `DAMAGED_IN_STORAGE` (giải phóng reserve, quay lại trạng thái hỏng chờ xử lý). |

> **Bulk (`tracking_type=bulk`):** Các dòng nói "Unit → `SOLD`/`RETURNED_TO_SUPPLIER`/`DISPOSED`" ở trên áp dụng cho serialized. Với bulk:
> - Duyệt: trừ `remaining_quantity` đi số lượng xuất, đồng thời trừ `reserved_quantity` tương ứng của giao dịch này. Cả 2 câu UPDATE nên nằm trong cùng 1 atomic SQL (tương tự Bước 3) để tránh race. Sau khi trừ, nếu `remaining_quantity <= 0` → chuyển status từ `IN_STOCK` → `SOLD` (hoặc `RETURNED_TO_SUPPLIER`/`DISPOSED`). Điều kiện chuyển status **không** phụ thuộc vào `reserved_quantity` còn lại của các phiếu khác đang chờ duyệt trên cùng lot.
> - Từ chối: chỉ trừ `reserved_quantity` (hoàn trả lại tồn khả dụng), không đụng `remaining_quantity` và không đổi status.
>
> **Ngoại lệ — Warranty cho đổi hàng bảo hành (REPLACE):**
> Nếu `reason=INTERNAL` và phiếu phát sinh từ `resolution=REPLACE` (mục 6 — đổi hàng bảo hành), vẫn phải gán `warranty_start_date` / `warranty_expires_at`, nhưng **kế thừa từ unit gốc** (không set = now). Mục đích: giữ nguyên hạn BH của khách, không reset khi đổi serial thay thế.

> ⚠ **Check status trước khi approve**: Nếu unit đã chuyển sang `DAMAGED_IN_STORAGE`/`LOST`/`UNDER_REPAIR` (với SALE/INTERNAL) hoặc không còn `DAMAGED_IN_STORAGE` (với DISPOSE) giữa lúc create→approve → **chặn**, báo lỗi "Unit không còn khả dụng", không tự động set SOLD / DISPOSED ghi đè.

#### Bước 5: Thực hiện xuất hàng vật lý — STOCK

- STOCK xuống kho, lấy đúng serial/location theo phiếu.
- Với linh kiện nhạy tĩnh điện (mainboard, RAM, GPU, CPU...) → STOCK bắt buộc đóng gói lại bằng **túi chống tĩnh điện** trước khi giao. Đây là quy tắc vận hành vật lý áp dụng theo tên category/kinh nghiệm NV — không map vào cột DB nào (`esd_sensitive` không phải field trong `categories`). Không nhầm với `qc_level` (QC level chỉ điều khiển mức kiểm tra lúc nhập, không liên quan đóng gói).
- Nếu phát hiện thiếu hàng thực tế so với phiếu → theo **Flow xử lý xuất thiếu** dưới đây.

### 3.3 Flow xử lý xuất thiếu (tồn hệ thống ≠ tồn thực tế)

```
STOCK phát hiện thiếu (cần A, chỉ có B)
  → STOCK đánh dấu "phát hiện thiếu" trên màn hình xuất
  → Hệ thống tự tạo StockAdjustment (reason=LOST, link phiếu xuất gốc)
  → Phiếu xuất gốc chuyển trạng thái "exception" (tạm vướng)
  → QL duyệt adjustment (4-eyes) → tồn hệ thống sửa về B
  → Phiếu xuất gốc tự động sửa số lượng = B, xuất phần có sẵn
  → Phần thiếu (A-B): NV ghi chú thủ công ngoài hệ thống
```

### 3.4 Từ chối / hủy phiếu xuất

#### 3.4.1 Từ chối phiếu xuất (lúc PENDING_APPROVAL hoặc exception)

- **Điều kiện**: Chỉ từ chối được nếu phiếu đang `PENDING_APPROVAL` hoặc `exception`.
- Serialized: unit → `IN_STOCK` (hoặc `DAMAGED_IN_STORAGE` nếu xuất DISPOSE từ thiệt hại).
- Bulk: chỉ trừ `reserved_quantity` (không đụng `remaining_quantity`, không đổi status). Tồn khả dụng được hoàn trả.
- Ghi audit log #23.

#### 3.4.2 Hủy phiếu xuất đã COMPLETED (hủy muộn)

- **Điều kiện**: Chỉ hủy được nếu đơn vị hàng (unit) chưa đi tiếp quá trạng thái `SOLD`:
  - Serialized: chưa chuyển sang `UNDER_REPAIR` / `SENT_TO_MANUFACTURER` / `RETURNED` / `RETURNED_TO_SUPPLIER` / `DISPOSED`.
  - Bulk: `remaining_quantity` đang bằng số lượng đã xuất (có thể cộng lại).
- Nếu unit đã qua các trạng thái trên → **chặn**, báo lỗi "Unit đã qua xử lý tiếp theo, không thể revert".
- **Với serialized:**
  - Unit → `IN_STOCK`, giữ nguyên `imported_at` gốc (không phá FIFO).
  - Nếu phiếu xuất có `reason=sale` (đã kích hoạt bảo hành): reset `warranty_start_date` / `warranty_expires_at` về NULL (khớp US-13).
- **Với bulk:** trong cùng 1 transaction: cộng lại `remaining_quantity`; nếu `remaining_quantity > 0` thì đổi `SOLD → IN_STOCK`.
- Ghi audit log #6.

### 3.5 Gợi ý đặt hàng khi tồn thấp

- Khi 1 sản phẩm dưới `min_stock`, ngoài hiển thị trên dashboard/báo cáo, hệ thống gợi ý **gộp các sản phẩm sắp hết của cùng 1 nhà cung cấp** thành 1 đề xuất đặt hàng (PO nháp) — QL chỉ cần xác nhận thay vì tự tạo PO từ đầu.
- PO nháp này pre-fill: NCC, danh sách sản phẩm + số lượng đề xuất (đủ lên trên `min_stock` + dự phòng), `expected_date` gợi ý.

### 3.6 Gợi ý xử lý dead stock

- Khi 1 sản phẩm được gắn nhãn tồn quá hạn (>90 ngày — tham số cấu hình), hệ thống cần gợi ý hành động xử lý tiếp theo, không chỉ dừng ở gắn nhãn hiển thị:
  - **Đề xuất giảm giá bán** (giảm `sell_price` tạm thời) để kích cầu.
  - **Đề xuất thanh lý** nếu quá hạn lâu (>180 ngày) hoặc không còn khả năng bán.
  - Gợi ý hiển thị trên dashboard cho QL xem xét và ra quyết định.


### 3.7 Theo dõi sau trả NCC (RETURN_SUPPLIER)

- `export_receipts` thêm trạng thái xử lý NCC: `supplier_status`: `SENT` → `CONFIRMED_RECEIVED` → `PROCESSING` → `RESOLVED` (xem `01-domain-model.md` bảng `export_receipts`).
- `supplier_result`: `FULL_REFUND | PARTIAL_REFUND | REPLACEMENT | REJECTED` — set khi `supplier_status = RESOLVED`.
- Mỗi lần NCC cập nhật trạng thái → ghi audit log (xem RQ-60/US-51).
- Dashboard hiển thị các phiếu chưa `RESOLVED` để QL theo dõi.

#### Truy vết về phiếu nhập gốc

- Thêm cột **`source_import_receipt_id`** (nullable FK → `import_receipts.id`) vào bảng `export_receipts` — chỉ dùng cho `reason=RETURN_SUPPLIER`. Mỗi `ProductUnit` vốn đã biết mình sinh ra từ `import_receipt_item_id` nào (qua `import_receipt_items` → `import_receipts`), nhưng expose trực tiếp trên phiếu xuất giúp tra cứu ngược nhanh mà không cần JOIN nhiều lớp.
  - Không tạo bảng `ImportReturn` riêng như đề xuất cũ ở `08-inventory-analysis.md` — quá nặng so với quy mô 1 kho nhỏ.
- Khi NV tạo phiếu xuất `reason=RETURN_SUPPLIER`, hệ thống tự động gợi ý điền `source_import_receipt_id` bằng cách tra ngược từ các `ProductUnit` được chọn:
  1. Lấy `import_receipt_item_id` từ mỗi `ProductUnit`.
  2. JOIN `import_receipt_items` → `import_receipts.id`.
  3. Nếu tất cả unit cùng thuộc 1 phiếu nhập → tự điền. Nếu khác phiếu → để trống, NV chọn thủ công.
- **Báo cáo đơn giản:** màn hình "Xem các lần trả NCC theo phiếu nhập gốc" — lọc `export_receipts` theo `source_import_receipt_id`, hiển thị danh sách các lần trả của lô đó (ngày trả, số lượng, lý do, kết quả xử lý từ NCC). Mục đích: phát hiện NCC có vấn đề lặp lại theo lô.

### 3.8 Sơ đồ trạng thái ExportReceipt

```
PENDING_APPROVAL → COMPLETED (terminal)
                 → CANCELLED (terminal, units → IN_STOCK, xem §3.4.1)
                 → exception (chờ xử lý thiếu)
exception → COMPLETED (sau khi adjustment LOST được duyệt)
COMPLETED → CANCELLED (có điều kiện, xem §3.4.2)
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
Mỗi phiếu kiểm kê có thời hạn tối đa **1 ngày làm việc** kể từ lúc tạo. Quá hạn mà chưa hoàn thành đếm → hệ thống tự động đóng phiếu (huỷ do hết hạn), NV phải tạo phiếu mới.

> **Lưu ý:** Đây **KHÔNG phải** giới hạn số lượng phiếu/ngày. Vẫn có thể tạo nhiều phiếu cho các zone khác nhau trong cùng 1 ngày, miễn zone đó chưa có phiếu đang active (theo rule chặn trùng phạm vi ở Bước 1).

**Edge case — Serial đúng, sai vị trí:**
Tách nhánh riêng "sai lệch vị trí" — chỉ update `location_id`, không tạo `ProductUnit` mới, không tính là UNEXPECTED.

#### Thao tác riêng: Chuyển vị trí nội bộ (RELOCATE) — NV / QL

- NV/QL có thể chuyển 1 `ProductUnit` sang location khác **bất kỳ lúc nào**, không cần chờ tới đợt kiểm kê.
- Chọn unit → chọn location mới → xác nhận.
- **Không cần duyệt 4-eyes** (không ảnh hưởng số lượng/giá trị tồn kho, chỉ đổi vị trí vật lý).
- Ghi `ProductUnitStatusLog` với `source_type='RELOCATE'` (từ location cũ → mới, ai làm, lúc nào).
- Hệ thống kiểm tra location mới có `is_active=true` và còn capacity (cảnh báo mềm, không chặn).
- **Chặn cứng** nếu zone đích đang có phiếu kiểm kê `IN_PROGRESS` hoặc `PENDING` — báo lỗi "Zone đang được kiểm kê, không thể relocate. Chờ kiểm kê xong hoặc tạo phiếu relocate sau."

#### Bước 3: Kết thúc đếm → COMPLETED — NV

- NV xác nhận hoàn thành kiểm kê cho zone/phạm vi.
- Phiếu → `COMPLETED`.

#### Bước 4: Duyệt kết quả — QL / AD

- QL (khác người tạo) duyệt:
  - **MISSING**: chuyển `ProductUnit.status` → `LOST`. Tạo `ProductUnitStatusLog`.
  - **UNEXPECTED** (có serial trong DB): cập nhật `status` theo thực tế.
  - **UNEXPECTED** (serial mới, chưa trong DB): tạo `ProductUnit` mới, ghi `found during stock check`.
  - **Sai vị trí**: update `location_id`, không đổi status.
- QL từ chối → `REJECTED`, không áp dụng thay đổi nào.

**Edge case — Found nhiều hơn Lost trước đó:**
Nếu số lượng `FOUND` > tổng `LOST` trong cùng phiếu → **cảnh báo** (bắt buộc QL duyệt tay, không auto-approve). Đã chốt: giữ >0 là ngưỡng cảnh báo, không thêm ngưỡng %.

### 4.3 Sơ đồ trạng thái StockCheck

```
PENDING → IN_PROGRESS → COMPLETED → APPROVED (terminal)
                                     → REJECTED (terminal)
```

### 4.4 Kiểm kê định kỳ (scheduled) — QL

- QL config tần suất kiểm kê cho từng zone (hàng ngày/định kỳ) qua bảng `stock_check_schedules` (xem `01-domain-model.md`).
- Hệ thống tự tạo phiếu kiểm kê định kỳ (PENDING) + gửi notification đến NV kho (hoặc QL) khi đến hạn (xem RQ-58/US-49).
- Kết quả kiểm kê xử lý như kiểm kê thủ công (Bước 1–4 ở trên).

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
| `DAMAGED` | `product_unit_id` | Unit → `DAMAGED_IN_STORAGE` |
| `LOST` | `product_unit_id` | Unit → `LOST` |
| `FOUND` | `product_unit_id` (nếu có) hoặc `product_id + quantity` (nếu không) | Unit → `IN_STOCK`, hoặc tạo unit mới nếu không có serial |

- `reason` bắt buộc.
- `image_url` tùy chọn (ảnh minh chứng).

#### Bước 2: Duyệt — QL (khác người tạo)

- **Lưu ý**: `PESSIMISTIC_WRITE` khi đọc unit để apply — tránh xung đột với export approve trên cùng unit.
- 4-eyes bắt buộc (`created_by ≠ approved_by`).

> **Ai duyệt được loại nào:**
>
> | Type | Ai duyệt (bình thường)? | Backup khi QL vắng | Ghi chú |
> |---|---|---|---|
> | LOST | Manager | Admin | Cần xác nhận mất thật |
> | DAMAGED | Manager | Admin | Cần ảnh minh chứng |
> | FOUND | Manager | Admin | Phát hiện thừa, dễ duyệt hơn |

| Loại | Tác động |
|------|----------|
| DAMAGED | `unit.status` → `DAMAGED_IN_STORAGE` |
| LOST | `unit.status` → `LOST` |
| FOUND (có unit) | `unit.status` → `IN_STOCK` (chỉ nếu đang ở LOST/DAMAGED_IN_STORAGE) |
| FOUND (không unit) | Tạo `ProductUnit` mới với serial `FOUND-{adjust_code}` |

- Với **bulk** FOUND có `product_unit_id`: cộng lại `remaining_quantity` của lot đó (tương tự cách DAMAGED/LOST trừ `remaining_quantity` về 0). Nếu lot đã hết (`remaining_quantity` = 0 trước khi found) → cộng dồn lên, không cần set `remaining_quantity = initial_quantity` (vì FOUND chỉ khôi phục tồn đã mất, không reset lịch sử lot).

**Edge case — Found không thể restore:**
Nếu unit đang ở `SOLD`/`REMOVED`/`DISPOSED`/`RETURNED_TO_SUPPLIER` — chặn, báo "Unit không thể khôi phục từ trạng thái này". `REMOVED` là state terminal, không revert được (theo `01-domain-model.md` mục 2).

### 5.3 Sơ đồ trạng thái StockAdjustment

```
PENDING → APPROVED (terminal, áp dụng thay đổi)
        → REJECTED (terminal, không thay đổi)
```

---

## 6. Bảo hành

### 6.1 Flow tổng quát

```
Khách báo lỗi → SALES/STOCK tạo warranty_request
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

#### Bước 1: Tiếp nhận — SALES/STOCK

- Khách mang hàng + hoá đơn (hoặc tra cứu theo serial/đơn xuất).
- Check: serial có trong hệ thống? `status=SOLD`? Còn hạn BH (`warranty_expires_at > now`)?
- SALES kiểm tra cả `serial_number` (ghi trên chip/board) **và tem bảo hành** (`warranty_seal_code`, dán ngoài vỏ hộp):
  - Nếu có `warranty_seal_code` trong hệ thống → xác nhận mua tại shop, đủ điều kiện đổi mới nhanh (REPLACE).
  - Nếu không có trong hệ thống (shop không dùng tem riêng, hoặc tem ngoài hệ thống khác) → bỏ qua bước này.
- **Mất/rách tem bảo hành**: xử lý theo hướng (a) — mất tem vẫn tra cứu được bằng serial, chỉ mất quyền đổi mới nhanh (REPLACE) tại shop, chuyển sang REPAIR/SENT_TO_MANUFACTURER.
- Nếu hết BH → từ chối tiếp nhận, hướng dẫn khách.

#### Bước 2: Nhận hàng + kiểm tra — STOCK

- STOCK nhận hàng từ khách, kiểm tra ngoại quan.
- Nhập kết quả kiểm tra:
  - `check_result`: CONFIRMED / REJECTED (không lỗi, không BH)
  - `check_note`
- **CONFIRMED**: unit GIỮ NGUYÊN trạng thái hiện tại (`SOLD`, hoặc `DEFECTIVE` nếu đến từ WARRANTY_TRANSFER của return_receipt §7.2). Chưa chuyển transition — chờ QL chọn resolution ở Bước 3.
- Nếu kết quả `REJECTED`: auto-resolve thẳng (không cần QL duyệt lần 2), bắt buộc `check_note` chi tiết (validate chặn submit nếu để trống). Phiếu chuyển `RESOLVED` với `resolution_type=REJECT` — ghi `ProductUnitStatusLog` ghi nhận REJECTED (không đổi status unit).

#### Bước 3: Đề xuất resolution + duyệt — QL

| Resolution | Mô tả | Transition unit gốc | Hậu quả |
|------------|-------|---------------------|---------|
| `REPAIR` | Sửa tại kho (hoặc gửi NCC) | `SOLD → UNDER_REPAIR` (hoặc `DEFECTIVE → UNDER_REPAIR` nếu từ WARRANTY_TRANSFER) | Unit giữ `UNDER_REPAIR`, khi xong → `SOLD`. Nếu gửi NCC: → `SENT_TO_MANUFACTURER` |
| `REPLACE` | Đổi serial mới | `SOLD → DEFECTIVE` (hoặc `DEFECTIVE → DEFECTIVE` nếu từ WARRANTY_TRANSFER — unit đã ở DEFECTIVE, giữ nguyên, chỉ ghi nhận) | Tạo export `reason=internal`, `sell_price=0`. Unit mới → `SOLD`. **Kế thừa `warranty_start_date` gốc** |
| `REFUND` | Hoàn tiền | `SOLD → RETURNED` (hoặc `DEFECTIVE → RETURNED` nếu từ WARRANTY_TRANSFER) | Unit → `RETURNED`. ExportReceipt có `refund_amount`. Liên quan `return_receipts` |
| `REJECT` | Từ chối BH | **Không đổi** — unit giữ nguyên trạng thái | Trả về khách. Ghi rõ lý do |

#### Bước 4: Thực thi — STOCK

- REPAIR: transition `SOLD → UNDER_REPAIR` (hoặc `DEFECTIVE → UNDER_REPAIR`) đã xảy ra ở Bước 3 khi QL duyệt resolution. Ở Bước 4 STOCK thực thi 1 trong 2 hướng: (a) sửa xong tại kho → chuyển `UNDER_REPAIR → SOLD`; (b) không tự sửa được, gửi hãng bảo hành → chuyển `UNDER_REPAIR → SENT_TO_MANUFACTURER` (lưu `rma_number`, `sent_to_partner_at`, khớp `06-ux-design.md §2.3` panel REPAIR).
  > Unit REPAIR thuộc sở hữu khách hàng (đã bán), sửa xong trả lại khách — không quay về tồn kho. `UNDER_REPAIR` không tính vào tồn khả dụng. `SENT_TO_MANUFACTURER` cũng không tính vào tồn khả dụng (hàng đã gửi đi). Xác nhận nhất quán với `01-domain-model.md` §2.1 state machine.
- REPLACE: lấy unit mới từ kho → xuất `internal` với `sell_price=0`, `warranty_start_date` kế thừa.
- REFUND: unit → `RETURNED`. Khách nhận tiền.

**Edge case — Chuỗi đổi BH lặp:**
Cảnh báo (không chặn) nếu 1 serial gốc đã qua >2 lần đổi. **Đã chốt:** giữ cảnh báo, không chặn cứng.

**Edge case — Hãng làm mất/hư hàng lúc vận chuyển RMA:**
Ghi nhận trên `warranty_request`, chuyển `product_unit.status → LOST`. Cửa hàng chịu trách nhiệm đền cho khách (chính sách nội bộ, không phải lỗi hệ thống).

**Edge case — Hãng trả RMA nhưng lỗi cũ vẫn còn:**
Chấp nhận unit vẫn lỗi hoặc gửi lại lần 2 (re-RMA). Ghi chú rõ số lần gửi trên `warranty_request` để tránh vòng lặp gửi-nhận không kiểm soát.

**Edge case — REPLACE hết serial tồn kho:**
SLA: 7 ngày làm việc kể từ ngày QL duyệt resolution=REPLACE. Quá hạn → cảnh báo QL trên dashboard, không tự huỷ. QL có nút "Chuyển sang REFUND" để đổi hướng xử lý — STOCK chỉ thực thi sau khi QL đã bấm chuyển hướng. Config: số ngày SLA lưu trong `system_settings` key `warranty_replace_sla_days`.

### 6.4 Sơ đồ trạng thái WarrantyRequest

```
PENDING → RECEIVED → UNDER_EVALUATION → RESOLVED (terminal: REPAIRED / REPLACED / REFUNDED / REJECTED)
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
| `CHANGE_MIND` | Khách đổi ý, không lỗi | Trong vòng 7 ngày kể từ `export_receipt.approved_at` |
| `DEFECTIVE` | Hàng lỗi kỹ thuật | Còn hạn BH (warranty) |
| `WRONG_ITEM` | Giao sai hàng | Không giới hạn thời gian |

> **Case đặc thù ngành linh kiện — Test-and-return abuse:**
> Khách mua CPU/GPU về ép xung/test rồi đòi trả vì "không như kỳ vọng" — **không phải warranty** (không lỗi kỹ thuật) và **không phải DOA** (đã dùng, không phải lỗi lúc nhận hàng). Đây là nhánh cần tách khỏi cả `warranty_requests` lẫn case DOA — xử lý theo đúng flow `CHANGE_MIND` ở mục này, với policy 7 ngày (đã chốt).

- Link `original_export_receipt_id` (bắt buộc).
- Trạng thái: `PENDING_APPROVAL`.
- **CHANGE_MIND: BE là nguồn xác thực cuối** — API tạo/xem return receipt phải trả về `days_remaining` hoặc `is_eligible` tính từ `export_receipt.approved_at + 7 ngày`. API submit tự validate lại ở Service layer, không chỉ dựa vào FE disable nút. FE chỉ hiển thị giá trị BE trả về, không tự quyết định enable/disable submit dựa trên tính toán riêng.

#### Bước 2: Kiểm tra condition — STOCK

| Condition | Mô tả | Hậu quả |
|-----------|-------|----------|
| `GOOD` | Hàng còn nguyên vẹn | → `RESTOCK`: unit → `IN_STOCK`. Nếu đã có `is_warranty_active=true` → set `false`. |
| `DEFECTIVE` | Hàng có lỗi | → `SCRAP`: unit → `DISPOSED`. Hoặc `WARRANTY_TRANSFER` (**chỉ áp dụng cho serialized** — nếu `product_unit.tracking_type = 'bulk'` thì reject 400): hệ thống tự tạo 1 `warranty_request` mới, khởi tạo thẳng ở state `RECEIVED` (bỏ qua `PENDING`). Unit chuyển `SOLD → DEFECTIVE` tại thời điểm này (vì hàng đã được xác nhận lỗi thật). `check_result` copy từ kết quả kiểm tra condition (`DEFECTIVE` → `CONFIRMED`). Từ đây warranty_request đi tiếp theo SOP §6 từ bước 3 (QL duyệt resolution). **Lưu ý transition**: vì unit đã ở `DEFECTIVE`, resolution REPAIR sẽ chuyển `DEFECTIVE → UNDER_REPAIR`; REPLACE giữ nguyên `DEFECTIVE` (ghi nhận đã xử lý); REFUND chuyển `DEFECTIVE → RETURNED`. REJECT giữ nguyên `DEFECTIVE`. |

#### Bước 3: Duyệt — QL (khác người tạo)

| Hành động | Tác động |
|-----------|----------|
| Duyệt | Áp dụng `resulting_action` (RESTOCK / SCRAP / WARRANTY_TRANSFER). Tạo `ProductUnitStatusLog`. |
| Từ chối | `CANCELLED`. Unit giữ nguyên `SOLD`. |

### 7.3 State machine ProductUnit (liên quan trả hàng)

> **Xác nhận:** KHÔNG có transition `SOLD → RETURNED` trực tiếp từ `return_receipts`. Transition `SOLD → RETURNED` chỉ xảy ra thông qua warranty flow với resolution=REFUND (xem §6.3 Bước 3).

```
SOLD → IN_STOCK      (condition=GOOD → RESTOCK)
SOLD → DISPOSED      (condition=DEFECTIVE → SCRAP)
SOLD → DEFECTIVE     (condition=DEFECTIVE → WARRANTY_TRANSFER — khởi tạo warranty_request với unit ở DEFECTIVE, chỉ serialized)
```

**Transition từ `DEFECTIVE` khi warranty_request đi tiếp (SOP §6.3 Bước 3):**
| Resolution | Transition |
|------------|-----------|
| REPAIR | `DEFECTIVE → UNDER_REPAIR` |
| REPLACE | Giữ `DEFECTIVE` (ghi nhận xử lý) |
| REFUND | `DEFECTIVE → RETURNED` |
| REJECT | Giữ `DEFECTIVE` |

---

## 8. Điều chỉnh giá nhập

### 8.1 Flow tổng quát

```
NV/QL tạo price_adjustment (link import_receipt_item, ghi giá cũ→mới + lý do)
  → PENDING_APPROVAL
  → QL duyệt (4-eyes) → APPROVED: update cost_price cho unit còn IN_STOCK
  → QL từ chối → REJECTED
```

### 8.2 Nguyên tắc

- **KHÔNG sửa trực tiếp** `import_receipt_items.unit_price` — luôn tạo adjustment record, duyệt xong mới áp dụng.
- Chỉ áp dụng cho `ProductUnit` còn `IN_STOCK` (prospective, không hồi tố). Unit đang `RESERVED` không được áp dụng — quyết định có chủ đích (vì reserved unit đang chờ duyệt xuất, giá vốn sẽ tính theo cost_price cũ tại thời điểm reserve; nếu adjustment chạy vào lúc này sẽ gây lệch COGS).
- Unit đã bán giữ nguyên `cost_price` cũ — COGS quá khứ không thay đổi.

### 8.3 Các bước chi tiết

#### Bước 1: Tạo phiếu — NV / QL

- Chọn `import_receipt_item_id` (dòng nhập gốc — không sửa được sau khi tạo).
- Hệ thống hiển thị `old_unit_price` từ dòng nhập.
- Nhập `new_unit_price` (phải khác giá cũ) + `reason` bắt buộc.
- Trạng thái: `PENDING_APPROVAL`.

#### Bước 2: Duyệt — QL (khác người tạo)

- Khi APPROVED:
  - Update `cost_price` của tất cả `ProductUnit` còn `IN_STOCK` thuộc `import_receipt_item` đó.
  - Batch update: `UPDATE product_units SET cost_price = ? WHERE import_receipt_item_id = ? AND status = 'IN_STOCK'`.
- Audit: `PRICE_ADJUSTMENT_APPROVED`.

### 8.4 Giá bán (sell_price) — không cần duyệt

- MANAGER/STOCK/SALES sửa `sell_price` trên sản phẩm bất kỳ lúc (khớp bảng phân quyền §1.3.1).
- Ghi vào `sell_price_history`: `product_id, old_price, new_price, changed_by, changed_at`.
- Không ảnh hưởng giá xuất đã xảy ra.

### 8.5 Sơ đồ trạng thái PriceAdjustment

```
PENDING_APPROVAL → APPROVED (terminal, update cost_price IN_STOCK units)
                 → REJECTED (terminal, không thay đổi)
```

---

## 9. Cấu trúc dữ liệu tham chiếu


### 9.1 Thêm/sửa so với domain model hiện tại

#### `warehouses`

```sql
CREATE TABLE warehouses (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(50) NOT NULL UNIQUE,      -- Mã kho: "WH-HCM", "WH-HN"
    name VARCHAR(255) NOT NULL,            -- "Kho chính"
    address TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

Thêm `warehouse_id` (FK) vào: `locations`, `import_receipts`, `export_receipts`, `stock_adjustments`, `stock_checks`.

#### `price_adjustments` — schema

Đã có sẵn trong `01-domain-model.md` (bảng `price_adjustments` đã có `import_receipt_item_id`). Khi APPROVED: KHÔNG sửa trực tiếp `import_receipt_items.unit_price` — chỉ update `cost_price` của `ProductUnit` còn `IN_STOCK`.

#### `sell_price_history` (bảng mới)

Đã có sẵn trong `01-domain-model.md` (`sell_price_history`).

#### `return_receipts` + `return_receipt_items` (bảng mới)

Đã có sẵn trong `01-domain-model.md` (`return_receipts`, `return_receipt_items`).

#### `import_receipt_items` — bổ sung field

`supplier_batch_no` đã có sẵn trong `01-domain-model.md` (`import_receipt_items`).

#### `ProductUnit` — bổ sung field

Các cột `cost_price`, `is_warranty_active`, `warranty_seal_code` đã có sẵn trong `01-domain-model.md` (`product_units`).

#### `export_receipts` — bổ sung field

`total_cogs` đã có sẵn trong `01-domain-model.md` (`export_receipts`).

### 9.2 Phân quyền duyệt khi QL vắng

Không cần bảng/field mới — **Admin đảm nhiệm duyệt thay** mọi loại phiếu khi QL vắng mặt. Admin vốn đã có quyền duyệt theo RBAC.

### 9.3 Ràng buộc dữ liệu

#### `serial_number` — unique scope

`serial_number` trên `product_units` cần unique **toàn hệ thống** (không phân biệt `product_id`), vì:
- Cùng 1 serial có thể xuất hiện trên nhiều sản phẩm khác nhau (vd: SN của NCC giống nhau giữa 2 dòng SP khác) — nhưng **xác suất thấp** và nếu xảy ra, gây nhầm lẫn khi tra cứu BH / kiểm kê.
- Unique toàn hệ thống đơn giản hơn cho index, không cần composite PK.
- Nếu sau này phát sinh nhu cầu cho phép trùng serial khác `product_id`, đổi sang composite UNIQUE(`serial_number`, `product_id`).

#### `serial_number` — ràng buộc unique với unit bị huỷ (REMOVED)

> ✅ **Đã chốt:** Dùng partial unique index qua generated column (MySQL 8.0+). Xem `03-known-issues-tech-debt.md §7.1.1` để biết chi tiết kỹ thuật.

Khi 1 phiếu nhập bị hủy (`status=REMOVED`), serial đó vẫn chiếm chỗ — chặn nhập lại cùng serial đó sau này. Giải pháp: virtual generated column `serial_active` + unique index, tự động loại unit bị huỷ khỏi phạm vi kiểm tra unique.

#### `locations` — chặn vô hiệu hoá location đang có hàng

- Khi QL/Admin cố vô hiệu hoá (`is_active=false`) 1 location, hệ thống kiểm tra `productCount` (số unit `IN_STOCK` đang gán location đó):
  - Nếu `productCount > 0` → **chặn**, báo "Location còn hàng, không thể vô hiệu hoá. Chuyển hết hàng đi nơi khác trước."
  - Nếu `productCount = 0` → cho phép.
- Rule này áp dụng tương tự với xoá location (đã có ở US-35).

### 9.4 Theo dõi sau trả NCC — cấu trúc dữ liệu bổ sung

> Các cột dưới đây đã có sẵn trong `01-domain-model.md`:
> - `export_receipts.source_import_receipt_id` — dùng cho `reason=RETURN_SUPPLIER`
> - `product_units.reserved_quantity` — bulk only, lượng đang reserve chờ duyệt

---

## 10. Phạm vi loại trừ

Các mục sau **không thuộc phạm vi SOP này**:

- Multi-warehouse / chuyển kho (stock transfer) — để dành khi có kho thứ 2.
- Ký gửi (consignment) — không áp dụng.
- Giao hàng / ship — tính từ lúc hàng rời kho.
- Tồn đầu kỳ — không cần (chưa go-live).
- Tích hợp hoá đơn kế toán — sổ sách làm tách biệt ngoài hệ thống.
- Backorder tự động — chỉ ghi chú thủ công (xuất thiếu).

---

## 11. Routes & UI Mapping

| Route | Page | Mô tả |
|-------|------|-------|
| `/stock/imports` | ImportListPage | Danh sách phiếu nhập |
| `/stock/imports/:id?` | ImportCreatePage | Tạo phiếu nhập (id rỗng = Phase 1 Manager, id có = Phase 2 Stock) |
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
| `/warranty` | WarrantyListPage | Danh sách yêu cầu BH, filter theo status (PENDING / RECEIVED / UNDER_EVALUATION / RESOLVED) |
| `/warranty/new` | WarrantyCreatePage | Tiếp nhận yêu cầu BH (SALES/STOCK), tra cứu serial + tem bảo hành |
| `/warranty/:id` | WarrantyDetailPage | Chi tiết: STOCK nhập kết quả kiểm tra, QL duyệt resolution, STOCK thực thi |
| `/returns` | ReturnListPage | Danh sách phiếu trả hàng |
| `/returns/new` | ReturnCreatePage | SALES tạo, link export gốc bắt buộc |
| `/returns/:id` | ReturnDetailPage | STOCK kiểm tra condition, QL duyệt |
| `/price-adjustments` | PriceAdjustmentListPage | Danh sách điều chỉnh giá nhập |
| `/price-adjustments/new` | PriceAdjustmentCreatePage | Tạo phiếu điều chỉnh giá nhập |
| `/price-adjustments/:id` | PriceAdjustmentDetailPage | Chi tiết phiếu điều chỉnh giá nhập |

### 11.1 Page size & Data export

**Page size selector** — `PaginationBar` hiển thị dropdown chọn số kết quả/trang: 10 (mặc định), 20, 50, 100. Đổi page size → tự reset về trang 0. Áp dụng cho: danh sách nhập/xuất, danh sách ProductUnit.

**CSV Export** — nút CSV (icon FileDown) xuất hiện trên `ImportDetailPage`, `ExportDetailPage` (xuất danh sách sản phẩm trong phiếu, UTF-8 BOM, mở được bằng Excel) và mỗi tab dạng bảng ở Dashboard. Cơ chế: `downloadCsv()` trong `utils/download-csv.ts` — tạo Blob + `URL.createObjectURL` + click ẩn, revoke sau khi download.

---

## 12. Ai duyệt cái gì? (Role-based Approval)

| Entity | Action | Ai được làm? |
|--------|--------|-------------|
| ImportReceipt | Tạo (Phase 1 — PENDING) | MANAGER |
| ImportReceipt | Nhập serial + QC + submit (Phase 2 — → PENDING_APPROVAL) | STOCK |
| ImportReceipt | Duyệt (→ COMPLETED) | MANAGER, ADMIN |
| ImportReceipt | Từ chối (→ PENDING, kèm lý do) | MANAGER, ADMIN |
| ImportReceipt | Cancel (→ CANCELLED) | MANAGER, ADMIN |
| ExportReceipt | Tạo | SALES, STOCK, MANAGER |
| ExportReceipt | Duyệt (→ COMPLETED) | MANAGER, ADMIN |
| ExportReceipt | Cancel | MANAGER, ADMIN |
| StockCheck | Tạo | MANAGER |
| StockCheck | Xác nhận (→ APPROVED) | MANAGER, ADMIN |
| StockCheck | Nhập kết quả đếm | STOCK (thực hiện đếm) |
| Adjustment | Tạo | STOCK, MANAGER |
| Adjustment LOST | Duyệt | MANAGER, ADMIN |
| Adjustment DAMAGED | Duyệt | MANAGER, ADMIN |
| Adjustment FOUND | Duyệt | MANAGER, ADMIN |
| ReturnReceipt | Tạo | SALES |
| ReturnReceipt | Duyệt (→ COMPLETED) | MANAGER, ADMIN |
| PriceAdjustment | Tạo | STOCK, MANAGER |
| PriceAdjustment | Duyệt (→ APPROVED) | MANAGER, ADMIN |
| PO | Tạo/Sửa | MANAGER |
| PO | Cancel | MANAGER |

> **Đã chốt:** LOST adjustment trong flow xuất thiếu (§3.3) — hệ thống tự tạo (created_by=STOCK), không cần MANAGER tạo tay. Duyệt adjustment LOST = đồng thời duyệt export receipt, không cần dual sign-off riêng.

### Phân biệt form nhập theo role

`ImportCreatePage` có 2 mode, route `/stock/imports/:id?`:

- **id rỗng** = Phase 1 (Manager) — Step 1-2, form tạo phiếu
- **id có** = Phase 2 (Stock) — Step 3-4, form nhập serial + QC + location

| Field | Phase 1 (Manager) | Phase 2 (Stock) |
|-------|-------------------|-----------------|
| Nhà cung cấp | ✅ Tạo | ❌ Banner readonly |
| Ngày nhập / Số chứng từ | ✅ Tạo | ❌ Banner readonly |
| Sản phẩm + expectedQuantity | ✅ Tạo | ❌ Banner readonly |
| **Đơn giá** | ✅ | ❌ Ẩn |
| **Bảo hành (tháng)** | ✅ | ❌ Ẩn |
| Vị trí kho | ❌ | ✅ Location picker |
| Serial | ❌ | ✅ ChipInput |
| QC (Pass/Fail) | ❌ | ✅ |
| NOT_RECEIVED | ❌ | ✅ |
| discrepancyNotes | ❌ | ✅ (bắt buộc nếu phát hiện hàng lạ) |
| Ghi chú | ✅ | ✅ |

---

<!-- end of file -->
