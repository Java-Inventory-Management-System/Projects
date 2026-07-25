# Thiết lập ban đầu — Hướng dẫn bootstrap hệ thống

Hệ thống khi bàn giao không có dữ liệu. Tài liệu này mô tả trình tự thiết lập lần đầu và ai làm gì.

---

## 1. Admin đầu tiên

Vấn đề "con gà quả trứng": cần ít nhất 1 ADMIN để tạo user khác, nhưng ADMIN đó do ai tạo?

**Quyết định:** Seed migration tạo 1 tài khoản ADMIN mặc định:

| Username | Password (buộc đổi lần đầu) | Role |
|----------|---------------------------|------|
| `admin` | `admin123` | ADMIN |

- Hệ thống seed này chạy duy nhất 1 lần trong migration đầu tiên (V1__init.sql hoặc data seed riêng).
- Lần đăng nhập đầu tiên: BE kiểm tra `is_password_reset == true` → buộc đổi password, không cho vào dashboard nếu chưa đổi.
- Sau khi đổi password xong → set `is_password_reset = false`, `status = ACTIVE`.
- Sau đổi pass lần đầu, nếu chưa có user MANAGER nào trong hệ thống → FE hiển thị prompt gợi ý: "Bạn có muốn tạo Quản lý kho ngay không?" (nút Yes / Để sau). Yes → chuyển đến trang `/users` (form tạo user với role QL). Đây là prompt, không block.
- **Không tạo endpoint `/setup/init`** — tránh lỗ hổng bảo mật. Seed migration là đủ.

> **Nếu sau này cần thêm ADMIN khác:** ADMIN hiện tại tự tạo qua màn hình quản lý user (US-28).

---

## 2. Trình tự bootstrap bắt buộc

Thứ tự dưới đây là bắt buộc vì entity sau phụ thuộc entity trước:

```
Bước 1: Tạo warehouse (seed mặc định)        → ADMIN (chỉ 1 lần, chặn cứng tạo thêm)
Bước 2: Tạo locations (zone → shelf → bin)  → ADMIN (hoặc QL nếu QL đã được tạo)
Bước 3: Tạo brands                          → ADMIN (hoặc QL nếu QL đã được tạo)
Bước 4: Tạo categories + category_zones     → ADMIN (hoặc QL nếu QL đã được tạo)
Bước 5: Tạo suppliers                       → ADMIN (hoặc QL nếu QL đã được tạo)
Bước 6: Tạo products + product_images       → ADMIN (hoặc QL nếu QL đã được tạo)
Bước 7: Tạo system_settings (seed)          → ADMIN (chạy migration)
Bước 8: Tạo users & gán role                → ADMIN
Bước 9: (Tùy chọn) Tạo stock_check_schedules → QL
```

### 2.1 Chi tiết từng bước

#### Bước 1: Warehouse

- **Role:** ADMIN (chỉ ADMIN mới tạo được, và chỉ tạo 1 lần duy nhất).
- **Số lượng:** 1 warehouse mặc định "Kho chính". Không cho phép tạo warehouse thứ hai — chặn cứng trong Service layer.
- **Thao tác:** Seed migration tạo warehouse mặc định. Nếu DB mới (seed chưa chạy), ADMIN tạo thủ công qua API `POST /warehouses`. Sau khi đã có warehouse, API chặn cứng không cho tạo thêm.
- **Lưu ý:** `warehouse_id` được dùng làm FK khắp nơi. Khi chỉ có 1 kho, các form nhập/xuất mặc định pre-fill warehouse này, ẩn selector.

#### Bước 2: Locations

- **3 cấp:** zone (A–E) → shelf (00–99) → bin (000–ZZZ). zone bắt buộc, shelf/bin optional.
- **`full_code`:** tự động ghép từ 3 cấp, VD: `A-01-01A`.
- **`max_capacity`:** số `ProductUnit` tối đa (serialized) hoặc số lot (bulk). NULL = không giới hạn, validation mềm.

#### Bước 3–6: Danh mục

- **Role bootstrap (lần đầu):** ADMIN (vì chưa có user QL nào). Sau khi QL đã được tạo ở Bước 8, các CRUD danh mục hàng ngày chuyển cho QL.
- **Kỹ thuật:** `category_zones` phải được tạo sau `categories` (phụ thuộc FK).
- `tracking_type` của product phải khớp mapping cứng: PIECE/BOX/SET → SERIALIZED; METER/KG → BULK.

#### Bước 7: Seed system_settings

Các key mặc định được seed trong migration:

| Key | Default value | Mô tả |
|-----|--------------|-------|
| `product_max_images` | `5` | Số ảnh tối đa / sản phẩm |
| `warranty_replace_sla_days` | `7` | Số ngày SLA chờ đổi BH khi hết serial |
| `dead_stock_threshold_days` | `90` | Số ngày tồn trước khi gắn nhãn dead stock |
| `allow_negative_stock_bulk` | `false` | Cho phép tồn âm với bulk (phase 2, phase 1 = false) |
| `warranty_seal_enabled` | `false` | Có áp dụng tem bảo hành hay không |

ADMIN có thể sửa sau qua màn hình cấu hình (API `PUT /admin/settings/:key`).

#### Bước 8: Users

ADMIN tạo tối thiểu:
- 1 MANAGER (QL)
- 1 STOCK (NV kho)
- 1 SALES (NV bán)

Mỗi user khi tạo xong có `status = NEW`, chưa thể đăng nhập. Admin phải kích hoạt (`ACTIVE`) thì user mới login được.

> **Prompt sau đổi pass lần đầu:** kể từ sau khi đổi pass (xem §1), nếu system chưa có MANAGER nào, FE hiển thị prompt nhẹ hỏi ADMIN có muốn tạo QL ngay không. Đây chỉ là gợi ý UX, không chặn cứng — ADMIN có thể bỏ qua và vào dashboard.

