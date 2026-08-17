# Convention viết diagram (Mermaid) — dùng cho AI coding tool

Khi tạo diagram bằng Mermaid trong tài liệu/markdown của dự án, tuân theo các quy tắc sau:

## 1. Sequence Diagram

- **Không để layout tự do.** Các participant phải theo đúng thứ tự luồng gọi thực tế (ví dụ: Frontend → Controller → Service → Repository/Database), không đảo vị trí tùy tiện.
- **Mỗi message một dòng rõ ràng**, không gộp nhiều hành động vào 1 arrow.
- **Phân biệt rõ request và response:**
  - Request: arrow liền nét `->>`
  - Response: arrow nét đứt `-->>`
- **Self-call** (một participant tự gọi chính nó, ví dụ verify password, generate token) dùng `participant->>participant: action`, không vẽ arrow chéo qua participant khác.
- Dùng `activate` / `deactivate` khi cần thể hiện rõ khoảng thời gian một service đang xử lý (đặc biệt nếu có nhiều self-call liên tiếp trong cùng participant).
- Note ngắn gọn, không nhồi nhiều thông tin vào 1 label — nếu message dài, cân nhắc rút gọn hoặc để chi tiết trong text mô tả bên ngoài diagram.

## 2. Flowchart / State Diagram (trạng thái + transition)

- Group theo **entity/aggregate** bằng `subgraph`, mỗi entity một khối riêng biệt.
- Nếu nhiều transition khác nhau cùng trỏ tới **một state kết thúc giống nhau** (ví dụ nhiều nhánh cùng dẫn tới `CANCELLED`), **gộp thành 1 node duy nhất**, không tạo state trùng tên ở nhiều vị trí.
- Đặt tên transition (label trên arrow) ngắn gọn, mô tả **hành động** hoặc **điều kiện** gây ra transition (ví dụ: `Approve 4-eyes`, `FAIL_HARDWARE`), không mô tả state đích.
- Quy ước màu theo ý nghĩa trạng thái (áp dụng nếu diagram tool hỗ trợ style/class):
  - **Gray**: state trung gian / đang xử lý (draft, pending, in-progress)
  - **Teal/Green**: state thành công / hoàn tất (completed, in-stock, approved)
  - **Coral/Red**: state thất bại / hủy (cancelled, defective, rejected)
- Nếu có nhiều state machine độc lập (không liên quan trực tiếp) trong cùng 1 diagram, tách thành các `subgraph` riêng, sắp xếp theo chiều dọc (trên-dưới), không đan xen.

## 3. ERD (Entity Relationship Diagram)

- **Mọi bảng có foreign key phải khai báo quan hệ tương ứng** (`}o--||` hoặc phù hợp) trỏ tới bảng cha. Nếu một bảng có cột dạng `xxx_id` nhưng không có dòng quan hệ, đó là dấu hiệu thiếu sót — cần bổ sung hoặc xác nhận là chủ ý (bảng độc lập).
- Trước khi vẽ, liệt kê danh sách quan hệ dạng text ngắn gọn (bảng con → bảng cha, qua cột nào) để review trước khi render ra ERD thật.
- Nếu số lượng bảng lớn (>5-6 bảng) hoặc mỗi bảng có nhiều cột (>10 cột), **tách ERD theo nhóm domain liên quan** (ví dụ: nhóm return receipt riêng, nhóm stock check riêng) thay vì nhồi tất cả vào 1 diagram — tránh diagram quá cao/rối.
- Comment `%%` trong Mermaid ERD nên ghi rõ **mục đích nghiệp vụ** của bảng (1 dòng ngắn), không chỉ liệt kê tên cột.

## 4. Quy trình chung khi AI tạo diagram

1. Trước khi viết code Mermaid, **tóm tắt layout dự kiến bằng text/ASCII** để xác nhận với người yêu cầu.
2. Chỉ render code Mermaid hoàn chỉnh **sau khi** layout đã được xác nhận.
3. Ưu tiên rõ ràng, dễ đọc hơn là đẹp/phức tạp — không thêm chi tiết không cần thiết vào diagram (icon, màu mè) nếu không phục vụ mục đích truyền đạt thông tin.
