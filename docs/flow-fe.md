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

**ImportCreatePage:** wizard gồm:
1. `import-create-step-products` — chọn sản phẩm, nhập quantity + price
2. `import-create-step-serials` — nhập serial numbers (cho serialized products)
3. `import-create-step-qc` — QC info
4. `import-create-sidebar` — sidebar hiển thị tổng quan

**ImportDetailPage:**
- View thông tin receipt + danh sách items
- Nếu status = DRAFT: nút Confirm
- Nếu status = PENDING_APPROVAL + user có `CAN_APPROVE`: nút Approve / Cancel
- Modal `serial-modal` — xem serial numbers
- `view-product-unit-modal` — xem chi tiết unit

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
- Chọn customer (nếu reason = SALE) → `customer-select-modal`
- Chọn sản phẩm + số lượng
- Chọn serial numbers (cho serialized)
- `location-picker` — chọn vị trí xuất

**ExportDetailPage:**
- Nếu PENDING_APPROVAL: nút Approve / Cancel
- `view-export-modal` — xem chi tiết

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
- `stock-check-items-table` — table ghi nhận kết quả kiểm
- `approval-dialog` — dialog approve/reject

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
- PUT `/warranty-request/{id}/resolve` — resolve
- PUT `/warranty-request/{id}/complete` — complete
- PUT `/warranty-request/{id}/cancel` — cancel

---

## Flow 12: Product Units

**Page:** `/stock/units` → `StockUnitsPage`

**Service:** `product-unit-service.ts`
- GET `/product-unit` — all (paged)
- GET `/product-unit/{id}` — detail
- GET `/product-unit/status/{status}` — filter by status
- GET `/product-unit/product/{productId}` — filter by product

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

**`locations-map-page.tsx`** — hiển thị map phân cấp zone/shelf/bin.

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
- GET `/audit-logs` — search (filter action, entity, userId, date range)

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
