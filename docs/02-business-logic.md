## 4. Nghiệp vụ chi tiết

### 4.1. Nhập kho

1. **Khởi tạo phiếu nhập**: chọn nhà cung cấp, số hóa đơn/chứng từ tham chiếu (nếu có), ngày nhập.
2. **Thêm sản phẩm vào phiếu**: mỗi dòng gồm sản phẩm, số lượng, đơn giá nhập, **số tháng bảo hành** (`warranty_months`). Phiếu hỗ trợ nhiều dòng sản phẩm khác nhau (form động).
3. **Nhập serial number**: nhập tay, import file Excel/CSV, hoặc quét barcode (nếu có thiết bị). Nếu sản phẩm không có serial gốc, hệ thống tự sinh mã nội bộ duy nhất. Validate: số lượng serial khớp số lượng khai báo, không trùng serial đang tồn tại trong hệ thống. Nếu import file bị lỗi 1 phần (vd 2/100 dòng trùng serial), hệ thống **skip dòng lỗi và nhập các dòng còn lại**, trả về danh sách lỗi cho người dùng.
4. **Gán vị trí**: chọn vị trí (kệ/ngăn) cho từng dòng sản phẩm hoặc cho cả lô. Hệ thống gợi ý vị trí trống hoặc vị trí đã chứa sản phẩm cùng loại.
5. **Upload ảnh** (tùy chọn): gắn ảnh lô hàng/sản phẩm qua Cloudinary.
6. **Xác nhận phiếu nhập** (trong 1 transaction): tạo các `product_units` trạng thái `in_stock`, gắn `imported_at` = thời điểm xác nhận (mốc tính FIFO), gắn `location_id`; lưu phiếu nhập `completed`; ghi audit log.
7. **Sửa serial sau xác nhận** (nếu nhập sai): API riêng cho phép sửa serial của `product_unit` nếu chưa xuất và không trong bảo hành. Ghi audit log (giá trị cũ → mới).
8. **Duyệt** (tùy chọn): có thể thêm bước `pending` → Quản lý kho duyệt → `completed` nếu cần kiểm soát chặt.

### 4.2. Xuất kho

1. **Khởi tạo phiếu xuất**: chọn lý do xuất (bán hàng, xuất nội bộ, trả nhà cung cấp, hủy hàng lỗi); nếu xuất bán, chọn khách hàng từ danh sách `customers` (hoặc tạo mới nếu chưa có).
2. **Thêm sản phẩm cần xuất**: chọn sản phẩm, số lượng; hệ thống kiểm tra tồn kho ngay tại bước này. Nếu tồn không đủ, hệ thống báo số lượng tối đa có thể xuất, nhân viên có thể chọn **xuất partial** (chỉ xuất số lượng có sẵn).
3. **Tự động chọn serial theo FIFO** (ưu tiên hàng nhập trước, gom theo vị trí để giảm di chuyển):
   ```sql
   SELECT * FROM product_units
   WHERE product_id = ? AND status = 'in_stock'
   ORDER BY imported_at ASC
   LIMIT <số lượng cần xuất>
   FOR UPDATE   -- khóa dòng, tránh phiếu khác xuất trùng
   ```
   > **Về gom vị trí:** sort chính luôn là `imported_at ASC` để đảm bảo FIFO. Sau khi có danh sách serial, UI gợi ý nhóm theo `location_id` để nhân viên lấy hàng cùng kệ một lượt, nhưng thứ tự ưu tiên xuất trước vẫn là hàng nhập trước.
   > Danh sách serial được chọn hiển thị cho nhân viên xem trước khi xác nhận.
4. **Xác nhận phiếu xuất** (trong 1 transaction): cập nhật `product_units.status` → `sold`; nếu lý do xuất là bán hàng, set `warranty_start_date` = ngày xuất và tính `warranty_expires_at`; lưu phiếu xuất `completed`; ghi audit log.
5. **Đối chiếu thực tế**: nhân viên lấy hàng theo đúng serial hệ thống đã chọn; cần cơ chế "đổi serial thay thế" trước khi hoàn tất nếu serial thực tế không khớp.

### 4.3. Bảo hành

1. **Tra cứu bảo hành theo serial**: nhập/quét serial → hiển thị sản phẩm, ngày mua, còn/hết hạn bảo hành, lịch sử xử lý bảo hành trước đó.
2. **Tiếp nhận yêu cầu**: nhân viên nhập serial khách mang tới, hệ thống kiểm tra serial tồn tại và còn hạn bảo hành, ghi nhận mô tả lỗi. Nếu có thể, xác minh khách qua tên/SĐT trong hệ thống.
3. **Tạo phiếu yêu cầu bảo hành** (`warranty_requests`): serial, ngày yêu cầu, mô tả lỗi, trạng thái `pending`.
4. **Quyết định hướng xử lý**:
   - **Đổi mới**: serial cũ chuyển `defective`/`returned_to_supplier`; xuất serial mới trong kho cho khách, **kế thừa thời hạn bảo hành còn lại** của serial cũ (không tính bảo hành mới từ đầu). Hướng này được ưu tiên nếu còn tồn.

   - **Gửi hãng / NCC bảo hành (RMA)**: serial chuyển `sent_to_manufacturer`, lưu `rma_number`, `sent_to_partner_at`, `expected_return_at`. Khi nhận lại từ hãng: nếu sửa được → trả khách (chuyển lại `sold`), nếu không → chuyển `defective` và chọn hướng khác. Thường áp dụng cho linh kiện chính hãng còn bảo hành nhà sản xuất.

   - **Sửa chữa (tự làm hoặc gửi bên thứ 3)**: serial chuyển `under_repair`, không tính vào tồn kho. Nếu cửa hàng có xưởng sửa → sửa xong trả khách. Nếu gửi tiệm sửa ngoài → lưu thông tin đối tác, biên nhận. Kết quả: sửa được → `sold`, không → `defective`.

   - **Từ chối**: hết hạn bảo hành hoặc lỗi do người dùng — ghi rõ lý do.

   - **Trả nhà cung cấp**: nếu lỗi do nhà sản xuất, không sửa được tại chỗ và không có RMA, chuyển `product_unit.status = 'returned_to_supplier'` (transition đã định nghĩa ở mục 2, không cần cột timestamp riêng — nếu sau này cần biết chính xác ngày trả, dùng `updated_at` của `product_unit` hoặc bảng audit log).

5. **Hoàn tất**: cập nhật `warranty_requests.status = completed`, ghi hướng xử lý thực tế, nhân viên xử lý, ngày hoàn tất, ghi audit log.

### 4.4. Điều chỉnh tồn kho

1. **Phát hiện vấn đề**: nhân viên phát hiện hàng hỏng, mất, hoặc thừa trong kho ngoài luồng kiểm kê.
2. **Tạo phiếu điều chỉnh**: chọn loại (`damaged` — hỏng trong kho, `lost` — mất, `found` — thừa), chọn sản phẩm/serial liên quan, nhập số lượng, mô tả lý do (bắt buộc), upload ảnh minh chứng (tùy chọn).
3. **Xử lý theo từng loại**:
   - `damaged`: chuyển `product_unit.status` → `damaged_in_storage`. Hàng hỏng được cách ly (có thể trả NCC hoặc thanh lý).
   - `lost`: chuyển `product_unit.status` → `lost`. Không thể khôi phục.
   - `found`: nếu serial đã tồn tại trong hệ thống và đang ở trạng thái `lost`/`sold` → kiểm tra đối chiếu. Nếu không có serial → tạo `product_unit` mới với trạng thái `in_stock`, ghi chú nguồn gốc "found during adjustment".
4. **Duyệt (4-eyes principle)**: Chỉ Quản lý kho/Admin mới duyệt được. **Người duyệt bắt buộc khác người tạo** (`created_by ≠ approved_by`). Bắt buộc nhập lý do xác nhận.
5. **Hoàn tất**: cập nhật trạng thái phiếu `approved`/`rejected`, ghi audit log.

---

## 5. Tình huống biên cần xử lý

| Tình huống                                             | Cách xử lý đề xuất                                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Hủy phiếu nhập sau khi đã xác nhận                     | Đánh dấu phiếu `cancelled`, set `product_units` liên quan sang `removed` (không xóa cứng)                                                                                                                                                                                                                                      |
| Hủy phiếu xuất sau khi đã xác nhận                     | Set lại `product_units` về `in_stock`, giữ nguyên `imported_at` gốc để không phá vỡ thứ tự FIFO                                                                                                                                                                                                                                |
| Trả hàng từ khách                                      | Tạo `product_units` mới (`in_stock`, `imported_at` = ngày trả) hoặc khôi phục serial cũ nếu xác minh hàng còn nguyên                                                                                                                                                                                                           |
| Sản phẩm lỗi phát hiện khi nhập                        | Set trạng thái `defective`, không tính vào tồn kho khả dụng nhưng vẫn hiển thị trong báo cáo                                                                                                                                                                                                                                   |
| Nhiều phiếu xuất tranh chấp serial cuối cùng           | Dùng `SELECT ... FOR UPDATE` trong transaction để đảm bảo chỉ 1 phiếu lấy được serial đó                                                                                                                                                                                                                                       |
| Đổi hàng bảo hành nhưng không còn tồn serial cùng loại | Giữ `pending` chờ nhập thêm hàng, hoặc chuyển sang gửi hãng (RMA) / từ chối                                                                                                                                                                                                                                                    |
| Serial đổi mới (replacement) lại tiếp tục lỗi          | Tra theo `replacement_unit_id` để thấy chuỗi lịch sử đổi trả, tránh đổi vòng lặp không kiểm soát                                                                                                                                                                                                                               |
| Bảo hành hết hạn nhưng khách yêu cầu hỗ trợ thiện chí  | Vẫn tạo `warranty_request` nhưng `resolution_type = reject` kèm ghi chú                                                                                                                                                                                                                                                        |
| Gửi hãng RMA bị mất/hư trong vận chuyển                | Ghi nhận trên `warranty_request`, chuyển `product_unit.status` → `lost`. Cửa hàng chịu trách nhiệm đền cho khách                                                                                                                                                                                                               |
| Hãng trả RMA nhưng lỗi cũ vẫn còn                      | Chấp nhận hoặc gửi lại lần 2 (re-RMA). Ghi chú số lần gửi trên `warranty_request`                                                                                                                                                                                                                                              |
| Nhập sai serial sau xác nhận                           | API sửa serial riêng, chỉ cho sửa nếu `product_unit` chưa xuất và không trong bảo hành. Ghi audit log (cũ → mới)                                                                                                                                                                                                               |
| Xuất không đủ hàng (partial)                           | Hệ thống báo số lượng tối đa có thể xuất, nhân viên chọn giảm số lượng hoặc hủy dòng. Không cho phép tồn âm                                                                                                                                                                                                                    |
| Hàng hỏng trong quá trình lưu kho                      | Tạo phiếu điều chỉnh loại `damaged` → chuyển `product_unit.status` → `damaged_in_storage`, cách ly hàng hỏng                                                                                                                                                                                                                   |
| Kiểm kê phát hiện hàng thừa                            | Nếu có serial cụ thể → tạo `product_unit` mới, ghi chú `found during stock check`. Nếu không rõ serial → tạo bản ghi tổng, chờ xử lý sau                                                                                                                                                                                       |
| Import serial file lỗi 1 phần                          | Skip dòng lỗi (trùng/định dạng sai), nhập các dòng còn lại. Trả về danh sách lỗi chi tiết cho người dùng                                                                                                                                                                                                                       |
| Ký tự serial gây nhầm lẫn                              | Khi tra cứu bảo hành, hỗ trợ tìm gần đúng: O/0, I/l. Hoặc chuẩn hóa đầu vào (vd loại bỏ ký tự đặc biệt)                                                                                                                                                                                                                        |
| Khách mất hóa đơn/không nhớ SĐT                        | Tra cứu theo serial, yêu cầu xác minh qua thông tin bổ sung (tên khách hàng, ngày mua gần đúng)                                                                                                                                                                                                                                |
| Cho phép tồn âm?                                       | Mặc định **không**, có thể bật trong cài đặt hệ thống dành cho trường hợp xuất trước nhập sau đặc biệt                                                                                                                                                                                                                         |
| Hàng tồn lâu (dead stock)                              | Tự động gắn nhãn sản phẩm tồn kho > 90 ngày (tham số cấu hình). Hiển thị cảnh báo trên dashboard                                                                                                                                                                                                                               |
| Cập nhật đơn giá nhập sau xác nhận                     | Không cho phép sửa giá sau khi đã xác nhận phiếu nhập. Nếu cần, tạo phiếu điều chỉnh giá riêng (có duyệt, ghi audit log)                                                                                                                                                                                                       |
| Xuất theo UOM meter (bán lẻ)                           | Ví dụ cáp mạng nhập 1 cuộn = 100 mét. Khi xuất 1.5m, cần cơ chế: traditional UOM (cuộn) không bán lẻ, hoặc quy đổi ra sub-unit (mét). Giải pháp: sản phẩm dạng meter có `unit = meter` + `tracking_type = bulk`, số lượng nhập là tổng mét, tồn kho = SUM(remaining_quantity), khi xuất cho phép số thập phân (xem 7.1 và 7.8) |
| Hủy phiếu xuất đã kích hoạt bảo hành                   | Khi hủy, ngoài việc set lại `product_units.status = in_stock`, cần reset `warranty_start_date = NULL` và `warranty_expires_at = NULL` để không tính bảo hành cho khoảng thời gian đã xuất                                                                                                                                      |

---

## 6. Phân quyền chi tiết

| Chức năng                        | Admin     | Quản lý kho     | Nhân viên          |
| -------------------------------- | --------- | --------------- | ------------------ |
| Quản lý người dùng               | ✅ CRUD   | ❌              | ❌                 |
| Xem audit log                    | ✅ Tất cả | ✅ Kho của mình | ❌                 |
| CRUD danh mục (SP, DM, NCC)      | ✅        | ✅              | ❌                 |
| Quản lý vị trí kho               | ✅        | ✅              | ❌                 |
| Quản lý khách hàng               | ✅        | ✅              | ✅ Xem + thêm      |
| Tạo phiếu nhập                   | ✅        | ✅              | ✅                 |
| Duyệt phiếu nhập (nếu cần)       | ✅        | ✅              | ❌                 |
| Sửa serial sau nhập              | ✅        | ✅              | ❌                 |
| Tạo phiếu xuất                   | ✅        | ✅              | ✅                 |
| Hủy phiếu nhập/xuất              | ✅        | ✅              | ❌                 |
| Xem tồn kho                      | ✅        | ✅              | ✅                 |
| Điều chỉnh min_stock             | ✅        | ✅              | ❌                 |
| Tạo phiếu kiểm kê                | ✅        | ✅              | ✅                 |
| Duyệt kiểm kê lệch               | ✅        | ✅              | ❌                 |
| Điều chỉnh tồn thủ công          | ✅ Tạo (cần duyệt — ⛔ không tự duyệt) | ✅ Tạo (cần duyệt — ⛔ không tự duyệt) | ✅ Tạo (cần duyệt) |
| Tra cứu bảo hành                 | ✅        | ✅              | ✅                 |
| Xử lý bảo hành (đổi/sửa/từ chối) | ✅        | ✅              | ❌                 |
| Dashboard & Báo cáo              | ✅        | ✅              | ❌                 |

> **4-eyes principle** (chi tiết tại US-42): Với các hành động cần duyệt (điều chỉnh tồn, kiểm kê lệch), người tạo và người duyệt **bắt buộc khác nhau** — áp dụng cho tất cả role, kể cả Admin. Invariant `created_by ≠ approved_by` được enforce ở Service layer + kiểm tra bằng ArchUnit.

---
