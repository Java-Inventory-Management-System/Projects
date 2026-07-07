## 7. Domain Review — Known Issues & Improvements

> Phân tích các vấn đề thiết kế hiện tại và đề xuất giải pháp.

### 7.1. Mâu thuẫn tracking: Serial number vs. Bulk (UOM meter)

**Vấn đề:** `product_units.serial_number VARCHAR(100) NOT NULL UNIQUE` — mỗi row = 1 vật phẩm vật lý. Với UOM = "meter" (cáp mạng nhập 1 cuộn 100m, xuất lẻ 1.5m), không thể gán 1 serial cho 1.5m.

**Root cause:** `products.unit` hỗ trợ `meter` nhưng cơ chế tồn kho = COUNT rows, không áp dụng được cho số thập phân liên tục.

**Giải pháp — Thêm `tracking_type` vào `products` + `product_units`:**

Tất cả domain tables chưa tồn tại (chưa tạo migration), nên các thay đổi được tích hợp thẳng vào CREATE TABLE:

```sql
-- products: thêm tracking_type
CREATE TABLE products (
    ...
    unit            VARCHAR(20) NOT NULL DEFAULT 'piece',
    tracking_type   VARCHAR(20) NOT NULL DEFAULT 'serialized' COMMENT 'serialized | bulk',
    sell_price      DECIMAL(15,2) NOT NULL DEFAULT 0,
    ...
);

-- product_units: tracking_type + initial/remaining_quantity, KHÔNG có export_receipt_item_id
CREATE TABLE product_units (
    ...
    serial_number           VARCHAR(100) NOT NULL,
    product_id              BIGINT NOT NULL,
    tracking_type           VARCHAR(20) NOT NULL DEFAULT 'serialized',
    initial_quantity        DECIMAL(15,2) NULL COMMENT 'bulk only',
    remaining_quantity      DECIMAL(15,2) NULL COMMENT 'bulk only',
    ...
    CONSTRAINT ck_pu_bulk_fields CHECK (
        (tracking_type = 'serialized' AND initial_quantity IS NULL AND remaining_quantity IS NULL)
        OR
        (tracking_type = 'bulk' AND initial_quantity IS NOT NULL AND remaining_quantity IS NOT NULL)
    )
);

-- export_receipt_item_units: thêm quantity
CREATE TABLE export_receipt_item_units (
    ...
    quantity  DECIMAL(15,2) NOT NULL DEFAULT 1.00,
    ...
);
```

**Luồng nhập:**

- `serialized`: sinh 1 `product_unit` / serial → COUNT để tính tồn
- `bulk`: tạo 1 `product_unit` với `serial_number = LOT-{receipt_code}-{line_no}`, `initial_quantity = remaining_quantity = 100`, `tracking_type = 'bulk'`

**Luồng xuất (FIFO cho bulk):**

```sql
SELECT * FROM product_units
WHERE product_id = ?
  AND ((tracking_type = 'serialized' AND status = 'in_stock')
    OR (tracking_type = 'bulk' AND status = 'in_stock' AND remaining_quantity > 0))
ORDER BY imported_at ASC
LIMIT <n>
FOR UPDATE
```

- Nếu row bulk và `remaining_quantity > qty_xuất`: trừ `remaining_quantity`, không chuyển status.
- Nếu row bulk và `remaining_quantity = qty_xuất`: set `status = 'sold'`.
- Tổng tồn = SUM `remaining_quantity` (bulk) + COUNT id (serialized).

> **Ghi chú về CHECK constraint:** MySQL không hỗ trợ subquery trong CHECK constraint, nên không thể enforce "serialized → quantity phải integer" ở DB bằng cách JOIN với `products.tracking_type`. Giải pháp: validate tại Service layer Java (kiểm tra `product.trackingType` trước khi insert). DB chỉ có `quantity > 0`.

### 7.2. Audit Log — Schema và danh sách hành động

**Vấn đề:** ERD không có bảng `audit_logs`, nhưng hầu hết nghiệp vụ (mục 4) đều yêu cầu "ghi audit log".

**Giải pháp — Schema (bảng đã được tạo ở V2, schema dưới đây để tham chiếu):**

```sql
CREATE TABLE audit_logs (
    id          BIGINT AUTO_INCREMENT,
    user_id     BIGINT,
    username    VARCHAR(100),
    ip_address  VARCHAR(45),
    request_id  VARCHAR(36),
    action      VARCHAR(100) NOT NULL,
    entity_name VARCHAR(100) NOT NULL,     -- V2 dùng entity_name (khác entity_type trong doc này)
    entity_id   VARCHAR(100),
    old_value   JSON,
    new_value   JSON,
    status      VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
    error_msg   TEXT,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ...
);
```

> Lưu ý: V2 thực tế dùng `entity_name` thay vì `entity_type` (cosmetic, không ảnh hưởng logic). Không có cột `description` trong V2 — có thể thêm sau nếu cần.

**Danh sách bắt buộc ghi audit log theo nghiệp vụ:**

| #   | Hành động                 | entity_type      | old_value        | new_value                    |
| --- | ------------------------- | ---------------- | ---------------- | ---------------------------- |
| 1   | Nhập kho (completed)      | IMPORT_RECEIPT   | null             | JSON phiếu + items + serials |
| 2   | Sửa serial sau nhập       | PRODUCT_UNIT     | serial cũ        | serial mới                   |
| 3   | Duyệt phiếu nhập          | IMPORT_RECEIPT   | status=pending   | status=completed             |
| 4   | Xuất kho (completed)      | EXPORT_RECEIPT   | null             | JSON phiếu + items + serials |
| 5   | Hủy phiếu nhập            | IMPORT_RECEIPT   | status=completed | status=cancelled             |
| 6   | Hủy phiếu xuất            | EXPORT_RECEIPT   | status=completed | status=cancelled             |
| 7   | Điều chỉnh tồn (approved) | STOCK_ADJUSTMENT | status=pending   | status=approved              |
| 8   | Kiểm kê (approved)        | STOCK_CHECK      | null             | diff summary                 |
| 9   | Bảo hành (hoàn tất)       | WARRANTY_REQUEST | trạng thái cũ    | resolution + serial thay đổi |
| 10  | Đổi role user             | USER             | role cũ          | role mới                     |
| 11  | Khóa/mở user              | USER             | is_active cũ     | is_active mới                |
| 12  | User đổi password         | USER             | null             | null                         |
| 13  | Admin reset password      | USER             | null             | null                         |
| 14  | Đăng nhập thất bại        | AUTH             | -                | - (optional)                 |

### 7.3. `stock_adjustments.product_unit_id` nullable + fallback

**Vấn đề:** Edge case "found không rõ serial" (mục 5) yêu cầu tạo bản ghi tổng chờ xử lý, nhưng `product_unit_id` là FK NOT NULL.

**Giải pháp — Cho NULL + thêm cột fallback (tích hợp vào CREATE TABLE):**

```sql
CREATE TABLE stock_adjustments (
    ...
    type            VARCHAR(30) NOT NULL COMMENT 'damaged | lost | found',
    product_unit_id BIGINT NULL COMMENT 'NULL nếu chỉnh theo product',
    product_id      BIGINT NULL COMMENT 'dùng khi không rõ serial',
    quantity        DECIMAL(15,2) NULL COMMENT 'dùng khi không rõ serial',
    ...
    CONSTRAINT fk_sa_unit    FOREIGN KEY (product_unit_id) REFERENCES product_units(id),
    CONSTRAINT fk_sa_product FOREIGN KEY (product_id) REFERENCES products(id),
    CONSTRAINT ck_sa_source CHECK (
        product_unit_id IS NOT NULL
        OR (product_id IS NOT NULL AND quantity IS NOT NULL)
    )
);
```

CHECK constraint đảm bảo: một adjustment phải reference **ít nhất 1** trong 2 cách. `quantity` là DECIMAL(15,2) để hỗ trợ bulk (vd found 1.5m cáp).

### 7.4. Trùng lặp FK: `product_units.export_receipt_item_id` vs `export_receipt_item_units`

**Vấn đề:** ERD cũ có cả FK trực tiếp trên `product_units` và bảng join `export_receipt_item_units` đều ghi quan hệ export ↔ unit. Rủi ro lệch dữ liệu.

**Giải pháp — Chỉ giữ `export_receipt_item_units`, bỏ `export_receipt_item_id` khỏi `product_units`:**

Vì `product_units` chưa tồn tại, chỉ cần **không include** cột `export_receipt_item_id` trong CREATE TABLE:

```sql
CREATE TABLE product_units (
    ...
    -- KHÔNG có export_receipt_item_id
    ...
);

-- Query thay thế: JOIN qua export_receipt_item_units
SELECT pu.* FROM product_units pu
JOIN export_receipt_item_units eriu ON eriu.product_unit_id = pu.id
WHERE eriu.export_receipt_item_id = ?;
```

### 7.5. Warranty Inheritance khi đổi serial

**Vấn đề:** Nghiệp vụ yêu cầu "kế thừa thời hạn BH còn lại" của serial cũ, nhưng `warranty_months` của serial mới có thể khác.

**Quy tắc:**

1. `warranty_months` = metadata gốc của unit (theo lô nhập) — không đổi.
2. `warranty_expires_at` = hạn BH thực tế — **copy cứng từ serial cũ khi đổi**.
3. `warranty_start_date` của serial mới = ngày đổi (tracking mốc).
4. Hiển thị: "Còn BH đến: `warranty_expires_at`" + "Chính sách gốc: `warranty_months` tháng".

### 7.6. Soft-delete không nhất quán

**Vấn đề:** users dùng `is_deleted`, products/locations dùng `is_active`, suppliers/brands/categories/customers không có cờ.

**Giải pháp — Đồng bộ `is_active` cho tất cả domain entities:**

`users` là bảng duy nhất đã tồn tại (V1) và đang dùng `is_deleted`:

```sql
-- users: migration ALTER TABLE (V4)
ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE AFTER status;
UPDATE users SET is_active = NOT is_deleted;

-- Verify trước khi drop: phải trả về 0 row lệch
SELECT COUNT(*) FROM users WHERE is_active = is_deleted;

ALTER TABLE users DROP COLUMN is_deleted;
```

> **Ranh giới `status` vs `is_active` trên `users` — bắt buộc phân biệt rõ để tránh code nhầm:**
>
> - `status` (`NEW | ACTIVE | INACTIVE`): trạng thái **workflow onboarding** — `NEW` = tài khoản mới tạo, chưa từng đăng nhập/đổi password lần đầu; chuyển `ACTIVE` sau khi user hoàn tất setup. Không dùng `status` để biểu diễn việc khóa/mở tài khoản.
> - `is_active`: cờ **bật/tắt truy cập** — Admin dùng để khóa/mở user bất kỳ lúc nào, độc lập với `status`.
> - Hệ quả: hành động "Khóa/mở user" trong audit log (mục 7.2, #11) phải ghi nhận thay đổi trên cột `is_active`, **không phải** `status`. Service layer khi khóa user chỉ toggle `is_active`, tuyệt đối không đụng vào `status`.

Các bảng domain khác (chưa tồn tại) — thêm `is_active BOOLEAN NOT NULL DEFAULT TRUE` vào CREATE TABLE:

```sql
CREATE TABLE suppliers ( ..., is_active BOOLEAN NOT NULL DEFAULT TRUE, ... );
CREATE TABLE brands ( ..., is_active BOOLEAN NOT NULL DEFAULT TRUE, ... );
CREATE TABLE categories ( ..., is_active BOOLEAN NOT NULL DEFAULT TRUE, ... );
CREATE TABLE customers ( ..., is_active BOOLEAN NOT NULL DEFAULT TRUE, ... );
```

`products` và `locations` đã có `is_active` trong ERD, giữ nguyên.

### 7.7. Transaction & Audit Log

**Vấn đề:** Audit log không được ảnh hưởng main transaction (không rollback lẫn nhau, không tạo race condition).

**Giải pháp (refactor `AuditLogAspect`):**

- **SUCCESS case**: `TransactionSynchronizationManager.registerSynchronization()` với `afterCommit()` callback — chạy sau khi main transaction commit thành công, **không thể xảy ra phantom log** (log ghi SUCCESS nhưng main rollback). Nếu không có transaction active, save synchronously.
- **FAILED case**: `@Async @Transactional(propagation = REQUIRES_NEW)` — gọi trước khi rethrow exception. Sub-transaction commit độc lập, không bị cuốn theo rollback của main.
- **Khi chính audit log bị lỗi**: swallow exception + log ra file fallback — **không fail request chính**.
- **Thứ tự log**: afterCommit chạy trên cùng thread → FIFO tự nhiên. Không cần sequence_number.

```java
@Around("@annotation(auditLog)")
public Object logExecution(ProceedingJoinPoint pjp, AuditLog auditLog) throws Throwable {
    String oldValue = captureOldValue(pjp, auditLog);
    try {
        Object result = pjp.proceed();
        if (TransactionSynchronizationManager.isActualTransactionActive()) {
            TransactionSynchronizationManager.registerSynchronization(
                new TransactionSynchronization() {
                    @Override public void afterCommit() {
                        try { auditLogService.saveLog(... SUCCESS ...); }
                        catch (Exception ex) { log.error("Audit log sau commit thất bại", ex); }
                    }
                });
        } else {
            auditLogService.saveLog(... SUCCESS ...);
        }
        return result;
    } catch (Throwable e) {
        auditLogService.saveFailedLog(... FAILED ...);  // @Async + REQUIRES_NEW
        throw e;
    }
}
```

### 7.8. Unit ↔ Tracking Type mapping rule

**Vấn đề:** Không có ràng buộc giữa `products.unit` và `products.tracking_type` — có thể tạo sản phẩm `unit='meter'` nhưng `tracking_type='serialized'`, dẫn đến tồn kho tính sai.

**Quy tắc mapping cứng:**

| `unit`  | `tracking_type` | Ví dụ                            |
| ------- | --------------- | -------------------------------- |
| `piece` | `serialized`    | CPU, RAM, mainboard              |
| `box`   | `serialized`    | Hộp linh kiện (mỗi hộp 1 serial) |
| `set`   | `serialized`    | Combo bàn phím + chuột           |
| `meter` | `bulk`          | Cáp mạng, dây điện               |
| `kg`    | `bulk`          | Hàn thiếc, hóa chất              |

**Enforce ở Service layer** — MySQL không thể cross-table CHECK:

```java
// ProductService.java — gọi khi create/update product
private void validateUnitTrackingType(Product product) {
    boolean requiresBulk = List.of("meter", "kg").contains(product.getUnit());
    boolean requiresSerialized = List.of("piece", "box", "set").contains(product.getUnit());

    if (requiresBulk && product.getTrackingType() == TrackingType.SERIALIZED) {
        throw new InvalidRequestException(
            "Sản phẩm đơn vị " + product.getUnit() + " bắt buộc tracking_type = bulk");
    }
    if (requiresSerialized && product.getTrackingType() == TrackingType.BULK) {
        throw new InvalidRequestException(
            "Sản phẩm đơn vị " + product.getUnit() + " bắt buộc tracking_type = serialized");
    }
}
```

**Lưu ý:** Khi thêm UOM mới trong tương lai, phải cập nhật cả mapping này và các service xuất/nhập/kiểm kê có logic phân nhánh theo tracking_type.

---
