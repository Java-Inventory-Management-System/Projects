# Product

## Register

product

## Users

4 roles, mỗi role có context và job riêng:

- **STOCK (nhân viên kho)**: Tạo phiếu nhập/xuất, quét serial, kiểm kê. Thao tác trên mobile/tablet trong kho — cần giao diện nhanh, nút bấm lớn, ít thao tác phụ.
- **SALES (nhân viên bán hàng)**: Xuất kho cho đơn hàng. Làm việc trên web, cần tìm kiếm sản phẩm nhanh, validation rõ ràng.
- **MANAGER (quản lý kho)**: Duyệt phiếu, xem báo cáo, quản lý danh mục sản phẩm. Dashboard overview, cần số liệu chính xác, filter mạnh.
- **ADMIN**: Quản lý user, audit log, cấu hình hệ thống. Ít dùng nhất nhưng cần quyền kiểm soát sâu.

## Product Purpose

Hệ thống quản lý kho nội bộ — quản lý tồn kho, nhập/xuất hàng, quét serial, kiểm kê và báo cáo. Mục tiêu: giảm thời gian thao tác của nhân viên kho, tăng accuracy của dữ liệu tồn kho, cho manager cái nhìn real-time về kho.

Success metric: thời gian tạo một phiếu nhập/xuất < 30 giây, sai sót kiểm kê < 1%.

## Brand Personality

**Chuyên nghiệp — Nhanh — Tin cậy**

- **Chuyên nghiệp**: Corporate, đúng mực, không trò chơi. Màu sắc kiềm chế, typography rõ ràng, spacing thoáng nhưng nén được nhiều thông tin.
- **Nhanh**: Ít click, ít chuyển trang, ít animation. Tool được tối ưu cho tốc độ thao tác, không phải cho visual delight.
- **Tin cậy**: UI không làm user nghi ngờ. Trạng thái rõ ràng (loading, empty, error, success). Data hiển thị chính xác, consistent.

## Anti-references

- ❌ Landing page marketing. Đây là tool, không phải portfolio.
- ❌ Card-ception (card trong card).
- ❌ Gradient text / gradient background.
- ❌ Animation màu mè, parallax, scroll-triggered reveal.
- ❌ Tím-xanh dương gradient (overused AI aesthetic).
- ❌ Font Inter (quá overused).
- ❌ Eyebrow text kiểu "WAREHOUSE" / "INVENTORY" uppercase tracked trên mọi section.
- ❌ Glassmorphism / blur decorative.

## Design Principles

1. **Thực dụng hơn hoàn mỹ** — Mỗi pixel phải phục vụ workflow. Nếu không làm user nhanh hơn, cắt bỏ.
2. **Tốc độ là tính năng** — Nhân viên kho cần thao tác nhanh. Optimize cho số lần click, không phải số lượng animation.
3. **Rõ ràng hơn trang trí** — Thông tin hiển thị trực tiếp, không ẩn giấu sau hover hay accordion nếu không cần thiết.
4. **Chuyên nghiệp, không hào nhoáng** — Corporate feel. Kiềm chế, chính xác, nhất quán.
5. **Role-appropriate density** — STOCK cần UI sparse với nút lớn. MANAGER cần data-dense dashboard. ADMIN cần hierarchical navigation.

## Accessibility & Inclusion

- WCAG AA (contrast ≥ 4.5:1 body text, ≥ 3:1 large text).
- Keyboard navigation đầy đủ cho mọi form và action.
- Focus indicators rõ ràng.
- Không yêu cầu screen reader đặc biệt (nội bộ, ít user).
- prefers-reduced-motion: tắt animation không cần thiết.
