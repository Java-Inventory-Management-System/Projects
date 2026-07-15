# API Documentation — Backend

> **Base URL**: `http://localhost:8888`
>
> **Response wrapper** (`ResponseObject<T>`):
> ```json
> { "code": 200, "message": "Success", "data": <T> }
> ```
> - `code`: HTTP status code
> - `message`: Status description
> - `data`: Payload (`null` on error)
>
> **Error format** (`ExceptionMessage`):
> ```json
> { "timestamp": "14-07-2026 10:30:00", "status": 400, "message": "Error description" }
> ```
>
> **Pagination wrapper** (`ResponsePage<T>`):
> ```json
> {
>   "content": [<T>],
>   "pagination": { "pageNumber": 0, "pageSize": 20, "totalElements": 100, "totalPages": 5 }
> }
> ```
> - Query params: `page` (0-indexed), `size` (default 20), `sort` (e.g. `sort=name,asc`)

---

## Authentication

### Auth Flow

1. **POST `/api/v1/auth/login`** → returns `accessToken` + sets `refreshToken` as HttpOnly cookie
2. Attach `Authorization: Bearer <accessToken>` to all subsequent requests
3. When `accessToken` expires, call **POST `/api/v1/auth/refresh-token`** (cookie sent automatically) → get new `accessToken`
4. **POST `/api/v1/auth/logout`** → clears refresh token cookie

### JWT Token (decoded claims)

```json
{
  "sub": "username",
  "id": 1,
  "username": "john",
  "email": "john@example.com",
  "role": "ADMIN",
  "iat": 1700000000,
  "exp": 1700086400
}
```

### Roles

| Role | Level | Description |
|------|-------|-------------|
| `ADMIN` | 1 | Full access |
| `MANAGER` | 2 | Management access |
| `SALES` | 3 | Sales operations |
| `STOCK` | 3 | Inventory operations |

---

## Auth Endpoints

### POST `/api/v1/auth/login`

Login with credentials.

**Request body:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `username` | string | ✅ | |
| `password` | string | ✅ | |

**Response** `200`: `JwtResponse`
| Field | Type | Notes |
|-------|------|-------|
| `accessToken` | string | JWT access token |
| `refreshToken` | string | Refresh token (also set as HttpOnly cookie) |
| `userId` | number | |
| `username` | string | |
| `isPasswordReset` | boolean | If `true`, user should change password |

**Auth**: Public

---

### POST `/api/v1/auth/refresh-token`

Refresh access token using refresh token cookie.

**Cookie**: `refreshToken` (HttpOnly, auto-sent)

**Response** `200`: `TokenRefreshResponse`
| Field | Type | Notes |
|-------|------|-------|
| `accessToken` | string | New JWT access token |

**Auth**: Public (cookie)

---

### POST `/api/v1/auth/forgot-password`

Send password reset email.

**Request body:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `email` | string | ✅ | Registered email |

**Response** `200`: `string` — Success message

**Auth**: Public

---

### POST `/api/v1/auth/reset-password`

Reset password using token received via email.

**Request body:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `token` | string | ✅ | Token from email |
| `newPassword` | string | ✅ | |
| `confirmPassword` | string | ✅ | Must match `newPassword` |

**Response** `200`: `string` — Success message

**Auth**: Public

---

### PUT `/api/v1/auth/change-password`

Change password for the currently authenticated user.

**Request body:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `oldPassword` | string | ✅ | Current password |
| `newPassword` | string | ✅ | |
| `confirmPassword` | string | ✅ | Must match `newPassword` |

**Response** `200`: `string` — Success message

**Auth**: Authenticated

---

### PUT `/api/v1/auth/{id}/reset-password`

Admin: force-reset user's password (returns temp password).

**Response** `200`: `string` — Temporary password

**Auth**: Admin/Manager (role-based security check)

---

## User Endpoints

### GET `/api/v1/user`

List users (paginated).

**Query params**: `page`, `size`, `sort`

**Response** `200`: `ResponsePage<UserResponse>`

### GET `/api/v1/user/{id}`

Get user detail.

**Response** `200`: `UserResponse`

### POST `/api/v1/user`

Create a new user. Backend auto-generates `username` (from `fullName`) and a temporary password.

**Request body:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `fullName` | string | ✅ | Used to generate username |
| `email` | string | ✅ | |
| `roleName` | string | ✅ | One of: `ADMIN`, `MANAGER`, `SALES`, `STOCK` |
| `status` | string | ✅ | Initial status |

**Response** `201`: `CreateUserResponse` (includes auto-generated `username` and `tempPassword`)

### PUT `/api/v1/user/{id}/info`

Update user's personal info.

**Request body:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `fullName` | string | ❌ | |
| `gender` | number | ❌ | `null` = not set |
| `dob` | string | ❌ | ISO 8601 datetime, `null` = not set |
| `phoneNumber` | string | ❌ | `null` = not set |

**Response** `200`: `UserResponse`

### PUT `/api/v1/user/{id}/status`

Activate/deactivate a user.

**Request body:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `active` | boolean | ✅ | `true` = active, `false` = inactive |

**Response** `200`: `UserResponse`

### PUT `/api/v1/user/{id}/role`

Update user's role.

**Request body**: Raw string (e.g. `"MANAGER"`)

**Response** `200`: `UserResponse`

### `UserResponse` / `CreateUserResponse`

| Field | Type | Notes |
|-------|------|-------|
| `id` | number | |
| `username` | string | Auto-generated |
| `fullName` | string | |
| `email` | string | |
| `role` | string | ADMIN / MANAGER / SALES / STOCK |
| `status` | string | |
| `gender` | number | `null` if not set |
| `dob` | string | ISO 8601 datetime, `null` if not set |
| `phoneNumber` | string | `null` if not set |
| `isPasswordReset` | boolean | |
| `isDeleted` | boolean | |
| `createdAt` | string | ISO 8601 |
| `updatedAt` | string | ISO 8601 |
| `tempPassword` | string | **Only in CreateUserResponse**, initial password |

---

## Brand Endpoints (`/api/v1/brand`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/brand` | List brands (paginated) |
| GET | `/api/v1/brand/{id}` | Get brand detail |
| POST | `/api/v1/brand` | Create brand |
| PUT | `/api/v1/brand/{id}` | Update brand |
| PUT | `/api/v1/brand/{id}/toggle-active` | Toggle active status |

**Request** (create/update): `BrandRequest`
| Field | Type | Required |
|-------|------|----------|
| `name` | string | ✅ (create) |
| `description` | string | ❌ |

**Response**: `BrandResponse`
| Field | Type |
|-------|------|
| `id` | number |
| `name` | string |
| `description` | string |
| `isActive` | boolean |
| `createdAt` | string (ISO 8601) |
| `updatedAt` | string (ISO 8601) |

---

## Category Endpoints (`/api/v1/category`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/category` | List categories (paginated) |
| GET | `/api/v1/category/{id}` | Get category detail |
| POST | `/api/v1/category` | Create category |
| PUT | `/api/v1/category/{id}` | Update category |
| PUT | `/api/v1/category/{id}/toggle-active` | Toggle active status |

**Request** (create/update): `CategoryRequest`
| Field | Type | Required |
|-------|------|----------|
| `name` | string | ✅ (create) |
| `description` | string | ❌ |

**Response**: `CategoryResponse` (same shape as `BrandResponse`)

---

## Product Endpoints (`/api/v1/product`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/product` | List products (paginated) |
| GET | `/api/v1/product/{id}` | Get product detail |
| POST | `/api/v1/product` | Create product |
| PUT | `/api/v1/product/{id}` | Update product |
| PUT | `/api/v1/product/{id}/toggle-active` | Toggle active status |

**Request** (create/update): `ProductRequest`
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | string | ✅ | |
| `sku` | string | ❌ | Stock keeping unit code |
| `barcode` | string | ❌ | |
| `brandId` | number | ❌ | Reference to Brand |
| `categoryId` | number | ❌ | Reference to Category |
| `description` | string | ❌ | |
| `unit` | string | ❌ | e.g. "piece", "kg" |
| `trackingType` | string | ❌ | Inventory tracking method |
| `sellPrice` | number (decimal) | ❌ | |
| `minStock` | number | ❌ | Minimum stock threshold |

**Response**: `ProductResponse`
| Field | Type | Notes |
|-------|------|-------|
| `id` | number | |
| `name` | string | |
| `sku` | string | |
| `barcode` | string | |
| `brandId` | number | |
| `brandName` | string | Resolved from relation |
| `categoryId` | number | |
| `categoryName` | string | Resolved from relation |
| `description` | string | |
| `unit` | string | |
| `trackingType` | string | |
| `sellPrice` | number (decimal) | |
| `minStock` | number | |
| `isActive` | boolean | |
| `createdAt` | string (ISO 8601) | |
| `updatedAt` | string (ISO 8601) | |

---

## Supplier Endpoints (`/api/v1/supplier`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/supplier` | List suppliers (paginated) |
| GET | `/api/v1/supplier/{id}` | Get supplier detail |
| POST | `/api/v1/supplier` | Create supplier |
| PUT | `/api/v1/supplier/{id}` | Update supplier |
| PUT | `/api/v1/supplier/{id}/toggle-active` | Toggle active status |

**Request** (create/update): `SupplierRequest`
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | string | ✅ (create) | |
| `contactPerson` | string | ❌ | |
| `phone` | string | ❌ | |
| `email` | string | ❌ | |
| `address` | string | ❌ | |
| `taxCode` | string | ❌ | |
| `note` | string | ❌ | |

**Response**: `SupplierResponse`
| Field | Type |
|-------|------|
| `id` | number |
| `name` | string |
| `contactPerson` | string |
| `phone` | string |
| `email` | string |
| `address` | string |
| `taxCode` | string |
| `note` | string |
| `isActive` | boolean |
| `createdAt` | string (ISO 8601) |
| `updatedAt` | string (ISO 8601) |

---

## Product Image Endpoints (`/api/v1/product-image`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/product-image/product/{productId}` | List images for a product |
| POST | `/api/v1/product-image` | Add image to product |
| DELETE | `/api/v1/product-image/{id}` | Delete single image |
| DELETE | `/api/v1/product-image/product/{productId}` | Delete all images for a product |

**Request** (create): `ProductImageRequest`
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `productId` | number | ✅ | |
| `url` | string | ✅ | Image URL |
| `isPrimary` | boolean | ❌ | Default `false` |
| `sortOrder` | number | ❌ | Display order |

**Response**: `ProductImageResponse`
| Field | Type |
|-------|------|
| `id` | number |
| `productId` | number |
| `url` | string |
| `isPrimary` | boolean |
| `sortOrder` | number |
| `createdAt` | string (ISO 8601) |

---

## Audit Log Endpoints (`/api/v1/audit-logs`)

### GET `/api/v1/audit-logs`

Search audit logs (paginated). **Requires**: `ADMIN`, `MANAGER`, or `SALES`.

**Query params:**
| Param | Type | Required | Notes |
|-------|------|----------|-------|
| `action` | string | ❌ | Filter by action (e.g. CREATE_PRODUCT) |
| `entity` | string | ❌ | Filter by entity name (e.g. PRODUCT) |
| `userId` | number | ❌ | Filter by user |
| `status` | string | ❌ | Filter by status |
| `from` | string | ❌ | ISO 8601 datetime, start range |
| `to` | string | ❌ | ISO 8601 datetime, end range |
| `page` | number | ❌ | 0-indexed |
| `size` | number | ❌ | Default 20 |

**Response** `200`: `ResponsePage<AuditLog>`

**AuditLog fields:**
| Field | Type | Notes |
|-------|------|-------|
| `userId` | number | |
| `username` | string | |
| `ipAddress` | string | |
| `requestId` | string | UUID |
| `action` | string | e.g. CREATE_PRODUCT, UPDATE_SUPPLIER |
| `entityName` | string | e.g. PRODUCT, SUPPLIER, USER |
| `entityId` | string | |
| `oldValue` | string (JSON) | Previous state |
| `newValue` | string (JSON) | New state |
| `status` | string | SUCCESS / ERROR |
| `errorMsg` | string | Error details if failed |
| `createdAt` | string (ISO 8601) | |

---

## TypeScript Type Definitions (Reference)

```typescript
// ============ Common ============

interface ResponseObject<T> {
  code: number;
  message: string;
  data: T | null;
}

interface ResponsePage<T> {
  content: T[];
  pagination: Pagination;
}

interface Pagination {
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
}

interface ExceptionMessage {
  timestamp: string; // "dd-MM-yyyy HH:mm:ss"
  status: number;
  message: string;
}

type URole = 'ADMIN' | 'MANAGER' | 'SALES' | 'STOCK';

// ============ Auth ============

interface LoginRequest {
  username: string;
  password: string;
}

interface JwtResponse {
  accessToken: string;
  refreshToken: string;
  userId: number;
  username: string;
  isPasswordReset: boolean;
}

interface TokenRefreshResponse {
  accessToken: string;
}

interface ForgotPasswordRequest {
  email: string;
}

interface ResetPasswordTokenRequest {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// ============ User ============

interface RegisterRequest {
  fullName: string;
  email: string;
  roleName: URole;
  status: string;
}

interface UserResponse {
  id: number;
  username: string;
  fullName: string;
  email: string;
  role: URole;
  status: string;
  gender: number | null;
  dob: string | null;       // ISO 8601
  phoneNumber: string | null;
  isPasswordReset: boolean;
  isDeleted: boolean;
  createdAt: string;        // ISO 8601
  updatedAt: string;        // ISO 8601
}

interface CreateUserResponse extends UserResponse {
  tempPassword: string;
}

interface UpdateInfoRequest {
  fullName?: string;
  gender?: number | null;
  dob?: string | null;       // ISO 8601
  phoneNumber?: string | null;
}

interface ToggleActiveRequest {
  active: boolean;
}

// ============ Brand / Category ============

interface CatalogRequest {
  name: string;
  description?: string;
}

interface CatalogResponse {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;        // ISO 8601
  updatedAt: string;        // ISO 8601
}

// ============ Product ============

interface ProductRequest {
  name: string;
  sku?: string;
  barcode?: string;
  brandId?: number;
  categoryId?: number;
  description?: string;
  unit?: string;
  trackingType?: string;
  sellPrice?: number;
  minStock?: number;
}

interface ProductResponse {
  id: number;
  name: string;
  sku: string | null;
  barcode: string | null;
  brandId: number | null;
  brandName: string | null;
  categoryId: number | null;
  categoryName: string | null;
  description: string | null;
  unit: string | null;
  trackingType: string | null;
  sellPrice: number | null;
  minStock: number | null;
  isActive: boolean;
  createdAt: string;        // ISO 8601
  updatedAt: string;        // ISO 8601
}

// ============ Supplier ============

interface SupplierRequest {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  taxCode?: string;
  note?: string;
}

interface SupplierResponse {
  id: number;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  taxCode: string | null;
  note: string | null;
  isActive: boolean;
  createdAt: string;        // ISO 8601
  updatedAt: string;        // ISO 8601
}

// ============ Product Image ============

interface ProductImageRequest {
  productId: number;
  url: string;
  isPrimary?: boolean;
  sortOrder?: number;
}

interface ProductImageResponse {
  id: number;
  productId: number;
  url: string;
  isPrimary: boolean;
  sortOrder: number | null;
  createdAt: string;        // ISO 8601
}

// ============ Audit Log ============

interface AuditLog {
  userId: number | null;
  username: string | null;
  ipAddress: string | null;
  requestId: string | null;
  action: string;
  entityName: string;
  entityId: string | null;
  oldValue: string | null;
  newValue: string | null;
  status: string;
  errorMsg: string | null;
  createdAt: string;        // ISO 8601
}
```

---

## Import Receipt Endpoints (`/api/v1/import-receipt`)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/import-receipt` | List import receipts (paginated) | Authenticated |
| GET | `/api/v1/import-receipt/{id}` | Get receipt detail | Authenticated |
| POST | `/api/v1/import-receipt` | Create + confirm import | MANAGER, STOCK |
| PUT | `/api/v1/import-receipt/{id}/approve` | Approve receipt | MANAGER, ADMIN |
| PUT | `/api/v1/import-receipt/{id}/cancel` | Cancel receipt | MANAGER, ADMIN |
| GET | `/api/v1/import-receipt/{id}/units` | Get product units in receipt | Authenticated |

**Request** (create): `ImportReceiptRequest`
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `receiptCode` | string | ❌ | Auto-generated if empty |
| `supplierId` | number | ✅ | |
| `note` | string | ❌ | |
| `items` | array | ✅ | List of ImportItemRequest |

**ImportItemRequest:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `productId` | number | ✅ | |
| `quantity` | number (decimal) | ✅ | |
| `unitPrice` | number (decimal) | ✅ | |
| `warrantyMonths` | number | ❌ | |
| `serialNumbers` | array[string] | ❌ | List of serials; auto-generated if empty |
| `locationId` | number | ❌ | Location assignment |

**Response**: `ImportReceiptResponse`
| Field | Type |
|-------|------|
| `id` | number |
| `receiptCode` | string |
| `supplierId` | number |
| `supplierName` | string |
| `totalAmount` | number (decimal) |
| `status` | string | PENDING / PENDING_APPROVAL / COMPLETED / CANCELLED |
| `note` | string |
| `createdBy` | number |
| `createdByName` | string |
| `approvedBy` | number (nullable) |
| `approvedByName` | string (nullable) |
| `items` | array of ImportItemResponse |
| `createdAt` | string (ISO 8601) |
| `updatedAt` | string (ISO 8601) |

**ImportItemResponse:**
| Field | Type |
|-------|------|
| `id` | number |
| `productId` | number |
| `productName` | string |
| `productSku` | string |
| `quantity` | number (decimal) |
| `unitPrice` | number (decimal) |
| `warrantyMonths` | number |
| `createdUnits` | number |

---

## Export Receipt Endpoints (`/api/v1/export-receipt`)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/export-receipt` | List export receipts (paginated) | Authenticated |
| GET | `/api/v1/export-receipt/{id}` | Get receipt detail | Authenticated |
| POST | `/api/v1/export-receipt` | Create export | MANAGER, STOCK |
| PUT | `/api/v1/export-receipt/{id}/approve` | Approve export | MANAGER, ADMIN |
| PUT | `/api/v1/export-receipt/{id}/cancel` | Cancel export | MANAGER, ADMIN |

**Request** (create): `ExportReceiptRequest`
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `reason` | string | ✅ | SALE / INTERNAL / RETURN_SUPPLIER / DISPOSE |
| `customerId` | number | ❌ | Required if reason = SALE |
| `note` | string | ❌ | |
| `items` | array | ✅ | List of ExportItemRequest |

**ExportItemRequest:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `productId` | number | ✅ | |
| `quantity` | number (decimal) | ✅ | |
| `unitPrice` | number (decimal) | ✅ | |

**Response**: `ExportReceiptResponse`
| Field | Type |
|-------|------|
| `id` | number |
| `receiptCode` | string |
| `reason` | string | SALE / INTERNAL / RETURN_SUPPLIER / DISPOSE |
| `customerId` | number (nullable) |
| `customerName` | string (nullable) |
| `totalAmount` | number (decimal) |
| `status` | string | PENDING_APPROVAL / COMPLETED / CANCELLED |
| `note` | string |
| `createdBy` | number |
| `createdByName` | string |
| `approvedBy` | number (nullable) |
| `approvedByName` | string (nullable) |
| `items` | array of ExportItemResponse |
| `createdAt` | string (ISO 8601) |
| `updatedAt` | string (ISO 8601) |

---

## Product Unit Endpoints (`/api/v1/product-unit`)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/product-unit` | List product units (paginated) | Authenticated |
| GET | `/api/v1/product-unit/{id}` | Get unit detail | Authenticated |
| GET | `/api/v1/product-unit/status/{status}` | List units by status | Authenticated |
| GET | `/api/v1/product-unit/product/{productId}` | List units by product | Authenticated |

**ProductUnitStatus enum**: `IN_STOCK`, `SOLD`, `DEFECTIVE`, `DAMAGED_IN_STORAGE`, `LOST`, `REMOVED`, `DISPOSED`, `UNDER_REPAIR`, `SENT_TO_MANUFACTURER`, `RETURNED`, `RETURNED_TO_SUPPLIER`

**Response**: `ProductUnitResponse`
| Field | Type | Notes |
|-------|------|-------|
| `id` | number | |
| `serialNumber` | string | |
| `productId` | number | |
| `productName` | string | |
| `productSku` | string | |
| `trackingType` | string | SERIALIZED / BULK |
| `initialQuantity` | number (decimal) | |
| `remainingQuantity` | number (decimal) | |
| `importReceiptItemId` | number | |
| `locationId` | number (nullable) | |
| `locationCode` | string (nullable) | |
| `status` | string | ProductUnitStatus |
| `importedAt` | string (ISO 8601) | FIFO basis |
| `warrantyMonths` | number | |
| `warrantyStartDate` | string (nullable) | |
| `warrantyExpiresAt` | string (nullable) | |
| `createdAt` | string (ISO 8601) | |
| `updatedAt` | string (ISO 8601) | |

---

## Stock Check Endpoints (`/api/v1/stock-check`)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/stock-check` | List stock checks (paginated) | MANAGER, ADMIN |
| GET | `/api/v1/stock-check/{id}` | Get detail | MANAGER, ADMIN, STOCK |
| POST | `/api/v1/stock-check` | Create (select units to check) | MANAGER, STOCK |
| PUT | `/api/v1/stock-check/{id}/items` | Record actual status for items | MANAGER, STOCK |
| PUT | `/api/v1/stock-check/{id}/complete` | Mark check as completed | MANAGER, STOCK |
| PUT | `/api/v1/stock-check/{id}/approve` | Approve (applies differences) | MANAGER, ADMIN |
| PUT | `/api/v1/stock-check/{id}/reject` | Reject | MANAGER, ADMIN |

**StockCheckStatus**: `PENDING` → `IN_PROGRESS` → `COMPLETED` → `APPROVED` / `REJECTED`

**Request** (create): `CreateStockCheckRequest`
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `note` | string | ❌ | |
| `productUnitIds` | array[number] | ✅ | List of unit IDs to check |

**Request** (record items): `StockCheckItemRequest.BatchRequest`
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `items` | array | ✅ | List of StockCheckItemRequest |

**StockCheckItemRequest:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `productUnitId` | number | ✅ | |
| `actualStatus` | string | ❌ | Defaults to `IN_STOCK` |
| `countedQuantity` | number (decimal) | ❌ | For bulk items |
| `note` | string | ❌ | |

**Request** (approve/reject): `ApproveStockCheckRequest`
| Field | Type | Required |
|-------|------|----------|
| `approvalNote` | string | ❌ |

**Response**: `StockCheckResponse`
| Field | Type | Notes |
|-------|------|-------|
| `id` | number | |
| `checkCode` | string | Auto-generated SC-yyyyMMdd-xxxx |
| `status` | string | StockCheckStatus |
| `note` | string | |
| `createdBy` | number | |
| `createdByName` | string | |
| `approvedBy` | number (nullable) | |
| `approvedByName` | string (nullable) | |
| `approvalNote` | string (nullable) | |
| `items` | array of StockCheckItemResponse | |
| `totalItems` | number | |
| `matchCount` | number | |
| `missingCount` | number | |
| `unexpectedCount` | number | |
| `createdAt` | string (ISO 8601) | |
| `updatedAt` | string (ISO 8601) | |

**DifferenceType**: `MATCH`, `MISSING`, `UNEXPECTED`, `PARTIAL_SHORTAGE`

**Note**: When approved, MISSING items → status `LOST`, UNEXPECTED items → status updated accordingly.

---

## Customer Endpoints (`/api/v1/customer`)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/customer` | List customers (paginated) | Authenticated |
| GET | `/api/v1/customer/search` | Search by keyword | Authenticated |
| GET | `/api/v1/customer/{id}` | Get detail | Authenticated |
| POST | `/api/v1/customer` | Create | Authenticated |
| PUT | `/api/v1/customer/{id}` | Update | Authenticated |
| PUT | `/api/v1/customer/{id}/toggle-active` | Toggle active | Authenticated |

**Request** (create/update): `CustomerRequest`
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | string | ✅ | |
| `phone` | string | ❌ | |
| `email` | string | ❌ | |
| `address` | string | ❌ | |
| `note` | string | ❌ | |

**Response**: `CustomerResponse`
| Field | Type |
|-------|------|
| `id` | number |
| `name` | string |
| `phone` | string (nullable) |
| `email` | string (nullable) |
| `address` | string (nullable) |
| `note` | string (nullable) |
| `isActive` | boolean |
| `createdAt` | string (ISO 8601) |
| `updatedAt` | string (ISO 8601) |

---

## Location Endpoints (`/api/v1/location`)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/location` | List locations (paginated) | Authenticated |
| GET | `/api/v1/location/search` | Search by keyword | Authenticated |
| GET | `/api/v1/location/{id}` | Get detail | Authenticated |
| POST | `/api/v1/location` | Create | MANAGER |
| PUT | `/api/v1/location/{id}` | Update | MANAGER |
| PUT | `/api/v1/location/{id}/toggle-active` | Toggle active | MANAGER |

**Request** (create/update): `LocationRequest`
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `zoneCode` | string | ✅ | e.g. A |
| `shelfCode` | string | ✅ | e.g. 01 |
| `binCode` | string | ✅ | e.g. 01A |
| `description` | string | ❌ | |

**Full code** is auto-generated as `{zoneCode}-{shelfCode}-{binCode}`.

**Response**: `LocationResponse`
| Field | Type |
|-------|------|
| `id` | number |
| `zoneCode` | string |
| `shelfCode` | string |
| `binCode` | string |
| `fullCode` | string (auto-generated) |
| `description` | string (nullable) |
| `isActive` | boolean |
| `createdAt` | string (ISO 8601) |
| `updatedAt` | string (ISO 8601) |

---

## TypeScript Type Definitions (Reference) — Bổ sung

```typescript
// ============ Import Receipt ============

interface ImportReceiptRequest {
  receiptCode?: string;
  supplierId: number;
  note?: string;
  items: ImportItemRequest[];
}

interface ImportItemRequest {
  productId: number;
  quantity: number;
  unitPrice: number;
  warrantyMonths?: number;
  serialNumbers?: string[];
  locationId?: number;
}

interface ImportReceiptResponse {
  id: number;
  receiptCode: string;
  supplierId: number;
  supplierName: string;
  totalAmount: number;
  status: 'PENDING' | 'PENDING_APPROVAL' | 'COMPLETED' | 'CANCELLED';
  note: string | null;
  createdBy: number;
  createdByName: string;
  approvedBy: number | null;
  approvedByName: string | null;
  items: ImportItemResponse[];
  createdAt: string;
  updatedAt: string;
}

interface ImportItemResponse {
  id: number;
  productId: number;
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: number;
  warrantyMonths: number;
  createdUnits: number;
}

// ============ Export Receipt ============

interface ExportReceiptRequest {
  reason: 'SALE' | 'INTERNAL' | 'RETURN_SUPPLIER' | 'DISPOSE';
  customerId?: number;
  note?: string;
  items: ExportItemRequest[];
}

interface ExportItemRequest {
  productId: number;
  quantity: number;
  unitPrice: number;
}

interface ExportReceiptResponse {
  id: number;
  receiptCode: string;
  reason: string;
  customerId: number | null;
  customerName: string | null;
  totalAmount: number;
  status: 'PENDING_APPROVAL' | 'COMPLETED' | 'CANCELLED';
  note: string | null;
  createdBy: number;
  createdByName: string;
  approvedBy: number | null;
  approvedByName: string | null;
  items: ExportItemResponse[];
  createdAt: string;
  updatedAt: string;
}

interface ExportItemResponse {
  id: number;
  productId: number;
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: number;
}

// ============ Product Unit ============

type ProductUnitStatus =
  | 'IN_STOCK' | 'SOLD' | 'DEFECTIVE' | 'DAMAGED_IN_STORAGE'
  | 'LOST' | 'REMOVED' | 'DISPOSED' | 'UNDER_REPAIR'
  | 'SENT_TO_MANUFACTURER' | 'RETURNED' | 'RETURNED_TO_SUPPLIER';

interface ProductUnitResponse {
  id: number;
  serialNumber: string;
  productId: number;
  productName: string;
  productSku: string;
  trackingType: 'SERIALIZED' | 'BULK';
  initialQuantity: number;
  remainingQuantity: number;
  importReceiptItemId: number;
  locationId: number | null;
  locationCode: string | null;
  status: ProductUnitStatus;
  importedAt: string;
  warrantyMonths: number;
  warrantyStartDate: string | null;
  warrantyExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============ Stock Check ============

type StockCheckStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'APPROVED' | 'REJECTED';
type DifferenceType = 'MATCH' | 'MISSING' | 'UNEXPECTED' | 'PARTIAL_SHORTAGE';

interface CreateStockCheckRequest {
  note?: string;
  productUnitIds: number[];
}

interface StockCheckItemRequest {
  productUnitId: number;
  actualStatus?: ProductUnitStatus;
  countedQuantity?: number;
  note?: string;
}

interface ApproveStockCheckRequest {
  approvalNote?: string;
}

interface StockCheckResponse {
  id: number;
  checkCode: string;
  status: StockCheckStatus;
  note: string | null;
  createdBy: number;
  createdByName: string;
  approvedBy: number | null;
  approvedByName: string | null;
  approvalNote: string | null;
  items: StockCheckItemResponse[];
  totalItems: number;
  matchCount: number;
  missingCount: number;
  unexpectedCount: number;
  createdAt: string;
  updatedAt: string;
}

interface StockCheckItemResponse {
  id: number;
  productUnitId: number;
  serialNumber: string;
  productId: number;
  productName: string;
  productSku: string;
  expectedStatus: string;
  actualStatus: string;
  countedQuantity: number;
  difference: DifferenceType;
  note: string;
}

// ============ Customer ============

interface CustomerRequest {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  note?: string;
}

interface CustomerResponse {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  note: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============ Location ============

interface LocationRequest {
  zoneCode: string;
  shelfCode: string;
  binCode: string;
  description?: string;
}

interface LocationResponse {
  id: number;
  zoneCode: string;
  shelfCode: string;
  binCode: string;
  fullCode: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

---

> **Note**: All `...Request` types for update endpoints are **partial** — fields are only patched if provided. For create, required fields are marked in the request table above.
