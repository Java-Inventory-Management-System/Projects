# Frontend Flows — Bám sát codebase

> File này mô tả luồng FE từ route → page → component/service, gồm route guards, lazy loading, và role-based navigation.
> Viết dựa trên codebase thật, không phải requirement.

---

## Architecture

```
routes/index.tsx          ← react-router config (lazy pages + guards)
features/*/pages/*.tsx    ← page components (gọi hooks/service trực tiếp)
services/*.ts             ← axios API calls
hooks/*.ts                ← React Query hooks
store/*.ts                ← Zustand stores (auth, ui)
```

**Routing:** `createBrowserRouter` trong `routes/index.tsx`. Tất cả page đều lazy-loaded qua `lazyPage()`.

**Auth guard:** `ProtectedRoute` — nếu chưa login → redirect `/login`. `PageGuard` — check role, nếu không đủ → render `ForbiddenPage`.

---

## Route Map

| Route | Page | Guard | Mô tả |
|-------|------|-------|-------|
| `/login` | `LoginPage` | public | Đăng nhập |
| `/` | `RootRedirect` | auth | Tuỳ role: STOCK → `/stock/units`, SALES → `/stock/exports`, còn lại → Dashboard |
| `/dashboard` | → `/` | redirect | |
| `/products` | `ProductsPage` | `CAN_VIEW_INVENTORY` | Danh sách sản phẩm |
| `/products/new` | `ProductCreatePage` | `MANAGER` | Tạo sản phẩm |
| `/products/:id` | `ProductEditPage` | `MANAGER` | Sửa sản phẩm |
| `/brands` | `BrandsPage` | `CAN_VIEW_INVENTORY` | Danh sách thương hiệu |
| `/categories` | `CategoriesPage` | `CAN_VIEW_INVENTORY` | Danh sách danh mục |
| `/suppliers` | `SuppliersPage` | `CAN_VIEW_INVENTORY` | Danh sách nhà cung cấp |
| `/customers` | `CustomersPage` | `CAN_OPERATE` | Danh sách khách hàng |
| `/inventory` | → `/stock/units` | redirect | |
| `/stock/imports` | `ImportListPage` | `CAN_VIEW_INVENTORY` | DS phiếu nhập |
| `/stock/imports/new` | `ImportCreatePage` | `CAN_VIEW_INVENTORY` | Tạo phiếu nhập (wizard) |
| `/stock/imports/:id` | `ImportDetailPage` | `CAN_VIEW_INVENTORY` | Chi tiết phiếu nhập |
| `/stock/exports` | `ExportListPage` | `CAN_OPERATE` | DS phiếu xuất |
| `/stock/exports/new` | `ExportCreatePage` | `CAN_OPERATE` | Tạo phiếu xuất |
| `/stock/exports/:id` | `ExportDetailPage` | `CAN_OPERATE` | Chi tiết phiếu xuất |
| `/stock/checks` | `StockCheckListPage` | `CAN_VIEW_INVENTORY` | DS kiểm kê |
| `/stock/checks/new` | `StockCheckCreatePage` | `CAN_OPERATE_STOCK` | Tạo kiểm kê |
| `/stock/checks/:id` | `StockCheckDetailPage` | `CAN_VIEW_INVENTORY` | Chi tiết kiểm kê |
| `/stock/adjustments` | `StockAdjustmentListPage` | `CAN_VIEW_INVENTORY` | DS điều chỉnh kho |
| `/stock/adjustments/new` | `StockAdjustmentCreatePage` | `CAN_OPERATE_STOCK` | Tạo điều chỉnh |
| `/stock/adjustments/:id` | `StockAdjustmentDetailPage` | `CAN_VIEW_INVENTORY` | Chi tiết điều chỉnh |
| `/stock/price-adjustments` | `PriceAdjustmentListPage` | `CAN_VIEW_INVENTORY` | DS điều chỉnh giá |
| `/stock/price-adjustments/new` | `PriceAdjustmentCreatePage` | `CAN_OPERATE_STOCK` | Tạo điều chỉnh giá |
| `/stock/price-adjustments/:id` | `PriceAdjustmentDetailPage` | `CAN_VIEW_INVENTORY` | Chi tiết điều chỉnh giá |
| `/stock/purchase-orders` | `POListPage` | `MANAGER` | DS đơn đặt hàng |
| `/stock/purchase-orders/new` | `POCreatePage` | `MANAGER` | Tạo đơn đặt hàng |
| `/stock/purchase-orders/:id` | `PODetailPage` | `MANAGER` | Chi tiết đơn đặt hàng |
| `/stock/units` | `StockUnitsPage` | `CAN_OPERATE` | DS đơn vị sản phẩm (ProductUnit) |
| `/warranty` | `WarrantyListPage` | `CAN_OPERATE` | DS bảo hành |
| `/warranty/new` | `WarrantyCreatePage` | `CAN_OPERATE` | Tạo yêu cầu bảo hành |
| `/warranty/:id` | `WarrantyDetailPage` | `CAN_OPERATE` | Chi tiết bảo hành |
| `/returns` | `ReturnListPage` | `CAN_OPERATE` | DS trả hàng |
| `/returns/new` | `ReturnCreatePage` | `CAN_OPERATE` | Tạo phiếu trả hàng |
| `/returns/:id` | `ReturnDetailPage` | `CAN_OPERATE` | Chi tiết trả hàng |
| `/users` | `UsersPage` | `ADMIN` | Quản lý user |
| `/audit` | `AuditPage` | `CAN_VIEW_REPORTS` | Audit log |
| `/403` | `ForbiddenPage` | public | Forbidden |
| `*` | `NotFoundPage` | public | 404 |

**Root redirect logic:**
- `STOCK` → `/stock/units`
- `SALES` → `/stock/exports`
- còn lại → `DashboardPage`

---

## Flow 1: Login

**Route:** `/login` → `LoginPage`

**Service:** `auth-service.ts`
- `POST /auth/login` → gửi email + password → nhận JWT + refresh token cookie
- Lưu user + token vào `auth-store` (Zustand)

**Sau login:**
- `ProtectedRoute` kiểm tra `auth-store.user` ≠ null
- Nếu có user → render `AppShell` + `Outlet`
- `AppShell` gồm `Sidebar` (desktop) / `Sheet` (mobile) + `Topbar` + `<Outlet />`

---

## Flow 2: Dashboard

**Route:** `/dashboard` (hoặc `/`)

**Service:** `dashboard-service.ts`
- `GET /dashboard/stats` → `CAN_VIEW_REPORTS`

**Component:** `dashboard-page.tsx` → `summary-tab.tsx`

---

## Flow 3: Catalog (Products, Brands, Categories, Suppliers)

**Pages:** `products-page`, `brands-page`, `categories-page`, `suppliers-page`

**Services:** tương ứng `product-service`, `brand-service`, `category-service`, `supplier-service`

**Pattern chung:**
- GET list (paged) → hiển thị table
- GET one (modal hoặc detail page)
- POST create → form → submit → toast
- PUT update → form → submit → toast
- PUT toggle-active → toggle switch → toast
- **Brand / Category**: có thêm ảnh đại diện (`image_url`). Dùng `ImageUpload` component (kéo thả) trong create/edit dialog. Ảnh hiển thị thumbnail tròn (brand) / vuông bo góc (category) trong list page và form.

**Product Images:** `product-image-service` → GET/POST/DELETE

**Category Zone:** `category-zone-service` → GET list + map (readonly)

---

## Flow 4: Import Receipt

**Pages:**
- `/stock/imports` → `ImportListPage` — table + filter by status
- `/stock/imports/new` → `ImportCreatePage` — wizard multi-step
- `/stock/imports/:id` → `ImportDetailPage` — chi tiết + actions

**Service:** `import-service.ts`
- GET `/import-receipt` — list (paged, filter status)
- GET `/import-receipt/{id}` — detail
- POST `/import-receipt` — create draft
- PUT `/import-receipt/{id}/confirm` — confirm
- PUT `/import-receipt/{id}/approve` — approve
- PUT `/import-receipt/{id}/cancel` — cancel
- GET `/import-receipt/{id}/units` — units

**ImportCreatePage:** wizard 4 bước:

1. **Chọn NCC/PO** (`import-create-step-supplier`): chọn supplier (ACTIVE), link PO nếu có (pre-fill items).
2. **Thêm SP + SL** (`import-create-step-products`): thêm dòng sản phẩm (quantity, unit_price, warranty_months). Hỗ trợ nhiều dòng cùng product_id. Nếu lệch >10% so với PO → cảnh báo mềm + bắt buộc note.
3. **Nhập serial** (`import-create-step-serials`): nhập tay / scan barcode / upload Excel. Validate file: check trùng nội bộ trước → DB sau. Ngưỡng 20% lỗi. Progress bar "12/50 serial".
   - Preview danh sách: mỗi dòng serial có badge xanh (OK) / đỏ (lỗi). Hover đỏ → tooltip lý do ("Trùng DB", "Trùng dòng 5"). Vẫn điền/xoá sửa textarea được.
4. **QC & xác nhận** (`import-create-step-qc`):
   - Checklist per-serial (toggle Pass/Fail).
   - QC level theo category (FULL/SAMPLING/SKIP), NV có thể override.
   - Progress bar: "12/50 đã kiểm".
   - FAIL_HARDWARE → badge đỏ + tự động DEFECTIVE.
   - FAIL_ACCESSORY → badge vàng + giữ PENDING_QC.
   - Location auto-assign badge (kèm link "Đổi").
   - Nút "Gửi duyệt" → PENDING_APPROVAL (chỉ khi 100% dòng đã QC).

**ImportCreateSidebar:** hiển thị tổng quan: số dòng, tổng quantity, tổng tiền, tiến độ QC.

**ImportDetailPage:**
- View thông tin receipt + danh sách items.
- Nếu status = DRAFT: nút Confirm (chỉ người tạo).
- Nếu status = PENDING_APPROVAL + user có `CAN_APPROVE`: nút Approve / Cancel.
- Nếu status = COMPLETED: nút Cancel (chỉ khi 100% units chưa xuất).
- Modal `serial-modal` — xem danh sách serial + trạng thái.
- `view-product-unit-modal` — xem chi tiết unit (location, warranty, cost_price).
- CSV Export nút (FileDown) — xuất danh sách SP trong phiếu.

---

## Flow 5: Export Receipt

**Pages:**
- `/stock/exports` → `ExportListPage`
- `/stock/exports/new` → `ExportCreatePage`
- `/stock/exports/:id` → `ExportDetailPage`

**Service:** `export-service.ts`
- GET `/export-receipt` — list
- GET `/export-receipt/{id}` — detail
- POST `/export-receipt` — create
- PUT `/export-receipt/{id}/approve` — approve
- PUT `/export-receipt/{id}/cancel` — cancel

**ExportCreatePage:**
- Chọn reason (SALE/INTERNAL/RETURN_SUPPLIER/DISPOSE).
- Nếu SALE: `customer-select-modal` (autocomplete, bắt buộc).
- Chọn sản phẩm + số lượng. Hệ thống hiển thị tồn khả dụng tối đa. Cho phép xuất partial.
- **Serial picker** (cho serialized):
  - Hệ thống tự chọn FIFO, hiển thị danh sách serial đề xuất.
  - NV có thể đổi serial thay thế (`override-serial-modal`): chọn serial khác + bắt buộc lý do.
  - Hỗ trợ paste multi-line, import `.txt`/`.csv`, highlight trùng lặp.
  - Progress bar "12/50 đã chọn" khi số lượng lớn.
  - Hiện rõ trạng thái "đang giữ chỗ" của serial (RESERVED) để NV khác không nhầm là còn trống.
- `location-picker` — chọn vị trí xuất.

**ExportDetailPage:**
- Nếu PENDING_APPROVAL: nút Approve / Cancel.
- Nếu COMPLETED + reason=SALE: hiển thị warranty dates.
- Nếu reason=RETURN_SUPPLIER: supplier_status tracking (SENT → CONFIRMED_RECEIVED → PROCESSING → RESOLVED), nút cập nhật.
- `view-export-modal` — xem chi tiết.
- CSV Export nút (FileDown).

---

## Flow 6: Return Receipt

**Pages:**
- `/returns` → `ReturnListPage`
- `/returns/new` → `ReturnCreatePage`
- `/returns/:id` → `ReturnDetailPage`

**Service:** `return-service.ts`
- GET `/return-receipts` — list
- GET `/return-receipts/{id}` — detail
- POST `/return-receipts` — create
- PUT `/return-receipts/{id}/approve` — approve
- PUT `/return-receipts/{id}/cancel` — cancel

**ReturnCreatePage:**
- **Bắt buộc chọn export gốc trước** (autocomplete theo mã phiếu xuất hoặc serial) — tránh SALES chọn reason trước rồi mới tìm export, dễ chọn sai.
- Chọn reason: `CHANGE_MIND` / `DEFECTIVE` / `WRONG_ITEM`.
  - CHANGE_MIND: hiện số ngày còn lại trong hạn 7 ngày (từ `export_receipt.approved_at`). BE validate, FE không tự disable.
- Chọn items từ export gốc.
- **Condition picker** (STOCK):
  - `GOOD` → `RESTOCK` (unit → IN_STOCK, `is_warranty_active=false`).
  - `DEFECTIVE` → chọn tiếp `SCRAP` (hủy) hay `WARRANTY_TRANSFER` (chuyển BH).
    - `WARRANTY_TRANSFER` chỉ hiện khi unit gốc là serialized; bulk chỉ hiện SCRAP.

**ReturnDetailPage:**
- Hiển thị thông tin export gốc, items, condition, resulting_action.
- Nếu PENDING_APPROVAL: nút Approve (QL) / Cancel.
- Sau approve: hiển thị kết quả (RESTOCK/SCRAP/WARRANTY_TRANSFER).

---

## Flow 7: Stock Check (Kiểm kê)

**Pages:**
- `/stock/checks` → `StockCheckListPage`
- `/stock/checks/new` → `StockCheckCreatePage`
- `/stock/checks/:id` → `StockCheckDetailPage`

**Service:** `stock-check-service.ts`
- GET `/stock-check/my` — checks của tôi
- GET `/stock-check` — all
- GET `/stock-check/{id}` — detail
- POST `/stock-check` — create
- PUT `/stock-check/{id}/items` — record items
- PUT `/stock-check/{id}/complete` — complete
- PUT `/stock-check/{id}/approve` — approve
- PUT `/stock-check/{id}/reject` — reject

**StockCheckDetailPage:**
- **Diff highlight**: bảng lệch nổi bật ngay đầu trang — đỏ cho `MISSING`, xanh cho `UNEXPECTED`, vàng cho `PARTIAL_SHORTAGE`. Các item khớp (MATCH) hiển thị thu gọn phía dưới.
- `stock-check-items-table` — table ghi nhận kết quả kiểm, filter theo difference type.
- Nút **"Tạo phiếu điều chỉnh (N)"** — batch apply cho tất cả item lệch (tạo StockAdjustment tương ứng: MISSING → LOST, UNEXPECTED → FOUND).
- `approval-dialog` — dialog approve/reject (chỉ QL/AD). Khi approve: hiển thị diff summary trước khi xác nhận.

---

## Flow 8: Stock Adjustment

**Pages:**
- `/stock/adjustments` → `StockAdjustmentListPage`
- `/stock/adjustments/new` → `StockAdjustmentCreatePage`
- `/stock/adjustments/:id` → `StockAdjustmentDetailPage`

**Service:** `stock-adjustment-service.ts`
- GET `/stock-adjustment/my` — của tôi
- GET `/stock-adjustment` — all
- GET `/stock-adjustment/{id}` — detail
- POST `/stock-adjustment` — create
- PUT `/stock-adjustment/{id}/approve` — approve
- PUT `/stock-adjustment/{id}/reject` — reject

**StockAdjustmentCreatePage:**
- **Type selector**: `DAMAGED` / `LOST` / `FOUND` — mỗi type đổi form tương ứng.
- Serial search (`serial-search-widget`) — nhập/gõ serial, fuzzy match, hiển thị thông tin unit.
- DAMAGED/LOST: bắt buộc chọn unit + lý do. Upload ảnh minh chứng tùy chọn.
- FOUND: nếu có serial → chọn unit; nếu không → nhập product + quantity (fallback).
- Reason bắt buộc (textarea).

**StockAdjustmentDetailPage:**
- Hiển thị type, unit, reason, ảnh (nếu có).
- Nếu PENDING + user có `CAN_APPROVE`: nút Approve / Reject.
- Sau approve: hiển thị kết quả unit transition.

---

## Flow 9: Price Adjustment

**Pages:**
- `/stock/price-adjustments` → `PriceAdjustmentListPage`
- `/stock/price-adjustments/new` → `PriceAdjustmentCreatePage`
- `/stock/price-adjustments/:id` → `PriceAdjustmentDetailPage`

**Service:** `price-adjustment-service.ts`
- GET `/price-adjustment/my` — của tôi
- GET `/price-adjustment` — all
- GET `/price-adjustment/{id}` — detail
- POST `/price-adjustment` — create
- PUT `/price-adjustment/{id}/approve` — approve
- PUT `/price-adjustment/{id}/reject` — reject

---

## Flow 10: Purchase Order

**Pages:**
- `/stock/purchase-orders` → `POListPage`
- `/stock/purchase-orders/new` → `POCreatePage`
- `/stock/purchase-orders/:id` → `PODetailPage`

**Service:** `purchase-order-service.ts`
- GET `/purchase-order` — list
- GET `/purchase-order/{id}` — detail
- POST `/purchase-order` — create
- PUT `/purchase-order/{id}/cancel` — cancel

---

## Flow 11: Warranty Request

**Pages:**
- `/warranty` → `WarrantyListPage`
- `/warranty/new` → `WarrantyCreatePage`
- `/warranty/:id` → `WarrantyDetailPage`

**Service:** `warranty-service.ts`
- GET `/warranty-request/lookup?serialNumber=` — lookup
- GET `/warranty-request` — list
- GET `/warranty-request/my-handled` — của tôi
- GET `/warranty-request/{id}` — detail
- POST `/warranty-request` — create
- PUT `/warranty-request/{id}/receive` — receive
- PUT `/warranty-request/{id}/check` — check
- PUT `/warranty-request/{id}/evaluate` — evaluate
- PUT `/warranty-request/{id}/execute` — execute
- PUT `/warranty-request/{id}/cancel` — cancel

### WarrantyListPage (`/warranty`)

**Bố cục:**
- **Tabs** map theo 4 status + "Tất cả" + "Đang xử lý" (đã RESOLVED nhưng chưa execute xong):
  `[Tất cả] [Chờ tiếp nhận] [Đang kiểm tra] [Chờ QL duyệt] [Đang xử lý] [Hoàn tất]`
  - Badge số trên mỗi tab (đặc biệt "Chờ QL duyệt" cần nổi bật).
- Search bar hỗ trợ serial / SĐT khách / mã phiếu.
- Nút **"+ Tiếp nhận mới"** — SALES/STOCK thấy, dẫn tới `/warranty/new`.
- Table columns: Mã phiếu | Serial | Sản phẩm | Khách | Ngày nhận | Trạng thái (WarrantyStatusBadge) | Resolution | Cảnh báo ⚠ (nếu >2 lần đổi BH).
- `PaginationBar` chung.

### WarrantyCreatePage (`/warranty/new`)

Thiết kế 2 giai đoạn: **tra cứu trước, nhập tay sau**.

**Giai đoạn A — Tra cứu:**
- Input serial + nút [Tìm] (autofocus, hỗ trợ scan).
- Kết quả: **Serial Info Card**:
  - Ảnh SP + tên, serial, khách, ngày mua, phiếu xuất gốc.
  - Progress bar hạn BH: xanh (>30 ngày) / vàng (≤30 ngày) / đỏ + khóa form (hết hạn).
  - Tem BH: ✅ Đã xác thực / ⚠️ Không có / — Ẩn (nếu shop tắt tem).
  - Lịch sử đổi BH: cam + ⚠ nếu >2 lần.
- **Không tìm thấy serial** → thông báo rõ, không hiện form.
- **Hết hạn BH** → card vẫn hiện (để thấy lý do), form khóa, banner đỏ + nút "Vẫn tạo phiếu (ngoài BH, tính phí)".

**Giai đoạn B — Nhập lỗi** (chỉ hiện khi còn hạn):
- Mô tả lỗi (textarea, bắt buộc).
- Upload ảnh/video (tùy chọn, tái dùng component upload SP).
- [Hủy] [Tiếp nhận →].
- Submit → tạo PENDING → in **phiếu biên nhận** (nút in hiện ngay sau tạo).

### WarrantyDetailPage (`/warranty/:id`)

**Khung sườn chung:**
```
#WR-0042  RTX 4070 Super — SN: ABC123XYZ
●───●───●───○                          ← WarrantyTimeline (4 mốc)
Tiếp nhận  Đã nhận  Đang đánh giá  Hoàn tất
21/07      21/07    —               —
[Thông tin khách/SP — thu gọn được]
[Panel động theo state]
```

- Timeline **luôn hiện đủ 4 mốc**, mốc chưa tới mờ (○), đã qua đặc + timestamp + người thực hiện.

**Panel động theo state:**

| State | Ai thao tác | Component |
|-------|------------|-----------|
| `PENDING` | STOCK | Nút "Xác nhận đã nhận hàng" |
| `RECEIVED` | STOCK | Form CONFIRMED / REJECTED (radio) + check_note (textarea, bắt buộc nếu REJECTED). CONFIRMED → UNDER_EVALUATION. REJECTED → RESOLVED (auto) |
| `UNDER_EVALUATION` | QL | 4 **ResolutionCard**: 🔧 REPAIR | 🔄 REPLACE | 💰 REFUND | ✕ REJECT. Mỗi card có mô tả hậu quả + cảnh báo ngữ cảnh (số tồn REPLACE, >2 lần đổi). Chọn → confirm dialog → submit |
| `RESOLVED` | STOCK | Panel theo resolution: **REPAIR**: nút "Sửa xong" / "Đã gửi NCC". **REPLACE**: chọn serial thay thế (gợi ý FIFO). **REFUND**: nhập số tiền hoàn. **REJECT**: in biên bản từ chối |

**Phân quyền action (06-ux-design §2.6):**
- SALES: read-only mọi state, chỉ được in.
- STOCK: xác nhận nhận (PENDING), check (RECEIVED), execute (RESOLVED).
- QL: evaluate (UNDER_EVALUATION).
- ADMIN (duyệt thay): thấy dòng nhắc "Đang duyệt thay QL".

### Components tái sử dụng

| Component | Dùng ở đâu |
|-----------|-----------|
| `WarrantyStatusBadge` | List, Detail header — 4 màu cố định theo state |
| `WarrantyTimeline` | Detail (đầu trang) — vertical, 4 mốc |
| `SerialLookupWidget` | Create (bước 1), Replace (thực thi) |
| `ResolutionCard` | Detail (UNDER_EVALUATION) — 4 card, prop `disabled`/`warningText` |
| `WarrantySealBadge` | Create, Detail — 3 trạng thái, ẩn nếu shop tắt tem |

---

## Flow 12: Product Units

**Page:** `/stock/units` → `StockUnitsPage`

**Service:** `product-unit-service.ts`
- GET `/product-unit` — all (paged)
- GET `/product-unit/{id}` — detail
- GET `/product-unit/status/{status}` — filter by status
- GET `/product-unit/product/{productId}` — filter by product

**StockUnitsPage** có 3 tabs: `[Units] [Inventory] [Locations Map]`.
- **Units tab**: danh sách ProductUnit (paged, filter theo status).
- **Inventory tab**: tồn kho gộp theo sản phẩm.
- **Locations Map tab**: `LocationsMapPage` (xem Flow 13).

**Cùng route `/inventory` redirect về đây.**

---

## Flow 13: Locations

**Page:** `/locations` → redirect `/stock/units`

**Service:** `location-service.ts`
- GET `/location` — list
- GET `/location/search` — search
- GET `/location/{id}` — detail
- GET `/location/map` — zone → shelf → bin map
- POST `/location` — create (MANAGER)
- PUT `/location/{id}` — update (MANAGER)
- PUT `/location/{id}/toggle-active` — toggle (MANAGER)

**`LocationsMapPage`** (tab 3 của `/stock/units`):
- Hiển thị map phân cấp zone → shelf → bin.
- **Lối đi**: giữa các zone card render khoảng trống nền xám + label "LỐI ĐI". Cửa vào/ra đánh dấu icon.
- **Zoom shelf**: click shelf header → view phóng to chỉ show shelf đó + tất cả bins. Nút "← Về tổng quan" để quay lại.
- **Bin detail**: khi nhấp vào 1 bin → popup hiển thị:
  - `Sản phẩm 15/50 đơn vị` + progress bar % capacity.
  - Trạng thái: Đang hoạt động.
- **Bin color theo % capacity**:
  - 0% → Trống (blue-50)
  - 1–49% → Ít (blue-100)
  - 50–89% → Có hàng (blue-200)
  - ≥90% → Đầy (blue-300)
  - Fallback khi `max_capacity = null`: threshold cũ (0, 10, 50).
- **Filter theo capacity**: Còn trống | Còn chỗ | Gần đầy | Đầy.
- **Kéo thả relocate (edit mode)**: bật "Quản lý vị trí" → kéo bin tile thả vào bin khác **cùng zone** → confirm dialog → API relocate. Tắt → view-only.
- **LocationPicker** (dùng trong import form): hiển thị `fullCode + productCount/maxCapacity`. Shelf/bin optional — nếu zone chỉ có location cấp zone, cho phép chọn dừng ở zone. Location đầy vẫn chọn được nhưng warning mềm.

---

## Flow 14: Customers

**Page:** `/customers` → `CustomersPage`

**Service:** `customer-service.ts`
- GET `/customer` — list
- GET `/customer/search` — search
- GET `/customer/{id}` — detail
- POST `/customer` — create
- PUT `/customer/{id}` — update (MANAGER)
- PUT `/customer/{id}/toggle-active` — toggle (MANAGER)

---

## Flow 15: Users (Admin)

**Page:** `/users` → `UsersPage` (chỉ ADMIN)

**Service:** `user-service.ts`
- GET `/user` — list
- GET `/user/{id}` — detail
- POST `/user` — create
- PUT `/user/{id}/info` — update info
- PUT `/user/{id}/status` — toggle active
- PUT `/user/{id}/role` — change role

---

## Flow 16: Audit Log

**Page:** `/audit` → `AuditPage` (`CAN_VIEW_REPORTS`)

**Service:** `audit-service.ts`
- GET `/audit-logs` — search (filter action, entity, userId, status, from, to, page, size)

**Filters** (cùng hàng ngang):
- Hành động: `<Select>` — Tất cả, LOGIN, CREATE, UPDATE, DELETE, APPROVE, REJECT, CANCEL, RESET_PASSWORD
- Đối tượng: `<Select>` — Tất cả, USER, IMPORT_RECEIPT, EXPORT_RECEIPT, PRODUCT_UNIT, WARRANTY_REQUEST, RETURN_RECEIPT, STOCK_CHECK, STOCK_ADJUSTMENT, PRICE_ADJUSTMENT, PURCHASE_ORDER, BRAND, CATEGORY, PRODUCT, SUPPLIER, LOCATION, CUSTOMER, SYSTEM_SETTINGS
- Trạng thái: `<Select>` — Tất cả, Thành công, Thất bại
- Người dùng: `<Select>` searchable — load từ `GET /user`, filter theo `userId`
- Từ ngày / Đến ngày: `<input type="date">`

**Table:** Thời gian | Người dùng | Hành động | Đối tượng | ID | IP | Trạng thái (badge)
**Detail:** click icon mắt → popup JSON format old/new values + error_msg nếu FAILED.

---

## Flow 17: Reports

**Route:** `/reports` → redirect `/`

**Service:** `report-service.ts`
- GET `/report/inventory-summary`
- GET `/report/inventory-by-category`
- GET `/report/low-stock`
- GET `/report/stock-value`
- GET `/report/activity`
- GET `/report/dead-stock`

(Dashboard page hiển thị summary reports.)

---

## Services Tổng hợp

| Service | BE endpoints | Ghi chú |
|---------|-------------|---------|
| `auth-service.ts` | `/auth/*` | Login, refresh, logout |
| `user-service.ts` | `/user/*` | CRUD user |
| `product-service.ts` | `/product/*` | CRUD product |
| `brand-service.ts` | `/brand/*` | CRUD brand |
| `category-service.ts` | `/category/*` | CRUD category |
| `supplier-service.ts` | `/supplier/*` | CRUD supplier |
| `product-image-service.ts` | `/product-image/*` | Image CRUD |
| `category-zone-service.ts` | `/category-zone/*` | Readonly |
| `import-service.ts` | `/import-receipt/*` | Import flow |
| `export-service.ts` | `/export-receipt/*` | Export flow |
| `return-service.ts` | `/return-receipts/*` | Return flow |
| `stock-check-service.ts` | `/stock-check/*` | Stock check flow |
| `stock-adjustment-service.ts` | `/stock-adjustment/*` | Adjustment flow |
| `price-adjustment-service.ts` | `/price-adjustment/*` | Price adj flow |
| `purchase-order-service.ts` | `/purchase-order/*` | PO flow |
| `warranty-service.ts` | `/warranty-request/*` | Warranty flow |
| `inventory-service.ts` | `/inventory` | Inventory view |
| `location-service.ts` | `/location/*` | Location CRUD |
| `customer-service.ts` | `/customer/*` | Customer CRUD |
| `product-unit-service.ts` | `/product-unit/*` | ProductUnit view |
| `dashboard-service.ts` | `/dashboard/stats` | Dashboard |
| `report-service.ts` | `/report/*` | Reports |
| `audit-service.ts` | `/audit-logs` | Audit logs |
