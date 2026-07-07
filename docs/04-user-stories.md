## 8. User Story

> Mục đích: bù lại bước **Elicitation/Analysis** đang thiếu ở các mục 1-7 phía trên — mỗi story được trace ngược về bảng/cột trong ERD, và các quyết định "kỹ thuật nhưng thực chất là chính sách nghiệp vụ" được đánh dấu riêng để xác nhận lại với Quản lý kho/chủ cửa hàng trước khi lock thiết kế.
>
> Định dạng: `ID | User Story | Acceptance Criteria | Nguồn (mapping ERD/nghiệp vụ) | Actor | Priority (MoSCoW) | Ghi chú validation`

Actor: **AD** = Admin, **QL** = Quản lý kho, **NV** = Nhân viên, **HT** = Hệ thống (background job/automation)

---

### 8.1 Epic 1 — Nhập kho

**US-01** | Là **NV**, tôi muốn khởi tạo phiếu nhập với nhà cung cấp và ngày nhập, để bắt đầu ghi nhận hàng vào kho.
- AC: Chọn `supplier_id` từ danh sách; phiếu tạo với `status = pending`; `receipt_code` tự sinh unique dạng `IMP-yyyyMMdd-seq`.
- Nguồn: `import_receipts`, mục 4.1 bước 1.
- Priority: Must.

**US-02** | Là **NV**, tôi muốn thêm nhiều dòng sản phẩm vào 1 phiếu nhập kèm số lượng, đơn giá, số tháng bảo hành, để nhập nhiều mặt hàng cùng lúc.
- AC: Mỗi dòng ghi `product_id`, `quantity`, `unit_price`, `warranty_months`; hỗ trợ thêm/xoá dòng trước khi xác nhận.
- Nguồn: `import_receipt_items`, mục 4.1 bước 2.
- Priority: Must.

**US-03** | Là **NV**, tôi muốn nhập serial cho từng dòng sản phẩm (tay/Excel/barcode), để hệ thống tạo `product_units` theo dõi từng đơn vị vật lý.
- AC: Validate số serial khớp `quantity` khai báo; trùng serial hiện có trong hệ thống → reject dòng đó; nếu sản phẩm không có serial gốc → hệ thống tự sinh mã nội bộ; import file lỗi 1 phần → skip dòng lỗi, nhập phần còn lại, trả về danh sách lỗi.
- Nguồn: `product_units.serial_number UK`, mục 4.1 bước 3, mục 5 (edge case "Import serial file lỗi 1 phần").
- Priority: Must.
- **Cần xác nhận:** ngưỡng "bao nhiêu % lỗi thì hệ thống nên chặn toàn bộ phiếu thay vì skip" chưa có — hỏi QLK.

**US-04** | Là **NV**, tôi muốn gán vị trí kho cho từng dòng sản phẩm hoặc cả lô, để hàng có vị trí lưu trữ xác định.
- AC: Chọn `location_id`; hệ thống gợi ý vị trí trống hoặc vị trí đã có sản phẩm cùng loại.
- Nguồn: `locations`, mục 4.1 bước 4.
- Priority: Should.
- **Cần xác nhận:** độ chi tiết zone-shelf-bin có thực sự cần thiết ở quy mô kho hiện tại, hay đang over-engineering đón đầu tương lai (đã nêu ở review trước)?

**US-05** | Là **NV**, tôi muốn xác nhận phiếu nhập, để hệ thống tạo các `product_units` ở trạng thái `in_stock` và mốc `imported_at` cho FIFO.
- AC: Thao tác trong 1 transaction; `imported_at` set tại thời điểm xác nhận (không phải lúc tạo record nháp); phiếu chuyển `pending_approval` (chưa `completed`); ghi audit log #1. Các unit từ phiếu này chưa được xuất kho cho tới khi QL duyệt.
- Nguồn: mục 4.1 bước 6, mục 2 (FIFO milestone), mục 7.2 bảng audit #1.
- Priority: Must.

**US-06** | Là **QL**, tôi muốn sửa lại serial vừa nhập nếu phát hiện nhập sai, để tránh phải hủy cả phiếu.
- AC: Chỉ cho sửa nếu unit chưa xuất kho và không trong bảo hành; ghi audit log giá trị cũ → mới.
- Nguồn: mục 4.1 bước 7, mục 7.2 audit #2, mục 5 (edge case "Nhập sai serial sau xác nhận").
- Priority: Should.

**US-07** | Là **QL**, tôi muốn hủy một phiếu nhập đã xác nhận, để xử lý trường hợp nhập nhầm hoàn toàn.
- AC: Phiếu chuyển `cancelled`; các `product_units` liên quan chuyển `removed` (terminal, không thể revert); ghi audit log #5.
- Nguồn: mục 2 (transition `in_stock → removed`), mục 5 (edge case dòng 1), mục 7.2 audit #5.
- Priority: Must.
- **Cần xác nhận (quan trọng):** `removed` không thể revert — nếu QL bấm nhầm nút hủy, phải tạo lại toàn bộ phiếu nhập + serial từ đầu. Đây là quyết định ảnh hưởng thao tác thực tế, cần QL xác nhận chấp nhận rủi ro này, không chỉ là quyết định kỹ thuật.

---

### 8.2 Epic 2 — Xuất kho

**US-08** | Là **NV**, tôi muốn khởi tạo phiếu xuất với lý do xuất (bán/nội bộ/trả NCC/hủy), để phân loại mục đích xuất kho.
- AC: Nếu lý do là bán hàng → bắt buộc chọn/tạo `customer_id`.
- Nguồn: `export_receipts.reason`, mục 4.2 bước 1.
- Priority: Must.

**US-09** | Là **NV**, tôi muốn hệ thống tự động chọn serial theo FIFO khi xuất, để không phải chọn tay từng serial.
- AC: Query `ORDER BY imported_at ASC ... FOR UPDATE`; danh sách serial hiển thị cho NV xem trước khi xác nhận; gom theo `location_id` để giảm di chuyển nhưng thứ tự ưu tiên vẫn là `imported_at`.
- Nguồn: mục 4.2 bước 3, mục 3 (FIFO tự động).
- Priority: Must.
- **Cần xác nhận:** có tình huống khách yêu cầu serial cụ thể (không theo FIFO) không — ví dụ kiểm tra ngày sản xuất, lô mới hơn? Nếu có, cần story riêng cho "chọn tay override FIFO" — hiện domain-model chưa có.

**US-10** | Là **NV**, tôi muốn được báo số lượng tối đa có thể xuất khi tồn không đủ, để chọn xuất một phần thay vì bị chặn hoàn toàn.
- AC: Hệ thống tính tồn khả dụng trước khi cho thêm dòng; cho phép xuất partial; không cho phép tồn âm (trừ khi cấu hình bật).
- Nguồn: mục 4.2 bước 2, mục 5 (edge case "Xuất không đủ hàng").
- Priority: Must.
- **Cần xác nhận:** "tồn âm có thể bật trong cài đặt" — có use case thực tế nào (pre-order hàng hiếm) cần việc này không, hay chỉ là cửa thoát kỹ thuật chưa có luồng nghiệp vụ đi kèm (thông báo khách, ngày dự kiến có hàng...)?

**US-11** | Là **NV**, tôi muốn xuất tạm (reserve) phiếu xuất, để khoá serial và chờ QL duyệt.
- AC: Hệ thống lock serial đã chọn (`SELECT ... FOR UPDATE`), phiếu chuyển `pending_approval`; ghi audit log. Serial bị khoá không được chọn bởi phiếu xuất khác.
- Nguồn: mục 4.2 bước 4, mục 7.2 audit #4.
- Priority: Must.

**US-42** | Là **QL**, tôi muốn duyệt phiếu xuất, để xác nhận xuất kho và kích hoạt bảo hành (nếu là bán hàng).
- AC: Chỉ QL/AD được duyệt; `approved_by ≠ created_by`. Khi duyệt: `product_units.status → sold`; nếu `reason = sale` → set `warranty_start_date` = ngày duyệt, tính `warranty_expires_at`; phiếu `completed`; ghi audit log #4. Nếu từ chối → phiếu `cancelled`, giải phóng serial.
- Nguồn: mục 4.2 bước 5, mục 7.2 audit #4, mục 6 (phân quyền).
- Priority: Must.

**US-12** | Là **NV**, tôi muốn đổi serial thay thế trước khi hoàn tất nếu hàng thực tế không khớp serial hệ thống chọn, để xử lý sai lệch giữa hệ thống và thực tế kho.
- AC: Cơ chế swap serial trong cùng phiếu xuất trước khi confirm cuối.
- Nguồn: mục 4.2 bước 5.
- Priority: Could.

**US-13** | Là **QL**, tôi muốn hủy phiếu xuất đã xác nhận, để xử lý trường hợp xuất nhầm.
- AC: `product_units` liên quan set lại `in_stock`, giữ nguyên `imported_at` gốc (không phá FIFO); nếu đã kích hoạt bảo hành → reset `warranty_start_date`/`warranty_expires_at` về NULL; ghi audit log #6.
- Nguồn: mục 5 (edge case "Hủy phiếu xuất", "Hủy phiếu xuất đã kích hoạt bảo hành"), mục 7.2 audit #6.
- Priority: Must.

**US-33** | Là **NV**, tôi muốn xuất một phần số lượng lẻ (ví dụ 1.5m cáp) từ một unit dạng bulk, để phục vụ bán lẻ theo mét/kg.
- AC: Nếu `remaining_quantity > qty_xuất` → chỉ trừ `remaining_quantity`, không đổi `status`; nếu `remaining_quantity = qty_xuất` → set `status = sold`; tổng tồn = SUM(remaining_quantity) cho bulk + COUNT(id) cho serialized.
- Nguồn: mục 7.1 (Luồng xuất FIFO cho bulk), mục 5 (edge case "Xuất theo UOM meter").
- Priority: Must — trước đây gộp ngầm vào US-09 nên dễ bị bỏ sót nhánh bulk khi viết test case cho luồng xuất.

---

### 8.3 Epic 3 — Bảo hành

**US-14** | Là **NV**, tôi muốn tra cứu bảo hành theo serial, để xem sản phẩm, ngày mua, hạn bảo hành và lịch sử xử lý trước đó.
- AC: Hỗ trợ tìm gần đúng khi serial dễ nhầm (O/0, I/l).
- Nguồn: mục 4.3 bước 1, mục 5 (edge case "Ký tự serial gây nhầm lẫn").
- Priority: Must.

**US-15** | Là **NV**, tôi muốn tiếp nhận yêu cầu bảo hành từ khách, để tạo phiếu và ghi nhận mô tả lỗi.
- AC: Kiểm tra serial tồn tại và còn hạn; xác minh khách qua tên/SĐT nếu có thể; tạo `warranty_requests.status = pending`.
- Nguồn: `warranty_requests`, mục 4.3 bước 2-3.
- Priority: Must.

**US-16** | Là **NV**, tôi muốn xử lý yêu cầu bảo hành theo 1 trong 4 hướng (đổi mới/RMA/sửa/từ chối/trả NCC), để giải quyết dứt điểm từng ca bảo hành.
- AC: Đổi mới → serial mới kế thừa hạn bảo hành còn lại của serial cũ; RMA → lưu `rma_number`, `sent_to_partner_at`; sửa chữa → chuyển `under_repair`, không tính tồn; từ chối → ghi rõ lý do.
- Nguồn: mục 4.3 bước 4, mục 7.5 (Warranty Inheritance), mục 2 (state machine).
- Priority: Must.
- **Cần xác nhận (quan trọng):** quy tắc "kế thừa cứng hạn bảo hành cũ" là **chính sách của cửa hàng**, không phải chỉ là quyết định kỹ thuật — cần chủ cửa hàng/QL xác nhận đây đúng là chính sách áp dụng, và có tuân luật bảo vệ người tiêu dùng VN không, trước khi cắm cứng vào state machine.

**US-17** | Là **NV**, tôi muốn hoàn tất phiếu bảo hành, để đóng ca xử lý và ghi audit log.
- AC: `status = completed`, ghi hướng xử lý thực tế + người xử lý + ngày hoàn tất.
- Nguồn: mục 4.3 bước 5, mục 7.2 audit #9.
- Priority: Must.

**US-18** | Là **NV**, tôi muốn xử lý trường hợp đổi hàng bảo hành nhưng hết tồn serial cùng loại, để không bị kẹt quy trình.
- AC: Giữ `pending` chờ nhập thêm hàng, hoặc chuyển hướng RMA/từ chối.
- Nguồn: mục 5 (edge case tương ứng).
- Priority: Should.
- **Cần xác nhận:** không có SLA nào cho việc "giữ pending bao lâu" — khách chờ vô thời hạn có chấp nhận được không? Thiếu NFR về thời gian xử lý bảo hành.

---

### 8.4 Epic 4 — Điều chỉnh tồn kho thủ công

**US-19** | Là **NV**, tôi muốn tạo phiếu điều chỉnh khi phát hiện hàng hỏng/mất/thừa ngoài luồng kiểm kê, để cập nhật tồn kho chính xác.
- AC: Chọn loại `damaged | lost | found`; nhập lý do bắt buộc; upload ảnh minh chứng tùy chọn.
- Nguồn: `stock_adjustments`, mục 4.4 bước 1-2.
- Priority: Must.

**US-20** | Là **QL/AD**, tôi muốn duyệt phiếu điều chỉnh tồn, để kiểm soát các thay đổi tồn kho ngoài quy trình chuẩn.
- AC: Chỉ QL/AD được duyệt; bắt buộc nhập lý do duyệt; ghi audit log #7.
- Nguồn: mục 4.4 bước 4, mục 7.2 audit #7, mục 6 (phân quyền).
- Priority: Must.
- **Cần xác nhận:** nếu QL vắng mặt, ai backup duyệt? Chưa có luồng ủy quyền/escalation.

**US-21** | Là **HT**, khi loại điều chỉnh là `found` và không rõ serial, tôi cần tạo bản ghi tổng chờ xử lý, để không chặn quy trình vì thiếu serial cụ thể.
- AC: `product_unit_id = NULL`, dùng `product_id` + `quantity` thay thế; CHECK constraint đảm bảo 1 trong 2 cách được set.
- Nguồn: mục 7.3 (`stock_adjustments.product_unit_id` nullable + fallback).
- Priority: Should.

---

### 8.5 Epic 5 — Kiểm kê

**US-22** | Là **QL**, tôi muốn tạo phiếu kiểm kê, để đối chiếu tồn kho thực tế với hệ thống.
- AC: `check_code` tự sinh; `status = pending → in_progress`.
- Nguồn: `stock_checks`, mục 6 (phân quyền kiểm kê).
- Priority: Should.

**US-23** | Là **NV**, tôi muốn ghi nhận trạng thái thực tế từng serial khi kiểm kê, để hệ thống tính ra chênh lệch.
- AC: So sánh `expected_status` vs `actual_status` → `difference = match | missing | unexpected`.
- Nguồn: `stock_check_items`.
- Priority: Should.

**US-24** | Là **QL/AD**, tôi muốn duyệt kết quả kiểm kê có chênh lệch, để chốt số liệu tồn kho chính thức.
- AC: `status = approved`; ghi audit log #8 (diff summary).
- Nguồn: mục 7.2 audit #8, mục 6 (phân quyền).
- Priority: Should.

**US-34** | Là **NV**, khi kiểm kê phát hiện hàng thừa (`difference = unexpected`), tôi muốn xử lý theo 2 trường hợp — có serial cụ thể hoặc không rõ serial — để ghi nhận đúng nguồn gốc hàng thừa.
- AC: Có serial → tạo `product_unit` mới ghi chú "found during stock check"; không rõ serial → tạo bản ghi tổng chờ xử lý (dùng cơ chế fallback `product_id` + `quantity` giống `stock_adjustments` ở mục 7.3).
- Nguồn: mục 5 (edge case "Kiểm kê phát hiện hàng thừa"), mục 7.3.
- Priority: Should — trước đây không tách khỏi US-23, dễ bị hiểu nhầm là chỉ cần ghi `difference` mà bỏ qua bước tạo unit mới.

**US-43** | Là **NV**, khi kiểm kê phát hiện thiếu (`difference = missing`), tôi muốn chuyển `product_unit` sang `lost` ngay trong phiếu kiểm kê, để cập nhật tồn kho chính xác mà không cần tạo adjustment riêng.
- AC: Unit chuyển `in_stock → lost`; ghi rõ nguyên nhân và người kiểm kê; ghi audit log. Nếu sau này tìm thấy, dùng adjustment `type=found` để khôi phục.
- Nguồn: mục 5 (edge case "Kiểm kê phát hiện thiếu").
- Priority: Should.

---

### 8.6 Epic 6 — Quản lý danh mục & vị trí

**US-25** | Là **AD/QL**, tôi muốn CRUD brand/category/supplier, để duy trì danh mục sản phẩm.
- AC: Soft-delete qua `is_active` (đồng bộ toàn hệ thống theo mục 7.6), không xóa cứng.
- Nguồn: `brands`, `categories`, `suppliers`, mục 7.6.
- Priority: Must.

**US-26** | Là **AD/QL**, tôi muốn tạo sản phẩm mới với đơn vị tính và tracking type, để hệ thống biết cách tính tồn kho cho sản phẩm đó.
- AC: Validate mapping `unit ↔ tracking_type` bắt buộc (piece/box/set → serialized; meter/kg → bulk); sai → reject ở Service layer.
- Nguồn: mục 7.1, mục 7.8.
- Priority: Must.
- **Cần xác nhận:** mapping đang hard-code trong Service layer — nếu thêm UOM mới (vd "lít"), phải sửa code thủ công. Có chấp nhận được không, hay cần làm thành bảng cấu hình?

**US-27** | Là **AD/QL**, tôi muốn upload tối đa 5 ảnh cho sản phẩm và đánh dấu 1 ảnh đại diện, để hiển thị sản phẩm trực quan.
- AC: `is_primary` duy nhất 1 ảnh/sản phẩm; `sort_order` cho thứ tự hiển thị.
- Nguồn: `product_images`, mục 3.
- Priority: Could.
- **Cần xác nhận:** con số "5 ảnh" chưa rõ nguồn — cần acceptance criteria/lý do cụ thể.

**US-35** | Là **AD/QL**, tôi muốn CRUD vị trí kho (zone/shelf/bin), để có danh sách vị trí hợp lệ trước khi gán cho `product_units`.
- AC: `full_code` unique dạng `A-01-01A`; soft-delete qua `is_active`; không cho xóa vị trí đang có unit `in_stock` gán vào.
- Nguồn: `locations`. Trước đây chỉ có US-04 "gán vị trí" — thiếu story tạo ra chính vị trí đó trước, dễ khiến sprint đầu bị chặn vì chưa có màn hình quản lý location.
- Priority: Must.

**US-36** | Là **AD/QL/NV**, tôi muốn CRUD thông tin khách hàng, để tra cứu và quản lý lịch sử mua hàng/bảo hành.
- AC: NV chỉ được xem + thêm mới (không sửa/xóa); AD/QL full CRUD; soft-delete qua `is_active`.
- Nguồn: `customers`, mục 6 (dòng phân quyền "Quản lý khách hàng" đã có sẵn nhưng chưa có story tương ứng).
- Priority: Must.

---

### 8.7 Epic 7 — Auth & phân quyền

**US-28** | Là **AD**, tôi muốn tạo/khóa/mở tài khoản nhân viên và gán role, để kiểm soát quyền truy cập hệ thống.
- AC: Khóa/mở chỉ toggle `is_active`, không đụng `status` (workflow onboarding riêng biệt); ghi audit log #10, #11.
- Nguồn: `users`, mục 7.6 (ranh giới `status` vs `is_active`), mục 7.2 audit #10-11.
- Priority: Must.

**US-29** | Là **User**, tôi muốn đổi mật khẩu hoặc được Admin reset mật khẩu, để khôi phục quyền truy cập.
- AC: Ghi audit log #12, #13 (không lưu giá trị mật khẩu, chỉ ghi hành động).
- Nguồn: `password_reset_tokens`, mục 7.2 audit #12-13.
- Priority: Must.

**US-30** | Là **User**, tôi muốn đăng nhập bằng username/password và refresh token, để duy trì phiên làm việc.
- AC: Đăng nhập thất bại ghi audit log optional (#14).
- Nguồn: `refresh_tokens`, mục 7.2 audit #14.
- Priority: Must.

**US-37** | Là **AD**, tôi muốn CRUD role (tên, level, mô tả), để định nghĩa các nhóm quyền trong hệ thống.
- AC: `level` xác định thứ bậc (1=ADMIN, 2=MANAGER, 3=SALES/STOCK); không cho xóa role đang có user gán vào.
- Nguồn: `roles`. Trước đây US-28 chỉ có "gán role cho user", chưa có story tạo ra chính role đó.
- Priority: Could — nếu 4 role (ADMIN/MANAGER/SALES/STOCK) là cố định vĩnh viễn thì có thể seed data thay vì làm màn hình CRUD; **cần xác nhận với AD** trước khi quyết định mức ưu tiên.

---

### 8.8 Epic 8 — Audit & Compliance

**US-31** | Là **AD**, tôi muốn xem toàn bộ audit log hệ thống, để giám sát mọi thay đổi dữ liệu.
- AC: Xem tất cả entity/action; filter theo user/action/thời gian.
- Nguồn: `audit_logs`, mục 6 (phân quyền: AD xem tất cả, QL xem kho của mình).
- Priority: Should.
- **Cần xác nhận:** chưa có yêu cầu retention (audit log giữ bao lâu) — liên quan luật kế toán/lưu trữ chứng từ tại VN, cần xác nhận với AD trước khi thiết kế archive/purge job.

**US-32** | Là **HT**, khi một transaction chính thành công, tôi cần ghi audit log **sau khi commit** để tránh phantom log, và khi transaction chính lỗi, tôi cần ghi log FAILED độc lập mà không ảnh hưởng transaction chính.
- AC: SUCCESS dùng `afterCommit()` callback; FAILED dùng `@Async @Transactional(REQUIRES_NEW)`; lỗi ghi audit log tự thân bị swallow + log fallback, không fail request chính.
- Nguồn: mục 7.7 (Transaction & Audit Log).
- Priority: Must.

---

### 8.9 Epic 9 — Cảnh báo & báo cáo tồn kho

**US-38** | Là **QL**, tôi muốn nhận cảnh báo khi tồn kho một sản phẩm xuống dưới `min_stock`, để kịp thời tạo phiếu nhập bổ sung.
- AC: So sánh tồn khả dụng (COUNT cho serialized / SUM remaining_quantity cho bulk) với `products.min_stock`; hiển thị danh sách sản phẩm dưới ngưỡng trên dashboard.
- Nguồn: `products.min_stock` — trường đã có trong ERD từ đầu nhưng chưa từng được dùng trong bất kỳ story nào ở nghiệp vụ chi tiết.
- Priority: Should.

**US-39** | Là **QL**, tôi muốn hệ thống tự động gắn nhãn sản phẩm tồn kho quá 90 ngày, để phát hiện dead stock cần xử lý (giảm giá/thanh lý).
- AC: Ngưỡng ngày là tham số cấu hình (không hard-code 90); dựa trên `imported_at` của unit còn `in_stock`; hiển thị cảnh báo trên dashboard.
- Nguồn: mục 5 (edge case "Hàng tồn lâu (dead stock)").
- Priority: Could.

---

### 8.10 Epic 10 — Trả hàng từ khách (ngoài luồng bảo hành)

**US-40** | Là **NV**, tôi muốn ghi nhận khách trả hàng thông thường (không phải hàng lỗi — ví dụ đổi ý, mua nhầm), để chuyển unit về lại trạng thái khả dụng hoặc xử lý theo tình trạng hàng trả.
- AC: Unit chuyển `sold → returned`; nếu hàng còn nguyên → `returned → in_stock` (mục 2 đã định nghĩa 2 transition này); nếu hàng lỗi → `returned → defective`.
- Nguồn: mục 2 (state machine, transition `sold→returned`, `returned→in_stock`, `returned→defective`), mục 5 (edge case "Trả hàng từ khách").
- Priority: Must.
- **⚠️ Gap ở tầng domain-model, không chỉ ở tầng story:** state machine đã định nghĩa transition này, nhưng **không có bảng nào** theo dõi phiếu trả hàng (không giống nhập/xuất/bảo hành đều có bảng riêng). Hiện chỉ có 1 dòng mô tả text ở bảng edge case mục 5. Trước khi implement US-40, cần bổ sung vào domain-model: bảng `return_receipts` (tương tự `export_receipts` nhưng chiều ngược), chính sách hoàn tiền/đổi hàng (có hoàn tiền không, trong bao lâu được trả), và audit action tương ứng — hiện bảng audit mục 7.2 không có dòng nào cho "khách trả hàng".

---

### 8.11 Epic 11 — Điều chỉnh đơn giá nhập sau xác nhận

**US-41** | Là **QL/AD**, tôi muốn tạo phiếu điều chỉnh giá nhập riêng khi phát hiện sai giá sau khi phiếu nhập đã xác nhận, để sửa giá mà không phá vỡ tính bất biến của phiếu nhập gốc.
- AC: Không cho sửa trực tiếp `import_receipt_items.unit_price` sau khi phiếu `completed`; phiếu điều chỉnh giá cần được duyệt; ghi audit log.
- Nguồn: mục 5 (edge case "Cập nhật đơn giá nhập sau xác nhận") — chỉ có 1 dòng mô tả giải pháp bằng lời, chưa thiết kế.
- Priority: Should.
- **⚠️ Gap ở tầng domain-model:** đây là luồng nghiệp vụ được nhắc tới nhưng **hoàn toàn chưa có bảng, chưa có state, chưa có audit action** trong toàn bộ 764 dòng của domain-model.md (khác với `stock_adjustments` — cùng là "điều chỉnh" nhưng đã có bảng riêng). Cần bổ sung bảng `price_adjustments` (hoặc mở rộng `stock_adjustments`) và thêm dòng audit tương ứng vào bảng mục 7.2 trước khi story này có thể được ước lượng effort chính xác.

---

### 8.12 Tổng hợp gap cần xác nhận lại với business (trước khi lock design)

| # | Gap | Story liên quan | Rủi ro nếu không xác nhận |
|---|---|---|---|
| 1 | FIFO cứng, không cho chọn tay serial | US-09 | Có thể chặn use case thực tế của khách hàng |
| 2 | `removed` không thể revert | US-07 | Thao tác sai không có đường lùi, rủi ro vận hành |
| 3 | Warranty inheritance là chính sách business, chưa xác nhận nguồn | US-16 | Có thể sai luật/chính sách cửa hàng thật |
| 4 | Tồn âm "có thể bật" nhưng thiếu luồng nghiệp vụ đi kèm | US-10 | Bật tính năng nhưng thiếu logic hỗ trợ backorder |
| 5 | SLA xử lý bảo hành khi hết serial | US-18 | Thiếu NFR, khách có thể chờ vô thời hạn |
| 6 | Backup approval khi QL vắng mặt | US-20 | Nghẽn quy trình vì thiếu người duyệt |
| 7 | Mapping unit↔tracking_type hard-code | US-26 | Thêm UOM mới phải sửa code, thiếu linh hoạt |
| 8 | Retention policy cho audit log | US-31 | Có thể vi phạm yêu cầu lưu trữ pháp lý |
| 9 | Location granularity (bin-level) có cần thiết không | US-04 | Over-engineering, vi phạm YAGNI |
| 10 | Số ảnh tối đa "5" chưa rõ nguồn | US-27 | Constraint tùy tiện, không traceable |
| 11 | 4 role có cố định vĩnh viễn hay cần CRUD | US-37 | Có thể làm dư tính năng không cần thiết |

### 8.13 Gap ở tầng domain-model gốc (cần bổ sung ERD/bảng trước khi implement, không chỉ thêm story)

| # | Luồng | Thiếu gì trong domain-model.md | Story bị chặn |
|---|---|---|---|
| A | Trả hàng khách (ngoài bảo hành) | Không có bảng `return_receipts`, không có audit action, chưa rõ chính sách hoàn tiền | US-40 |
| B | Điều chỉnh giá nhập sau xác nhận | Không có bảng, không có state, không có audit action — chỉ có 1 dòng mô tả text | US-41 |

Hai gap này khác nhóm 9 gap ở trên: nhóm trên là "đã có thiết kế nhưng chưa chắc đúng nghiệp vụ" (validation gap), còn A/B là "chưa có thiết kế" (analysis gap) — cần quay lại domain-model.md bổ sung trước khi viết acceptance criteria chi tiết cho US-40/41.