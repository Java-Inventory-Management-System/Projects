> Gộp từ: `03-known-issues.md`, `08-inventory-analysis.md` (P0/P1), `09-business-analysis.md` (P0 bugs), `09c-business-analysis-final-review.md` (bugs còn treo) (các file này đã bị xóa sau khi gộp — xem git history nếu cần tra lại quá trình phân tích gốc).

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
| 1   | Nhập kho (NV xác nhận)    | IMPORT_RECEIPT   | null             | JSON phiếu + items + serials; status=pending→pending_approval |
| 2   | Sửa serial sau nhập       | PRODUCT_UNIT     | serial cũ        | serial mới                   |
| 3   | Duyệt phiếu nhập          | IMPORT_RECEIPT   | status=pending_approval | status=completed, approved_by |
| 4   | Xuất kho (QL duyệt)       | EXPORT_RECEIPT   | null             | JSON phiếu + items + serials; status=pending_approval→completed |
| 5   | Hủy phiếu nhập            | IMPORT_RECEIPT   | status=completed | status=cancelled             |
| 6   | Hủy phiếu xuất            | EXPORT_RECEIPT   | status=completed | status=cancelled             |
| 7   | Điều chỉnh tồn (approved) | STOCK_ADJUSTMENT | status=pending   | status=approved              |
| 8   | Kiểm kê (approved)        | STOCK_CHECK      | null             | diff summary                 |
| 9   | Kiểm kê — chuyển missing→lost | PRODUCT_UNIT | status=in_stock  | status=lost, stock_check_id  |
| 10  | Bảo hành (hoàn tất)       | WARRANTY_REQUEST | trạng thái cũ    | resolution + serial thay đổi |
| 11  | Đổi role user             | USER             | role cũ          | role mới                     |
| 12  | Khóa/mở user              | USER             | is_active cũ     | is_active mới                |
| 13  | User đổi password         | USER             | null             | null                         |
| 14  | Admin reset password      | USER             | null             | null                         |
| 15  | Đăng nhập thất bại        | AUTH             | -                | - (optional)                 |

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

### 7.9. Phân quyền Admin — tách vai trò giám sát khỏi vận hành nghiệp vụ (Separation of Duties)

**Vấn đề:** Bảng phân quyền ban đầu (mục 6) cho Admin ✅ ở toàn bộ 18/18 chức năng — bao gồm cả tạo và tự duyệt mọi giao dịch nghiệp vụ (nhập/xuất/điều chỉnh tồn/bảo hành), đồng thời là người duy nhất xem toàn bộ audit log. Trong thực tế Admin là người được thuê (system admin/IT), không phải chủ sở hữu doanh nghiệp — cho một nhân viên vừa hành động vừa tự giám sát chính mình tạo lỗ hổng gian lận nội bộ (embezzlement) mà không ai trong hệ thống phát hiện được, vì người có khả năng gây ra sai phạm cũng chính là người duy nhất xem log để phát hiện sai phạm.

**Root cause:** Elicitation ban đầu không hỏi rõ "Admin trong hệ thống này thực chất đóng vai trò gì trong doanh nghiệp thật", nên mặc định gán ✅ toàn bộ cho role có `level` cao nhất — nhầm lẫn giữa "quyền hệ thống cao nhất" và "được tin tưởng tuyệt đối về nghiệp vụ".

**Quyết định:** Tách Admin thành vai trò **giám sát + quản trị hệ thống** (quản lý user, cấu hình hệ thống, xem toàn bộ audit log, làm approver dự phòng khi cần escalation), loại bỏ quyền **khởi tạo** giao dịch nghiệp vụ hàng ngày (nhập/xuất/điều chỉnh tồn/danh mục/bảo hành) khỏi Admin. Quản lý kho (QL) chịu trách nhiệm vận hành thực tế.

Áp dụng ràng buộc **`created_by ≠ approved_by`** cho mọi luồng có bước duyệt (phiếu nhập, phiếu xuất, kiểm kê lệch, điều chỉnh tồn thủ công) — người duyệt không được là người đã tạo phiếu, bất kể role. Khi chỉ có 1 QL và họ là người tạo, hệ thống escalate lên Admin duyệt thay — đây là lý do Admin vẫn giữ ✅ ở các dòng "Duyệt...", nhưng không còn ✅ ở dòng "Tạo...".

**Đã cân nhắc và loại bỏ:** thêm role Owner/Chủ sở hữu riêng đứng trên Admin. Bị loại vì ở quy mô 1 kho của dự án này, chưa có use case nào cho thấy Owner cần hành vi khác biệt rõ ràng so với Admin sau khi Admin đã được tách vai trò giám sát — thêm role này sẽ là over-engineering, vi phạm YAGNI (lỗi #6 trong checklist SAD).

**Hệ quả kỹ thuật:**
- Cần enforce `approved_by != created_by` ở service layer cho `import_receipts`, `export_receipts`, `stock_checks`, `stock_adjustments` trước khi cho phép chuyển status sang `approved`/`completed`.
- **Gap đã xử lý:** `import_receipts` và `export_receipts` trước đây chưa có cột `approved_by` trong ERD (mục 1) — chỉ có `created_by`. Đã bổ sung cột `approved_by BIGINT NULL FK` vào cả hai bảng để service layer có thể kiểm tra `approved_by != created_by` khi chuyển status sang `completed` qua bước duyệt.
- Phù hợp làm invariant test bằng ArchUnit hoặc unit test tầng service (đúng mục tiêu học nâng cao đã đề ra cho WMS sample project).
- Trade-off chấp nhận: nếu chỉ có 1 QL, escalate lên Admin nghĩa là Admin phải tham gia duyệt trong tình huống này — chấp nhận được vì đây là exception/backup, không phải luồng vận hành chính.

### 7.10. Traceability & UX doc chưa đồng bộ role SALES

**Vấn đề:** Role SALES được thêm vào hệ thống sau khi bộ tài liệu (01–07) đã được viết dựa trên 3 role (ADMIN, MANAGER, STOCK). Việc thêm role được cập nhật đầy đủ ở `02-sop-nghiep-vu.md` §1.3.1 (bảng phân quyền) và code (`@PreAuthorize`), nhưng các tài liệu còn lại đồng bộ không đầy đủ.

**Phạm vi ảnh hưởng:**
- `04-requirements-traceability.md`: legend thiếu SL; RQ-22→33 actor chỉ ghi `NV` thiếu SL; US-40 (trả hàng) actor sai NV phải là SALES; US-25/35/36 actor gồm AD (trái matrix); US-41 (điều chỉnh giá) actor QL/AD sai, phải là NV/QL.
- `07-ux-design.md`: §2.2 tiêu đề WarrantyCreatePage ghi `(SALES)` — thiếu STOCK; §1.4 dòng "tránh NV" sai actor (phải là SALES).
- `01-domain-model.md`: dòng 28 ghi level 3 chung cho SALES/STOCK — level này dùng trong `UserRoleSecurity.canUpdate()` (hierarchical user mgmt), đã xác nhận không ảnh hưởng feature-level permissions.
- `backend/docs/api/api-documentation.md`: role hierarchy, user create/response enums, role description thiếu SALES.
- `02-sop-nghiep-vu.md`: §2 flow diagram/mô tả ghi SALES tạo phiếu nhập (trái §1.3.1); §12 approval table có ADMIN ở Tạo rows, thiếu SALES ở ExportReceipt Tạo.

**Đã xử lý — lượt 1 (trước session này):** US-xx và các file khác đã được đồng bộ, nhưng RQ-xx matrix (mục 1) bị bỏ sót. `02-sop-nghiep-vu.md` §1.3.1 đã đúng từ lượt trước, không sửa lại.
- `04-requirements-traceability.md` (US-xx): US-08→12/33 thêm SL, US-13/42 thêm AD, US-40 NV→SALES, US-25/35 bỏ AD, US-36 bỏ AD, US-41 QL/AD→NV/QL; RQ-10→13 bỏ AD, RQ-14 bỏ AD.
- `07-ux-design.md`: §1.4 "tránh NV" → "tránh SALES".
- `backend/docs/api/api-documentation.md`: thêm SALES vào role hierarchy, enum, description; sửa location/map, price-adjustment/reject permissions.
- `02-sop-nghiep-vu.md`: §2.1/2.2 import bỏ SALES; §12 table bỏ ADMIN khỏi Tạo rows, thêm SALES ExportReceipt Tạo.
- `06-open-questions.md`: thêm #17 về SALES sell_price.

**Đã xử lý — lượt 2 (session này, 2026-07-24):** Sửa RQ-xx matrix còn sót.
- `04-requirements-traceability.md` (RQ-xx matrix): RQ-21→QL/AD, RQ-22→QL/NV/SL, RQ-23→QL/NV/SL, RQ-24→QL/NV/SL, RQ-25→QL/NV/SL, RQ-26→QL/NV/SL, RQ-27→QL/AD, RQ-28→QL/NV/SL, RQ-29→NV/SL, RQ-30→NV/SL, RQ-31→NV/QL; US-16 NV→NV/QL.
- Thêm SL vào legend actor đầu file `04-requirements-traceability.md`.

---

## 8. Bugs từ phân tích Inventory (08)

> Nguồn: `08-inventory-analysis-archive.md`. Chỉ lấy mục P0/P1 còn treo (bỏ multi-warehouse, reports, frontend, DevOps, testing).

### 8.1 P0 — Nghiệp vụ tồn kho

#### 8.1.1 Location không có capacity check (08 §4) — Đã xử lý schema

- **Trạng thái:** Schema đã fix — `01-domain-model.md` `locations` đã có `max_capacity` (nullable). Validation mềm + UI % occupancy vẫn là việc code cần làm (xem `07-ux-design.md §1.1`).
- **Nguồn:** `08-inventory-analysis-archive.md §4`
- **Mô tả cũ:** `Location` không có `maxCapacity`. Khi nhập kho, không kiểm tra bin đã đầy trước khi gán vị trí. Export không cho phép chọn location cụ thể.
- **Vị trí:** `Location.java` (entity thiếu field), `ImportReceiptService` (thiếu capacity validation)
- **Tác động:** Nhân viên có thể nhập chồng quá sức chứa thực tế; không kiểm soát được hàng lấy từ bin nào khi xuất.
- **Fix đề xuất cũ:** Thêm `maxCapacity DECIMAL(15,2) NULL` vào `Location`. Validation mềm (cảnh báo, không chặn) khi vượt quá capacity. Frontend hiển thị % occupancy.
- **Việc còn lại:** Service-layer validation (cảnh báo mềm khi vượt capacity) + UI % occupancy.

#### 8.1.2 Thiếu return flow 2 chiều — ImportReturn & SalesReturn (08 §6, §7)

- **Nguồn:** `08-inventory-analysis-archive.md §6, §7`
- **Mô tả:** Không có flow trả hàng cho NCC (import return) và khách hàng trả lại (sales return). Phải dùng export/import thủ công, mất traceability.
- **Tác động:** Khi nhập lô hỏng, không tạo chứng từ trả NCC. Khi khách trả hàng, không có flow nhập lại kho.
- **Fix:** Tạo entity `ImportReturn` + `SalesReturn` với các bước kiểm tra (inspect) → quyết định nhập lại/hủy. Kế thừa warranty nếu còn hạn.

#### 8.1.3 Customer không có unique constraint (08 §14)

- **Nguồn:** `08-inventory-analysis-archive.md §14`
- **Mô tả:** Không có unique constraint trên `phone`/`email` của `Customer`. Tìm kiếm chỉ theo name.
- **Tác động:** Dễ tạo customer trùng (cùng phone nhưng khác tên), báo cáo sales by customer sai.
- **Fix:** Thêm `UNIQUE (phone)` và `UNIQUE (email)`. Validate trùng khi create/update. Mở rộng search lên phone + email.

#### 8.1.4 Import thiếu Draft, không sửa được phiếu pending (08 §15.1)

- **Nguồn:** `08-inventory-analysis-archive.md §15.1`
- **Mô tả:** Tạo phiếu nhập là `PENDING_APPROVAL` ngay, không có `DRAFT`. Không thể sửa phiếu sau khi tạo (chỉ approve/cancel). Nếu sai 1 dòng phải hủy làm lại.
- **Tác động:** UX tệ, mất thời gian khi nhập nhiều dòng.
- **Fix:** Thêm `DRAFT` status, cho phép sửa trước khi submit. SOP §2.2 đã chốt thêm draft.

#### 8.1.5 Set warranty trên import không copy sang ProductUnit (08 §15.1)

- **Nguồn:** `08-inventory-analysis-archive.md §15.1`
- **Mô tả:** `warrantyMonths` lưu ở `ImportReceiptItem` nhưng không copy sang `ProductUnit` khi tạo unit.
- **Vị trí:** `ImportReceiptService.createAndConfirm()` — lúc tạo `ProductUnit`
- **Tác động:** ProductUnit không có warrantyMonths → không tính được hạn BH.
- **Fix:** Copy `warrantyMonths` từ `ImportReceiptItem` sang `ProductUnit` khi tạo unit. (Lưu ý: 09 §3 xác nhận bug này là false positive — `warrantyMonths` đã được copy ở code hiện tại.)

#### 8.1.6 Không chọn serial/lot khi xuất (08 §15.2)

- **Nguồn:** `08-inventory-analysis-archive.md §15.2`
- **Mô tả:** User không thể chọn serial cụ thể hoặc location cụ thể để xuất. Hệ thống auto FIFO hoàn toàn.
- **Tác động:** NV kho không kiểm soát được unit nào được xuất, không ưu tiên xuất hàng cận date.
- **Fix:** Cho phép override serial tay + bắt buộc lý do. SOP §3.2 B2 đã chốt.

#### 8.1.7 Double-booking khi xuất — thiếu pessimistic lock (08 §15.2)

- **Nguồn:** `08-inventory-analysis-archive.md §15.2`
- **Mô tả:** Units được claim ở `create()` nhưng chưa deduct đến lúc approve. Hai phiếu song song có thể claim cùng unit.
- **Vị trí:** `ExportReceiptService.create()` — thiếu `FOR UPDATE`
- **Tác động:** Overselling: approve phiếu thứ 2 fail vì unit đã sold.
- **Fix:** Thêm `@Lock(PESSIMISTIC_WRITE)` hoặc `SELECT ... FOR UPDATE`. SOP bổ sung reserve transaction ngắn.

#### 8.1.8 4-eyes principle chưa enforce đầy đủ (08 §15.3, §16.1)

- **Nguồn:** `08-inventory-analysis-archive.md §15.3, §16.1`
- **Mô tả:** `createdBy != approvedBy` chưa enforce ở service layer. StockAdjustmentService bỏ qua check (comment out).
- **Vị trí:** `StockAdjustmentService.approve()`, `ImportReceiptService.approve()`, `ExportReceiptService.approve()`
- **Tác động:** NV kho có thể tự tạo + tự duyệt phiếu nhập/xuất/điều chỉnh — vi phạm separation of duties.
- **Fix:** Thêm `if (receipt.getCreatedBy().equals(currentUserId)) throw SelfApprovalException()` ở mọi method approve.

### 8.2 P0 — Kỹ thuật & Security

#### 8.2.1 Không có optimistic locking trên entity (08 §17.1)

- **Nguồn:** `08-inventory-analysis-archive.md §17.1`
- **Mô tả:** Không entity nào có `@Version`. `remainingQuantity` của bulk unit có thể bị silent overwrite.
- **Vị trí:** `BaseEntity.java` + tất cả entity
- **Tác động:** Ghi đè tồn kho khi 2 request xuất concurrent → overselling.
- **Fix:** Thêm `@Version private Long version` vào `BaseEntity` hoặc entity quan trọng.

#### 8.2.2 ExportReceiptService.create() không pessimistic lock (08 §17.2)

- **Nguồn:** `08-inventory-analysis-archive.md §17.2`
- **Mô tả:** Query stock units không dùng `FOR UPDATE`. Request khác có thể lấy mất units giữa lúc đọc và claim.
- **Vị trí:** `ExportReceiptService.java:120-135`
- **Tác động:** Double-booking như 8.1.7.
- **Fix:** `@Lock(PESSIMISTIC_WRITE)` trên repository method.

#### 8.2.3 Check trùng serial không an toàn concurrent (08 §17.3)

- **Nguồn:** `08-inventory-analysis-archive.md §17.3`
- **Mô tả:** `findExistingSerialNumbers()` không dùng `FOR UPDATE`. 2 import concurrent có thể insert cùng serial.
- **Vị trí:** `ImportReceiptService.java:200-204`
- **Tác động:** Trùng serial → DB constraint chặn, 1 request fail (không silent, nhưng gây lỗi người dùng).
- **Fix:** Dùng unique constraint DB + `try-catch DataIntegrityViolationException`.

#### 8.2.4 ApiExceptionHandler thiếu handler (08 §19.1)

- **Nguồn:** `08-inventory-analysis-archive.md §19.1`
- **Mô tả:** Chỉ bắt `ApiException`. Validation error → 500. DB error leak schema.
- **Vị trí:** `ApiExceptionHandler.java`
- **Tác động:** UX tệ (500 thay vì 400), lộ thông tin DB.
- **Fix:** Thêm `@ExceptionHandler` cho `MethodArgumentNotValidException`, `DataIntegrityViolationException`, `HttpMessageNotReadableException`, `ConstraintViolationException`, `Exception` catch-all.

#### 8.2.5 JWT secret yếu, hardcoded (08 §16.2)

- **Nguồn:** `08-inventory-analysis-archive.md §16.2`
- **Mô tả:** `JWT_SECRET: RGF3bkJyZWFrZXJEYXduQnJlYWtlckRhd25CcmVha2Vy` (base64 của ~28 ký tự dễ đoán).
- **Vị trí:** `docker-compose.yml:39`
- **Tác động:** Kẻ tấn công có thể forge JWT token nếu biết secret.
- **Fix:** Dùng biến môi trường `${JWT_SECRET}` với fallback, không hardcode.

#### 8.2.6 AuthTokenFilter không verify user active (08 §16.3)

- **Nguồn:** `08-inventory-analysis-archive.md §16.3`
- **Mô tả:** Filter tạo `UserDetailsImpl` từ JWT claims mà không query DB kiểm tra user còn active.
- **Vị trí:** `AuthTokenFilter.java:61-68`
- **Tác động:** User bị deactivate vẫn dùng JWT cũ đến hết hạn.
- **Fix:** Thêm `userRepository.findByIdAndIsActiveTrue()` check trong filter.

#### 8.2.7 Không có brute-force protection (08 §16.4)

- **Nguồn:** `08-inventory-analysis-archive.md §16.4`
- **Mô tả:** Login endpoint public, không rate limit, không lockout sau N lần fail.
- **Vị trí:** `AuthService.java`
- **Tác động:** Brute force password.
- **Fix:** Thêm `@RateLimiter` hoặc login attempt counter + lockout.

#### 8.2.8 Access token lưu ở localStorage (09b §3)

- **Nguồn:** `09b-business-analysis-supplement.md §3`
- **Mô tả:** JWT access token lưu ở `localStorage`, dễ bị đánh cắp qua XSS.
- **Vị trí:** `frontend/src/utils/http-client.ts:27`
- **Tác động:** Kẻ tấn công XSS có thể đọc token trực tiếp từ localStorage.
- **Fix:** Chuyển access token vào memory (Zustand store) + httpOnly cookie cho refresh token.

#### 8.2.9 Password policy quá yếu (09b §3)

- **Nguồn:** `09b-business-analysis-supplement.md §3`
- **Mô tả:** Chỉ check `length < 6`, không yêu cầu uppercase/lowercase/number/special char.
- **Vị trí:** `AuthService.java:160`
- **Tác động:** Password dễ bị brute-force/đoán.
- **Fix:** Thêm pattern validation — tối thiểu 8 ký tự, có uppercase, lowercase, number.

#### 8.2.10 File upload endpoint public, không giới hạn (09b §3)

- **Nguồn:** `09b-business-analysis-supplement.md §3`
- **Mô tả:** `/api/v1/uploads/**` không auth, không giới hạn size/type.
- **Vị trí:** `SecurityConfig.java:101`
- **Tác động:** Ai cũng upload được file bất kỳ dung lượng/loại nào lên server.
- **Fix:** Thêm auth + giới hạn max file size + whitelist content-type.

### 8.3 P1 — Từ Inventory

#### 8.3.1 Batch/Lot tracking (08 §3)

- **Nguồn:** `08-inventory-analysis-archive.md §3`
- **Mô tả:** Không có `lotNumber` riêng. Không thể truy xuất lô NCC, không FEFO.
- **Tác động:** Không track lô lỗi, không ưu tiên xuất hàng gần hết hạn.
- **Fix:** Thêm `lotNumber` vào `ImportReceipt` + `ProductUnit`. API trace serial → lot. FEFO sorting cho SP có expiry.

#### 8.3.2 FIFO cost flow/COGS (08 §5)

- **Nguồn:** `08-inventory-analysis-archive.md §5`
- **Mô tả:** Không có COGS. Report `stock-value` tính theo `sellPrice` (giá bán), không phải giá vốn nhập.
- **Tác động:** Lợi nhuận gộp báo cáo sai.
- **Fix:** Thêm `costPrice` vào `ProductUnit` (lấy từ `ImportReceiptItem.unitPrice`). Thêm `costPrice` vào `ExportReceiptItemUnit`. Tính COGS = sum(costPrice).

#### 8.3.3 Batch operations — multi-select, bulk approve (08 §8)

- **Nguồn:** `08-inventory-analysis-archive.md §8`
- **Mô tả:** Export chỉ add product one-by-one. Không bulk approve/cancel. Không Excel upload.
- **Tác động:** Thao tác chậm với số lượng lớn.
- **Fix:** Multi-select product, bulk approve/cancel API, Excel upload cho import/export.

#### 8.3.4 Export reason-specific logic (08 §15.2)

- **Nguồn:** `08-inventory-analysis-archive.md §15.2`
- **Mô tả:** `INTERNAL`, `RETURN_SUPPLIER`, `DISPOSE` xử lý giống `SALE` — không có hành vi riêng.
- **Tác động:** Sai logic nghiệp vụ (vd: `RETURN_SUPPLIER` không cần customer, không sinh doanh thu).
- **Fix:** Tách handler riêng cho từng reason.

#### 8.3.5 Export multi-select product (08 §15.2)

- **Nguồn:** `08-inventory-analysis-archive.md §15.2` (phần Export multi-select trong P1)
- **Mô tả:** Export form dùng single Select, chỉ thêm được 1 product mỗi lần.
- **Tác động:** Tạo phiếu xuất chậm với >5 sản phẩm.
- **Fix:** Chuyển sang multi-select giống import form.

#### 8.3.6 N+1 query ImportReceipt/ExportReceipt (08 §18.1)

- **Nguồn:** `08-inventory-analysis-archive.md §18.1`
- **Mô tả:** `ImportReceiptService.findAll()` ~80+ query/trang 20 receipt. `ExportReceiptService.toResponse()` cũng N+1.
- **Vị trí:** `ImportReceiptService.java:74-95`, `ExportReceiptService.java:297-315`
- **Tác động:** Chậm khi data lớn — đúng 2 màn dùng nhiều nhất.
- **Fix:** Dùng `@EntityGraph` / `JOIN FETCH`, batch query.

---

## 9. P0 bugs từ code review (09)

> Nguồn: `09-business-analysis-archive.md §3` — bugs thật đang chạy trong code, mức P0, ảnh hưởng trực tiếp tính đúng tồn kho.

| # | Bug | Vị trí | Tác động | Fix |
|---|---|---|---|---|
| 1 | **Double-booking khi xuất** | `ExportReceiptService.create()` | Không `FOR UPDATE` khi claim unit → 2 phiếu concurrent chọn trùng serial → phiếu 2 fail lúc approve hoặc overselling | `@Lock(PESSIMISTIC_WRITE)` hoặc `SELECT ... FOR UPDATE`; SOP bổ sung reserve transaction ngắn |
| 2 | **4-eyes thiếu ở StockAdjustmentService** | `StockAdjustmentService.approve():143-147` | 3 service kia enforce OK, riêng StockAdjustment có block check bị comment out → NV tự tạo + tự duyệt adjustment | Uncomment check `createdBy.equals(userId)` → throw |
| 3 | **Không có optimistic locking** | `BaseEntity.java` | `remainingQuantity` bulk bị silent overwrite khi 2 request concurrent | Thêm `@Version` vào entity quan trọng |
| 4 | ~~warrantyMonths không copy~~ | — | **False positive** — đã copy ở `ImportReceiptMappingHelper.java:44` và `ImportReceiptService.java:165,181,223` | Không cần fix |
| 5 | **Check trùng serial không có lock** | `ImportReceiptService.createAndConfirm():200-204` | 2 import concurrent insert trùng serial → unique constraint chặn, 1 request fail | Unique constraint DB + `try-catch DataIntegrityViolationException` |
| 6 | **ReceiptCodeGenerator race condition** | `ReceiptCodeGenerator.java:9-17` | Dùng sequential prefix+date-XXXX, while loop check DB. 2 request concurrent chọn cùng seq → unique constraint chặn, 1 fail (severity thấp) | DB sequence hoặc UUID ngắn |
| 7 | **JWT secret yếu, hardcoded** | `docker-compose.yml:39` | Base64 của ~28 ký tự dễ đoán → có thể forge token | `${JWT_SECRET}` env, không hardcode |
| 8 | **ApiExceptionHandler thiếu handler** | `ApiExceptionHandler.java` | Validation error → 500, DB leak schema | Thêm handler cho validation, DB constraint, catch-all |
| 9 | **N+1 query nặng** | `ImportReceiptService.findAll()`, `ExportReceiptService.toResponse()` | ~80+ query/trang 20 receipt → chậm | `@EntityGraph`/`JOIN FETCH`, batch query |

---

## 10. Bugs còn treo từ rà soát cuối (09c)

> Nguồn: `09c-business-analysis-final-review-archive.md §1`. Chỉ lấy bugs marked "❌ Ngoài phạm vi SOP" hoặc "⏳ Còn mở". Bỏ mục "✅ Đã chốt".

| # | Vấn đề | Nguồn (08) | Chi tiết | Trạng thái |
|---|---|---|---|---|
| 1 | **Field mismatch `productId` vs `id`** — P0, latent type error | 08 §21.1 | Backend trả `productId`, frontend `InventoryItem` khai báo `id`. Hiện tại `inventory-page.tsx` không dùng `item.id` nên chưa crash | ❌ Ngoài phạm vi 7 luồng |
| 2 | **Partial PO import bị chặn ở UI** | 08 §15.1 | Backend đã handle PARTIAL, UI chưa cho nhập 1 phần | ❌ Ngoài phạm vi SOP |
| 3 | **Thiếu endpoint `GET /export-receipt/{id}/units`** | 08 §15.2 | Import có, export không | ❌ Ngoài phạm vi SOP |
| 4 | **`export_receipts` thiếu `purchase_order_id`** | 08 §15.3 | Import có link PO, export không — khó trace khi sales return | ❌ Ngoài phạm vi SOP |
| 5 | **Không có notification/alert chủ động low-stock** | 08 §2 | Chỉ có report thụ động, thiếu `@Scheduled` job | ❌ Ngoài phạm vi SOP |
| 6 | **Customer deduplication** | 08 §14 | Không unique constraint phone/email | ❌ Ngoài phạm vi 7 luồng |
| 7 | **Batch operations cho xuất kho còn thiếu** | 08 §8 | Single Select, không bulk approve/cancel | ❌ Ngoài phạm vi SOP |
| 8 | **Barcode/RFID hoàn toàn chưa có** | 08 §13 | `ProductUnit` không có field barcode | ❌ Ngoài phạm vi SOP |
