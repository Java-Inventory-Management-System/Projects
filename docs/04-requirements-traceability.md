# Requirements Traceability

> Hợp nhất từ `04-user-stories.md` (user stories + acceptance criteria) và `05-requirements-analysis.md` (traceability matrix RQ → US).
> Mỗi yêu cầu (RQ) được trace tới User Story (US) và ngược lại.

---

## 1. Requirements Traceability Matrix

> **Loại**: F = Functional, N = Non-functional, T = Technical constraint
> **Priority**: MoSCoW (Must / Should / Could / Won't)
> **Actor**: AD = ADMIN, QL = MANAGER (Quản lý), NV = STOCK (Nhân viên kho), SL = SALES (Nhân viên bán hàng), HT = Hệ thống

### Auth & Security

| ID    | Yêu cầu                               | Loại | Nguồn      | Pri   | Actor | US    |
| ----- | ------------------------------------- | ---- | ---------- | ----- | ----- | ----- |
| RQ-01 | Đăng nhập bằng username/password      | F    | Phỏng vấn  | Must  | User  | US-30 |
| RQ-02 | Refresh token tự động                 | F    | Phỏng vấn  | Must  | HT    | US-30 |
| RQ-03 | Đổi mật khẩu                          | F    | Phỏng vấn  | Must  | User  | US-29 |
| RQ-04 | Forgot/reset password bằng token      | F    | Phỏng vấn  | Must  | User  | US-29 |
| RQ-05 | Admin tạo/khoá/mở user                | F    | Phỏng vấn  | Must  | AD    | US-28 |
| RQ-06 | Admin gán role cho user (≠ ADMIN)     | F    | Phỏng vấn  | Must  | AD    | US-28 |
| RQ-07 | Admin không tự gán ADMIN cho bản thân | N    | SAD review | Must  | AD    | US-28 |
| RQ-08 | Admin không thể tạo user role ADMIN   | N    | SAD review | Must  | AD    | US-28 |
| RQ-09 | CRUD role                             | F    | SAD review | Won't | AD    | US-37 |

### Catalog

| ID    | Yêu cầu                                  | Loại | Nguồn     | Pri   | Actor    | US    |
| ----- | ---------------------------------------- | ---- | --------- | ----- | -------- | ----- |
| RQ-10 | CRUD brand/category/supplier             | F    | Phỏng vấn | Must  | QL       | US-25 |
| RQ-11 | CRUD sản phẩm (kèm unit ↔ tracking_type) | F    | Phỏng vấn | Must  | QL       | US-26 |
| RQ-12 | Upload ảnh sản phẩm (tối đa 5)           | F    | Phỏng vấn | Could | QL       | US-27 |
| RQ-13 | CRUD vị trí kho (zone-shelf-bin)         | F    | Phỏng vấn | Must  | QL       | US-35 |
| RQ-13a | Validate location theo quy ước — zone A-Z, shelf NN, bin NNN; cảnh báo khi location không có category_zones mapping | N | Domain review | Should | HT (Service layer) | US-35 |
| RQ-14 | CRUD khách hàng (NV/SL: xem + thêm)       | F    | Phỏng vấn | Must  | QL/NV/SL | US-36 |

### Purchase Order

| ID | Yêu cầu | Loại | Nguồn | Pri | Actor | US |
|---|---|---|---|---|---|---|
| RQ-53 | Tạo đơn đặt hàng (PO) với NCC + SP + số lượng + giá + ngày giao | F    | Phỏng vấn | Must   | QL | US-44 |
| RQ-54 | Link PO khi tạo phiếu nhập (Phase 1) — pre-fill NCC + SP | F | Phỏng vấn | Must | QL | US-45 |
| RQ-55 | Tự động cập nhật received_quantity + trạng thái PO khi duyệt import | F | Phỏng vấn | Must | HT | US-46 |
| RQ-56 | Hủy đơn đặt hàng | F | Phỏng vấn | Should | QL | US-47 |
| RQ-57 | Gợi ý đặt hàng khi tồn thấp — tự động gộp sản phẩm sắp hết của cùng NCC thành PO nháp | F | Phỏng vấn | Should | HT | US-48 |

### Inventory

| ID    | Yêu cầu                                | Loại | Nguồn     | Pri    | Actor | US    |
| ----- | -------------------------------------- | ---- | --------- | ------ | ----- | ----- |
| RQ-15 | Tạo phiếu nhập (Phase 1 — MANAGER)      | F    | Phỏng vấn | Must   | QL    | US-01 |
| RQ-16 | Thêm dòng sản phẩm vào phiếu nhập      | F    | Phỏng vấn | Must   | QL    | US-02 |
| RQ-17 | Nhập serial + QC + location (Phase 2 — STOCK) | F | Phỏng vấn | Must | NV | US-03 |
| RQ-18 | Gán vị trí kho cho từng dòng/lô        | F    | Phỏng vấn | Should | NV    | US-04 |
| RQ-19 | Submit serial+QC lên duyệt             | F    | Phỏng vấn | Must   | NV    | US-05 |
| RQ-20 | Sửa serial sau nhập (nếu chưa xuất)    | F    | Phỏng vấn | Should | QL    | US-06 |
| RQ-21 | Duyệt/từ chối phiếu nhập               | F    | Phỏng vấn | Must   | QL/AD | US-07 |
| RQ-22 | Tạo phiếu xuất (chọn lý do, KH)        | F    | Phỏng vấn | Must   | QL/NV/SL | US-08 |
| RQ-23 | FIFO tự động khi xuất                  | F    | Phỏng vấn | Must   | QL/NV/SL | US-09 |
| RQ-24 | Báo tồn tối đa khi xuất thiếu          | F    | Phỏng vấn | Must   | QL/NV/SL | US-10 |
| RQ-25 | Xác nhận phiếu xuất (kích hoạt BH)     | F    | Phỏng vấn | Must   | QL/NV/SL | US-11 |
| RQ-26 | Đổi serial thay thế trước xuất         | F    | Phỏng vấn | Could  | QL/NV/SL | US-12 |
| RQ-27 | Hủy phiếu xuất (reset BH nếu có)       | F    | Phỏng vấn | Must   | QL/AD | US-13 |
| RQ-28 | Xuất lẻ (bulk: meter/kg)               | F    | Phỏng vấn | Must   | QL/NV/SL | US-33 |
| RQ-21a | Hủy phiếu nhập (chuyển trạng thái terminal, không xóa cứng) | F | Phỏng vấn | Must | QL/AD | US-08 |
| RQ-60 | Theo dõi trạng thái trả NCC — lưu các milestone SENT/CONFIRMED_RECEIVED/PROCESSING/RESOLVED | F | Domain review | Should | NV | US-51 |

### Warranty

| ID    | Yêu cầu                        | Loại | Nguồn     | Pri    | Actor | US    |
| ----- | ------------------------------ | ---- | --------- | ------ | ----- | ----- |
| RQ-29 | Tra cứu BH theo serial (fuzzy) | F    | Phỏng vấn | Must   | NV/SL | US-14 |
| RQ-30 | Tiếp nhận yêu cầu BH           | F    | Phỏng vấn | Must   | NV/SL | US-15 |
| RQ-31 | Xử lý BH (đổi/RMA/sửa/từ chối) | F    | Phỏng vấn | Must   | NV/QL | US-16 |
| RQ-32 | Hoàn tất phiếu BH + audit      | F    | Phỏng vấn | Must   | NV    | US-17 |
| RQ-33 | Xử lý hết tồn khi đổi BH       | F    | Phỏng vấn | Should | NV    | US-18 |

### Stock Adjustment & Check

| ID | Yêu cầu | Loại | Nguồn | Pri | Actor | US |
|---|---|---|---|---|---|---|
| RQ-34 | Tạo phiếu điều chỉnh tồn | F | Phỏng vấn | Must | NV/QL | US-19 |
| RQ-35 | Duyệt phiếu điều chỉnh (4-eyes) | F | Phỏng vấn | Must | QL/AD | US-20 |
| RQ-36 | Found không rõ serial (fallback) | F | Phỏng vấn | Should | HT | US-21 |
| RQ-37 | Tạo phiếu kiểm kê | F | Phỏng vấn | Should | QL | US-22 |
| RQ-38 | Ghi nhận trạng thái thực tế khi kiểm kê | F | Phỏng vấn | Should | NV | US-23 |
| RQ-39 | Duyệt kết quả kiểm kê lệch | F | Phỏng vấn | Should | QL/AD | US-24 |
| RQ-40 | Xử lý hàng thừa khi kiểm kê (có/không serial) | F | Phỏng vấn | Should | NV | US-34 |
| RQ-58 | Kiểm kê định kỳ (scheduled) — QL config tần suất, hệ thống tự tạo phiếu + noti | F | Domain review | Should | HT | US-49 |

### Audit & Monitoring

| ID    | Yêu cầu                                      | Loại | Nguồn         | Pri    | Actor | US           |
| ----- | -------------------------------------------- | ---- | ------------- | ------ | ----- | ------------ |
| RQ-41 | Audit log mọi thay đổi dữ liệu               | F    | Phỏng vấn     | Must   | HT    | US-31, US-32 |
| RQ-42 | Audit log afterCommit (tránh phantom)        | T    | Domain review | Must   | HT    | US-32        |
| RQ-43 | Admin xem toàn bộ audit log, QL xem kho mình | F    | Phỏng vấn     | Should | AD/QL | US-31        |
| RQ-44 | Cảnh báo tồn dưới min_stock                  | F    | Domain review | Should | QL    | US-38        |
| RQ-45 | Gắn nhãn dead stock (mặc định 90 ngày, configurable) | F | Domain review | Could  | QL    | US-39        |
| RQ-59 | Gợi ý xử lý dead stock — đề xuất giảm giá/thanh lý từ dashboard | F | Domain review | Could | QL | US-50 |

### Non-functional

| ID | Yêu cầu | Loại | Nguồn | Pri | Actor | US |
|---|---|---|---|---|---|---|
| RQ-46 | 4-eyes principle: created_by ≠ approved_by | N | SAD review | Must | HT | US-20, US-42 |
| RQ-47 | Không cho phép tồn âm (mặc định) | N | Domain review | Must | HT | US-10 |
| RQ-48 | Mapping unit ↔ tracking_type cứng | T | Domain review | Must | HT | US-26 |

### Gaps chưa có US

| ID    | Yêu cầu                             | Loại | Nguồn         | Pri | Ghi chú                                    |
| ----- | ----------------------------------- | ---- | ------------- | --- | ------------------------------------------ |
| RQ-49 | Quy trình trả hàng khách (ngoài BH) | F    | Edge cases    | Must | Đã có thiết kế (`return_receipts` + flow chi tiết) |
| RQ-50 | Điều chỉnh giá nhập sau xác nhận    | F    | Edge cases    | Must | Đã có thiết kế (`price_adjustments` flow) |
| RQ-51 | Retention policy audit log          | N    | Domain review | Must | Tối thiểu 2 năm — đã chốt với business. Không làm archive/purge job ở phase 1. |
| RQ-52 | Backup duyệt khi QL vắng            | N    | SAD review    | Must | Admin duyệt thay |

---

## 2. User Stories

> Mỗi story được trace ngược về bảng/cột trong ERD và các quyết định nghiệp vụ.

Actor: **AD** = Admin, **QL** = Quản lý kho, **NV** = Nhân viên kho, **SL** = Nhân viên bán hàng, **HT** = Hệ thống (background job/automation)

### 2.1 Epic 1 — Nhập kho

**US-01** | Là **Manager**, tôi muốn khởi tạo phiếu nhập với nhà cung cấp và ngày nhập, để bắt đầu ghi nhận hàng vào kho.
- AC: Chọn `supplier_id` từ danh sách; phiếu tạo với `status = PENDING`; `receipt_code` tự sinh unique dạng `IMP-yyyyMMdd-seq`.
- Priority: Must.

**US-02** | Là **Manager**, tôi muốn thêm nhiều dòng sản phẩm vào 1 phiếu nhập kèm số lượng, đơn giá, số tháng bảo hành, để nhập nhiều mặt hàng cùng lúc.
- AC: Mỗi dòng ghi `product_id`, `expected_quantity`, `unit_price`, `warranty_months`; hỗ trợ thêm/xoá dòng trước khi tạo; tạo xong chuyển sang Phase 2 cho Stock.
- Priority: Must.

**US-03** | Là **Stock**, tôi muốn nhập serial cho từng dòng sản phẩm (tay/Excel/barcode), để hệ thống tạo `product_units` theo dõi từng đơn vị vật lý.
- AC: Nhập số serial thực tế (KHÔNG block nếu khác `expected_quantity`); trùng serial hiện có trong hệ thống → trả lỗi cụ thể (kèm receiptId + ngày); import file lỗi 1 phần → skip dòng lỗi, nhập phần còn lại, trả về danh sách lỗi.
- AC: Item 0 serial → phải chọn `itemStatus = NOT_RECEIVED` trước khi submit (optional lý do).
- AC: Phát hiện hàng ngoài danh sách → bắt buộc ghi `discrepancyNotes`.
- Priority: Must.
- **Đã chốt:** Ngưỡng lỗi 20% (gộp cả trùng nội bộ file + trùng DB) → chặn toàn phiếu. Dưới ngưỡng → skip dòng lỗi, nhập phần còn lại. Xem `02-sop-nghiep-vu.md §2.2 Bước 2`.

**US-04** | Là **Stock**, tôi muốn gán vị trí kho cho từng dòng sản phẩm hoặc cả lô, để hàng có vị trí lưu trữ xác định.
- AC: Chọn `location_id` cho từng item (hoặc để auto-assign sau submit); hệ thống gợi ý vị trí trống hoặc vị trí đã có sản phẩm cùng loại.
- Priority: Should.
- **Đã chốt:** Giữ 3 cấp zone-shelf-bin, shelf/bin optional khi nhập (chỉ bắt buộc zone).

**US-05** | Là **Stock**, tôi muốn gửi phiếu nhập kèm serial + QC lên duyệt, để Manager kiểm tra và hoàn tất nhập kho.
- AC: Submit gửi danh sách serial thực tế + kết quả QC + location (KHÔNG gửi expectedQuantity); BE tự tính `receivedQuantity = count(serial)`, `qcPassQuantity`, `qcFailQuantity`; phiếu chuyển `PENDING_APPROVAL`; ghi audit log #2.
- AC: Validate: MỌI item phải có ≥1 serial hoặc đã chọn NOT_RECEIVED; không block nếu received ≠ expected.
- Priority: Must.

**US-06** | Là **Manager**, tôi muốn sửa lại serial vừa nhập nếu phát hiện nhập sai, để tránh phải hủy cả phiếu.
- AC: Chỉ cho sửa nếu unit chưa xuất kho và không trong bảo hành; ghi audit log giá trị cũ → mới (#3).
- Priority: Should.

**US-07** | Là **Manager/Admin**, tôi muốn duyệt hoặc từ chối phiếu nhập `PENDING_APPROVAL`, để hoàn tất nhập kho hoặc yêu cầu Stock sửa lại.
- AC (Duyệt → COMPLETED): `created_by ≠ approved_by`; cộng tồn kho = `qcPassQuantity`; ghi audit log #4.
- AC (Từ chối → PENDING): Bắt buộc nhập `reject_reason`; serial + QC đã nhập giữ nguyên (Stock sửa lại và resubmit); ghi audit log #23.
- Priority: Must.

**US-08** | Là **Manager/Admin**, tôi muốn hủy một phiếu nhập (bất kỳ trạng thái nào), để xử lý trường hợp nhập nhầm hoàn toàn.
- AC: Phiếu chuyển `CANCELLED`; các `product_units` liên quan chuyển `REMOVED` (terminal, không thể revert); ghi audit log #6.
- Priority: Must.
- **Lưu ý:** `REMOVED` không thể revert — trade-off đã chấp nhận (xem §3.1 mục 2). Nếu bấm nhầm nút hủy, phải tạo lại toàn bộ phiếu nhập từ đầu.

### 2.2 Epic 2 — Xuất kho

**US-08** | Là **QL/NV/SL**, tôi muốn khởi tạo phiếu xuất với lý do xuất (bán/nội bộ/trả NCC/hủy), để phân loại mục đích xuất kho.
- AC: Nếu lý do là bán hàng → bắt buộc chọn/tạo `customer_id`.
- Priority: Must.

**US-09** | Là **QL/NV/SL**, tôi muốn hệ thống tự động chọn serial theo FIFO khi xuất, để không phải chọn tay từng serial.
- AC: Query `ORDER BY imported_at ASC ... FOR UPDATE`; danh sách serial hiển thị cho NV xem trước khi xác nhận; gom theo `location_id` để giảm di chuyển.
- Priority: Must.
- **Đã chốt:** Cho phép NV override serial tay + bắt buộc lý do.

**US-10** | Là **QL/NV/SL**, tôi muốn được báo số lượng tối đa có thể xuất khi tồn không đủ, để chọn xuất một phần thay vì bị chặn hoàn toàn.
- AC: Hệ thống tính tồn khả dụng trước khi cho thêm dòng; cho phép xuất partial; không cho phép tồn âm (trừ khi cấu hình bật).
- Priority: Must.
- **Đã chốt:** Chặn tồn âm với serialized. Với bulk: giữ chặn cứng, không mở phase 1.

**US-11** | Là **QL/NV/SL**, tôi muốn xuất tạm (reserve) phiếu xuất, để khoá serial và chờ QL duyệt.
- AC: Hệ thống lock serial đã chọn (`SELECT ... FOR UPDATE`), phiếu chuyển `PENDING_APPROVAL`; ghi audit log. Serial bị khoá không được chọn bởi phiếu xuất khác.
- Priority: Must.

**US-42** | Là **QL/AD**, tôi muốn duyệt phiếu xuất, để xác nhận xuất kho và kích hoạt bảo hành (nếu là bán hàng).
- AC: Chỉ QL/AD được duyệt; `approved_by ≠ created_by`. Khi duyệt: `product_units.status` từ `RESERVED` → `SOLD`; nếu `reason = sale` → set `warranty_start_date` = ngày duyệt, tính `warranty_expires_at`; phiếu `COMPLETED`; ghi audit log #4. Nếu từ chối → phiếu `CANCELLED`, giải phóng serial (`RESERVED` → `IN_STOCK`).
- Priority: Must.

**US-12** | Là **QL/NV/SL**, tôi muốn đổi serial thay thế trước khi hoàn tất nếu hàng thực tế không khớp serial hệ thống chọn, để xử lý sai lệch giữa hệ thống và thực tế kho.
- AC: Cơ chế swap serial trong cùng phiếu xuất trước khi confirm cuối.
- Priority: Could.

**US-13** | Là **QL/AD**, tôi muốn hủy phiếu xuất đã xác nhận, để xử lý trường hợp xuất nhầm.
- AC: `product_units` liên quan set lại `IN_STOCK`, giữ nguyên `imported_at` gốc (không phá FIFO); nếu đã kích hoạt bảo hành → reset `warranty_start_date`/`warranty_expires_at` về NULL; ghi audit log #6.
- Priority: Must.

**US-33** | Là **QL/NV/SL**, tôi muốn xuất một phần số lượng lẻ (ví dụ 1.5m cáp) từ một unit dạng bulk, để phục vụ bán lẻ theo mét/kg.
- AC: Nếu `remaining_quantity > qty_xuất` → chỉ trừ `remaining_quantity`, không đổi `status`; nếu `remaining_quantity = qty_xuất` → set `status = SOLD`; tổng tồn = SUM(remaining_quantity) cho bulk + COUNT(id) cho serialized.
- Priority: Must.

**US-51** | Là **NV**, tôi muốn cập nhật trạng thái xử lý của NCC (sent → confirmed_received → processing → resolved) trên phiếu trả NCC, để theo dõi tiến độ và kết quả (hoàn tiền/đổi hàng/từ chối).
- AC: `supplier_status` cập nhật thủ công bởi NV; khi chuyển `RESOLVED` → bắt buộc nhập `supplier_result` (FULL_REFUND/PARTIAL_REFUND/REPLACEMENT/REJECTED); dashboard lọc phiếu chưa RESOLVED.
- Priority: Should.

**US-52** | Là **ADMIN**, tôi muốn warehouse "Kho chính" được seed mặc định khi khởi tạo hệ thống, để có không gian vật lý làm việc cho locations.
- AC: "Kho chính" được seed mặc định, pre-fill trong các form nhập/xuất; không cho phép tạo warehouse thứ hai (chặn cứng, không toggle).
- Priority: Must.

### 2.3 Epic 3 — Bảo hành

**US-14** | Là **NV/SL**, tôi muốn tra cứu bảo hành theo serial, để xem sản phẩm, ngày mua, hạn bảo hành và lịch sử xử lý trước đó.
- AC: Hỗ trợ tìm gần đúng khi serial dễ nhầm (O/0, I/l).
- Priority: Must.

**US-15** | Là **NV/SL**, tôi muốn tiếp nhận yêu cầu bảo hành từ khách, để tạo phiếu và ghi nhận mô tả lỗi.
- AC: Kiểm tra serial tồn tại và còn hạn; xác minh khách qua tên/SĐT nếu có thể; tạo `warranty_requests.status = PENDING`.
- Priority: Must.

**US-16** | Là **NV/QL**, tôi muốn xử lý yêu cầu bảo hành theo 1 trong 4 hướng (sửa chữa/đổi mới/hoàn tiền/từ chối), để giải quyết dứt điểm từng ca bảo hành.
- AC: Sửa chữa → chuyển `UNDER_REPAIR`, không tính tồn; nếu gửi NCC → lưu `rma_number`, `sent_to_partner_at`; sửa xong → `SOLD`, không sửa được → `DEFECTIVE`. Đổi mới → serial cũ chuyển `DEFECTIVE`; serial mới `IN_STOCK → SOLD`, kế thừa hạn BH còn lại (giữ nguyên `warranty_start_date` gốc). Hoàn tiền → unit chuyển `RETURNED`. Từ chối → không đổi status, ghi rõ lý do.
- Lưu ý: nếu warranty_request đến từ nhánh WARRANTY_TRANSFER của return_receipt (§7.2), unit đầu vào đã ở `DEFECTIVE` thay vì `SOLD` — transition tương ứng theo từng resolution xem `01-domain-model.md` §2.1 (bảng có cột riêng cho nguồn `DEFECTIVE`).
- Priority: Must.
- **Đã chốt:** Kế thừa hạn BH cũ — giữ nguyên `warranty_start_date` gốc, không reset.

**US-17** | Là **NV**, tôi muốn hoàn tất phiếu bảo hành, để đóng ca xử lý và ghi audit log.
- AC: `status = RESOLVED`, ghi hướng xử lý thực tế + người xử lý + ngày hoàn tất.
- Priority: Must.

**US-18** | Là **NV**, tôi muốn xử lý trường hợp đổi hàng bảo hành nhưng hết tồn serial cùng loại, để không bị kẹt quy trình.
- AC: Giữ `PENDING` chờ nhập thêm hàng, hoặc chuyển hướng RMA/từ chối.
- Priority: Should.
- **Đã chốt:** SLA = 7 ngày làm việc kể từ QL duyệt REPLACE. Quá hạn → cảnh báo QL, không tự huỷ. QL có nút "Chuyển sang REFUND". Config qua `system_settings`.

### 2.4 Epic 4 — Điều chỉnh tồn kho thủ công

**US-19** | Là **NV**, tôi muốn tạo phiếu điều chỉnh khi phát hiện hàng hỏng/mất/thừa ngoài luồng kiểm kê, để cập nhật tồn kho chính xác.
- AC: Chọn loại `DAMAGED | LOST | FOUND`; nhập lý do bắt buộc; upload ảnh minh chứng tùy chọn.
- Priority: Must.

**US-20** | Là **QL/AD**, tôi muốn duyệt phiếu điều chỉnh tồn, để kiểm soát các thay đổi tồn kho ngoài quy trình chuẩn.
- AC: Chỉ QL/AD được duyệt; bắt buộc nhập lý do duyệt; ghi audit log #7.
- Priority: Must.
- **Đã chốt:** Admin duyệt thay khi QL vắng. Không cần luồng ủy quyền riêng.

**US-21** | Là **HT**, khi loại điều chỉnh là `found` và không rõ serial, tôi cần tạo bản ghi tổng chờ xử lý, để không chặn quy trình vì thiếu serial cụ thể.
- AC: `product_unit_id = NULL`, dùng `product_id` + `quantity` thay thế; CHECK constraint đảm bảo 1 trong 2 cách được set.
- Priority: Should.

### 2.5 Epic 5 — Kiểm kê

**US-22** | Là **QL**, tôi muốn tạo phiếu kiểm kê, để đối chiếu tồn kho thực tế với hệ thống.
- AC: `check_code` tự sinh; `status = PENDING → IN_PROGRESS`.
- Priority: Should.

**US-23** | Là **NV**, tôi muốn ghi nhận trạng thái thực tế từng serial khi kiểm kê, để hệ thống tính ra chênh lệch.
- AC: So sánh `expected_status` vs `actual_status` → `difference = MATCH | MISSING | UNEXPECTED`.
- Priority: Should.

**US-24** | Là **QL/AD**, tôi muốn duyệt kết quả kiểm kê có chênh lệch, để chốt số liệu tồn kho chính thức.
- AC: `status = APPROVED`; ghi audit log #8 (diff summary).
- Priority: Should.

**US-34** | Là **NV**, khi kiểm kê phát hiện hàng thừa (`difference = unexpected`), tôi muốn xử lý theo 2 trường hợp — có serial cụ thể hoặc không rõ serial.
- AC: Có serial → tạo `product_unit` mới ghi chú "found during stock check"; không rõ serial → tạo bản ghi tổng chờ xử lý (dùng cơ chế fallback `product_id` + `quantity`).
- Priority: Should.

**US-43** | Là **NV**, khi kiểm kê phát hiện thiếu (`difference = MISSING`), tôi muốn ghi nhận trạng thái thực tế trong phiếu kiểm kê, để QL có căn cứ duyệt chuyển `LOST`.
- AC: NV nhập `actual_status = MISSING/LOST` cho từng unit; hệ thống tự tính `difference = MISSING`. Unit chỉ thực sự chuyển `IN_STOCK → LOST` khi QL duyệt kết quả kiểm kê ở Bước 4 (không phải lúc NV đếm). Ghi audit log khi duyệt. Nếu sau này tìm thấy, dùng adjustment `type=FOUND` để khôi phục.
- Priority: Should.

**US-49** | Là **QL**, tôi muốn config lịch kiểm kê định kỳ theo zone (tần suất, next_run_date), để hệ thống tự động tạo phiếu kiểm kê và gửi notification khi đến hạn.
- AC: Lưu schedule trong bảng `stock_check_schedules`; khi `next_run_date` đến → hệ thống tự tạo `stock_checks` ở trạng thái `PENDING` + gửi noti; QL có thể tắt/tạm dừng schedule.
- Priority: Should.

### 2.6 Epic 6 — Quản lý danh mục & vị trí

**US-25** | Là **QL**, tôi muốn CRUD brand/category/supplier, để duy trì danh mục sản phẩm.
- AC: Soft-delete qua `is_active` (đồng bộ toàn hệ thống), không xóa cứng.
- Priority: Must.

**US-26** | Là **QL**, tôi muốn tạo sản phẩm mới với đơn vị tính và tracking type, để hệ thống biết cách tính tồn kho cho sản phẩm đó.
- AC: Validate mapping `unit ↔ tracking_type` bắt buộc (piece/box/set → serialized; meter/kg → bulk); sai → reject ở Service layer.
- Priority: Must.
- **Đã chốt:** Chấp nhận hard-code. Thêm UOM = sửa code.

**US-27** | Là **QL**, tôi muốn upload tối đa 5 ảnh cho sản phẩm và đánh dấu 1 ảnh đại diện, để hiển thị sản phẩm trực quan.
- AC: `is_primary` duy nhất 1 ảnh/sản phẩm; `sort_order` cho thứ tự hiển thị.
- Priority: Could.
- **Đã chốt:** Giữ default 5. Configurable qua `system_settings` key `product_max_images`.

**US-35** | Là **QL**, tôi muốn CRUD vị trí kho (zone/shelf/bin), để có danh sách vị trí hợp lệ trước khi gán cho `product_units`.
- AC: `full_code` unique dạng `A-01-01A` (đủ 3 cấp) hoặc `A` (chỉ zone); shelf/bin optional — chỉ bắt buộc zone; soft-delete qua `is_active`; không cho xóa vị trí đang có unit `IN_STOCK` gán vào.
- Priority: Must.

**US-36** | Là **QL/NV/SL**, tôi muốn CRUD thông tin khách hàng, để tra cứu và quản lý lịch sử mua hàng/bảo hành.
- AC: NV chỉ được xem + thêm mới (không sửa/xóa); QL full CRUD; soft-delete qua `is_active`.
- Priority: Must.

### 2.7 Epic 7 — Auth & phân quyền

**US-28** | Là **AD**, tôi muốn tạo/khóa/mở tài khoản nhân viên và gán role, để kiểm soát quyền truy cập hệ thống.
- AC: Khóa/mở chỉ toggle `is_active`, không đụng `status`; ghi audit log #10, #11.
- Priority: Must.

**US-29** | Là **User**, tôi muốn đổi mật khẩu hoặc được Admin reset mật khẩu, để khôi phục quyền truy cập.
- AC: Ghi audit log #12, #13 (không lưu giá trị mật khẩu, chỉ ghi hành động).
- Priority: Must.

**US-30** | Là **User**, tôi muốn đăng nhập bằng username/password và refresh token, để duy trì phiên làm việc.
- AC: Đăng nhập thất bại ghi audit log optional (#14).
- Priority: Must.

**US-37** | Là **AD**, tôi muốn CRUD role (tên, level, mô tả), để định nghĩa các nhóm quyền trong hệ thống.
- AC: `level` xác định thứ bậc (1=ADMIN, 2=MANAGER, 3=SALES/STOCK); không cho xóa role đang có user gán vào.
- Priority: Won't — 4 role cố định (seed data). Bỏ khỏi scope chính thức.

### 2.8 Epic 8 — Audit & Compliance

**US-31** | Là **AD**, tôi muốn xem toàn bộ audit log hệ thống, để giám sát mọi thay đổi dữ liệu.
- AC: Xem tất cả entity/action; filter theo user/action/thời gian.
- Priority: Should.
- **Đã chốt:** Tối thiểu 2 năm. Không làm archive/purge job ở phase 1.

**US-32** | Là **HT**, khi một transaction chính thành công, tôi cần ghi audit log **sau khi commit** để tránh phantom log, và khi transaction chính lỗi, tôi cần ghi log FAILED độc lập.
- AC: SUCCESS dùng `afterCommit()` callback; FAILED dùng `@Async @Transactional(REQUIRES_NEW)`; lỗi ghi audit log tự thân bị swallow + log fallback, không fail request chính.
- Priority: Must.

### 2.9 Epic 9 — Cảnh báo & báo cáo tồn kho

**US-38** | Là **QL**, tôi muốn nhận cảnh báo khi tồn kho một sản phẩm xuống dưới `min_stock`, để kịp thời tạo phiếu nhập bổ sung.
- AC: So sánh tồn khả dụng (COUNT cho serialized / SUM remaining_quantity cho bulk) với `products.min_stock`; hiển thị danh sách sản phẩm dưới ngưỡng trên dashboard.
- Priority: Should.

**US-39** | Là **QL**, tôi muốn hệ thống tự động gắn nhãn sản phẩm tồn kho quá 90 ngày, để phát hiện dead stock cần xử lý (giảm giá/thanh lý).
- AC: Ngưỡng ngày là tham số cấu hình (không hard-code 90); dựa trên `imported_at` của unit còn `IN_STOCK`; hiển thị cảnh báo trên dashboard.
- Priority: Could.

**US-50** | Là **QL**, tôi muốn hệ thống đề xuất hành động xử lý dead stock (giảm giá bán / đề xuất thanh lý) trên dashboard, để không chỉ dừng ở gắn nhãn hiển thị.
- AC: Với unit dead stock >90 ngày → đề xuất giảm `sell_price` tạm thời; >180 ngày → thêm đề xuất thanh lý; QL click đề xuất → chuyển đến màn hình tạo adjustment/export tương ứng; đề xuất mang tính tư vấn, không tự động thực thi.
- Priority: Could.

### 2.10 Epic 10 — Trả hàng từ khách (ngoài luồng bảo hành)

**US-40** | Là **SALES**, tôi muốn ghi nhận khách trả hàng thông thường (không phải hàng lỗi — ví dụ đổi ý, mua nhầm), để chuyển unit về lại trạng thái khả dụng hoặc xử lý theo tình trạng hàng trả.
- AC: Unit chuyển trực tiếp từ `SOLD` → `IN_STOCK` khi condition=GOOD (resulting_action=RESTOCK); `SOLD` → `DISPOSED` khi condition=DEFECTIVE + resulting_action=SCRAP; `SOLD` → `DEFECTIVE` khi condition=DEFECTIVE + resulting_action=WARRANTY_TRANSFER (chỉ áp dụng serialized, xem `03-known-issues-tech-debt.md §8.1.9`). **Không có** trạng thái `RETURNED` trung gian — xem `02-sop-nghiep-vu.md §7.3`.
- Priority: Must.
- **Đã chốt domain-model:** `return_receipts` + `return_receipt_items` đã có trong `01-domain-model.md` (bổ sung đợt merge SOP §9). Chính sách hoàn tiền/đổi hàng (vd thời gian CHANGE_MIND, condition DEFECTIVE→SCRAP hay WARRANTY_TRANSFER) đã được SOP §7 định nghĩa.

### 2.11 Epic 11 — Điều chỉnh đơn giá nhập sau xác nhận

**US-41** | Là **NV/QL**, tôi muốn tạo phiếu điều chỉnh giá nhập riêng khi phát hiện sai giá sau khi phiếu nhập đã xác nhận, để sửa giá mà không phá vỡ tính bất biến của phiếu nhập gốc.
- AC: Không cho sửa trực tiếp `import_receipt_items.unit_price` sau khi phiếu `COMPLETED`; phiếu điều chỉnh giá cần được duyệt; ghi audit log.
- Priority: Should.
- **Đã chốt domain-model:** `price_adjustments` đã có trong `01-domain-model.md` (bổ sung đợt merge SOP §9). State machine (`pending_approval → approved | rejected`) + SOP flow chi tiết đã có ở `02-sop-nghiep-vu.md §8`. Story này có thể ước lượng dựa trên thiết kế hiện tại.

### 2.12 Epic 12 — Đặt hàng (Purchase Order)

**US-44** | Là **QL**, tôi muốn tạo đơn đặt hàng với nhà cung cấp, sản phẩm, số lượng, đơn giá dự kiến và ngày giao, để chủ động lên kế hoạch nhập hàng trước khi NCC giao.
- AC: Chọn NCC từ danh sách; thêm nhiều dòng sản phẩm (mỗi dòng: `product_id`, `quantity`, `unit_price`); nhập `expected_date` (mặc định +14 ngày); ghi chú tùy chọn; `po_code` tự sinh unique dạng `PO-yyyyMMdd-seq`; trạng thái khởi tạo `DRAFT`.
- Priority: Must.

**US-45** | Là **Manager**, khi tạo phiếu nhập (Phase 1) tôi muốn chọn một đơn đặt hàng để liên kết, để hệ thống tự động lấy thông tin NCC và danh sách sản phẩm từ PO.
- AC: Khi chọn PO → pre-fill `supplier_id` và danh sách `items`; Manager có thể thêm/bớt dòng; phiếu nhập ghi `purchase_order_id` để truy vết.
- Priority: Must.

**US-46** | Là **HT**, khi duyệt phiếu nhập có liên kết PO, tôi cần cập nhật `received_quantity` trên các dòng PO tương ứng và tự động tính lại trạng thái PO.
- AC: Cộng dồn `received_quantity` theo `product_id`; nếu tất cả dòng đã nhận đủ → PO `COMPLETED`; nếu một số dòng nhận một phần → PO `PARTIAL`; nếu chưa có dòng nào → giữ `DRAFT`.
- Priority: Must.

**US-47** | Là **QL**, tôi muốn hủy đơn đặt hàng nếu không còn nhu cầu.
- AC: Không cho hủy nếu đã có phiếu nhập `COMPLETED` liên kết đến PO này.
- Priority: Should.

**US-48** | Là **HT**, khi 1 sản phẩm dưới `min_stock`, tôi muốn tự động gợi ý gộp các sản phẩm sắp hết của cùng 1 NCC thành PO nháp, để QL chỉ cần xác nhận thay vì tự tạo PO từ đầu.
- AC: PO nháp pre-fill NCC + danh sách sản phẩm + số lượng đề xuất (đủ lên `min_stock` + dự phòng) + `expected_date` gợi ý; QL có thể sửa số lượng/từ chối trước khi gửi.
- Priority: Should.

---

## 3. Trade-off đã chấp nhận

> Các trade-off dưới đây là rủi ro kiến trúc/nghiệp vụ đã được chấp nhận, không phải gap còn mở. Nguồn sự thật cho các quyết định đã chốt là `03-known-issues-tech-debt.md` (xem `§7.10` về việc `06-open-questions.md` đã bị xoá khỏi repo và không còn áp dụng).

### 3.1 Trade-off đã chấp nhận

| # | Trade-off | Story liên quan | Rủi ro |
|---|---|---|---|
| 1 | FIFO cứng, không cho chọn tay serial (trừ override có lý do) | US-09 | Có thể chặn use case thực tế nếu khách hàng yêu cầu chọn serial cụ thể (vd lấy hàng cận date). Đã có cơ chế override + lý do làm giảm nhẹ. |
| 2 | `REMOVED` không thể revert | US-07 | Thao tác sai không có đường lùi — phải tạo lại phiếu nhập + serial từ đầu. Chấp nhận để giữ tính bất biến audit trail. |
| 3 | Backup approval khi QL vắng mặt | US-20 | Nghẽn quy trình nếu Admin cũng không duyệt kịp. Chấp nhận vì tần suất thấp (QL vắng là exception). |
| 4 | Mapping unit↔tracking_type hard-code | US-26 | Thêm UOM mới phải sửa code. Chấp nhận vì UOM ít thay đổi, không đáng làm config động. |

<!-- end of file -->
