# Demo Walkthrough — Hướng dẫn thao tác & tái hiện tất cả chức năng

> File này hướng dẫn từng bước thao tác trên hệ thống.
> Mỗi flow có 2 phần: (1) xem dữ liệu seed sẵn, (2) tự tạo từ đầu nếu không có seed.

---

## Tài khoản demo

Tất cả mật khẩu: **admin123**

| Username | Vai trò | Làm được gì |
|----------|---------|-------------|
| admin | ADMIN | Quản trị hệ thống, duyệt thay QL, xem audit/báo cáo |
| manager | MANAGER | Duyệt/từ chối phiếu, quản lý danh mục |
| sales | SALES | Tạo phiếu xuất, trả hàng |
| stock | STOCK | Tạo phiếu nhập, kiểm kê, điều chỉnh tồn |

---

## 1. Đăng nhập

### Dữ liệu seed
4 tài khoản ACTIVE: admin, manager, sales, stock.

### Tái hiện từ đầu

**Bước 1:** Mở http://localhost
- Form login: username + password (toggle show/hide) + nút "Đăng nhập"

**Bước 2:** Nhập thông tin đăng nhập → Enter
- Thành công: redirect theo role (ADMIN/MANAGER → Dashboard, STOCK → /stock/units, SALES → /stock/exports)
- Thất bại: banner lỗi đỏ

**Bước 3:** Logout → avatar menu (góc trên phải) → "Đăng xuất"

> **Tự tạo tài khoản mới:** ADMIN vào /users → "Thêm người dùng" → nhập Họ tên, Email, Vai trò → tạo xong copy temp password → kích hoạt user

---

## 2. Dashboard & Báo cáo

**Vai trò:** ADMIN, MANAGER

### Dữ liệu seed
Dashboard load thống kê từ seed data (32 SP, 1 import, 2 export, ...).

### Tái hiện từ đầu

**Bước 1:** Login as admin → vào /
- 6 tab: Tổng quan | Theo danh mục | Sắp hết hàng | Giá trị tồn | Hoạt động | Tồn lâu
- Mỗi tab click để xem chi tiết, filter (Hoạt động có date range, Tồn lâu có days input)
- Nút CSV Export ở mỗi tab

**Bước 2:** Nếu chưa có dữ liệu:
- Tạo ít nhất 1 import receipt (COMPLETED) để có ProductUnit trong kho
- Tạo ít nhất 1 export receipt (COMPLETED) để có SOLD units
- Dashboard sẽ tự động cập nhật số liệu

---

## 3. Sản phẩm (Products)

**Route:** /products | /products/new | /products/:id
**Vai trò:** Xem: CAN_VIEW_INVENTORY. Tạo/sửa: MANAGER

### Dữ liệu seed
32 sản phẩm: CPU, RAM, GPU, Mainboard, PSU, Storage, Case, Cooling — mỗi SP có SKU, barcode, brand, category, tracking_type.

### Tái hiện từ đầu

**Bước 1 (tạo brand + category trước):**
- Login as manager → /brands → "Thêm" → nhập tên (vd: "Intel"), mô tả → Lưu
- /categories → "Thêm" → nhập tên (vd: "CPU"), mô tả → Lưu

**Bước 2 (tạo sản phẩm):**
- /products/new → điền form:
  - Tên sản phẩm (*): "Intel Core i7-14700K"
  - SKU: "CPU-INT-001"
  - Barcode: (tuỳ chọn)
  - Thương hiệu: chọn "Intel" (đã tạo ở bước 1)
  - Danh mục: chọn "CPU"
  - Đơn vị tính: PIECE
  - Kiểu theo dõi: "Theo serial" (SERIALIZED)
  - Giá bán: 11499000
  - Tồn tối thiểu: 5
  - Mô tả: (tuỳ chọn)
- Click "Tạo sản phẩm" → POST /api/v1/product → redirect list

**Bước 3 (sửa sản phẩm):**
- /products → click icon bút → /products/:id
- Sửa thông tin, thêm ảnh (nhập URL → "Thêm"), set ảnh chính
- Toggle Active/Inactive
- "Lưu" → PUT /api/v1/product/:id

---

## 4. Thương hiệu (Brands)

**Route:** /brands
**Vai trò:** Xem: CAN_VIEW_INVENTORY. CRUD: MANAGER

### Dữ liệu seed
13 brands (ASUS, Gigabyte, MSI, Intel, AMD, Samsung, Corsair, ...).

### Tái hiện từ đầu

- /brands → "Thêm" → dialog: Tên (*), Mô tả, upload ảnh → Lưu
- Click hàng → edit dialog
- Toggle active/inactive

---

## 5. Danh mục (Categories)

**Route:** /categories
**Vai trò:** Xem: CAN_VIEW_INVENTORY. CRUD: MANAGER

### Dữ liệu seed
8 categories: CPU, RAM, GPU, Mainboard, PSU, Storage, Case, Cooling.

### Tái hiện từ đầu

Tương tự Brands: table + dialog create/edit + toggle active.

---

## 6. Nhà cung cấp (Suppliers)

**Route:** /suppliers
**Vai trò:** Xem: CAN_VIEW_INVENTORY. CRUD: MANAGER

### Dữ liệu seed
6 suppliers: Intel Vietnam, Corsair Asia, Samsung Vina, ...

### Tái hiện từ đầu

- "Thêm" → dialog: Tên (*), Người LH, SĐT, Email, Địa chỉ, Mã số thuế, Ghi chú → Lưu
- Toggle active/inactive

---

## 7. Nhập kho (Import Receipt)

**Lifecycle:** DRAFT → (confirm) → PENDING_APPROVAL → (approve) → COMPLETED
**Vai trò:** STOCK tạo + confirm. MANAGER approve/cancel.

### Dữ liệu seed
INIT-000001: Intel Vietnam, 32 items, COMPLETED.

### Tái hiện từ đầu

**Bước 1 (tạo DRAFT):**
- Cần có: supplier (đã tạo ở Flow 6), products (đã tạo ở Flow 3), locations (seed sẵn)
- Login as stock → /stock/imports/new
- Wizard 4 bước:
  1. **Chọn NCC**: chọn supplier từ dropdown
  2. **Thêm SP + SL**: click "Thêm dòng" → chọn product, nhập quantity, unit_price, warranty_months
  3. **Nhập serial**: nhập tay từng serial / paste multi-line / upload Excel
  4. **QC & xác nhận**: checklist Pass/Fail per-serial, chọn location

**Bước 2 (confirm → PENDING_APPROVAL):**
- Sau tạo → redirect /stock/imports/:id (DRAFT)
- Nút "Confirm" (chỉ người tạo) → validate serials → tạo ProductUnits → PENDING_APPROVAL

**Bước 3 (approve → COMPLETED):**
- Login as manager → /stock/imports → tìm phiếu PENDING_APPROVAL
- Vào detail → nút "Duyệt" → dialog xác nhận
- ProductUnits chính thức vào kho (IN_STOCK)

> **Luồng đầy đủ:** stock tạo → stock confirm → manager approve

---

## 8. Xuất kho (Export Receipt)

**Lifecycle:** PENDING_APPROVAL → (approve) → COMPLETED / (cancel) → CANCELLED
**Vai trò:** SALES tạo. MANAGER approve/cancel.

### Dữ liệu seed

| Mã phiếu | Khách | Lý do | Tiền | Trạng thái |
|----------|-------|-------|------|-----------|
| EXP-20260702-001 | Công ty TNHH ABC | SALE | 58.992.000 | COMPLETED |
| EXP-20260708-001 | Nguyễn Văn Minh | SALE | 30.598.000 | PENDING_APPROVAL |

### Tái hiện từ đầu

**Bước 1 (tạo PENDING_APPROVAL):**
- Cần có: customer, sản phẩm có tồn IN_STOCK
- Login as sales → /stock/exports/new
- Chọn reason: SALE / INTERNAL / RETURN_SUPPLIER / DISPOSE
- Nếu SALE: search + chọn customer (modal autocomplete)
- Thêm items: chọn product, nhập quantity (system gợi ý FIFO)
- Submit → PENDING_APPROVAL

**Bước 2 (approve → COMPLETED):**
- Login as manager → /stock/exports → tìm phiếu PENDING_APPROVAL
- Vào detail → "Duyệt" → dialog xác nhận
- ProductUnits → SOLD, gán warranty dates

> **Luồng đầy đủ:** sales tạo → manager approve → units SOLD

---

## 9. Trả hàng (Return Receipt)

**Lifecycle:** PENDING_APPROVAL → (approve) → COMPLETED → RESTOCK/SCRAP
**Vai trò:** SALES tạo. MANAGER approve/cancel.

### Dữ liệu seed

| Mã phiếu | Khách | Lý do | Trạng thái |
|----------|-------|-------|-----------|
| RR-000002 | Công ty TNHH ABC | CHANGE_MIND | PENDING_APPROVAL |
| RR-000001 | Công ty TNHH ABC | DEFECTIVE | COMPLETED |

### Tái hiện từ đầu

**Bước 1 (tạo PENDING_APPROVAL):**
- Cần có: export receipt gốc (COMPLETED), customer, units SOLD
- Login as sales → /returns/new
- Bắt buộc chọn export gốc trước (autocomplete mã phiếu hoặc serial)
- Chọn reason: CHANGE_MIND / DEFECTIVE / WRONG_ITEM
- Chọn items từ export gốc, nhập condition (GOOD/DEFECTIVE)
- Chọn resulting action:
  - GOOD → RESTOCK
  - DEFECTIVE → SCRAP
- Submit → PENDING_APPROVAL

**Bước 2 (approve → COMPLETED):**
- Login as manager → /returns → tìm PENDING_APPROVAL
- Nút "Duyệt" → xác nhận
- ProductUnit chuyển trạng thái theo resulting_action:
  - RESTOCK → IN_STOCK
  - SCRAP → DISPOSED

> **Luồng đầy đủ:** sales tạo (chọn export + items + condition) → manager duyệt → unit cập nhật trạng thái

---

## 10. Kiểm kê (Stock Check)

**Lifecycle:** PENDING → (record items) → IN_PROGRESS → (complete) → COMPLETED → (approve) → APPROVED
**Vai trò:** STOCK tạo + ghi nhận. MANAGER approve/reject.

### Dữ liệu seed

| Mã phiếu | Trạng thái | Mô tả |
|----------|-----------|-------|
| SC-000001 | PENDING | Kiểm kê đột xuất khu A — 3 items, chưa ghi nhận |
| SC-20260705-001 | COMPLETED | Kiểm kê định kỳ — 4 items, 1 MISSING |

### Tái hiện từ đầu

**Bước 1 (tạo PENDING):**
- Login as stock → /stock/checks/new
- Chọn các ProductUnit cần kiểm (IN_STOCK)
- Submit → PENDING (items đã được sinh tự động)

**Bước 2 (ghi nhận kết quả):**
- /stock/checks/:id → tab Results
- Nhập counted_quantity, actual_status cho từng item
- Save (lưu tạm) hoặc Complete (lưu + chuyển COMPLETED)

**Bước 3 (approve):**
- Login as manager → /stock/checks → tìm COMPLETED
- Diff summary hiển thị sai lệch màu (MISSING=đỏ, UNEXPECTED=xanh)
- Nút "Approve" / "Reject" → dialog → xác nhận
- Nếu APPROVED + có item lệch → nút "Tạo phiếu điều chỉnh (N)" → batch tạo StockAdjustment

> **Luồng đầy đủ:** stock tạo → stock ghi nhận → stock complete → manager approve → (optional) auto-create adjustments

---

## 11. Điều chỉnh tồn (Stock Adjustment)

**Lifecycle:** PENDING → (approve) → APPROVED / (reject) → REJECTED
**Vai trò:** STOCK tạo. MANAGER approve/reject.

### Dữ liệu seed

| Mã phiếu | Loại | SP | Lý do | Trạng thái |
|----------|------|-----|-------|-----------|
| ADJ-000001 | LOST | Intel Core i7 | Thất lạc khi kiểm kê | PENDING |
| ADJ-20260706-001 | DAMAGED | Intel Core i7 | Hỏng vận chuyển | APPROVED |

### Tái hiện từ đầu

**Bước 1 (tạo PENDING):**
- Cần có: ProductUnit IN_STOCK (để điều chỉnh DAMAGED/LOST)
- Login as stock → /stock/adjustments/new
- Chọn type: DAMAGED / LOST / FOUND
- DAMAGED/LOST: search serial → chọn unit → nhập lý do (*) → upload ảnh (tuỳ chọn)
- FOUND: chọn product + nhập serial/quantity
- Submit → PENDING

**Bước 2 (approve → APPROVED):**
- Login as manager → /stock/adjustments → filter "Chờ duyệt"
- Vào detail → "Duyệt" / "Từ chối" → dialog → xác nhận
- APPROVED → ProductUnit chuyển trạng thái (IN_STOCK → LOST/DAMAGED_IN_STORAGE/FOUND)

> **Luồng đầy đủ:** stock tạo (chọn type + unit + lý do) → manager duyệt → unit cập nhật

---

## 12. Điều chỉnh giá (Price Adjustment)

**Lifecycle:** PENDING → (approve) → APPROVED / (reject) → REJECTED
**Vai trò:** STOCK/SALES tạo. MANAGER approve/reject.

### Dữ liệu seed

| Mã phiếu | SP | Giá cũ → Mới | Lý do | Trạng thái |
|----------|-----|------------|-------|-----------|
| PA-000001 | SSD Samsung 990 Pro | 3.899.000 → 3.499.000 | Giá giảm thị trường | PENDING |
| PA-20260707-001 | SSD Samsung 990 Pro | 9.499.000 → 8.999.000 | Thỏa thuận NCC | APPROVED |

### Tái hiện từ đầu

**Bước 1 (tạo PENDING):**
- Cần có: import receipt item đã COMPLETED (chứa old_price)
- Login as stock/sales → /stock/price-adjustments/new
- Chọn import receipt item → system tự lấy old_price
- Nhập new_price + lý do (*) → Submit → PENDING

**Bước 2 (approve → APPROVED):**
- Login as manager → /stock/price-adjustments → filter "Chờ duyệt"
- Vào detail → "Duyệt" / "Từ chối" → AlertDialog → xác nhận
- APPROVED → import receipt item.price được cập nhật

> **Luồng đầy đủ:** stock/sales tạo (chọn import item + giá mới) → manager duyệt → cập nhật giá vốn

---

## 13. Đơn đặt hàng (Purchase Order)

**Lifecycle:** DRAFT → (khi nhập 1 phần) → PARTIALLY_RECEIVED → (khi nhập hết) → COMPLETED
**Vai trò:** MANAGER tạo, hủy.

### Dữ liệu seed
Không có PO seed.

### Tái hiện từ đầu

**Bước 1 (tạo DRAFT):**
- Login as manager → /stock/purchase-orders/new
- Chọn supplier → nhập items (product + quantity + unit_price)
- Nhập expected_delivery_date → Submit → DRAFT

**Bước 2 (tạo import từ PO):**
- /stock/purchase-orders/:id → nút "Tạo phiếu nhập"
- Redirect /stock/imports/new?poId=... — items được pre-fill từ PO
- Tạo import receipt → confirm → approve → product vào kho
- PO tự động cập nhật trạng thái dựa trên số lượng đã nhập

> **Luồng đầy đủ:** manager tạo PO → (optional) tạo import từ PO → PO auto-update

---

## 14. Kho hàng (Stock Units)

**Route:** /stock/units (gồm 3-4 tab)
**Vai trò:** CAN_OPERATE

### Dữ liệu seed
~182 ProductUnits (IN_STOCK + SOLD) — có thể xem danh sách, filter theo status.

### Tái hiện từ đầu
- ProductUnit được tạo tự động khi import receipt được approve
- Không có API tạo thủ công

**Các tab:**
- **Tổng quan** (MANAGER): thống kê tồn kho
- **Danh sách**: table ProductUnit (paged, filter status)
- **Tồn kho**: inventory gộp theo sản phẩm (số lượng tồn)
- **Bản đồ kho**: xem Flow 16

---

## 16. Bản đồ kho (Locations Map)

**Route:** /stock/units → tab "Bản đồ kho"
**Vai trò:** MANAGER, CAN_VIEW_INVENTORY

### Dữ liệu seed
~80 locations: zone A–Z, shelf 01–04, bin 01–04.

### Tái hiện từ đầu

- Location được seed khi khởi tạo hệ thống (V7__seed.sql)
- MANAGER có thể thêm location mới qua API (không có UI create riêng — dùng LocationsMapPage edit mode)

**Thao tác:**
- Zoom shelf: click shelf header → phóng to
- Bin popup: click bin → SL SP / max capacity + progress bar
- Filter capacity: Còn trống / Còn chỗ / Gần đầy / Đầy
- Edit mode (MANAGER): bật "Quản lý vị trí" → kéo thả bin tile

---

## 17. Khách hàng (Customers)

**Route:** /customers
**Vai trò:** Xem: CAN_OPERATE. CRUD: MANAGER

### Dữ liệu seed
6 customers: Công ty TNHH ABC, Cửa hàng PC Plus, Nguyễn Văn Minh, ...

### Tái hiện từ đầu

- /customers → "Thêm" → dialog: Tên (*), SĐT, Email, Địa chỉ, Ghi chú → Lưu
- Click icon bút → edit dialog
- Click icon Power → toggle active/inactive

---

## 18. Người dùng (Users)

**Route:** /users
**Vai trò:** ADMIN (duy nhất)

### Dữ liệu seed
4 users: admin (ADMIN), manager (MANAGER), sales (SALES), stock (STOCK).

### Tái hiện từ đầu

**Bước 1 (tạo user mới):**
- Login as admin → /users → "Thêm người dùng"
- Nhập: Họ tên, Email (*), Vai trò (Select)
- Submit → dialog hiển thị temp password → copy + gửi cho user
- User mới ở trạng thái NEW, chưa login được

**Bước 2 (kích hoạt user):**
- Click icon Ban → toggle ACTIVE
- User login được với temp password

**Bước 3 (quản lý user):**
- Click UserCog → edit info (Họ tên, SĐT, Giới tính)
- Click Shield → change role
- Click KeyRound → reset password (toast hiện pass mới)
- Click Ban → toggle active/inactive

---

## 19. Nhật ký hệ thống (Audit Log)

**Route:** /audit
**Vai trò:** CAN_VIEW_REPORTS (ADMIN, MANAGER)

### Dữ liệu seed
Audit logs từ mọi hành động CRUD.

### Tái hiện từ đầu
Audit log tự động ghi khi có thao tác — không cần tạo thủ công.

**Thao tác:**
- Filter: Hành động | Đối tượng | Trạng thái | Người dùng (searchable) | Từ ngày → Đến ngày
- Filter chips + "Xoá bộ lọc"
- Click icon mắt → dialog JSON old/new values + error_msg

---

---

## Phụ lục: Debug & khắc phục

### API 500 / không tìm thấy route
`ash
# Kiểm tra backend logs
docker compose logs backend --tail=50

# Kiểm tra route thực tế (các controller dùng /api/v1 prefix tự động)
# Return: /api/v1/return-receipts (plural)
# Còn lại: /api/v1/stock-check, /stock-adjustment, /price-adjustment, /import-receipt, /export-receipt (singular)
`

### Text bị lỗi font / dấu hỏi
`sql
-- Kiểm tra charset connection
mysql -u root -p123456 -e "SHOW VARIABLES LIKE 'character_set%';"
-- Nếu character_set_client = latin1 → chạy lại seed với UTF8:
SET NAMES utf8mb4;
-- Kiểm tra JDBC URL có ?characterEncoding=UTF-8 không
`

### Flyway checksum mismatch (khi sửa file SQL)
`sql
-- Tính checksum mới của file đã sửa
-- UPDATE flyway_schema_history SET checksum = <new_checksum> WHERE version = <n>;
-- Hoặc xoá record + seed data để chạy lại
`

### Không có dữ liệu trong Dashboard
Đảm bảo đã tạo ít nhất:
- 1 import receipt COMPLETED (để có ProductUnit IN_STOCK)
- 1 export receipt COMPLETED (để có SOLD units + doanh thu)

### Quên mật khẩu
`ash
docker compose exec mysql mysql -u root -p123456 inventory_db
UPDATE users SET password='.JsUViqKjM9drfhi4dlu/XiLY0E4JO3Ccd2IzmhbNfdZEDeFnay' WHERE username='admin';
`
(Mật khẩu reset về admin123)
