# Backend Flows — Bám sát codebase

> File này mô tả luồng BE từ controller → service → entity, gồm endpoints, PreAuthorize guard, status machine, và business rules cốt lõi.
> Viết dựa trên codebase thật, không phải requirement.

---

## Roles & Permissions

| Role | Mô tả |
|------|-------|
| `ADMIN` | Full system access. Quản lý user, audit, system. |
| `MANAGER` | Quản lý kho/phòng ban. Approve/reject phiếu, CRUD catalog, reports. |
| `STOCK` | Thao tác nghiệp vụ kho (nhập, kiểm kê, điều chỉnh giá). |
| `SALES` | Bán hàng (xuất kho, bảo hành, trả hàng, khách hàng). |

**Authorization constants** (`AuthorizationExpressions.java`):

| Constant | Roles |
|----------|-------|
| `ROLE_ADMIN` | ADMIN |
| `ROLE_MANAGER` | MANAGER |
| `CAN_VIEW_REPORTS` | MANAGER, ADMIN |
| `CAN_APPROVE` | MANAGER, ADMIN |
| `CAN_OPERATE_STOCK` | MANAGER, STOCK |
| `CAN_VIEW_INVENTORY` | MANAGER, ADMIN, STOCK |
| `CAN_OPERATE` | SALES, STOCK, MANAGER |
| `CAN_MANAGE_CATALOG` | MANAGER |
| `CAN_MANAGE_SYSTEM` | ADMIN |
| `CAN_UPDATE_USER` | `@roleSecurity.canUpdate(#id, authentication)` |

---

## Flow 1: Auth

**Controller:** `AuthController.java` — `/auth`

| Endpoint | Method | Guard | Mô tả |
|----------|--------|-------|-------|
| `/auth/login` | POST | public | Login, trả JWT + refresh token cookie |
| `/auth/refresh-token` | POST | public | Refresh JWT bằng refresh token cookie |
| `/auth/logout` | POST | public | Xoá refresh token cookie |
| `/auth/forgot-password` | POST | public | Gửi email reset password |
| `/auth/reset-password` | POST | public | Reset password bằng token từ email |
| `/auth/{id}/reset-password` | PUT | `CAN_UPDATE_USER` | Admin reset password user khác |
| `/auth/change-password` | PUT | `CAN_VIEW_INVENTORY` | User tự đổi password |

**Service:** `AuthService.java`
- `login()` → xác thực credentials → generate JWT + refresh token
- `refreshToken()` → validate refresh token → cấp JWT mới + rotate refresh token
- `logout()` → clear refresh token
- `forgotPassword()` → generate reset token → send email via `MailService`
- `resetPasswordByToken()` → validate token → set password mới
- `resetPassword(id)` → admin reset → set password random
- `changePassword()` → verify old password → set new

**Entity:** `User`, `RefreshToken`, `PasswordResetToken`

---

## Flow 2: User Management

**Controller:** `UserController.java` — `/user`

| Endpoint | Method | Guard | Mô tả |
|----------|--------|-------|-------|
| `/user` | GET | `CAN_MANAGE_SYSTEM` | List users (paged) |
| `/user/{id}` | GET | `CAN_MANAGE_SYSTEM` | Get user by ID |
| `/user` | POST | `CAN_MANAGE_SYSTEM` | Create user |
| `/user/{id}/info` | PUT | `CAN_MANAGE_SYSTEM` | Update user info |
| `/user/{id}/status` | PUT | `CAN_MANAGE_SYSTEM` | Toggle active/inactive |
| `/user/{id}/role` | PUT | `CAN_MANAGE_SYSTEM` | Change role |

**Service:** `UserService.java`
- `createUser()` → validate unique username/email → create with role
- `updateInfo()`, `updateStatus()`, `updateRole()` → find + update

---

## Flow 3: Catalog Management

### Brand — `/brand`
| Endpoint | Guard | Mô tả |
|----------|-------|-------|
| GET /brand | `CAN_VIEW_INVENTORY` | List (paged) |
| GET /brand/{id} | `CAN_VIEW_INVENTORY` | Get one |
| POST /brand | `CAN_MANAGE_CATALOG` | Create |
| PUT /brand/{id} | `CAN_MANAGE_CATALOG` | Update |
| PUT /brand/{id}/toggle-active | `CAN_MANAGE_CATALOG` | Toggle active |

### Category — `/category`
Same pattern as Brand — `CAN_VIEW_INVENTORY` read, `CAN_MANAGE_CATALOG` write.

### Product — `/product`
| Endpoint | Guard | Mô tả |
|----------|-------|-------|
| GET /product | `CAN_OPERATE` | List (paged) |
| GET /product/{id} | `CAN_OPERATE` | Get one |
| POST /product | `CAN_MANAGE_CATALOG` | Create |
| PUT /product/{id} | `CAN_MANAGE_CATALOG` | Update |
| PUT /product/{id}/toggle-active | `CAN_MANAGE_CATALOG` | Toggle active |

**Service:** `ProductService.java`
- `create()` → validate name, SKU (unique), trackingType vs unit validation:
  - `TrackingType.SERIALIZED` → unit must be PIECE/BOX/SET
  - `TrackingType.BULK` → unit must be METER/KG
- `update()` → partial update, re-validate unit+tracking

### Supplier — `/supplier`
Same pattern — `CAN_VIEW_INVENTORY` read, `CAN_MANAGE_CATALOG` write.

### Product Image — `/product-image`
| Endpoint | Guard | Mô tả |
|----------|-------|-------|
| GET /product-image/product/{productId} | `CAN_VIEW_REPORTS` | List images |
| POST /product-image | `CAN_MANAGE_CATALOG` | Add image |
| DELETE /product-image/{id} | `CAN_MANAGE_CATALOG` | Delete image |
| DELETE /product-image/product/{productId} | `CAN_MANAGE_CATALOG` | Delete all images |

### Category Zone — `/category-zone` (readonly)
| Endpoint | Guard | Mô tả |
|----------|-------|-------|
| GET /category-zone | `CAN_VIEW_INVENTORY` | All zones |
| GET /category-zone/{categoryId} | `CAN_VIEW_INVENTORY` | Zone by category |
| GET /category-zone/map | `CAN_VIEW_INVENTORY` | Zone map (categoryId → zoneCode) |

---

## Flow 4: Import Receipt

**Controller:** `ImportReceiptController.java`

| Endpoint | Method | Guard | Mô tả |
|----------|--------|-------|-------|
| `/import-receipt` | GET | `CAN_VIEW_INVENTORY` | List (paged, filter by status) |
| `/import-receipt/{id}` | GET | `CAN_VIEW_INVENTORY` | Get one |
| `/import-receipt` | POST | `CAN_OPERATE_STOCK` | Create (status = DRAFT) |
| `/import-receipt/{id}/confirm` | PUT | `CAN_OPERATE_STOCK` | Confirm (DRAFT → PENDING_APPROVAL) |
| `/import-receipt/{id}/approve` | PUT | `CAN_APPROVE` | Approve (PENDING_APPROVAL → COMPLETED) |
| `/import-receipt/{id}/cancel` | PUT | `CAN_APPROVE` | Cancel |
| `/import-receipt/{id}/units` | GET | `CAN_VIEW_INVENTORY` | List ProductUnits của receipt |

**Service:** `ImportReceiptService.java`

**Status machine:**
```
DRAFT → PENDING_APPROVAL → COMPLETED
                         ↘ CANCELLED
       DRAFT → CANCELLED
```

**Business rules:**
- `create()` → status = DRAFT, tạo `ImportReceipt` + `ImportReceiptItem` + liên kết `PurchaseOrder` (nếu có - optional). Có thể nếu `poId` được cung cấp sẽ update PO status thành `PARTIAL` hoặc `COMPLETED`
- `confirm()` → DRAFT → PENDING_APPROVAL. Chỉ người tạo mới confirm được.
- `approve()` → PENDING_APPROVAL → COMPLETED. Tạo `ProductUnit` records từ items, gán:
  - Serialized: tạo từng unit riêng với serial number
  - Bulk: tạo 1 unit với quantity
  - Status: `PENDING_QC` → `IN_STOCK` (sau approve)
  - Cost price từ import receipt item
  - Import `ProductUnitStatusLog` với source = `IMPORT_RECEIPT`
- `cancel()` → chỉ cancel được nếu chưa completed. Kiểm tra PENDING_APPROVAL hoặc DRAFT mới cho cancel.

---

## Flow 5: Export Receipt

**Controller:** `ExportReceiptController.java`

| Endpoint | Method | Guard | Mô tả |
|----------|--------|-------|-------|
| `/export-receipt` | GET | `CAN_OPERATE` | List (paged, filter by status) |
| `/export-receipt/{id}` | GET | `CAN_OPERATE` | Get one |
| `/export-receipt` | POST | `CAN_OPERATE` | Create (status = PENDING_APPROVAL) |
| `/export-receipt/{id}/approve` | PUT | `CAN_APPROVE` | Approve (→ COMPLETED) |
| `/export-receipt/{id}/cancel` | PUT | `CAN_APPROVE` | Cancel |

**Service:** `ExportReceiptService.java`

**Status machine:**
```
PENDING_APPROVAL → COMPLETED
                ↘ CANCELLED
```

**Business rules:**
- `create()` → status = PENDING_APPROVAL, `ExportReason` bắt buộc (SALE, INTERNAL, RETURN_SUPPLIER, DISPOSE)
  - Kiểm tra đủ stock cho từng item (so với `ProductUnit.remainingQuantity`)
  - Dành cho serialized: bắt buộc chọn unitIds
- `approve()` → PENDING_APPROVAL → COMPLETED
  - Update `ProductUnit.status` → SOLD (hoặc REMOVED tuỳ reason)
  - Trừ `remainingQuantity`
  - Log `ProductUnitStatusLog` với source = `EXPORT_RECEIPT`
  - Kiểm tra `TrackingType.SERIALIZED` bắt buộc serial
  - Nếu reason = SALE, customer bắt buộc
- `cancel()` → chỉ cancel PENDING_APPROVAL

---

## Flow 6: Return Receipt

**Controller:** `ReturnReceiptController.java` — `/return-receipts`

| Endpoint | Method | Guard | Mô tả |
|----------|--------|-------|-------|
| `/return-receipts` | GET | `CAN_OPERATE` | List (paged) |
| `/return-receipts/{id}` | GET | `CAN_OPERATE` | Get one |
| `/return-receipts` | POST | `CAN_OPERATE` | Create (status = PENDING_APPROVAL) |
| `/return-receipts/{id}/approve` | PUT | `CAN_APPROVE` | Approve (→ COMPLETED) |
| `/return-receipts/{id}/cancel` | PUT | `CAN_APPROVE` | Cancel |

**Service:** `ReturnReceiptService.java`

**Status machine:**
```
PENDING_APPROVAL → COMPLETED
                ↘ CANCELLED
```

**Business rules:**
- `create()` → yêu cầu export receipt gốc, customer, danh sách items cần return
- `approve()` → PENDING_APPROVAL → COMPLETED
  - Tạo `ProductUnit` mới (hoặc cập nhật unit cũ) với status = `RETURNED`
  - Log `ProductUnitStatusLog` với source = `RETURN_RECEIPT`
- `cancel()` → chỉ cancel PENDING_APPROVAL. Không cho cancel nếu đã COMPLETED.

---

## Flow 7: Stock Check (Kiểm kê)

**Controller:** `StockCheckController.java`

| Endpoint | Method | Guard | Mô tả |
|----------|--------|-------|-------|
| `/stock-check/my` | GET | `CAN_VIEW_INVENTORY` | Checks của user hiện tại |
| `/stock-check` | GET | `CAN_VIEW_REPORTS` | All checks (paged) |
| `/stock-check/{id}` | GET | `CAN_VIEW_INVENTORY` | Get one |
| `/stock-check` | POST | `CAN_OPERATE_STOCK` | Create (status = PENDING) |
| `/stock-check/{id}/items` | PUT | `CAN_OPERATE_STOCK` | Ghi nhận items đã kiểm |
| `/stock-check/{id}/complete` | PUT | `CAN_OPERATE_STOCK` | Complete (→ COMPLETED) |
| `/stock-check/{id}/approve` | PUT | `CAN_APPROVE` | Approve (→ APPROVED) |
| `/stock-check/{id}/reject` | PUT | `CAN_APPROVE` | Reject (→ REJECTED) |

**Service:** `StockCheckService.java`

**Status machine:**
```
PENDING → IN_PROGRESS → COMPLETED → APPROVED
                                    ↘ REJECTED
         PENDING → CANCELLED (EXPIRED)
```

**Business rules:**
- `create()` → status = PENDING, chỉ định danh sách products/locations cần kiểm
- `recordItems()` → trạng thái chuyển PENDING → IN_PROGRESS (lần đầu). Ghi nhận `countedQuantity`, `actualStatus` cho từng item. Tính `DifferenceType`: MATCH, MISSING, UNEXPECTED, PARTIAL_SHORTAGE
- `complete()` → IN_PROGRESS → COMPLETED
- `approve()` → COMPLETED → APPROVED. ADMIN/MANAGER ghi nhận chênh lệch, tạo `StockAdjustment` khi có chênh lệch
- `reject()` → COMPLETED → REJECTED. Yêu cầu ghi lý do

---

## Flow 8: Stock Adjustment (Điều chỉnh kho)

**Controller:** `StockAdjustmentController.java` — `/stock-adjustment`

| Endpoint | Method | Guard | Mô tả |
|----------|--------|-------|-------|
| `/stock-adjustment/my` | GET | `CAN_VIEW_INVENTORY` | Adjustments của tôi |
| `/stock-adjustment` | GET | `CAN_VIEW_REPORTS` | All (paged, filter type+status) |
| `/stock-adjustment/{id}` | GET | `CAN_VIEW_INVENTORY` | Get one |
| `/stock-adjustment` | POST | `CAN_OPERATE_STOCK` | Create (status = PENDING) |
| `/stock-adjustment/{id}/approve` | PUT | `CAN_APPROVE` | Approve (→ APPROVED) |
| `/stock-adjustment/{id}/reject` | PUT | `CAN_APPROVE` | Reject (→ REJECTED) |

**Service:** `StockAdjustmentService.java`

**Status machine:**
```
PENDING → APPROVED
       ↘ REJECTED
```

**Adjustment types:** `AdjustmentType` = DAMAGED, LOST, FOUND

**Business rules:**
- `create()` → validate type (DAMAGED/LOST/FOUND), reason bắt buộc
  - DAMAGED/LOST: bắt buộc `productUnitId`
  - FOUND: nếu không có `productUnitId` thì cần `productId`
- `approve()` → PENDING → APPROVED
  - **4-eyes principle:** người tạo không được approve phiếu của mình
  - DAMAGED: `ProductUnit.status` → DAMAGED_IN_STORAGE, trừ `remainingQuantity`
  - LOST: `ProductUnit.status` → LOST, trừ `remainingQuantity`
  - FOUND: tạo `ProductUnit` mới với status = IN_STOCK
  - Log `ProductUnitStatusLog` với source = `STOCK_ADJUSTMENT`
- `reject()` → PENDING → REJECTED

---

## Flow 9: Price Adjustment

**Controller:** `PriceAdjustmentController.java` — `/price-adjustment`

| Endpoint | Method | Guard | Mô tả |
|----------|--------|-------|-------|
| `/price-adjustment/my` | GET | `CAN_OPERATE_STOCK` | Adjustments của tôi |
| `/price-adjustment` | GET | `CAN_VIEW_INVENTORY` | All (paged, filter status) |
| `/price-adjustment/{id}` | GET | `CAN_VIEW_INVENTORY` | Get one |
| `/price-adjustment` | POST | `CAN_OPERATE_STOCK` | Create (status = PENDING) |
| `/price-adjustment/{id}/approve` | PUT | `CAN_APPROVE` | Approve (→ APPROVED) |
| `/price-adjustment/{id}/reject` | PUT | `CAN_APPROVE` | Reject (→ REJECTED) |

**Service:** `PriceAdjustmentService.java`

**Status machine:**
```
PENDING → APPROVED
       ↘ REJECTED
```

**Business rules:**
- `create()` → chọn product, nhập giá mới + lý do. Validate giá mới != giá hiện tại
- `approve()` → PENDING → APPROVED. Update `Product.sellPrice`
- `reject()` → PENDING → REJECTED

---

## Flow 10: Purchase Order (Đơn đặt hàng)

**Controller:** `PurchaseOrderController.java` — `/purchase-order`

| Endpoint | Method | Guard | Mô tả |
|----------|--------|-------|-------|
| `/purchase-order` | GET | `ROLE_MANAGER` | List (paged, filter status) |
| `/purchase-order/{id}` | GET | `ROLE_MANAGER` | Get one |
| `/purchase-order` | POST | `ROLE_MANAGER` | Create (status = DRAFT) |
| `/purchase-order/{id}/cancel` | PUT | `ROLE_MANAGER` | Cancel |

**Service:** `PurchaseOrderService.java`

**Status machine:**
```
DRAFT ↔ (partial khi có import receipt)
      ↘ CANCELLED
```

**Business rules:**
- `create()` → supplier + items bắt buộc. Status = DRAFT. Tính `totalAmount`
- `cancel()` → chỉ cancel DRAFT/Không có import receipt COMPLETED
- PO được update tự động khi ImportReceipt được tạo có `poId`: DRAFT → PARTIAL hoặc COMPLETED

---

## Flow 11: Warranty Request (Bảo hành)

**Controller:** `WarrantyRequestController.java` — `/warranty-request`

| Endpoint | Method | Guard | Mô tả |
|----------|--------|-------|-------|
| `/warranty-request/lookup` | GET | `CAN_OPERATE` | Tra cứu serial → thông tin BH |
| `/warranty-request` | GET | `CAN_OPERATE` | List (paged, filter status+resolution) |
| `/warranty-request/my-handled` | GET | `ROLE_MANAGER` | Requests do tôi xử lý |
| `/warranty-request/{id}` | GET | `CAN_OPERATE` | Get one |
| `/warranty-request` | POST | `CAN_OPERATE` | Create (status = PENDING) |
| `/warranty-request/{id}/resolve` | PUT | `ROLE_MANAGER` | Resolve (chọn hướng xử lý) |
| `/warranty-request/{id}/complete` | PUT | `ROLE_MANAGER` | Complete (ghi kết quả) |
| `/warranty-request/{id}/cancel` | PUT | `ROLE_MANAGER` | Cancel |

**Service:** `WarrantyRequestService.java`

**Status machine:**
```
PENDING → COMPLETED
       ↘ CANCELLED
```

**Resolution types:** `WarrantyResolutionType` = REPLACE, RMA, REPAIR, REJECT, RETURN_SUPPLIER

**Completion results:** `WarrantyCompletionResult` = REPAIRED, DEFECTIVE, LOST

**Business rules:**
- `lookup()` → tra serial → trả về product info, customer, export receipt, warranty hạn
- `create()` → serial bắt buộc, lookup export receipt để gán thông tin
- `resolve()` → PENDING, MANAGER chọn hướng xử lý:
  - REPLACE: chọn unit thay thế (cùng product, IN_STOCK). Unit cũ → DEFECTIVE. Unit thay thế → SOLD. Tạo system export receipt.
  - RMA (Return to Manufacturer): unit → SENT_TO_MANUFACTURER
  - REPAIR: unit → UNDER_REPAIR
  - REJECT: từ chối bảo hành, unit → DEFECTIVE
  - RETURN_SUPPLIER: unit → RETURNED_TO_SUPPLIER
- `complete()` → resolve đã chọn → ghi kết quả thực tế (REPAIRED/DEFECTIVE/LOST)
- `cancel()` → chỉ cancel PENDING

---

## Flow 12: Inventory View

**Controller:** `InventoryController.java` — `/inventory`

| Endpoint | Method | Guard | Mô tả |
|----------|--------|-------|-------|
| `/inventory` | GET | `CAN_OPERATE` | List tồn kho (paged, search) |

**Service:** `InventoryService.java`
- Join `Product` + `ProductUnit` để tính tồn kho theo product
- Hiển thị tổng quantity in stock, location, tracking type

---

## Flow 13: Location Management

**Controller:** `LocationController.java` — `/location`

| Endpoint | Guard | Mô tả |
|----------|-------|-------|
| GET /location | `CAN_OPERATE` | List |
| GET /location/search | `CAN_OPERATE` | Search by keyword |
| GET /location/{id} | `CAN_OPERATE` | Get one |
| GET /location/map | `CAN_VIEW_INVENTORY` | Map phân cấp zone → shelf → bin |
| POST /location | `ROLE_MANAGER` | Create |
| PUT /location/{id} | `ROLE_MANAGER` | Update |
| PUT /location/{id}/toggle-active | `ROLE_MANAGER` | Toggle |

**Location format:** `ZONE-SHELF-BIN` (e.g., `A-01-001`)

---

## Flow 14: Customer Management

**Controller:** `CustomerController.java` — `/customer`

| Endpoint | Guard | Mô tả |
|----------|-------|-------|
| GET /customer | `CAN_OPERATE` | List |
| GET /customer/search | `CAN_OPERATE` | Search |
| GET /customer/{id} | `CAN_OPERATE` | Get one |
| POST /customer | `CAN_OPERATE` | Create |
| PUT /customer/{id} | `ROLE_MANAGER` | Update |
| PUT /customer/{id}/toggle-active | `ROLE_MANAGER` | Toggle |

---

## Flow 15: Dashboard

**Controller:** `DashboardController.java` — `/dashboard`

| Endpoint | Guard | Mô tả |
|----------|-------|-------|
| GET /dashboard/stats | `CAN_VIEW_REPORTS` | Dashboard stats |

---

## Flow 16: Reports

**Controller:** `ReportController.java` — `/report`

| Endpoint | Guard | Mô tả |
|----------|-------|-------|
| GET /report/inventory-summary | `CAN_VIEW_REPORTS` | Tổng quan tồn kho |
| GET /report/inventory-by-category | `CAN_VIEW_REPORTS` | Tồn kho theo danh mục |
| GET /report/low-stock | `CAN_VIEW_INVENTORY` | Sản phẩm sắp hết |
| GET /report/stock-value | `CAN_VIEW_REPORTS` | Giá trị tồn kho |
| GET /report/activity | `CAN_VIEW_REPORTS` | Hoạt động (from → to) |
| GET /report/dead-stock | `CAN_VIEW_REPORTS` | Hàng tồn lâu |

---

## Flow 17: Audit Log

**Controller:** `AuditLogController.java` — `/audit-logs`

| Endpoint | Guard | Mô tả |
|----------|-------|-------|
| GET /audit-logs | `CAN_VIEW_REPORTS` | Search (filter action, entity, userId, status, date range) |

---

## Flow 18: File Upload

**Controller:** `FileUploadController.java` — `/upload`

| Endpoint | Guard | Mô tả |
|----------|-------|-------|
| POST /upload | `CAN_OPERATE_STOCK` | Upload file → Cloudinary, trả về URL |

---

## ProductUnit Status Machine (xuyên suốt các flow)

```
PENDING_QC (sau import → confirm → chờ QC)
    ↓
IN_STOCK (sau approve import)
    ↓
RESERVED → SOLD
    ↓
DEFECTIVE (warranty reject, return defective)
DAMAGED_IN_STORAGE (stock adjustment)
LOST (stock adjustment)
UNDER_REPAIR (warranty repair)
SENT_TO_MANUFACTURER (warranty RMA)
RETURNED (return receipt)
RETURNED_TO_SUPPLIER (warranty)
REMOVED (export dispose)
DISPOSED
```

Mỗi lần chuyển trạng thái đều ghi `ProductUnitStatusLog` với `sourceType` (IMPORT_RECEIPT, EXPORT_RECEIPT, STOCK_ADJUSTMENT, STOCK_CHECK, WARRANTY_REQUEST, RELOCATE, RETURN_RECEIPT) + `sourceId`.

