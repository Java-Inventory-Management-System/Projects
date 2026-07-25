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

**Entity:** `ImportReceipt`, `ImportReceiptItem`, `ProductUnit`

**QC states:** `qc_level` trên `categories`: `FULL` (mặc định) | `SAMPLING` | `SKIP`

- `create()` → status = DRAFT. Chọn NCC (phải ACTIVE). Link PO nếu có (chỉ link PO chưa COMPLETED). Cho phép nhiều dòng cùng `product_id` (giá vốn khác nhau). Nếu giá nhập lệch >10% so với PO → cảnh báo mềm, bắt buộc note.

- `confirm()` → DRAFT → PENDING_APPROVAL. Chỉ người tạo mới confirm được. Yêu cầu **100% dòng đã qua QC** (Pass hoặc FAIL_HARDWARE đã xử lý, FAIL_ACCESSORY đã ghi nhận).

- `approve()` → PENDING_APPROVAL → COMPLETED. **4-eyes** (`created_by ≠ approved_by`). Tạo `ProductUnit` records từ items:
  - **Serialized**: tạo từng unit riêng với serial number. Status: `IN_STOCK` (Pass) / `DEFECTIVE` (FAIL_HARDWARE) / `PENDING_QC` (FAIL_ACCESSORY).
  - **Bulk**: tạo 1 unit với quantity. Status: `IN_STOCK`.
  - Copy `cost_price` từ `import_receipt_item.unit_price`. Copy `warranty_months`.
  - Nếu có link PO → cập nhật `received_quantity` atomic (`SET x = x + ?`), tính lại PO status (PARTIAL/COMPLETED).
  - Log `ProductUnitStatusLog` với source = `IMPORT_RECEIPT`.

- `cancel()` → chuyển CANCELLED. **Điều kiện**: 100% units từ phiếu đó đang `IN_STOCK` hoặc `PENDING_QC` (chưa xuất). Tất cả unit → `REMOVED` (terminal). Nếu có link PO → rollback `received_quantity`.

  | Trạng thái | Cancel được không? |
  |---|---|
  | DRAFT | ✅ (hủy luôn, chưa tạo unit) |
  | PENDING_APPROVAL | ✅ (units → REMOVED) |
  | COMPLETED | ✅ (chỉ khi 100% units chưa xuất — units → REMOVED) |

**Serial validation (cho serialized):**
- Nhập tay / scan barcode / upload Excel.
- Validate file Excel trước: **kiểm tra trùng nội bộ file trước → check DB sau**. Ngưỡng lỗi 20% (gộp cả 2 loại):
  - **>20%** → chặn toàn phiếu, yêu cầu sửa file.
  - **≤20%** → skip dòng lỗi, giữ dòng đúng, trả danh sách dòng bị bỏ qua.
- Serial case-insensitive (`SN001` == `sn001`). Normalize về uppercase khi check DB.

**QC flow:**
- Mỗi unit sau nhập serial → `PENDING_QC` (chưa tính tồn khả dụng).
- Kết quả QC:
  - **Pass** → `IN_STOCK`
  - **FAIL_HARDWARE** (chết chip, lỗi nguồn, chạy không ổn định) → `DEFECTIVE`, ghi `"DOA - phát hiện lúc nhập"`, đi nhánh trả NCC nhanh.
  - **FAIL_ACCESSORY** (thiếu phụ kiện) → **giữ `PENDING_QC`**, ghi chú thiếu gì, chờ bổ sung rồi re-QC. Không chuyển DEFECTIVE.

**Location auto-assign (sau QC Pass):**
1. Zone = mapping `category_id → zone_code` (bảng `category_zones`).
2. Trong zone, ưu tiên bin đã chứa cùng `product_id` và còn dưới capacity (cảnh báo mềm).
3. Hết chỗ → bin trống, ưu tiên bin % dùng thấp nhất.
4. Nếu zone chỉ có location cấp zone → gán thẳng vào zone.
- NV có thể **đổi location thủ công** (kèm lý do nếu khác zone ưu tiên).

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

**Entity:** `ExportReceipt`, `ExportReceiptItem`, `ExportReceiptItemUnit`, `ProductUnit`

**Export reasons:** `SALE` (bắt buộc customer) | `INTERNAL` | `RETURN_SUPPLIER` | `DISPOSE`

- `create()` → status = PENDING_APPROVAL. Hệ thống kiểm tra tồn khả dụng (`SUM remaining_quantity WHERE status=IN_STOCK`). Nếu thiếu → báo max possible, cho xuất partial. **Chặn tồn âm** (serialized + bulk đều chặn cứng).

- **FIFO auto-select serial** (Bước 2):
  - Query: `SELECT ... WHERE status='IN_STOCK' ORDER BY imported_at ASC, id ASC`.
  - **Tie-break**: nếu `imported_at` trùng millisecond → sort phụ theo `id ASC`.
  - NV có thể **override serial** + bắt buộc lý do (ghi audit).

- **Reserve (Bước 3)** — 1 transaction ngắn:
  - `SELECT ... FOR UPDATE` (PESSIMISTIC_WRITE) các unit sẽ xuất.
  - **Serialized:** `IN_STOCK → RESERVED`.
  - **Bulk:** cộng dồn `reserved_quantity` (atomic: `UPDATE ... SET reserved_quantity = reserved_quantity + :qty WHERE remaining_quantity - reserved_quantity >= :qty`). Nếu 0 rows affected → hết tồn khả dụng.
  - Commit ngay → release lock.
  - Các FIFO query sau tự động bỏ qua: serialized filter `status NOT IN ('RESERVED')`, bulk filter `(remaining_quantity - reserved_quantity) > 0`.

- `approve()` → PENDING_APPROVAL → COMPLETED. **4-eyes** (`created_by ≠ approved_by`).

  | Reason | Unit transition | Ghi chú |
  |--------|----------------|---------|
  | `SALE` | `RESERVED → SOLD` | Set `warranty_start_date = now`, `warranty_expires_at = now + warranty_months` |
  | `INTERNAL` | `RESERVED → SOLD` | Nếu từ warranty REPLACE → kế thừa `warranty_start_date` gốc (không set now) |
  | `RETURN_SUPPLIER` | `RESERVED → RETURNED_TO_SUPPLIER` (terminal). Set `supplier_status = SENT` | Có thể gợi ý `source_import_receipt_id` từ unit |
  | `DISPOSE` | `RESERVED → DISPOSED`. **Chặn nếu unit đang IN_STOCK** (phải qua DAMAGED_IN_STORAGE trước) | |

  - **Check status trước approve**: nếu unit đã chuyển sang state khác giữa lúc create→approve → chặn, báo "Unit không còn khả dụng".
  - **Bulk**: trừ `remaining_quantity` + `reserved_quantity` (atomic). Nếu `remaining_quantity <= 0` → set `IN_STOCK → SOLD` (hoặc tương ứng theo reason).
  - Log `ProductUnitStatusLog` với source = `EXPORT_RECEIPT`.

- `cancel()` → PENDING_APPROVAL → CANCELLED. Unit → `IN_STOCK` (giải phóng reserve). Chỉ cancel được PENDING_APPROVAL hoặc `exception`.

- **Cancel COMPLETED (hủy muộn)** — xem SOP §3.4.2:
  - **Điều kiện**: unit chưa qua `UNDER_REPAIR` / `SENT_TO_MANUFACTURER` / `RETURNED` / `RETURNED_TO_SUPPLIER` / `DISPOSED`.
  - Serialized: unit → `IN_STOCK`, giữ nguyên `imported_at` gốc. Nếu reason=SALE → reset `warranty_start_date`/`warranty_expires_at` về NULL.
  - Bulk: cộng lại `remaining_quantity`.

- **EXCEPTION state** (flow xuất thiếu — SOP §3.3):
  - Phát hiện thiếu → STOCK đánh dấu → hệ thống tự tạo `StockAdjustment LOST` → phiếu xuất → `exception`.
  - QL duyệt adjustment → tồn sửa về thực tế → phiếu tự động sửa số lượng → xuất phần có sẵn.

- **RETURN_SUPPLIER tracking** (SOP §3.7):
  - `supplier_status`: `SENT → CONFIRMED_RECEIVED → PROCESSING → RESOLVED`
  - `supplier_result` (set khi RESOLVED): `FULL_REFUND | PARTIAL_REFUND | REPLACEMENT | REJECTED`
  - Dashboard hiển thị phiếu chưa RESOLVED.
  - Gợi ý `source_import_receipt_id` tự động từ ProductUnit → ImportReceiptItem → ImportReceipt.

---

## Flow 6: Return Receipt

**Controller:** `ReturnReceiptController.java` — `/return-receipts`

| Endpoint | Method | Guard | Mô tả |
|----------|--------|-------|-------|
| `/return-receipts` | GET | `CAN_OPERATE` | List (paged) |
| `/return-receipts/{id}` | GET | `CAN_OPERATE` | Get one |
| `/return-receipts` | POST | `CAN_OPERATE` | Create (status = PENDING_APPROVAL) |
| `/return-receipts/{id}/approve` | PUT | `CAN_APPROVE` | Approve (→ COMPLETED, áp dụng resulting_action) |
| `/return-receipts/{id}/cancel` | PUT | `CAN_APPROVE` | Cancel |

**Service:** `ReturnReceiptService.java`

**Entity:** `ReturnReceipt`, `ReturnReceiptItem`, `ProductUnit`

**Status machine:**
```
PENDING_APPROVAL → COMPLETED (áp dụng resulting_action)
                ↘ CANCELLED (unit giữ nguyên SOLD)
```

**Business rules:**

- `create()` → yêu cầu `original_export_receipt_id` (bắt buộc). Chọn reason:

  | Reason | Mô tả | Điều kiện |
  |--------|-------|-----------|
  | `CHANGE_MIND` | Khách đổi ý, không lỗi | Trong vòng 7 ngày từ `export_receipt.approved_at` (BE validate — FE chỉ hiển thị) |
  | `DEFECTIVE` | Hàng lỗi kỹ thuật | Còn hạn BH |
  | `WRONG_ITEM` | Giao sai hàng | Không giới hạn |

  Trạng thái khởi tạo: `PENDING_APPROVAL`.

- `approve()` → PENDING_APPROVAL → COMPLETED. **4-eyes** (`created_by ≠ approved_by`). Áp dụng `condition` + `resulting_action` theo bảng:

  | Condition | resulting_action | Unit transition | Ghi chú |
  |-----------|-----------------|----------------|---------|
  | `GOOD` | `RESTOCK` | `SOLD → IN_STOCK`. Set `is_warranty_active = false` | Hàng nguyên vẹn nhập lại kho |
  | `DEFECTIVE` | `SCRAP` | `SOLD → DISPOSED` | Hàng lỗi → hủy. Cho phép bulk (không cần serialized) |
  | `DEFECTIVE` | `WARRANTY_TRANSFER` | `SOLD → DEFECTIVE`. Hệ thống tự tạo `warranty_request` mới, state khởi tạo `RECEIVED` (bỏ qua PENDING), `check_result = CONFIRMED`, copy từ condition. **Chỉ cho serialized** — bulk → reject 400 | Chuyển sang warranty flow. Unit đã ở DEFECTIVE, các resolution REPAIR → `DEFECTIVE → UNDER_REPAIR`, REPLACE → giữ DEFECTIVE, REFUND → `DEFECTIVE → RETURNED` |

  > **Xác nhận:** KHÔNG có transition `SOLD → RETURNED` trực tiếp từ return_receipts. Transition này chỉ xảy ra qua warranty flow với resolution=REFUND (SOP §7.3).

  Log `ProductUnitStatusLog` với source = `RETURN_RECEIPT`.

- `cancel()` → CANCELLED. Unit giữ nguyên `SOLD`. Chỉ cancel PENDING_APPROVAL.

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
PENDING → IN_PROGRESS → COMPLETED → APPROVED (terminal)
                                    ↘ REJECTED (terminal)
         PENDING → CANCELLED (hủy thủ công)
```

**Business rules:**
- `create()` → status = PENDING. Chọn phạm vi (1 zone / nhiều zone / toàn kho). **Chặn tạo nếu zone đang có phiếu active** (IN_PROGRESS or PENDING). Snapshot danh sách `ProductUnit` trong phạm vi.
- `recordItems()` → PENDING → IN_PROGRESS (lần đầu). Ghi nhận `countedQuantity`, `actualStatus` cho từng item. Tính `difference`:
  - `actual = expected` → `MATCH`
  - `actual = LOST/MISSING` → `MISSING`
  - `actual ≠ expected && actual ≠ LOST` → `UNEXPECTED`
  - `countedQuantity < expectedQuantity` (bulk) → `PARTIAL_SHORTAGE`
  - **Sai vị trí** (serial đúng, location khác): chỉ update `location_id`, không tính UNEXPECTED.
- `complete()` → IN_PROGRESS → COMPLETED
- `approve()` → COMPLETED → APPROVED. **4-eyes** (`created_by ≠ approved_by`). Áp dụng thay đổi unit:
  - **MISSING**: `ProductUnit.status` → `LOST`. Tạo `ProductUnitStatusLog`.
  - **UNEXPECTED** (có serial trong DB): cập nhật `status` theo thực tế.
  - **UNEXPECTED** (serial mới): tạo `ProductUnit` mới, ghi `found during stock check`.
  - **Sai vị trí**: chỉ update `location_id`.
- `reject()` → COMPLETED → REJECTED. Không áp dụng thay đổi nào. Yêu cầu ghi lý do.
- **Snapshot stale**: phiếu có thời hạn tối đa **1 ngày làm việc** kể từ lúc tạo. Quá hạn → hệ thống tự động CANCELLED. Tuy nhiên **không có state EXPIRED** — dùng CANCELLED cho cả hủy thủ công lẫn hết hạn.

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
  - FOUND: nếu có `productUnitId` → khôi phục unit; nếu không → dùng `productId` + `quantity` (fallback cho serial không rõ)
- `approve()` → PENDING → APPROVED
  - **4-eyes:** `created_by ≠ approved_by`
  - **PESSIMISTIC_WRITE** khi đọc unit để apply — tránh race với export approve trên cùng unit.
  - DAMAGED: `ProductUnit.status` → `DAMAGED_IN_STORAGE`, trừ `remainingQuantity` (bulk set về 0)
  - LOST: `ProductUnit.status` → `LOST`, trừ `remainingQuantity` (bulk set về 0)
  - FOUND (có unit): `ProductUnit.status` → `IN_STOCK` (chỉ nếu đang ở LOST/DAMAGED_IN_STORAGE). Bulk: cộng lại `remaining_quantity`.
  - FOUND (không unit): tạo `ProductUnit` mới với serial `FOUND-{adjust_code}`, status = `IN_STOCK`.
  - Log `ProductUnitStatusLog` với source = `STOCK_ADJUSTMENT`.
  - **Chặn FOUND nếu unit đang ở `SOLD`/`REMOVED`/`DISPOSED`/`RETURNED_TO_SUPPLIER`** — không thể restore từ state terminal.
- `reject()` → PENDING → REJECTED. Không thay đổi unit.

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

**Entity:** `PriceAdjustment`, `ImportReceiptItem`, `ProductUnit`

- `create()` → chọn `import_receipt_item_id` (dòng nhập gốc). Hệ thống hiển thị `old_unit_price`. Nhập `new_unit_price` (phải khác giá cũ) + `reason` bắt buộc. Status = `PENDING_APPROVAL`.

- `approve()` → PENDING_APPROVAL → APPROVED. **4-eyes** (`created_by ≠ approved_by`).
  - Update `cost_price` của tất cả `ProductUnit` còn `IN_STOCK` thuộc `import_receipt_item` đó.
  - Batch: `UPDATE product_units SET cost_price = ? WHERE import_receipt_item_id = ? AND status = 'IN_STOCK'`.
  - **KHÔNG sửa** `import_receipt_items.unit_price` (giữ nguyên lịch sử).
  - **KHÔNG áp dụng** cho unit đã bán / đang RESERVED (prospective, không hồi tố).
  - Audit: `PRICE_ADJUSTMENT_APPROVED`.

- `reject()` → PENDING_APPROVAL → REJECTED. Không thay đổi.

**Sell price (không cần duyệt):**
- MANAGER/STOCK/SALES sửa `sell_price` trên `products` bất kỳ lúc.
- Ghi vào `sell_price_history`: `product_id, old_price, new_price, changed_by, changed_at`.
- Không ảnh hưởng giá xuất đã xảy ra.

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
| `/warranty-request/lookup` | GET | `CAN_OPERATE` | Tra cứu serial → thông tin BH (còn hạn, khách, export gốc) |
| `/warranty-request` | GET | `CAN_OPERATE` | List (paged, filter status+resolution) |
| `/warranty-request/my-handled` | GET | `ROLE_MANAGER` | Requests do tôi xử lý |
| `/warranty-request/{id}` | GET | `CAN_OPERATE` | Get one |
| `/warranty-request` | POST | `CAN_OPERATE` | Create (status = PENDING) |
| `/warranty-request/{id}/receive` | PUT | `CAN_OPERATE` | Receive (PENDING → RECEIVED — STOCK nhận hàng từ khách) |
| `/warranty-request/{id}/check` | PUT | `CAN_OPERATE` | Check (RECEIVED → UNDER_EVALUATION nếu CONFIRMED, → RESOLVED nếu REJECTED) |
| `/warranty-request/{id}/evaluate` | PUT | `CAN_APPROVE` | Evaluate — QL chọn resolution (UNDER_EVALUATION, thực hiện unit transitions) |
| `/warranty-request/{id}/execute` | PUT | `CAN_OPERATE` | Execute — STOCK thực thi resolution (RESOLVED, chỉ cần cho REPAIR path) |
| `/warranty-request/{id}/cancel` | PUT | `CAN_APPROVE` | Cancel (chỉ PENDING mới được cancel) |

**Service:** `WarrantyRequestService.java`

**Entity:** `WarrantyRequest`, `ProductUnit` (FK: `product_unit_id`, `replacement_unit_id`)

**Status machine:**
```
PENDING → RECEIVED → UNDER_EVALUATION → RESOLVED (terminal)
                   ↘ RESOLVED (STOCK từ chối ngay — auto REJECT, không cần QL)
PENDING → CANCELLED
```

**Resolution types:** `WarrantyResolutionType` = REPAIR, REPLACE, REFUND, REJECT

> RMA được hấp thụ vào REPAIR (gửi NCC là 1 nhánh của REPAIR). RETURN_SUPPLIER không còn là resolution của warranty — xử lý qua export_receipt riêng.

**Business rules:**

- `lookup()` → tra serial (fuzzy match O/0, I/l) → trả về product info, customer, export receipt, warranty hạn, `warranty_seal_code` nếu có, lịch sử đổi BH (số lần). Nếu hết hạn → vẫn trả thông tin (để SALES thấy lý do từ chối), FE khóa form, hiện banner hết hạn.

- `create()` → serial bắt buộc. Check: serial tồn tại? `status=SOLD` (hoặc `DEFECTIVE` nếu từ WARRANTY_TRANSFER)? Còn hạn BH? Check warranty seal nếu shop dùng. Tạo `status=PENDING`.

- `receive()` → PENDING → RECEIVED. STOCK xác nhận đã nhận hàng vật lý vào kho. Chưa chuyển transition unit.

- `check()` → STOCK kiểm tra:
  - `check_result=CONFIRMED` → RECEIVED → UNDER_EVALUATION. **Unit giữ nguyên trạng thái hiện tại** (`SOLD` hoặc `DEFECTIVE`) — chưa chuyển transition. Chờ QL chọn resolution.
  - `check_result=REJECTED` (không lỗi/không thuộc BH) → RECEIVED → RESOLVED với `resolution_type=REJECT`. **Không đổi status unit** (giữ nguyên `SOLD` hoặc `DEFECTIVE`). Bắt buộc `check_note`.

- `evaluate()` → QL chọn 1 trong 4 resolution. Unit transitions xảy ra NGAY tại bước này:

  | Resolution | Transition unit từ `SOLD` | Transition unit từ `DEFECTIVE` (WARRANTY_TRANSFER) | Transition replacement_unit (nếu có) |
  |---|---|---|---|
  | `REPAIR` | `SOLD → UNDER_REPAIR` | `DEFECTIVE → UNDER_REPAIR` | — |
  | `REPLACE` | `SOLD → DEFECTIVE` | Giữ `DEFECTIVE` (đã ở DEFECTIVE, chỉ ghi nhận) | `IN_STOCK → SOLD` (tạo export_receipt ngầm `reason=INTERNAL`, `sell_price=0`, kế thừa `warranty_start_date` gốc) |
  | `REFUND` | `SOLD → RETURNED` | `DEFECTIVE → RETURNED` | — |
  | `REJECT` | Không đổi | Không đổi | — |

  > **REPLACE** kế thừa `warranty_start_date` gốc (không reset) — khớp SOP §6.2.
  > **REPAIR** không tính unit vào tồn khả dụng. `UNDER_REPAIR` / `SENT_TO_MANUFACTURER` đều không khả dụng.

- `execute()` → STOCK thực thi (chỉ cần cho REPAIR path):
  - **REPAIR — sửa xong tại kho**: `UNDER_REPAIR → SOLD`. Trả khách.
  - **REPAIR — gửi NCC**: `UNDER_REPAIR → SENT_TO_MANUFACTURER`. Lưu `rma_number`, `sent_to_partner_at`.
  - **SENT_TO_MANUFACTURER** (cập nhật sau, không có endpoint riêng — có thể gộp vào execute hoặc update riêng):
    - Hãng trả xong → `SENT_TO_MANUFACTURER → SOLD`.
    - Hãng từ chối → `SENT_TO_MANUFACTURER → DEFECTIVE`.

- `cancel()` → chỉ cancel PENDING. Không cho cancel RECEIVED/UNDER_EVALUATION/RESOLVED.

**Edge cases:**
- **Hết serial đổi (REPLACE)**: SLA 7 ngày làm việc (config qua `system_settings` key `warranty_replace_sla_days`). Quá hạn → cảnh báo QL dashboard. QL có nút chuyển hướng → REFUND.
- **>2 lần đổi BH**: cảnh báo (không chặn cứng) — hiển thị trên Serial Info Card.
- **Mất tem BH**: mất quyền REPLACE nhanh tại shop, chuyển sang REPAIR/SENT_TO_MANUFACTURER.
- **Hãng làm mất/hư hàng RMA**: ghi nhận trên warranty_request, unit → LOST.
- **Warranty từ WARRANTY_TRANSFER (return_receipt)**: unit đã ở `DEFECTIVE` ngay từ đầu. Các resolution áp dụng transitions tương ứng theo cột DEFECTIVE ở bảng trên.

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
PENDING_QC ──→ IN_STOCK (QC Pass)
             → DEFECTIVE (QC FAIL_HARDWARE)
             → PENDING_QC (giữ nguyên — QC FAIL_ACCESSORY, chờ bổ sung phụ kiện)

IN_STOCK ──→ RESERVED (export reserve)
          → SOLD (export SALE/INTERNAL)
          → DEFECTIVE (phát hiện lỗi trong kho)
          → DAMAGED_IN_STORAGE (hỏng trong lưu kho)
          → LOST (mất hàng — adjustment)
          → REMOVED (hủy phiếu nhập, units chưa xuất)
          → RETURNED (qua return_receipt RESTOCK — SOLD→IN_STOCK, đã merge ở trên)

RESERVED → SOLD (QL duyệt export)
         → IN_STOCK (QL từ chối / hủy export)

SOLD ──→ IN_STOCK (return_receipt RESTOCK, set is_warranty_active=false)
      → DISPOSED (return_receipt SCRAP)
      → DEFECTIVE (return_receipt WARRANTY_TRANSFER)
      → UNDER_REPAIR (warranty REPAIR)
      → DEFECTIVE (warranty REPLACE — unit lỗi chuyển DEFECTIVE)
      → RETURNED (warranty REFUND)
      → RETURNED_TO_SUPPLIER (export RETURN_SUPPLIER)

UNDER_REPAIR → SOLD (sửa xong, trả khách)
            → DEFECTIVE (không sửa được)
            → SENT_TO_MANUFACTURER (gửi hãng BH)

SENT_TO_MANUFACTURER → SOLD (hãng trả đã sửa)
                     → DEFECTIVE (hãng từ chối BH)

DEFECTIVE → UNDER_REPAIR (warranty REPAIR — từ WARRANTY_TRANSFER)
          → RETURNED (warranty REFUND — từ WARRANTY_TRANSFER)
          → RETURNED_TO_SUPPLIER (export RETURN_SUPPLIER)
          → (giữ DEFECTIVE — warranty REPLACE/REJECT)

RETURNED → IN_STOCK (đủ điều kiện nhập lại kho)
         → DEFECTIVE (hàng trả bị lỗi)

LOST → IN_STOCK (tìm lại — adjustment FOUND)

DAMAGED_IN_STORAGE → DISPOSED (export DISPOSE)

REMOVED     [*] terminal — hủy phiếu nhập
DISPOSED    [*] terminal — thanh lý hàng hỏng
RETURNED_TO_SUPPLIER [*] terminal — trả NCC
```

> **Phân biệt REMOVED vs DISPOSED:** `REMOVED` chỉ dành cho hủy phiếu nhập (unit chưa từng rời `IN_STOCK`). `DISPOSED` chỉ dành cho thanh lý hàng hỏng đã xác nhận trong kho (luôn đi qua export_receipt).

> **Bulk**: 1 product_unit (lot) giữ `IN_STOCK` xuyên suốt, chỉ chuyển `SOLD` khi `remaining_quantity = 0`. Khi chuyển sang DAMAGED/LOST/DEFECTIVE/REMOVED → set `remaining_quantity = 0`.

Mỗi lần chuyển trạng thái đều ghi `ProductUnitStatusLog` với `sourceType` (IMPORT_RECEIPT, EXPORT_RECEIPT, STOCK_ADJUSTMENT, STOCK_CHECK, WARRANTY_REQUEST, **RELOCATE**, RETURN_RECEIPT) + `sourceId`.

