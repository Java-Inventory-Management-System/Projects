> Gộp từ: `02-sop-nghiep-vu.md` (phiên bản cũ đặt tên `10-sop-quy-trinh-nghiep-vu.md`), `07-warehouse-flow.md` (routes, permissions), `09-business-analysis.md`, `09c-business-analysis-final-review.md` (các file này đã bị xóa sau khi gộp — xem git history nếu cần tra lại quá trình phân tích gốc).

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

### 1.3.1 Bảng phân quyền chi tiết theo chức năng

> Bảng tóm lược ở trên là bản rút gọn theo luồng nghiệp vụ. Bảng dưới đây liệt kê đầy đủ theo từng chức năng cụ thể, bao gồm cả các chức năng ngoài 7 luồng chính (quản lý user, cấu hình hệ thống, xem audit log...).

> **Cập nhật:** Admin được tách thành vai trò *giám sát + quản trị hệ thống*, không còn tham gia khởi tạo giao dịch nghiệp vụ hàng ngày. Các dòng có dấu `*` áp dụng ràng buộc `created_by ≠ approved_by` — người duyệt không được là người đã tạo phiếu, bất kể role.

| Chức năng | ADMIN | MANAGER | STOCK | SALES |
|-----------|-------|---------|-------|-------|
| Quản lý người dùng | ✅ CRUD | ❌ | ❌ | ❌ |
| Xem audit log | ✅ Tất cả (giám sát) | ✅ Vận hành trong ca của mình | ❌ | ❌ |
| Cấu hình hệ thống (ngưỡng dead-stock, tồn âm) | ✅ | ❌ | ❌ | ❌ |
| CRUD danh mục (SP, DM, NCC) | ❌ | ✅ | ❌ | ❌ |
| Quản lý vị trí kho | ❌ | ✅ | ❌ | ❌ |
| Quản lý khách hàng | ❌ | ✅ | ✅ Xem + thêm | ✅ Xem + thêm |
| Tạo phiếu nhập | ❌ | ✅ | ✅ | ❌ |
| Duyệt phiếu nhập * | ✅ (escalation) | ✅ * | ❌ | ❌ |
| Sửa serial sau nhập | ❌ | ✅ | ❌ | ❌ |
| Tạo phiếu xuất | ❌ | ✅ | ✅ | ✅ |
| Duyệt phiếu xuất * | ✅ (escalation) | ✅ * | ❌ | ❌ |
| Hủy phiếu nhập/xuất | ✅ (backup) | ✅ | ❌ | ❌ |
| Xem tồn kho | ✅ | ✅ | ✅ | ✅ |
| Điều chỉnh min_stock | ✅ (cấu hình) | ✅ | ❌ | ❌ |
| Tạo phiếu kiểm kê | ❌ | ✅ | ❌ | ❌ |
| Duyệt kiểm kê lệch * | ✅ (escalation) | ✅ * | ❌ | ❌ |
| Tạo phiếu điều chỉnh tồn thủ công | ❌ | ✅ | ✅ (cần duyệt) | ❌ |
| Duyệt phiếu điều chỉnh tồn thủ công * | ✅ (escalation) | ✅ * | ❌ | ❌ |
| Tra cứu bảo hành | ✅ | ✅ | ✅ | ✅ |
| Xử lý bảo hành (đổi/sửa/từ chối) | ❌ | ✅ | ✅ (tiếp nhận, kiểm tra) | ✅ (tiếp nhận) |
| Dashboard & Báo cáo | ✅ (chỉ xem) | ✅ | ❌ | ❌ |

**\*** Ràng buộc `created_by ≠ approved_by`: nếu Manager là người tạo phiếu, họ không được tự duyệt phiếu đó — hệ thống tự động escalate lên Admin. Nếu doanh nghiệp có từ 2 Manager trở lên, một Manager khác cũng có thể duyệt thay cho nhau, không bắt buộc phải là Admin.

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
STOCK/QL tạo phiếu nhập (draft) ──┬──→ Huỷ bỏ draft
                                       │
                                       ↓
                            PENDING_APPROVAL
                                       │
                                       ├── QL duyệt → COMPLETED
                                       │
                                       └── QL từ chối → CANCELLED (units → REMOVED)
```

### 2.2 Các bước chi tiết

#### Bước 1: Tạo phiếu nhập (draft) — STOCK / QL

- Chọn nhà cung cấp (NCC) — validated: NCC phải tồn tại trong DB và đang `active`.
- Link `purchase_order_id` nếu có (tùy chọn). Nếu PO đã COMPLETED → **chặn link**, báo "PO đã hoàn thành".
- Nhập danh sách item (sản phẩm, số lượng, `unit_price`, `warranty_months`).
- **Cho phép nhiều dòng cùng 1 `product_id`** trong cùng phiếu (ví dụ: 2 đợt hàng phụ của cùng 1 SP với giá vốn khác nhau). Không có ràng buộc unique theo product_id trong phạm vi 1 phiếu nhập.
- Trạng thái khởi tạo: **`draft`** — cho phép sửa số lượng/giá/serial trước khi gửi duyệt.

> **Điểm mở**: Giá nhập lệch so với giá dự kiến trong PO — hiện tại cho nhập giá thực tế tự do, PO chỉ tham khảo. **Cần xác nhận lại với chủ shop** trước khi coi là chính thức.

#### Bước 2: Nhập serial — NV / QL

- Nếu tracking type = **serialized**: bắt buộc nhập đủ serial (`số lượng serial = số lượng`).
- Nhập bằng tay, scan barcode, hoặc upload file Excel.
- **Validate trong file Excel trước**: kiểm tra trùng lặp nội bộ file. Nếu phát hiện:
  - **>20% dòng lỗi** → chặn toàn bộ phiếu, yêu cầu sửa file và upload lại.
  - **≤20% dòng lỗi** → skip dòng lỗi, giữ dòng đúng, hiển thị danh sách dòng bị bỏ qua cho NV xác nhận.
- **Validate với DB**: kiểm tra serial đã tồn tại (case-insensitive — cả upper/lower).
- **Ngưỡng 20% được tính gộp cả 2 loại lỗi** (trùng nội bộ file + trùng với DB đã tồn tại), không tách riêng. Thứ tự kiểm tra vẫn là: check trùng nội bộ file trước → check với DB sau, nhưng số dòng lỗi cộng dồn từ cả 2 bước để so với ngưỡng 20% tổng số dòng trong file.
- Nếu tracking type = **bulk**: không cần serial, chỉ cần số lượng.

**Edge case — Duplicate serial cùng file Excel:**
Kiểm tra trùng trong nội bộ file TRƯỚC khi validate với DB, tránh cả 2 dòng cùng pass validate riêng lẻ rồi vi phạm unique constraint.

**Edge case — Serial case-insensitive conflict:**
`"SN001"` và `"sn001"` được coi là trùng. Normalize về uppercase/khi check DB.

#### Bước 3: Kiểm tra chất lượng (QC) — NV

- Mỗi `ProductUnit` sau khi nhập serial chuyển vào trạng thái trung gian **`pending_qc`** — chưa tính vào tồn khả dụng.
- Cấu hình theo `category_id`:
  - Nhóm hàng giá trị cao (GPU, mainboard, CPU, RAM...) → bắt buộc kiểm từng serial.
  - Nhóm hàng giá trị thấp (cáp, phụ kiện...) → cho phép sampling hoặc bỏ qua.
- NV đánh dấu từng serial, kết quả gồm **3 loại**:
  - **Pass** → chuyển `in_stock`.
  - **FAIL_HARDWARE** (lỗi phần cứng thật — chết chip, lỗi nguồn, chạy không ổn định) → chuyển `defective`, ghi chú `"DOA - phát hiện lúc nhập"`, không vào tồn bán được. Đi nhánh trả NCC nhanh (thời hạn đề xuất 3–7 ngày — xác nhận lại với NCC thực tế trước khi chốt).
  - **FAIL_ACCESSORY** (thiếu phụ kiện đi kèm — ốc, cáp, IO shield, keo tản nhiệt...) → **KHÔNG chuyển `defective`**. Giữ `pending_qc`, ghi chú rõ thiếu phụ kiện nào, chờ bổ sung phụ kiện rồi re-QC, hoặc báo NCC riêng (khác nhánh trả vì phần cứng vẫn tốt). Nếu phụ kiện được bổ sung sau → re-QC Pass → `in_stock`.
- Hàng FAIL_HARDWARE QC đi theo nhánh trả NCC nhanh, **khác với flow bảo hành thông thường** (lỗi phát hiện ngay lúc nhận hàng, chưa qua tay khách).
- Nếu shop có dùng tem bảo hành riêng: NV nhập/scan mã `warranty_seal_code` (dán trên vỏ hộp) song song với từng `ProductUnit` — optional, không chặn nếu để trống.
- Phiếu chỉ được gửi duyệt (`pending_approval`) sau khi **100% dòng đã qua QC** (Pass, hoặc FAIL_HARDWARE đã xử lý, hoặc FAIL_ACCESSORY đã ghi nhận — không cần chờ bù phụ kiện xong).

#### Bước 4: Gán vị trí kho — auto-assign (hệ thống) + override thủ công

- Hệ thống tự động gán location **sau khi QC** — unit Pass mới được gán bin trong zone bán được:
  1. Zone = mapping `category_id → zone_code` (bảng `category_zones`).
  2. Trong zone, ưu tiên bin đã chứa cùng `product_id` và còn dưới capacity (cảnh báo mềm, không chặn).
  3. Hết chỗ → bin trống, ưu tiên bin % dùng thấp nhất.
- NV có thể **đổi location thủ công** (kèm lý do nếu khác zone ưu tiên).
- Không chặn cứng nếu bin đầy — **cảnh báo mềm** (vì kích thước linh kiện đa dạng).

#### Bước 5: Xác nhận & gửi duyệt → PENDING_APPROVAL

- 1 transaction:
  - Tạo `ImportReceipt` + `ImportReceiptItem` + `ProductUnit` (status = `in_stock` (Pass), `defective` (FAIL_HARDWARE), hoặc `pending_qc` (FAIL_ACCESSORY chưa xử lý xong) tuỳ kết quả QC).
  - Copy `warranty_months` từ `ImportReceiptItem` → `ProductUnit`.
  - Copy `cost_price` từ `ImportReceiptItem.unit_price` → `ProductUnit.cost_price`.
  - Nếu có link PO → cập nhật `received_quantity` (atomic `SET x = x + ?`).
- Chuyển phiếu từ `draft` → `pending_approval`.
- **Từ đây không sửa được nữa** (chỉ duyệt hoặc từ chối).

#### Bước 6: QL duyệt / từ chối — QL (khác người tạo)

| Hành động | Điều kiện | Kết quả |
|-----------|-----------|---------|
| Duyệt | `created_by ≠ approved_by` | → `COMPLETED`. Nếu có link PO → cập nhật PO status (PARTIAL / COMPLETED). |
| Từ chối | `created_by ≠ approved_by` | → `CANCELLED`. Tất cả `ProductUnit` → `REMOVED` (terminal). |

#### Bước 7: Huỷ phiếu đã COMPLETED (hủy muộn)

- **Điều kiện**: 100% `ProductUnit` sinh từ phiếu đó đang ở `in_stock` (chưa xuất) **hoặc** `pending_qc` (FAIL_ACCESSORY chưa xử lý xong):
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
| `RETURN_SUPPLIER` | Trả NCC | Không cần customer. Xem mục 3.6 để biết theo dõi hậu trả NCC. |
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
  - **Serialized:** đổi status từ `in_stock` → `reserved`.
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
- Phiếu → `pending_approval`.
- Các FIFO query sau tự động bỏ qua:
  - Serialized: filter `status NOT IN ('reserved', ...)`.
  - Bulk: filter `(remaining_quantity - reserved_quantity) > 0`.

#### Bước 4: QL duyệt / từ chối — QL (khác người tạo)

| Reason | Hành động | Điều kiện | Kết quả |
|--------|-----------|-----------|---------|
| SALE / INTERNAL | Duyệt | `created_by ≠ approved_by` | Unit → `sold`. Nếu `reason=SALE`: set `warranty_start_date=now`, `warranty_expires_at=now + warranty_months`. |
| SALE / INTERNAL | Từ chối | `created_by ≠ approved_by` | Unit → `in_stock` (giải phóng reserve). Xoá warranty dates nếu đã set. |
| RETURN_SUPPLIER | Duyệt | `created_by ≠ approved_by` | Unit → `returned_to_supplier` (terminal). |
| RETURN_SUPPLIER | Từ chối | `created_by ≠ approved_by` | Unit → `in_stock` (giải phóng reserve). |
| DISPOSE | Duyệt | `created_by ≠ approved_by`. Unit phải đang ở `damaged_in_storage` — **chặn nếu unit đang `in_stock`** (không cho thanh lý hàng còn tốt; nếu muốn thanh lý hàng còn tốt → điều chỉnh `damaged_in_storage` trước, rồi xuất thanh lý). | Unit → `disposed` (terminal). |
| DISPOSE | Từ chối | `created_by ≠ approved_by` | Unit → `damaged_in_storage` (giải phóng reserve, quay lại trạng thái hỏng chờ xử lý). |

> **Bulk (`tracking_type=bulk`):** Các dòng nói "Unit → `sold`/`returned_to_supplier`/`disposed`" ở trên áp dụng cho serialized. Với bulk:
> - Duyệt: trừ `remaining_quantity` đi số lượng xuất. Nếu `remaining_quantity - reserved_quantity ≤ 0` sau khi trừ → chuyển status từ `in_stock` → `sold` (hoặc `returned_to_supplier`/`disposed`). Đồng thời trừ `reserved_quantity` tương ứng.
> - Từ chối: chỉ trừ `reserved_quantity` (hoàn trả lại tồn khả dụng), không đụng `remaining_quantity` và không đổi status.
>
> **Ngoại lệ — Warranty cho đổi hàng bảo hành (REPLACE):**
> Nếu `reason=INTERNAL` và phiếu phát sinh từ `resolution=REPLACE` (mục 6 — đổi hàng bảo hành), vẫn phải gán `warranty_start_date` / `warranty_expires_at`, nhưng **kế thừa từ unit gốc** (không set = now). Mục đích: giữ nguyên hạn BH của khách, không reset khi đổi serial thay thế.

> ⚠ **Check status trước khi approve**: Nếu unit đã chuyển sang `damaged_in_storage`/`lost`/`under_repair` (với SALE/INTERNAL) hoặc không còn `damaged_in_storage` (với DISPOSE) giữa lúc create→approve → **chặn**, báo lỗi "Unit không còn khả dụng", không tự động set SOLD / DISPOSED ghi đè.

#### Bước 5: Thực hiện xuất hàng vật lý — STOCK

- STOCK xuống kho, lấy đúng serial/location theo phiếu.
- Với `ProductUnit` thuộc category có flag `esd_sensitive=true` (mainboard, RAM, GPU, CPU...) → bắt buộc đóng gói lại bằng **túi chống tĩnh điện** trước khi giao khách. Lưu ý quy trình vật lý, không cần field/entity riêng trong DB.
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

### 3.5 Gợi ý đặt hàng khi tồn thấp

- Khi 1 sản phẩm dưới `min_stock`, ngoài hiển thị trên dashboard/báo cáo, hệ thống gợi ý **gộp các sản phẩm sắp hết của cùng 1 nhà cung cấp** thành 1 đề xuất đặt hàng (PO nháp) — QL chỉ cần xác nhận thay vì tự tạo PO từ đầu.
- PO nháp này pre-fill: NCC, danh sách sản phẩm + số lượng đề xuất (đủ lên trên `min_stock` + dự phòng), `expected_date` gợi ý.

### 3.6 Gợi ý xử lý dead stock

- Khi 1 sản phẩm được gắn nhãn tồn quá hạn (>90 ngày — tham số cấu hình), hệ thống cần gợi ý hành động xử lý tiếp theo, không chỉ dừng ở gắn nhãn hiển thị:
  - **Đề xuất giảm giá bán** (giảm `sell_price` tạm thời) để kích cầu.
  - **Đề xuất thanh lý** nếu quá hạn lâu (>180 ngày) hoặc không còn khả năng bán.
  - Gợi ý hiển thị trên dashboard cho QL xem xét và ra quyết định.

### 3.7 Theo dõi sau trả NCC (RETURN_SUPPLIER)

- Sau khi phiếu xuất với `reason=RETURN_SUPPLIER` được duyệt (`COMPLETED`), hệ thống ghi nhận trạng thái xử lý của NCC qua các mốc:
  - **`sent`**: Hàng đã giao cho NCC (mặc định sau khi duyệt).
  - **`confirmed_received`**: NCC xác nhận đã nhận hàng.
  - **`processing`**: NCC đang xử lý (đổi hàng mới / hoàn tiền / từ chối).
  - **`resolved`**: NCC đã hoàn tất xử lý — kèm kết quả (`result_type`: `REPLACEMENT` / `REFUND` / `REJECTED`) + ghi chú.
- Các mốc này do NV/QL cập nhật thủ công dựa trên thông tin từ NCC (không có API tích hợp).
- Thời gian NCC phản hồi được tính từ `sent` → `confirmed_received` → `resolved`, hiển thị trên dashboard để QL theo dõi.

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
pending_approval → completed (terminal)
                 → cancelled (terminal, units → in_stock)
                 → exception (chờ xử lý thiếu)
exception → completed (sau khi adjustment LOST được duyệt)
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

### 4.4 Kiểm kê định kỳ (scheduled) — QL

- QL cấu hình tần suất kiểm kê theo từng khu vực (ví dụ: khu hàng giá trị cao → hàng tháng; khu hàng giá trị thấp → hàng quý).
- Đến lịch, hệ thống tự tạo phiếu kiểm kê nháp (`PENDING`) + gửi thông báo cho QL.
- QL xác nhận kích hoạt phiếu (hoặc dời lịch nếu bận), sau đó chạy đúng flow kiểm kê hiện có (Bước 1–4 ở trên).
- Không thay thế khả năng tạo phiếu kiểm kê đột xuất thủ công — QL vẫn có thể tạo phiếu riêng bất kỳ lúc.

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

> **Ai duyệt được loại nào:**
>
> | Type | Ai duyệt (bình thường)? | Backup khi QL vắng | Ghi chú |
> |---|---|---|---|
> | LOST | Manager | Admin | Cần xác nhận mất thật — quan trọng hơn DAMAGED/FOUND nên có thể yêu cầu note chặt hơn |
> | DAMAGED | Manager | Admin | Cần ảnh minh chứng |
> | FOUND | Manager | Admin | Phát hiện thừa, dễ duyệt hơn |

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
- SALES kiểm tra cả `serial_number` (ghi trên chip/board) **và tem bảo hành** (`warranty_seal_code`, dán ngoài vỏ hộp):
  - Nếu có `warranty_seal_code` trong hệ thống → xác nhận mua tại shop, đủ điều kiện đổi mới nhanh (REPLACE).
  - Nếu không có trong hệ thống (shop không dùng tem riêng, hoặc tem ngoài hệ thống khác) → bỏ qua bước này.
- **Mất/rách tem bảo hành**: xử lý theo 1 trong 2 hướng — **(a)** mất tem vẫn tra cứu được bằng serial, chỉ mất quyền đổi mới nhanh (REPLACE) tại shop, chuyển sang BH hãng (REPAIR/SENT_TO_MANUFACTURER); **(b)** mất tem = từ chối toàn bộ BH shop (kể cả sửa). → **Chưa chốt, xem `06-open-questions.md` #13**.
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

**Edge case — Hãng làm mất/hư hàng lúc vận chuyển RMA:**
Ghi nhận trên `warranty_request`, chuyển `product_unit.status → lost`. Cửa hàng chịu trách nhiệm đền cho khách (chính sách nội bộ, không phải lỗi hệ thống).

**Edge case — Hãng trả RMA nhưng lỗi cũ vẫn còn:**
Chấp nhận unit vẫn lỗi hoặc gửi lại lần 2 (re-RMA). Ghi chú rõ số lần gửi trên `warranty_request` để tránh vòng lặp gửi-nhận không kiểm soát.

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

> **Case đặc thù ngành linh kiện — Test-and-return abuse:**
> Khách mua CPU/GPU về ép xung/test rồi đòi trả vì "không như kỳ vọng" — **không phải warranty** (không lỗi kỹ thuật) và **không phải DOA** (đã dùng, không phải lỗi lúc nhận hàng). Đây là nhánh cần tách khỏi cả `warranty_requests` lẫn case DOA — xử lý theo đúng flow `CHANGE_MIND` ở mục này, với policy thời hạn riêng (VD 7 ngày, xem câu hỏi #7 ở `06-open-questions.md`) khác hẳn `warranty_months`.

- Link `original_export_receipt_id` (bắt buộc).
- Trạng thái: `PENDING_APPROVAL`.

#### Bước 2: Kiểm tra condition — STOCK

| Condition | Mô tả | Hậu quả |
|-----------|-------|----------|
| `GOOD` | Hàng còn nguyên vẹn | → `RESTOCK`: unit → `in_stock`. Nếu đã có `is_warranty_active=true` → set `false`. |
| `DEFECTIVE` | Hàng có lỗi | → `SCRAP`: unit → `disposed`. Hoặc `WARRANTY_TRANSFER`: hệ thống tự tạo 1 `warranty_request` mới, khởi tạo thẳng ở state `received` (bỏ qua `pending` — vì bản chất SALES/STOCK đã tiếp nhận và kiểm tra hàng ngay trong flow trả hàng này rồi, không cần lặp lại bước tiếp nhận). `check_result` copy từ kết quả kiểm tra condition ở return_receipt (`DEFECTIVE` → `CONFIRMED`). Từ đây warranty_request đi tiếp bình thường theo SOP §6 từ bước 3 (QL duyệt resolution). |

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

#### `price_adjustments` — schema

Đã có sẵn trong `01-domain-model.md` (bảng `price_adjustments` đã có `import_receipt_item_id`). Khi APPROVED: KHÔNG sửa trực tiếp `import_receipt_items.unit_price` — chỉ update `cost_price` của `ProductUnit` còn `in_stock`.

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

#### `serial_number` — ràng buộc unique với unit bị huỷ (removed)

**Vấn đề:** Hiện tại `serial_number` là UNIQUE toàn cục, không phân biệt status. Khi 1 phiếu nhập bị hủy (`status=removed`), serial đó vẫn chiếm chỗ — chặn nhập lại cùng serial đó sau này.

**Có 2 hướng giải quyết:**

| Hướng | Mô tả | Ưu điểm | Nhược điểm |
|-------|-------|---------|------------|
| **(a) Partial unique index** | Đổi UNIQUE thành filtered index: `CREATE UNIQUE INDEX ... ON product_units(serial_number) WHERE status NOT IN ('removed','disposed','returned_to_supplier')` | Cho phép nhập lại serial đã huỷ mà không cần đổi dữ liệu. Index gọn. | MySQL trước 8.0 không hỗ trợ filtered index. MySQL 8.0+ có thể dùng `CREATE UNIQUE INDEX ... WHERE status <> 'removed'` nhưng cú pháp có giới hạn (không support OR, IN). Giải pháp: dùng generated column + unique index. |
| **(b) Đổi serial khi huỷ** | Khi hủy phiếu nhập, đổi `serial_number` lưu trong DB thành `{serial_gốc}-REMOVED-{timestamp}`. Giữ serial gốc ở cột `original_serial` (nullable, chỉ dùng cho removed units) để audit/tra cứu. | Hoạt động với mọi version MySQL. Không cần index đặc biệt. | Làm phức tạp logic trong cancel flow. Dữ liệu bị biến dạng (serial trong DB không còn là serial thật). |

> **Khuyến nghị:** Hướng (a) nếu DB là MySQL 8.0.13+ (dùng `VIRTUAL GENERATED COLUMN` + unique index để mô phỏng partial index). Hướng (b) nếu cần tương thích MySQL < 8.0 hoặc muốn tránh index phức tạp. **Chờ quyết định cuối cùng.**

#### `locations` — chặn vô hiệu hoá location đang có hàng

- Khi QL/Admin cố vô hiệu hoá (`is_active=false`) 1 location, hệ thống kiểm tra `productCount` (số unit `in_stock` đang gán location đó):
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
| `/warranty` | WarrantyListPage | Danh sách yêu cầu BH, filter theo status (pending / received / under_evaluation / resolved) |
| `/warranty/new` | WarrantyCreatePage | Tiếp nhận yêu cầu BH (SALES), tra cứu serial + tem bảo hành |
| `/warranty/:id` | WarrantyDetailPage | Chi tiết: STOCK nhập kết quả kiểm tra, QL duyệt resolution, STOCK thực thi |
| `/returns` | ReturnListPage | Danh sách phiếu trả hàng |
| `/returns/new` | ReturnCreatePage | SALES tạo, link export gốc bắt buộc |
| `/returns/:id` | ReturnDetailPage | STOCK kiểm tra condition, QL duyệt |
| `/price-adjustments` | PriceAdjustmentListPage | Danh sách điều chỉnh giá |
| `/price-adjustments/new` | PriceAdjustmentCreatePage | Tạo phiếu điều chỉnh giá |
| `/price-adjustments/:id` | PriceAdjustmentDetailPage | Chi tiết phiếu điều chỉnh giá |

### 11.1 Page size & Data export

**Page size selector** — `PaginationBar` hiển thị dropdown chọn số kết quả/trang: 10 (mặc định), 20, 50, 100. Đổi page size → tự reset về trang 0. Áp dụng cho: danh sách nhập/xuất, danh sách ProductUnit.

**CSV Export** — nút CSV (icon FileDown) xuất hiện trên `ImportDetailPage`, `ExportDetailPage` (xuất danh sách sản phẩm trong phiếu, UTF-8 BOM, mở được bằng Excel) và mỗi tab dạng bảng ở Dashboard. Cơ chế: `downloadCsv()` trong `utils/download-csv.ts` — tạo Blob + `URL.createObjectURL` + click ẩn, revoke sau khi download.

---

## 12. Ai duyệt cái gì? (Role-based Approval)

| Entity | Action | Ai được làm? |
|--------|--------|-------------|
| ImportReceipt | Tạo | STOCK, MANAGER |
| ImportReceipt | Duyệt (→ COMPLETED) | MANAGER, ADMIN |
| ImportReceipt | Cancel | MANAGER, ADMIN |
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
| PO | Tạo/Sửa | MANAGER |
| PO | Cancel | MANAGER |

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

## 13. Tham chiếu archive

Các bug/gap/edge-case đã được SOP xử lý có thể xem lại quá trình phân tích tại git history (các file gốc đã bị xóa sau khi gộp):
- `09-business-analysis.md` — gốc phân tích, bug P0, 23 edge cases, chính sách
- `09c-business-analysis-final-review.md` — rà soát cuối 28 mục từ `08-inventory-analysis.md`
