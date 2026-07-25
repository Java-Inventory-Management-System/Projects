# Role Capabilities — Ai làm được gì

> File này mô tả chi tiết từng role: landing page, navigation items, quyền hạn (dựa trên BE `@PreAuthorize` + FE route guards + sidebar).

---

## Tổng quan

| Role | Vai trò | Landing |
|------|---------|---------|
| `ADMIN` | System admin + approver | Dashboard |
| `MANAGER` | Quản lý kho, full operations | Dashboard |
| `STOCK` | Thủ kho | `/stock/units` |
| `SALES` | Bán hàng | `/stock/exports` |

---

## ADMIN

### Landing: Dashboard

### Navigation (sidebar)

| Mục | Path |
|-----|------|
| Dashboard | `/` |
| Products | `/products` |
| Brands | `/brands` |
| Categories | `/categories` |
| Suppliers | `/suppliers` |
| Customers | `/customers` |
| Inventory | `/stock/units` |
| Imports | `/stock/imports` |
| Exports | `/stock/exports` |
| Stock Checks | `/stock/checks` |
| Adjustments | `/stock/adjustments` |
| Warranty | `/warranty` |
| Returns | `/returns` |
| Price Adj. | `/stock/price-adjustments` |
| Users | `/users` |
| Audit | `/audit` |

### Có thể làm

| Hành động | Vì |
|-----------|----|
| Xem Dashboard, Reports, Audit | `CAN_VIEW_REPORTS` |
| Xem catalog (Products, Brands, Categories, Suppliers) | `CAN_VIEW_INVENTORY` |
| Xem tất cả stock ops (imports, exports, checks, adjustments, price adj, warranty, returns) | mix of `CAN_VIEW_INVENTORY` + `CAN_OPERATE` |
| Approve/Reject tất cả phiếu (import, export, stock check, adjustment, price adj) | `CAN_APPROVE` |
| CRUD Users + đổi role/status | `CAN_MANAGE_SYSTEM` |
| Reset password user khác | `CAN_UPDATE_USER` |
| CRUD khách hàng (Customers) | `CAN_MANAGE_SYSTEM` + `ROLE_MANAGER` |

### Không thể làm

| Hành động | Vì thiếu |
|-----------|----------|
| Tạo phiếu nhập, confirm | `CAN_OPERATE_STOCK` |
| Tạo stock check, record items, complete | `CAN_OPERATE_STOCK` |
| Tạo stock adjustment | `CAN_OPERATE_STOCK` |
| Tạo price adjustment | `CAN_OPERATE_STOCK` |
| Upload file | `CAN_OPERATE_STOCK` |
| CRUD catalog (product, brand, category, supplier) | `CAN_MANAGE_CATALOG` |
| Tạo/update/delete location | `ROLE_MANAGER` |
| ~~Update/delete customer~~ | Đã chuyển lên "Có thể làm" — ADMIN full CRUD customer |
| Resolve/complete/cancel warranty | `ROLE_MANAGER` |
| Purchase Order (view/create/cancel) | `ROLE_MANAGER` |
| Tạo export, warranty, return | `CAN_OPERATE` (FE guard matches) |

---

## MANAGER

### Landing: Dashboard

### Navigation (sidebar)

Giống ADMIN, thêm **Purchase Orders** (`/stock/purchase-orders`).

### Có thể làm **tất cả**, trừ:

| Không thể làm | Vì |
|---------------|----|
| CRUD Users, đổi role/status | `CAN_MANAGE_SYSTEM` (chỉ ADMIN) |

### Riêng MANAGER mới có

| Hành động | Guard |
|-----------|-------|
| Purchase Order (CRUD + cancel) | `ROLE_MANAGER` |
| Resolve/complete/cancel warranty request | `ROLE_MANAGER` |
| Xem warranty do mình xử lý | `ROLE_MANAGER` |
| CRUD Location (create, update, toggle) | `ROLE_MANAGER` |
| Update + toggle customer | `ROLE_MANAGER` |
| CRUD catalog (product, brand, category, supplier, product image) | `CAN_MANAGE_CATALOG` |

---

## STOCK

### Landing: `/stock/units`

### Navigation (sidebar)

| Mục | Path |
|-----|------|
| Dashboard | `/` (redirect → `/stock/units`) |
| Products | `/products` |
| Brands | `/brands` |
| Categories | `/categories` |
| Suppliers | `/suppliers` |
| Customers | `/customers` |
| Inventory | `/stock/units` |
| Imports | `/stock/imports` |
| Exports | `/stock/exports` |
| Stock Checks | `/stock/checks` |
| Adjustments | `/stock/adjustments` |
| Warranty | `/warranty` |
| Returns | `/returns` |
| Price Adj. | `/stock/price-adjustments` |

(Không thấy Users, Audit, Purchase Orders)

### Có thể làm

| Nhóm | Hành động |
|------|-----------|
| **Nhập kho** | Tạo phiếu nhập (DRAFT), Confirm (→ PENDING_APPROVAL) |
| **Xuất kho** | Tạo phiếu xuất (PENDING_APPROVAL) |
| **Kiểm kê** | Tạo stock check, record items, complete |
| **Điều chỉnh kho** | Tạo stock adjustment (PENDING) |
| **Điều chỉnh giá** | Tạo price adjustment (PENDING) |
| **Upload** | Upload file (image) |
| **Bảo hành** | Tạo warranty request (PENDING) |
| **Trả hàng** | Tạo return receipt (PENDING_APPROVAL) |
| **Khách hàng** | Xem + tạo customer |
| **Xem** | Catalog (products, brands, categories, suppliers), inventory, các danh sách phiếu |

### Không thể làm

| Hành động | Vì thiếu |
|-----------|----------|
| Approve/Reject bất kỳ phiếu nào | `CAN_APPROVE` |
| CRUD catalog (product, brand, category, supplier) | `CAN_MANAGE_CATALOG` |
| Purchase Order | `ROLE_MANAGER` |
| Location CRUD | `ROLE_MANAGER` |
| Resolve/complete/cancel warranty | `ROLE_MANAGER` |
| Update/delete customer | `ROLE_MANAGER` |
| Xem Dashboard, Reports, Audit | `CAN_VIEW_REPORTS` |
| Quản lý user | `CAN_MANAGE_SYSTEM` |

---

## SALES

### Landing: `/stock/exports`

### Navigation (sidebar)

| Mục | Path |
|-----|------|
| Customers | `/customers` |
| Inventory | `/stock/units` |
| Exports | `/stock/exports` |
| Warranty | `/warranty` |
| Returns | `/returns` |

(Không thấy Dashboard, Products, Brands, Categories, Suppliers, Imports, Checks, Adjustments, Price Adj, Users, Audit, Purchase Orders)

### Có thể làm

| Nhóm | Hành động |
|------|-----------|
| **Xuất kho** | Tạo phiếu xuất (PENDING_APPROVAL) — chỉ reason = SALE |
| **Bảo hành** | Lookup serial, tạo warranty request (PENDING) |
| **Trả hàng** | Tạo return receipt (PENDING_APPROVAL) |
| **Khách hàng** | Xem + tạo customer |
| **Xem** | Inventory (product units), danh sách phiếu xuất/bảo hành/trả hàng |

### Không thể làm

| Hành động | Vì thiếu |
|-----------|----------|
| Approve/Reject bất kỳ phiếu nào | `CAN_APPROVE` |
| Nhập kho, kiểm kê, điều chỉnh kho/giá | `CAN_OPERATE_STOCK` |
| Xem Dashboard, Reports, Audit | `CAN_VIEW_REPORTS` |
| Xem catalog (Products, Brands, Categories, Suppliers) | `CAN_VIEW_INVENTORY` |
| Purchase Order | `ROLE_MANAGER` |
| Location CRUD | `ROLE_MANAGER` |
| Resolve/complete/cancel warranty | `ROLE_MANAGER` |
| Update/delete customer | `ROLE_MANAGER` |
| CRUD catalog | `CAN_MANAGE_CATALOG` |
| Quản lý user | `CAN_MANAGE_SYSTEM` |

---

## Cross-role Flows

### Import → Approve

```
STOCK:  /stock/imports/new → create (DRAFT)
STOCK:  /stock/imports/:id → confirm (PENDING_APPROVAL)
MANAGER/ADMIN: /stock/imports/:id → approve (COMPLETED)
                                → cancel (CANCELLED)
```

### Export → Approve

```
STOCK/SALES: /stock/exports/new → create (PENDING_APPROVAL)
MANAGER/ADMIN: /stock/exports/:id → approve (COMPLETED)
                               → cancel (CANCELLED)
```

### Stock Check → Approve

```
STOCK:  /stock/checks/new → create (PENDING)
STOCK:  /stock/checks/:id → record items (IN_PROGRESS)
STOCK:  /stock/checks/:id → complete (COMPLETED)
MANAGER/ADMIN: /stock/checks/:id → approve (APPROVED)
                              → reject (REJECTED)
```

### Stock Adjustment → Approve

```
STOCK:  /stock/adjustments/new → create (PENDING)
MANAGER/ADMIN: /stock/adjustments/:id → approve (APPROVED)
                                   → reject (REJECTED)
```

### Price Adjustment → Approve

```
STOCK:  /stock/price-adjustments/new → create (PENDING)
MANAGER/ADMIN: /stock/price-adjustments/:id → approve (APPROVED)
                                         → reject (REJECTED)
```

### Warranty → Resolve → Complete

```
STOCK/SALES: /warranty/lookup?serialNumber= → lookup
STOCK/SALES: /warranty/new → create (PENDING)
MANAGER:     /warranty/:id → resolve (chọn REPLACE/RMA/REPAIR/REJECT/RETURN_SUPPLIER)
MANAGER:     /warranty/:id → complete (ghi kết quả REPAIRED/DEFECTIVE/LOST)
                          → cancel (CANCELLED)
```

### Return → Approve

```
STOCK/SALES: /returns/new → create (PENDING_APPROVAL)
MANAGER/ADMIN: /returns/:id → approve (COMPLETED)
                         → cancel (CANCELLED)
```

### Purchase Order (MANAGER only)

```
MANAGER: /stock/purchase-orders/new → create (DRAFT)
MANAGER: /stock/purchase-orders/:id → cancel (CANCELLED)
(Khi STOCK tạo import với poId → PO tự động update PARTIAL/COMPLETED)
```
