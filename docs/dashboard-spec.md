# Dashboard & Work-Queue — Đặc tả (đối chiếu source code)

Tài liệu mô tả hệ thống Dashboard (`/`) của WMS: kiến trúc tab, phân quyền, chi tiết từng tab. Đã đối chiếu với source code hiện tại (frontend, 2026).

## 1. Bối cảnh chung

Hệ thống quản lý kho nội bộ có 4 vai trò (role):

| Role | Mô tả |
|---|---|
| `ADMIN` | Quản trị hệ thống, toàn quyền |
| `MANAGER` | Quản lý kho — xem báo cáo, duyệt phiếu, quản lý danh mục |
| `STOCK` | Nhân viên kho — nhập/xuất, kiểm kê, QC |
| `SALES` | Nhân viên bán hàng — tạo phiếu xuất/trả |

Dashboard là trang chủ `/`, mở cho mọi role. Nội dung điều khiển bởi hệ thống tab + phân quyền.

## 2. Kiến trúc trang Dashboard

### 2.1 Thanh tab
- Thanh tab ngang dưới tiêu đề trang; tab chọn có `border-b-2 border-primary text-primary`.
- Tab render lazy (React.lazy + Suspense, fallback `PageSkeleton`).
- Tab hiển thị theo role: mỗi tab khai báo `roles[]`, chỉ thấy tab thuộc quyền (`perm.hasRole`).
- Tab không có quyền không hiện; truy cập URL `/?tab=` không hợp lệ → fallback `safeTab` về tab hợp lệ đầu tiên.

### 2.2 Tab mặc định theo role
- `MANAGER` / `ADMIN` → `/` mặc định tab **"Tổng quan"** (summary).
- `STOCK` / `SALES` (và dev không user) → `/` mặc định tab **"Việc cần làm"** (work-queue).
- Logic: `defaultTab = (role === "MANAGER" || role === "ADMIN") ? "summary" : "work-queue"`, sau đó `safeTab` fallback.

### 2.3 Dev mode (AUTH_ENABLED=false)
- Mọi tab hiển thị (không login), `/` mặc định tab "Việc cần làm" (`hasRole` trả true → thấy cả 12 section work-queue). Chỉ dùng demo/test.

### 2.4 Danh sách 8 tab và quyền xem

| # | Tab | Key | Quyền (ROLES) | Role thấy |
|---|---|---|---|---|
| 1 | Tổng quan | `summary` | `CAN_VIEW_REPORTS` | MANAGER, ADMIN |
| 2 | Theo danh mục | `category` | `CAN_VIEW_REPORTS` | MANAGER, ADMIN |
| 3 | Sắp hết hàng | `low-stock` | `CAN_VIEW_INVENTORY` | MANAGER, ADMIN, STOCK |
| 4 | Giá trị tồn kho | `stock-value` | `CAN_VIEW_REPORTS` | MANAGER, ADMIN |
| 5 | Hoạt động | `activity` | `CAN_VIEW_REPORTS` | MANAGER, ADMIN |
| 6 | Hàng tồn lâu | `dead-stock` | `CAN_VIEW_REPORTS` | MANAGER, ADMIN |
| 7 | Kiểm kê | `stock-check` | `CAN_VIEW_REPORTS` | MANAGER, ADMIN |
| 8 | Việc cần làm | `work-queue` | `CAN_OPERATE` | TẤT CẢ 4 role |

Theo role:
- **ADMIN**: 8 tab. **MANAGER**: 8 tab. **STOCK**: 2 tab ("Việc cần làm" mặc định + "Sắp hết hàng"). **SALES**: 1 tab ("Việc cần làm").

## 3. Chi tiết từng tab

### 3.1 Tab "Việc cần làm" (work-queue) — mọi role
Bảng tổng hợp công việc cần xử lý của riêng người dùng, chia section (tiêu đề + số lượng + "Xem tất cả" link). Mỗi section gọi 1 API riêng, fetch song song (`Promise.allSettled` — lỗi 1 section không chết tab).

**Giao diện:**
- **Header**: chào — `Xin chào, {tên} ({ROLE})`; bên phải `Cập nhật lúc HH:mm:ss` (thời điểm data refetch cuối).
- **Grid sections**: 2 cột (từ `lg`, 1024px) khi ≥3 section; **1 cột khi <3 section**. Mỗi section: tiêu đề + badge số lượng + link "Xem tất cả" + tối đa 3 dòng phiếu gần nhất.
- **Dòng phiếu**: mã phiếu + đối tác (trái, `truncate`), badge trạng thái + thời gian tương đối + chevron (phải). Cả dòng là link. Target size `min-h-11` = 44px (đạt WCAG).
- **Badge trạng thái**: 2 variant — `destructive` (Bị từ chối), `secondary` (mọi trạng thái khác).
- **Thời gian tương đối**: hôm nay → `Hôm nay, HH:mm`; hôm qua → `Hôm qua, HH:mm`; cũ hơn → `dd/MM/yyyy`.
- **Ưu tiên (urgency)**: section `high` có icon AlertTriangle + header/badge đỏ; `normal` tông trung tính. Tín hiệu ưu tiên không chỉ bằng màu (icon + thứ tự section high trước).
- **Empty state**: tất cả section 0 → thông báo "Không còn việc cần xử lý".
- **Refetch**: `staleTime 30s`, không polling (refetch khi window focus/re-mount). Không gộp API backend.

**Các section (12) theo role:**

| # | Section | STOCK | SALES | MANAGER | ADMIN |
|---|---|---|---|---|---|
| 1 | Nhập kho bị từ chối (chưa xử lý) | ✓ | | | |
| 2 | Phiếu xuất chờ xuất kho | ✓ | | | |
| 3 | Chờ QC | ✓ | | | |
| 4 | Nhập kho bản nháp | ✓ | | | |
| 5 | Kiểm kê đang mở (của tôi: PENDING + IN_PROGRESS) | ✓ | | | |
| 6 | Sắp hết hàng | ✓ | | | |
| 7 | Phiếu xuất của tôi chờ xử lý | | ✓ | | |
| 8 | Phiếu trả hàng của tôi chờ tiếp nhận | | ✓ | | |
| 9 | Phiếu trả hàng chờ tiếp nhận | | | ✓ | ✓ |
| 10 | Điều chỉnh tồn kho chờ duyệt | | | ✓ | ✓ |
| 11 | Điều chỉnh giá chờ duyệt | | | ✓ | ✓ |
| 12 | Kiểm kê chờ phê duyệt (COMPLETED) | | | ✓ | ✓ |

→ MANAGER/ADMIN chỉ thấy 4 section **chờ duyệt** (work-queue = việc riêng; thao tác kho thuộc STOCK).

**Route mapping ("Xem tất cả" và click dòng phiếu):**

| Section | viewAllLink | Dòng phiếu |
|---|---|---|
| import-rejected | `/stock/imports?status=REJECTED` | `/stock/imports/{id}` |
| export-pending | `/stock/exports?status=PENDING` | `/stock/exports/{id}` |
| qc-pending | `/returns-qc/qc` | `/returns-qc/qc` |
| import-draft | `/stock/imports?status=DRAFT` | `/stock/imports/{id}` |
| stock-check | `/stock/ops/checks?status=PENDING` | `/stock/ops/checks/{id}` |
| low-stock | `/products` | `/products` |
| export-mine | `/stock/exports?status=PENDING` | `/stock/exports/{id}` |
| return-mine / return-approval | `/returns-qc/returns?status=PENDING_APPROVAL` | `/returns-qc/returns/{id}` |
| adjustment-approval | `/stock/ops/adjustments?status=PENDING` | `/stock/ops/adjustments/{id}` |
| price-approval | `/stock/ops/price-adjustments?status=PENDING` | `/stock/ops/price-adjustments/{id}` |
| check-approval | `/stock/ops/checks?status=COMPLETED` | `/stock/ops/checks/{id}` |

### 3.2 Tab "Tổng quan" (summary) — MANAGER/ADMIN
- 6 StatCard: Số sản phẩm (kèm số danh mục), Tổng tồn kho (kèm trung bình/danh mục), Giá trị tồn kho (kèm xu hướng % so với tháng trước), Sắp hết hàng (kèm % + nút "Xem chi tiết →" nhảy tab low-stock), Hết hàng (kèm %), widget "Phiếu nhập bị từ chối chưa xử lý" (chỉ khi >0, link list REJECTED).
- Cảnh báo: banner vàng khi có SP chưa phân loại (`/products?filter=uncategorized`); banner đỏ khi có phiếu nhập bị từ chối.
- Treemap giá trị tồn kho theo danh mục (bấm ô → tab "Theo danh mục").
- Bar stacked sức khỏe tồn kho (Đủ / Sắp hết / Hết) theo danh mục.
- Top 10 SP giá trị cao (ComposedChart Bar + Line % tích lũy, reference 80% — Pareto).

### 3.3 Tab "Theo danh mục" (category) — MANAGER/ADMIN
- Bar ngang số SKU theo danh mục.
- DataTable: Danh mục | Số SP | Tổng tồn | Giá trị tồn (VND) — phân trang 20, hàng "Chưa phân loại".
- Nút **Xuất CSV** (ton-kho-theo-danh-muc.csv).

### 3.4 Tab "Sắp hết hàng" (low-stock) — MANAGER/ADMIN/STOCK
- DataTable: SKU | Sản phẩm | Tồn (đỏ khi ≤ min) | Min | **Thiếu hụt** (+ nếu dư) — phân trang.
- Nút "Nhập hàng" mỗi dòng → `/stock/imports/create?ref=low-stock&productId=X`.
- Nút **Xuất CSV** (sap-het-hang.csv, toàn bộ kết quả).

### 3.5 Tab "Giá trị tồn kho" (stock-value) — MANAGER/ADMIN
- ABC/Pareto: ComposedChart Bar giá trị + Line % tích lũy + reference 80%.
- DataTable: SKU | Sản phẩm | Danh mục | SL | Đơn giá | Tổng giá trị — phân trang.
- Nút **Xuất CSV** (gia-tri-ton.csv).

### 3.6 Tab "Hoạt động" (activity) — MANAGER/ADMIN
- Bộ lọc Từ/Đến (DatePicker, mặc định đầu tháng → nay) + chuyển **Theo giá trị / Theo số lượng**.
- Bar cột đôi Nhập vs Xuất theo ngày.
- DataTable: Loại (badge Nhập/Xuất) | Mã phiếu | Ngày | Đối tác | Số dòng | Tổng tiền — phân trang. Chỉ đếm phiếu hoàn tất.

### 3.7 Tab "Hàng tồn lâu" (dead-stock) — MANAGER/ADMIN
- Bộ lọc: Số ngày tồn (mặc định 90), từ khóa, danh mục.
- Histogram 3 khoảng thời gian (threshold→1.33x, 1.33x→2x, 2x+).
- DataTable: SKU | Sản phẩm | Serial | Ngày nhập | Số ngày tồn | Giá vốn — **sắp xếp theo cột**, phân trang. Nút "Xử lý" → chi tiết SP.

### 3.8 Tab "Kiểm kê" (stock-check) — MANAGER/ADMIN
- Bộ lọc Từ/Đến (mặc định đầu tháng → nay).
- Bar số phiếu kiểm kê mỗi tháng.
- Bar stacked điều chỉnh mỗi tháng (Thất thoát / Tìm thấy / Hư hỏng).
- Bảng chênh lệch gần đây: Mã phiếu | Ngày | Thiếu (đỏ) | Dư (vàng) + nút "Xem" → chi tiết phiếu.

## 4. Phân quyền chi tiết

### 4.1 Quyền xem Dashboard
| Role | Vào `/` | Tab mặc định | Số tab |
|---|---|---|---|
| ADMIN | ✓ | Tổng quan | 8 |
| MANAGER | ✓ | Tổng quan | 8 |
| STOCK | ✓ | Việc cần làm | 2 |
| SALES | ✓ | Việc cần làm | 1 |

### 4.2 Ma trận permission (permissions.ts)
| Permission | ADMIN | MANAGER | STOCK | SALES |
|---|---|---|---|---|
| `CAN_VIEW_REPORTS` | ✓ | ✓ | ✗ | ✗ |
| `CAN_APPROVE` | ✓ | ✓ | ✗ | ✗ |
| `CAN_MANAGE_CATALOG` | ✓ | ✓ | ✗ | ✗ |
| `CAN_MANAGE_SYSTEM` | ✓ | ✗ | ✗ | ✗ |
| `CAN_OPERATE_STOCK` | ✗ | ✓ | ✓ | ✗ |
| `CAN_VIEW_QC` | ✓ | ✓ | ✓ | ✗ |
| `CAN_CREATE_TRANSACTION` | ✗ | ✓ | ✗ | ✓ |
| `CAN_CREATE_PRICE_ADJUSTMENT` | ✗ | ✓ | ✗ | ✗ |
| `CAN_VIEW_INVENTORY` | ✓ | ✓ | ✓ | ✗ |
| `CAN_OPERATE` | ✓ | ✓ | ✓ | ✓ |
| `CAN_VIEW_PRODUCTS` | ✓ | ✓ | ✓ | ✓ |

Dữ liệu phân tích (summary, category, stock-value, activity, dead-stock, stock-check) do backend bảo vệ bằng `CAN_VIEW_REPORTS` → STOCK/SALES nhận 403 nếu gọi trực tiếp.

## 5. Quy tắc triển khai

1. Không phá code đã hoạt động: giữ nguyên hành vi 7 tab còn lại, không đổi route/service/types.
2. Tab ẩn = không truy cập được (URL `?tab=` fallback).
3. Default tab theo role (mục 2.2).
4. Mỗi tab tách file `features/dashboard/tabs/` (lazy); work-queue ở `features/work-queue/`, export `WorkQueueTab`.
5. i18n song ngữ vi-en; tiền tệ VND (`vi-VN`), ngày `dd/MM/yyyy`.
6. CSV export dùng `downloadCsv`, xuất toàn bộ dữ liệu.
7. Design: tông trung tính + 1 accent xanh thép (≤10%); IBM Plex Sans; không gradient/card-ception/anim trang trí; density theo role (STOCK thưa & target lớn, MANAGER dày).
8. Work-queue tối giản tuyệt đối: badge 2 variant + "Hôm nay, HH:mm" + greeting; cấm thêm icon loại phiếu/skeleton/phân nhóm/SLA.

## 6. Tiêu chí chấp nhận

- Login 4 role: ADMIN/MANAGER 8 tab, `/` ra "Tổng quan"; STOCK 2 tab + `/` ra "Việc cần làm"; SALES 1 tab.
- Tab load dữ liệu thật từ BE, không mock, không console error, không 403 với role được phép.
- Work-queue: greeting + role, "Cập nhật lúc", badge trạng thái, "Hôm nay/Hôm qua, HH:mm", link "Xem tất cả" đúng route, empty state; SALES 1 cột, ≥3 section 2 cột.
- CSV 3 tab xuất đúng cột.
- Build + typecheck + 13 unit + 16 integration test pass.