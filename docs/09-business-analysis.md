# Tổng hợp phân tích nghiệp vụ Nhập kho / Xuất kho / Kiểm kê / Điều chỉnh giá

> Hệ thống Quản lý Kho Linh Kiện Máy Tính — tổng hợp từ phiên phân tích domain-model + code review thực tế.
> Dùng làm context prompt cho AI khác — không phải tài liệu đọc cho người.

---

## 0. Bối cảnh hệ thống

- **Domain**: WMS cho cửa hàng bán lẻ linh kiện máy tính (kiểu GearVN), quản lý theo serial number (`serialized`) hoặc theo số lượng lô (`bulk`, dùng cho SP dạng mét/kg như cáp mạng).
- **Stack**: Spring Boot 4 + Java 25, MySQL 8 (Flyway), React 19 + Vite + TypeScript + TailwindCSS v4, JWT auth.
- **Quy mô**: 1 kho vật lý duy nhất (chưa multi-warehouse), 4 role: ADMIN, MANAGER (QL), STOCK (NV), SALES (role tồn tại trong schema nhưng **không xuất hiện ở bất kỳ ma trận phân quyền nào** liên quan nhập/xuất — gap chưa chốt).
- **Nguyên tắc xuyên suốt**: 4-eyes principle (`created_by ≠ approved_by`) cho mọi luồng có duyệt; audit log ghi `afterCommit`; FIFO tự động theo `imported_at` khi xuất; Admin chỉ giám sát, không khởi tạo giao dịch nghiệp vụ (ADR 7.9, Separation of Duties).
- **Có 2 nguồn tài liệu KHÁC NHAU đang tồn tại song song, cần đối chiếu**:
  1. Domain-model gốc (specs `01-entity-model.md`, `02-business-logic.md`, `03-known-issues.md`, `05-requirements-analysis.md`) — thiết kế đầy đủ, có state machine chi tiết.
  2. Code review thực tế đang chạy (`08-inventory-analysis.md`, ghi ngày 21/07/2026) + tài liệu implementation notes (`07-warehouse-flow.md`) — phản ánh code THẬT, lệch khá nhiều so với spec gốc.

---

## 1. Flow hiện tại theo domain-model gốc

### 1.1 Nhập kho

```
Tạo phiếu (chọn NCC, link PO nếu có) → status = pending
  → Thêm dòng SP (product, qty, unit_price, warranty_months)
  → Nhập serial (tay/Excel/barcode) — validate đủ SL, không trùng
  → Gán vị trí kho (hiện tại: chọn tay)
  → XÁC NHẬN (1 transaction): tạo product_units (status=in_stock, imported_at=now)
    → phiếu → pending_approval (CHƯA completed, chưa được xuất)
  → QL duyệt (approved_by ≠ created_by)
    → Duyệt → completed, cập nhật PO.received_quantity nếu có link
    → Từ chối → cancelled, units → removed (terminal, KHÔNG revert được)
```

**Điều kiện hủy phiếu đã completed**: chỉ được nếu 100% units sinh từ phiếu đó chưa từng rời `in_stock` (serialized: chưa có trong `export_receipt_item_units`; bulk: `remaining_quantity = initial_quantity`). Có dù chỉ 1 unit đã xuất → không hủy được cả phiếu.

### 1.2 Xuất kho

```
Tạo phiếu: chọn lý do (sale/internal/return_supplier/dispose)
  — reason=sale bắt buộc customer_id
  → Chọn SP + SL → check tồn ngay, thiếu → báo max khả dụng, cho xuất partial
  → FIFO auto-select: SELECT ... WHERE status='in_stock' ORDER BY imported_at ASC LIMIT n FOR UPDATE
  → Reserve: phiếu → pending_approval, serial đã chọn "bị khóa"
  → QL duyệt (approved_by ≠ created_by)
    → Duyệt → completed: units → sold; nếu sale, set warranty_start/expires_at
    → Từ chối → cancelled: giải phóng serial
```

### 1.3 Trạng thái `product_units` (code thật — 11 status)

`IN_STOCK, SOLD, DEFECTIVE, DAMAGED_IN_STORAGE, LOST, REMOVED (terminal), DISPOSED (terminal), UNDER_REPAIR, SENT_TO_MANUFACTURER, RETURNED, RETURNED_TO_SUPPLIER (terminal)`

Quy tắc quan trọng:
- `removed` = hủy phiếu nhập (chưa từng rời in_stock); `disposed` = thanh lý hàng hỏng đã xác nhận trong kho — 2 state này KHÔNG dùng thay thế nhau.
- Bulk unit: giữ `status=in_stock` xuyên suốt kể cả xuất một phần; chỉ chuyển `sold` khi `remaining_quantity` chạm 0. Khi rời `in_stock` vì damaged/lost/removed, `remaining_quantity` phải set về 0 (tránh SUM tồn sai).
- Warranty `resolution_type=replace`: unit thay thế `in_stock→sold`, hệ thống tự tạo `export_receipt` ngầm `reason=internal`, `sell_price=0` nhưng vẫn trừ giá vốn.

### 1.4 Kiểm kê (Stock Check)

```
Tạo phiếu kiểm kê → PENDING (chọn khu vực/toàn kho, snapshot SP+SL hiện tại)
  → Đếm thực tế → IN_PROGRESS (MATCH / MISSING / UNEXPECTED / PARTIAL_SHORTAGE)
  → COMPLETED (ghi nhận kết quả)
  → QL/AD duyệt → APPROVED
  → KHÔNG tự sửa kho — chỉ ghi nhận lệch, QL tạo Adjustment riêng cho từng item lệch
```

- MISSING → chuyển thẳng `product_unit.status = lost` ngay trong phiếu kiểm kê (không cần adjustment riêng).
- UNEXPECTED có serial → tạo `product_unit` mới ghi "found during stock check"; không rõ serial → bản ghi tổng chờ xử lý (dùng fallback `product_id`+`quantity` giống stock_adjustments).

### 1.5 Điều chỉnh giá (Price Adjustment)

Đã có trong code (`PriceAdjustment` entity + `PriceAdjustmentController`). Vấn đề thật là chất lượng implementation kém (xem mục 3).

Phân biệt 2 loại giá cần tách rõ:

| Loại | Đối tượng | Duyệt? | Ảnh hưởng |
|---|---|---|---|
| Điều chỉnh giá vốn nhập | `import_receipt_items.unit_price` | Có (4-eyes) | COGS/giá vốn tồn kho |
| Điều chỉnh giá bán | `products.sell_price` | Tùy | Chỉ ảnh hưởng phiếu xuất tạo SAU thời điểm đổi giá |

---

## 2. Mâu thuẫn giữa các nguồn tài liệu (CẦN CHỐT trước khi code tiếp)

| # | Điểm mâu thuẫn | Domain-model gốc (01/02) | Tài liệu implementation (07) | Code thật (08) |
|---|---|---|---|---|
| 1 | Thời điểm tạo `product_units` khi nhập | Tạo ngay lúc xác nhận (pending_approval), chặn export tới khi completed | Tạo khi phiếu → COMPLETED (duyệt xong) | `PENDING` status là dead code — `createAndConfirm()` tạo thẳng `PENDING_APPROVAL`, bỏ qua bước `pending` riêng |
| 2 | Hủy phiếu nhập đã COMPLETED | Chỉ hủy nếu 100% units chưa rời in_stock; `removed` terminal, không revert | "xóa ProductUnits" khi cancel, không điều kiện | Cancel có check đầy đủ: kiểm tra từng unit còn `IN_STOCK`, bulk check `remaining == initial`. Đúng spec |
| 3 | Auto-approve phiếu nhập | Duyệt "bắt buộc" (US-05/US-08 trong 02) | Có nhánh "PENDING → COMPLETED (auto)" không giải thích điều kiện | Không thấy trong code review |
| 4 | Enum status `product_units` | domain-model có thể có 15+, nhưng code thật chỉ 11 (`in_stock, sold, defective, damaged_in_storage, lost, removed, disposed, under_repair, sent_to_manufacturer, returned, returned_to_supplier`) | Không đề cập | Code có **11 status**: `IN_STOCK, SOLD, DEFECTIVE, DAMAGED_IN_STORAGE, LOST, REMOVED, DISPOSED, UNDER_REPAIR, SENT_TO_MANUFACTURER, RETURNED, RETURNED_TO_SUPPLIER`. **Không có `IN_TRANSIT`** — các status còn thiếu so với spec gốc cần được đối chiếu |
| 5 | `stock_adjustments.type` | `damaged \| lost \| found` (lowercase) | `DAMAGED / LOST / FOUND` (uppercase, thêm nhánh tách MISSING→LOST/DAMAGED) | Java enum `AdjustmentType`: `DAMAGED, LOST, FOUND` (uppercase). SQL comment V9 ghi `'damaged / lost / found'` (lowercase) nhưng chỉ là comment. Giá trị JPA lưu DB = tên enum → uppercase |

**Hành động cần làm**: quyết định nguồn sự thật duy nhất (khuyến nghị: domain-model gốc là target-state, code hiện tại là điểm xuất phát cần vá dần) trước khi viết thêm feature mới, tránh vừa code vừa đá nhau giữa 2 spec.

---

## 3. Bug thật đang chạy trong code — mức P0 (ảnh hưởng trực tiếp tính đúng của tồn kho)

| # | Bug | File/vị trí | Tác động |
|---|---|---|---|
| 1 | **Double-booking khi xuất** | `ExportReceiptService.create()` | Không dùng `FOR UPDATE`/`PESSIMISTIC_WRITE` khi claim unit. 2 phiếu xuất concurrent có thể chọn trùng serial → phiếu 2 fail lúc approve, hoặc overselling |
| 2 | **4-eyes principle thiếu ở StockAdjustmentService** | `StockAdjustmentService.approve():143-147` — `ImportReceiptService.approve()`, `ExportReceiptService.approve()`, `StockCheckService.approve()` đã có check đầy đủ | 3 service kia enforce OK (`createdBy.equals(userId)` → throw). Riêng `StockAdjustmentService` có comment `/* tạm thời bỏ 4-eyes */`, block check bị comment out → NV kho tự tạo + tự duyệt adjustment |
| 3 | **Không có optimistic locking** | `BaseEntity.java` — không entity nào có `@Version` | `remainingQuantity` của bulk unit có thể bị ghi đè khi 2 request xuất đồng thời (silent overwrite) |
| 4 | ~~`warrantyMonths` không copy sang `ProductUnit` lúc nhập~~ | — | **False positive**: `warrantyMonths` **đã được copy** ở `ImportReceiptMappingHelper.java:44` và `ImportReceiptService.java:165,181,223`. Lúc nhập → unit đã có warrantyMonths. |
| 5 | **Check trùng serial không có lock** | `ImportReceiptService.createAndConfirm():200-204` | 2 import concurrent có thể cùng insert trùng serial trước khi unique constraint DB kịp chặn |
| 6 | **`ReceiptCodeGenerator` race condition** | `ReceiptCodeGenerator.java:9-17` | Dùng **sequential** `prefix+YYYYMMDD-XXXX`, có while loop check DB existence. Không dùng timestamp+random. Nếu 2 request concurrent chọn cùng seq → unique constraint DB chặn, 1 request fail (không silent duplicate) — severity thấp hơn mô tả gốc |
| 7 | **JWT secret yếu, hardcoded** | `docker-compose.yml:39` | `JWT_SECRET` base64 của chuỗi ~28 ký tự dễ đoán — có thể forge token |
| 8 | **`ApiExceptionHandler` thiếu handler** | Chỉ bắt `ApiException` | Lỗi validation trả 500 thay vì 400, DB error có thể leak schema |
| 9 | **N+1 query nặng** | `ImportReceiptService.findAll()` (~80+ query/trang 20 receipt), `ExportReceiptService.toResponse()` | Chậm khi data lớn — đúng 2 màn hình dùng nhiều nhất hàng ngày |

---

## 4. Gap nghiệp vụ — có thiết kế (đôi khi có cả code proposal) nhưng chưa implement đầy đủ

| # | Gap | Trạng thái | Ghi chú |
|---|---|---|---|
| A | Draft cho phiếu nhập | Chưa có | Tạo là `PENDING_APPROVAL` ngay, không sửa được trước khi duyệt (chỉ approve/cancel). Phiếu 50+ dòng nhập sai 1 chỗ phải hủy làm lại từ đầu |
| B | Export reason-specific logic | Chưa có | `INTERNAL`, `RETURN_SUPPLIER`, `DISPOSE` xử lý y hệt `SALE` dù bản chất khác (không doanh thu, không khách hàng) |
| C | Return flow 2 chiều (`ImportReturn`, `SalesReturn`) | Đã có thiết kế chi tiết trong `08` mục 6-7 (entity, flow, `condition`/`resolution`), chưa implement. Trùng với gap `US-40`/`US-49` ở tài liệu domain gốc — đây chính là gap `return_receipts` được nêu ở nhiều nơi | Việc còn lại là implement, không phải thiết kế từ đầu |
| D | Location capacity | Nửa vời | Frontend đã có field `maxCapacity`, LocationPicker đã auto-suggest theo category (`category_zones` table đã tồn tại từ V4) — nhưng **backend Location entity chưa có `maxCapacity`** → không check được bin đầy, có thể nhập chồng vượt sức chứa |
| E | COGS/giá vốn thật | Chưa có | Report `stock-value` tính theo `sellPrice` (giá bán) chứ không phải giá vốn nhập. Lợi nhuận gộp báo cáo sai hoàn toàn |
| F | Lot/batch traceability | Chưa có | Không track lô hàng từ NCC, không trả lời được "serial này thuộc lô nào, lô đó còn bao nhiêu cái khác cũng lỗi" |
| G | Serial/location selection khi xuất | Chưa có | User không chọn được serial cụ thể hay location cụ thể để xuất — hoàn toàn auto FIFO, không override được |
| H | QC/Inspection khi nhập kho | Hoàn toàn chưa có (gap phát hiện qua review, không nằm trong 8 file gốc) | Xem đề xuất mục 5.2 |
| I | Auto-assign vị trí kho khi nhập | Hiện tại chọn tay | Xem đề xuất mục 5.1 — lưu ý: 1 phần cơ chế auto-suggest theo category ĐÃ CÓ ở frontend, chỉ cần hoàn thiện |

---

## 5. Thay đổi thiết kế đã đề xuất theo yêu cầu người dùng

### 5.1 Auto-assign vị trí kho (bỏ chọn tay)

Vì chỉ 1 kho quy mô nhỏ, dùng **fixed/category-based slotting** (không cần thuật toán velocity-based phức tạp của WMS lớn):

1. Zone ưu tiên = mapping `category_id → zone_code` (bảng `category_zones` đã tồn tại, Manager cấu hình sẵn).
2. Trong zone, ưu tiên bin đã chứa cùng `product_id` và còn `< maxCapacity` (gom hàng cùng loại).
3. Không có → bin trống có capacity phù hợp, ưu tiên bin % đã dùng thấp nhất trong zone.
4. Zone ưu tiên hết chỗ → fallback zone kế tiếp, cảnh báo QL.
5. Không tìm được bin nào → KHÔNG block phiếu nhập, để `location_id = NULL` tạm + flag "chờ gán thủ công".

Giữ nút đổi vị trí thủ công cho case ngoại lệ (SP cồng kềnh, cần cách ly).

### 5.2 Thêm bước QC/kiểm tra chất lượng hàng nhập

Đối chiếu thực tế các WMS (nguyên tắc "quarantine/hold" trước khi release vào tồn khả dụng — hàng nhập không bao giờ vào thẳng pick-able stock mà chưa qua kiểm tra). Đề xuất thêm status trung gian **`pending_qc`** trước `in_stock`:

```
Xác nhận phiếu nhập → product_units (status=pending_qc, KHÔNG tính vào tồn khả dụng)
  → NV kiểm tra từng serial: ngoại quan, đủ phụ kiện, test nhanh nếu có thể
  → Pass → in_stock | Fail → defective ngay (không qua in_stock), note "DOA - phát hiện lúc nhập"
  → Phiếu chỉ chuyển pending_approval sau khi 100% dòng đã qua QC
```

Không cần QC 100% từng cái — cấu hình theo category: SP giá trị cao (GPU/mainboard/CPU) bắt buộc QC từng serial; SP rẻ (cáp/phụ kiện) sampling hoặc bỏ qua.

### 5.3 Bảng `price_adjustments` — đề xuất refactor

**Bảng đã tồn tại** (V10 migration): có `adjust_code`, `import_receipt_item_id`, `old_price`, `new_price`, `reason`, `status`, `created_by`, `approved_by`, `approval_note`. Chỉ hỗ trợ điều chỉnh giá vốn nhập (link trực tiếp `import_receipt_items`), chưa có điều chỉnh giá bán.

**Đề xuất mở rộng**: thêm `target_type` ('import_cost' | 'sell_price') và `reference_id` (polymorphic) để 1 bảng phục vụ cả 2 loại:

```sql
ALTER TABLE price_adjustments
  ADD COLUMN target_type VARCHAR(20) NOT NULL DEFAULT 'import_cost'
    COMMENT 'import_cost | sell_price',
  ADD COLUMN reference_id BIGINT NOT NULL COMMENT 'import_receipt_item_id hoặc product_id',
  MODIFY COLUMN import_receipt_item_id BIGINT NULL;
```

Nguyên tắc: không bao giờ UPDATE trực tiếp `unit_price` trên dòng phiếu nhập đã completed — tạo adjustment record, duyệt xong mới áp giá mới, giữ giá cũ nguyên vẹn cho audit trail.

**Cần quyết định rõ**: áp dụng hồi tố cho unit đã bán hay chỉ prospective (units còn `in_stock`) — xem edge case §6.4.

---

## 6. Edge case tổng hợp theo luồng (chưa có trong 8 file gốc — tự suy luận qua review)

### 6.1 Nhập kho

| # | Edge case | Mô tả | Mức độ |
|---|-----------|-------|--------|
| 1 | PO rollback khi hủy import | Hủy phiếu nhập đã completed có link PO → `received_quantity` không được rollback, PO status không tính lại → PO báo sai "đã nhận đủ" | **P0** |
| 2 | Tie-break FIFO trùng millisecond | Khi `imported_at` trùng millisecond (nhập nhiều serial cùng transaction) — cần secondary sort `id ASC` | **P1** |
| 3 | Duplicate serial trong cùng file Excel | Cả 2 dòng pass validate rồi vi phạm unique constraint lúc insert | **P1** |
| 4 | QC/DOA sau khi phiếu đã completed | Cần phân biệt "lỗi phát hiện lúc QC nhập" (policy đổi NCC nhanh, trong 3-7 ngày) vs "lỗi phát hiện trong kho" (policy khác) | **P1** |
| 5 | Over-receipt so với PO | NCC giao dư so với PO — chỉ xử lý case thiếu/đúng, chưa xử lý case nhận nhiều hơn đặt | **P1** |
| 6 | Race condition `received_quantity` | 2 phiếu nhập cùng link 1 PO duyệt gần đồng thời → cần atomic `UPDATE received_quantity = received_quantity + ?`, không phải read-modify-write | **P0** |
| 7 | SP/NCC bị deactivate giữa lúc PO/phiếu nhập draft đang mở | Chưa có rule rõ ràng | **P2** |

### 6.2 Xuất kho

| # | Edge case | Mô tả | Mức độ |
|---|-----------|-------|--------|
| 1 | Hủy phiếu xuất khi unit đã đi xa hơn `sold` | Unit đã sang `under_repair`/`sent_to_manufacturer`/`returned` — không thể revert thẳng về `in_stock`, cần chặn và báo lỗi rõ thay vì set bừa | **P0** |
| 2 | Warranty ghi đè khi bán lại | `warranty_start_date` bị ghi đè nếu unit được bán lại lần 2 sau khi khách trả hàng — chưa rõ tính BH từ lần bán nào | **P1** |
| 3 | Export internal sub-type | Demo/gift/sample bị gộp chung 1 reason, không phân biệt "mất hẳn" vs "vẫn còn nhưng đổi mục đích" — nên có sub-type | **P2** |
| 4 | Bulk unit: hủy xuất khi đã bán hết | `remaining_quantity=0, status=sold` → phải update ĐỒNG BỘ cả 2 field (cộng lại `remaining_quantity` VÀ đổi `sold→in_stock`), chưa ai viết rule chiều ngược này | **P1** |
| 5 | Export vs Adjustment race condition | Cùng 1 unit bị 2 luồng khác nhau (xuất và điều chỉnh) tranh chấp — không có cơ chế lock chéo | **P0** |
| 6 | Chuỗi đổi bảo hành không giới hạn | `replacement_unit_id` không có ngưỡng cảnh báo, rủi ro gian lận đổi hàng | **P1** |

### 6.3 Kiểm kê

| # | Edge case | Mô tả | Mức độ |
|---|-----------|-------|--------|
| 1 | Stock check snapshot bị stale | Kiểm kê kéo dài, unit bị xuất hợp lệ giữa lúc đang kiểm → báo `MISSING` sai | **P1** |
| 2 | 2 phiếu kiểm kê chồng phạm vi | Cùng zone — không có ràng buộc chặn tạo trùng | **P1** |
| 3 | Found bulk nhiều hơn lost trước đó | Không validate, rủi ro tạo tồn ảo/gian lận nội bộ | **P2** |
| 4 | Unexpected sai vị trí | Phát hiện đúng serial đã tồn tại nhưng SAI VỊ TRÍ — cần nhánh "sai lệch vị trí" riêng (update `location_id`), không phải nhánh `found` (tạo unit mới), nếu không sẽ trùng unit/sai tồn theo bin | **P1** |

### 6.4 Điều chỉnh giá

| # | Edge case | Mô tả | Mức độ |
|---|-----------|-------|--------|
| 1 | Hồi tố vs Prospective | Price adjustment không hồi tố units đã bán trước đó → COGS của các đơn cũ (giá cũ) và units còn tồn (giá mới) lệch nhau, cần quyết định rõ prospective-only hay hồi tố toàn bộ + hiển thị rõ trên UI | **P1** |
| 2 | Hóa đơn/CSV đã in lệch với DB | Bản in cũ lệch vĩnh viễn với DB mới, nên cân nhắc tạo "biên bản điều chỉnh giá" có mã chứng từ riêng để in kèm, phù hợp yêu cầu kế toán VN về chứng từ không sửa ngầm | **P1** |

### 6.5 Phát hiện bổ sung khi đọc code — cross-cutting

| # | Edge case | Flow | Chi tiết | Mức |
|---|-----------|------|----------|:---:|
| 1 | **PriceAdjustment approve UPDATE thẳng unit_price gốc** | Điều chỉnh giá | `PriceAdjustmentService.java:115` — `item.setUnitPrice(adj.getNewPrice())` sửa trực tiếp dòng nhập gốc. Vi phạm nguyên tắc "không UPDATE trực tiếp, giữ audit trail". Mất trace giá cũ nếu adjustment bị xóa | **P0** |
| 2 | **Export approve overwrite unit status không check** | Xuất | `ExportReceiptService.approve():206` — không check current status của unit trước khi set SOLD. Nếu unit bị DAMAGED/LOST giữa lúc create→approve, approve vẫn ghi đè → mất trace | **P0** |
| 3 | **Adjustment không lock unit trước modify** | Điều chỉnh | `applyDamaged/Lost/Found` đọc unit → modify → save, không `PESSIMISTIC_WRITE`. Xung đột với export approve trên cùng unit | **P0** |
| 4 | **StockCheck UNEXPECTED không tạo unit mới** | Kiểm kê | `StockCheckService.approve():186-188` — chỉ `setStatus(actualStatus)` trên unit cũ. Không handle "found serial lạ" (serial chưa có trong DB, tạo mới hoặc ghi nhận fallback) | **P1** |
| 5 | **Serial case-insensitive conflict** | Nhập | `findExistingSerialNumbers` là case-sensitive. `"SN001"` và `"sn001"` qua được check → insert thành 2 unit. DB unique constraint cũng case-sensitive (utf8mb4_bin hoặc general_ci) | **P1** |
| 6 | **Import không validate location tồn tại** | Nhập | `locationId` gán thẳng vào ProductUnit, không `findById` check location có thật không. Nếu sai → unit nằm ở location ảo, tồn kho theo location sai | **P1** |
| 7 | **Export không validate customer tồn tại** | Xuất | `customerId` chỉ null-check, không `findById` verify. Nếu sai → phiếu xuất sale không trace được khách | **P1** |
| 8 | **Negative/zero quantity không bị chặn** | Nhập/Xuất | `ImportItemRequest.quantity` là `BigDecimal` không có `@Min(1)`. Có thể nhập `qty=0` hoặc `qty=-5` → tạo product_unit sai, tồn kho âm/ảo | **P1** |
| 9 | **User deactivated vẫn approve được** | All | `approve()` lấy `userId` từ JWT, không query DB check `is_active`. User bị khóa vẫn approve được receipt/check/adjustment | **P1** |
| 10 | **PO đã COMPLETED vẫn cho link** | Nhập | `createAndConfirm()` không check `purchase_order.status` trước khi link. PO đã hoàn thành vẫn nhận thêm hàng | **P1** |
| 11 | **StockCheck bulk không handle partial shortage** | Kiểm kê | Bulk unit `remaining_quantity` thay đổi theo thời gian. Snapshot lúc create khác lúc record. `PARTIAL_SHORTAGE` được nhắc trong doc 1.4 nhưng `DifferenceType` không có enum này | **P2** |
| 12 | **Không có PARTIAL_SHORTAGE enum** | Kiểm kê | `DifferenceType` chỉ có MATCH/MISSING/UNEXPECTED. Doc mục 1.4 mô tả nhưng code không implement | **P2** |

---

## 7. Gap chính sách nghiệp vụ cần xác nhận với chủ cửa hàng/QL (không phải quyết định kỹ thuật thuần túy)

| # | Gap | Rủi ro nếu không xác nhận |
|---|---|---|
| 1 | FIFO cứng, không cho chọn tay serial | Có thể chặn use case thực tế (khách muốn serial mới hơn) |
| 2 | `removed` không thể revert khi hủy nhầm phiếu nhập | Thao tác sai không có đường lùi |
| 3 | Warranty inheritance (kế thừa hạn BH khi đổi serial) là chính sách business | Có thể sai luật bảo vệ người tiêu dùng VN |
| 4 | Tồn âm "có thể bật" nhưng thiếu luồng backorder đi kèm | Bật tính năng nhưng thiếu logic hỗ trợ |
| 5 | SLA xử lý bảo hành khi hết serial để đổi | Khách có thể chờ vô thời hạn |
| 6 | Backup approval khi chỉ có 1 QL và họ vắng mặt | Nghẽn quy trình duyệt |
| 7 | Mapping unit↔tracking_type hard-code trong Service layer | Thêm UOM mới phải sửa code |
| 8 | Retention policy cho audit log | Có thể vi phạm luật lưu trữ chứng từ kế toán VN |
| 9 | Role `SALES` không xuất hiện ở bất kỳ ma trận quyền nhập/xuất nào | Không rõ SALES có quyền gì trong luồng bán hàng |
| 10 | Số ảnh tối đa "5"/sản phẩm — nguồn gốc con số chưa rõ | Constraint tùy tiện |

---

## 8. Việc cần làm tiếp theo (đề xuất thứ tự ưu tiên)

1. **P0 — chốt trước khi code thêm feature mới**: quyết định nguồn sự thật giữa domain-model gốc vs code thật (mục 2), đặc biệt là enum status `product_units` (11 vs 15+ giá trị).
2. **P0 — fix bug đang chạy**: double-booking export (thêm `PESSIMISTIC_WRITE`/status `reserved`), 4-eyes ở StockAdjustmentService (uncomment block), thêm `@Version` cho concurrency-critical entities, không UPDATE thẳng `unit_price` khi approve price adjustment, check unit status trước khi set SOLD ở export approve, thêm `PESSIMISTIC_WRITE` cho adjustment apply methods. `warrantyMonths` đã copy OK — không cần fix.
3. **P1 — hoàn thiện gap đã có thiết kế**: Draft cho import, Return flow (Import/Sales Return), `maxCapacity` ở backend, COGS thật.
4. **P1 — feature mới theo yêu cầu**: auto-assign location, QC/inspection step khi nhập.
5. **P2 — case validate thêm**: các edge case ở mục 6, ưu tiên theo tần suất xảy ra thực tế trong vận hành.
6. **Xác nhận chính sách business** ở mục 7 với chủ cửa hàng trước khi lock design cứng vào code.
