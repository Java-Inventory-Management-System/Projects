# Đánh giá giao diện — Bản dành cho người không chuyên kỹ thuật

> Bài này mô tả các vấn đề về giao diện, cách bố trí và sự đồng nhất của phần mềm bằng ngôn ngữ thường ngày — không cần kiến thức lập trình.
> Mức độ ưu tiên: **Cao** = nên sửa trước khi bàn giao · **TB** = nên sửa · **Thấp** = chỉnh đẹp hơn khi có thời gian.
> Cập nhật: 2026-08-09 — chưa mục nào được xử lý (nhóm vấn đề thẩm mỹ, chưa ảnh hưởng tính đúng tồn kho).

---

## Tóm tắt một câu

Giao diện nhìn chung đã rất chỉn chu và nhất quán — nhưng có 4 nhóm điểm cần chau chuốt: **chữ có chỗ quá nhỏ không đọc được**, **kích thước ô nhập liệu mỗi nơi một kiểu**, **màu cảnh báo không thống nhất**, và **các màn hình xem chi tiết bố cục khác nhau**.

---

## 1. Chữ có chỗ quá nhỏ — người dùng sẽ phải nheo mắt

Trên bản đồ kho (màn hình xem các ô chứa hàng), một số chữ chỉ nhỏ bằng **nửa cỡ chữ bình thường**, gồm:
- Số thùng hàng hiển thị ngay trên ô chứa
- Mã hiệu của từng dãy kệ

Khi đó người dùng gần như không đọc được, phải rê chuột lên để xem chú thích. Cùng tình trạng này còn xuất hiện rải rác ở **hơn 100 chỗ** trên nhiều màn hình khác — đo được trong mã nguồn: ~110 chỗ gọi cỡ chữ đặt riêng (10px / 11px) thay vì theo thang cỡ chuẩn chung.

**Ảnh hưởng**: nhân viên kho làm việc lâu sẽ mỏi mắt, dễ nhầm số liệu.

**Đề xuất**: quy định một bộ cỡ chữ chung (nhỏ nhất vẫn phải đọc được), áp dụng đồng nhất toàn phần mềm.

## 2. Kích thước ô nhập liệu mỗi nơi một kiểu

Ngay trong cùng một màn hình, có tới **3 kích thước ô nhập khác nhau**: ô chọn sản phẩm cao, ô nhập số lượng thấp hơn, nút bấm lại cao khác. Đo được trong mã nguồn: 59 ô thấp (h-8), 20 ô vừa (h-9), 17 ô cao (h-10) nằm đan xen trên khắp các màn hình. Nhìn chung chưa gãy gọn, nhưng khi làm quen, người dùng sẽ cảm thấy "lỏng lẻo" và phải dò từng ô.

**Đề xuất**: thống nhất 3 cỡ dùng chung (ô nhập thông thường, ô trong bảng, ô nhỏ), màn hình nào cũng theo đúng bộ đó.

## 3. Màu cảnh báo không thống nhất — cùng ý nghĩa, khác màu

Ví dụ điển hình: cảnh báo "hàng sắp hết" đang được hiển thị bằng **3 kiểu khác nhau** ở 3 nơi:
- Nơi thì viền vàng nhưng chữ tiêu đề màu **đỏ** (hai màu mâu thuẫn nhau)
- Nơi thì cả thẻ màu vàng cam
- Nơi thì dùng tông màu khác hẳn

Đo trong mã nguồn: riêng tông vàng đang dùng tới **9 sắc thái khác nhau** (từ vàng rất nhạt tới vàng đậm), xen lẫn với đỏ 500/600 — tất cả cho cùng một ý nghĩa cảnh báo.

Màu đỏ/xanh/vàng tượng trưng cho "nguy hiểm / bình thường / lưu ý" — nếu mỗi màn hình hiểu khác nhau, người dùng sẽ bỏ qua những cảnh báo thật.

**Đề xuất**: định nghĩa một bộ màu chuẩn cho cảnh báo, lỗi, bình thường — áp dụng y hệt ở mọi màn hình.

## 4. Các màn hình "xem chi tiết" bố cục khác nhau

Ba màn hình xem chi tiết (hàng hóa, kiện hàng, tồn kho) cùng dạng nội dung nhưng khoảng cách giữa các dòng **mỗi màn hình một khác** — màn này cách rộng, màn kia cách hẹp. Người dùng quen màn này sang màn kia sẽ thấy "lạ".

**Đề xuất**: chọn một mẫu bố cục chung cho tất cả màn hình xem chi tiết.

## 5. Những điểm cần sửa nhỏ khác

- **Nút bấm chỉ có hình ảnh, không có mô tả**: một số nút (chụp ảnh, xóa ảnh) chỉ hiện biểu tượng. Với người dùng công nghệ hỗ trợ hoặc người mới, không biết nút này để làm gì.
- **Kích thước biểu tượng lẫn lộn**: cùng là biểu tượng trong nút bấm, nơi to nơi nhỏ.
- **Tiêu đề cửa sổ không đồng đều**: cửa sổ này chữ to hơn cửa sổ kia.
- **Một vài màn hình tự đặt màu kiểu riêng** (vd: màu chữ trên biểu đồ) thay vì dùng màu chung của hệ thống.

## 6. Điểm đang làm rất tốt — giữ nguyên

- Khoảng cách giữa các thành phần nhìn chung đều và hợp lý (không có chỗ nào "lệch lạc" do tùy biến).
- Màn hình nhập mã máy có thanh tiến trình và đếm rõ ràng: đủ/thiếu/thừa.
- Màn hình tìm kiếm theo mã máy có cảnh báo đầy đủ: mã không tồn tại, sai sản phẩm, máy đã xuất — rất rõ ràng.
- Màn hình tổng quan (dashboard) dùng màu sắc và biểu đồ thống nhất, dễ đọc.

---

## Ưu tiên sửa

| Ưu tiên | Việc | Lý do |
|---|---|---|
| Cao | Chữ nhỏ trên bản đồ kho (số thùng, mã kệ) | Không đọc được, ảnh hưởng trực tiếp thao tác kho |
| Cao | Thêm mô tả cho các nút chỉ có hình ảnh | Người dùng mới và người dùng công nghệ hỗ trợ không biết nút dùng để làm gì |
| TB | Thống nhất cỡ chữ toàn hệ thống (128 vị trí đang tự đặt) | Tạo cảm giác chuyên nghiệp, giảm mỏi mắt |
| TB | Gộp các bảng màu/mô tả trạng thái đang viết lặp lại ở 4 chỗ về một chỗ duy nhất | Tránh sau này mỗi màn hình hiểu trạng thái một kiểu |
| TB | Bộ màu cảnh báo chuẩn + thống nhất kích thước ô nhập | Đồng bộ ý nghĩa màu sắc |
| Thấp | Bố cục màn hình chi tiết, kích thước biểu tượng, tiêu đề cửa sổ | Chỉnh đẹp, ít rủi ro |

---

*Số liệu trong bài (cỡ chữ, chiều cao ô nhập, tông màu) được đo lại từ mã nguồn hiện tại — ổn định theo từng lần thay đổi giao diện.*
