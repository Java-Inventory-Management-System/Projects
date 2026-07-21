# Phân tích Inventory — Hiện trạng & Đề xuất cải tiến

> Tài liệu mapping 15 vấn đề inventory, mô tả hiện trạng code, phân tích tác động và đề xuất giải pháp.

---

## 1. Inventory Overview / Multi-warehouse (Tổng quan tồn kho đa kho)

### Hiện trạng
- ❌ **Không có khái niệm Warehouse entity.** Toàn bộ hệ thống chỉ có 1 kho ảo.
- `Location` là đơn vị lưu trữ vật lý nhỏ nhất (zone → shelf → bin), không gắn với warehouse nào.
- `ProductUnit`, `ImportReceipt`, `ExportReceipt` đều không có `warehouse_id`.
- Dashboard (`DashboardResponse`) chỉ hiển thị tổng số trên toàn hệ thống, không filter theo kho.

### Tác động
- Nếu doanh nghiệp có >1 kho vật lý, không thể phân biệt hàng ở kho A vs kho B.
- Không thể báo cáo riêng theo từng kho.
- Stock transfer (chuyển kho) không khả thi.

### Giải pháp đề xuất
1. Thêm entity `Warehouse`:
   ```java
   @Entity @Table(name = "warehouses")
   public class Warehouse extends AuditableEntity {
       private String code;        // unique, auto-generated: "WH-001"
       private String name;        // required
       private String address;
       private Boolean isActive;   // default true
   }
   ```
2. Thêm `warehouse_id FK → warehouses.id` vào:
   - `locations` — mỗi location thuộc 1 kho
   - `product_units` — hàng ở kho nào
   - `import_receipts` — nhập vào kho nào
   - `export_receipts` — xuất từ kho nào
   - `stock_checks` — kiểm kê kho nào
   - `stock_adjustments` — điều chỉnh ở kho nào
3. Migration thêm dữ liệu mặc định (1 warehouse) cho dữ liệu hiện tại.
4. API filter `?warehouseId=` cho tất cả endpoints danh sách + báo cáo.

### Ghi chú
- Giải pháp này mang tính **architecture change**. Cần cân nhắc thời điểm triển khai.
- Có thể triển khai theo 2 phase: (1) thêm warehouse + migration, (2) thêm filter/báo cáo.

---

## 2. Minimum Stock Alerts (Cảnh báo tồn tối thiểu)

### Hiện trạng
- Đã có field `minStock` trên `Product` entity (nullable).
- Endpoint `/report/low-stock` trả về danh sách sản phẩm có `remainingQuantity <= minStock`.
- Dashboard hiển thị `lowStockCount`.
- **Nhưng**: không có alert chủ động (notification/email), không có scheduled job.

### Tác động
- User phải tự refresh trang dashboard để biết hàng sắp hết.
- Hàng tồn xuống dưới minStock có thể gây gián đoạn kinh doanh nếu không được phát hiện kịp.

### Giải pháp đề xuất
1. Thêm `@Scheduled` job (cron daily hoặc hourly):
   - Scan tất cả `Product` có `remainingQuantity <= minStock`.
   - Tạo `Notification` record cho user có role MANAGER/ADMIN.
2. Entity `Notification` đề xuất:
   ```java
   @Entity @Table(name = "notifications")
   public class Notification extends BaseEntity {
       private Long userId;
       private String type;      // LOW_STOCK, EXPIRING_WARRANTY, etc.
       private String title;
       private String message;
       private Long referenceId; // ID của entity liên quan
       private Boolean isRead;   // default false
       private Instant createdAt;
   }
   ```
3. Frontend: badge đếm notification chưa đọc trên nav + dropdown list.
4. Email alert (optional): gửi email cho manager khi low stock.

---

## 3. Batch/Lot Tracking (Theo dõi lô hàng)

### Hiện trạng
- ❌ Không có field `lotNumber` / `batchNumber` riêng trên `ProductUnit` hay `ImportReceipt`.
- Có thể truy xuất lô theo `importReceiptId` (biết hàng từ phiếu nhập nào), nhưng không có số lô của nhà cung cấp.
- Export auto FIFO, không cho phép chọn lot cụ thể.
- Không có traceability (truy xuất từ export → import).

### Tác động
- Không track được lô hàng lỗi từ nhà cung cấp (recall).
- Không thể ưu tiên xuất hàng theo hạn sử dụng (FEFO — First Expiry First Out).
- Khách hàng hỏi lại serial xuất ra từ lô nào → không có endpoint.

### Giải pháp đề xuất
1. Thêm field `lotNumber VARCHAR(100)` vào `ImportReceipt` (số lô do NCC cung cấp).
2. Thêm field `lotNumber VARCHAR(100)` vào `ProductUnit` (kế thừa từ import receipt).
3. Auto-generate lot code khi tạo import nếu không nhập: `LOT-{receiptCode}-{itemIndex}`.
4. Thêm API:
   - `GET /product-unit/trace/{serialNumber}` — trả về lịch sử nhập/xuất của 1 serial.
   - `GET /products/{id}/trace` — trả về toàn bộ lot còn hàng + số lượng.
5. Lot-picking UI: cho phép user chọn lot khi xuất thay vì auto FIFO.
6. FEFO support: nếu product có expiry date, ưu tiên xuất lot gần hết hạn.

---

## 4. Location Management — Capacity Check (Quản lý vị trí & kiểm tra sức chứa)

### Hiện trạng
- ✅ `Location` entity với zone/shelf/bin hierarchy.
- ✅ `LocationPicker` UI trong import form với auto-suggest location theo category.
- ❌ `Location` không có `maxCapacity` — không thể biết bin đã đầy hay chưa.
- ❌ Khi import, không kiểm tra bin có đủ chỗ trống trước khi gán.
- ❌ Export: không cho phép chọn location cụ thể để xuất (FIFO tự động chọn unit đầu tiên).

### Tác động
- Không có capacity → không có cảnh báo khi bin sắp đầy, nhân viên dễ nhập chồng quá sức chứa thực tế.
- Không thể tối ưu layout kho dựa trên sức chứa.
- Nhân viên xuất hàng không kiểm soát được lấy hàng từ bin nào.
- **Quyết định:** không chặn cứng khi đầy — chỉ cảnh báo mềm (SOP §2.2 B3), vì kích thước linh kiện đa dạng, khó định lượng capacity chính xác.

### Giải pháp đề xuất
1. Thêm `maxCapacity DECIMAL(15,2) NULL` vào `Location`.
2. Thêm logic validation ở `ImportReceiptService`:
   - Khi tạo/duyệt import, tính tổng `remainingQuantity` của các `ProductUnit` trong location + quantity nhập.
   - Nếu vượt quá `maxCapacity` → **cảnh báo mềm** (soft warning, không chặn) — nhân viên vẫn có thể chọn bin đầy, nhưng UI hiển thị warning "Bin đã đầy, cân nhắc chọn bin khác" (SOP §2.2 B3).
   - BULK product: so sánh `quantity` với capacity còn lại.
   - SERIALIZED product: mỗi unit = 1.
3. `LocationMapData` trả về thêm `maxCapacity`, `currentOccupancy`, `isFull`.
4. Frontend: bin color dựa trên % capacity thay vì hardcode threshold.
5. Export: thêm cột chọn location, hiển thị số lượng tồn theo location.
6. Filter location: "Còn trống", "Còn chỗ", "Gần đầy", "Đầy".

---

## 5. Inventory Valuation / FIFO Cost Flow (Định giá tồn kho)

### Hiện trạng
- ❌ Không có cơ chế tính COGS (Cost of Goods Sold) theo FIFO.
- `ImportReceiptItem.unitPrice` lưu giá nhập.
- `ExportReceiptItem.sellPrice` và `ExportReceiptItemUnit.sellPrice` do user nhập tay.
- Report `stock-value` tính `quantity * sellPrice` (giá bán), không phải giá vốn.
- `UnitPrice` trên export receipt là do user nhập tay, không auto-lấy từ import unit.

### Tác động
- Báo cáo tài chính không chính xác (profit margin sai).
- Không thể tính giá vốn xuất kho theo chuẩn FIFO.
- Không audit được giá vốn từng đơn hàng.

### Giải pháp đề xuất
1. Thêm `costPrice DECIMAL(15,2)` vào `ProductUnit` — ghi lại giá nhập của unit đó tại thời điểm import.
2. Khi import duyệt:
   - `ProductUnit.costPrice = ImportReceiptItem.unitPrice`
3. Khi export:
   - `ExportReceiptItemUnit.sellPrice` vẫn do user nhập (giá bán thực tế).
   - Thêm `costPrice` vào `ExportReceiptItemUnit` = `ProductUnit.costPrice` của unit được xuất.
   - COGS = sum(costPrice) của các unit trong phiếu xuất.
4. Thêm bảng `InventoryLayer` (cost layer) để support average cost nếu cần:
   ```sql
   CREATE TABLE inventory_layers (
       product_id    BIGINT NOT NULL,
       receipt_id    BIGINT NOT NULL,   -- import receipt
       quantity      DECIMAL(15,2) NOT NULL,
       unit_cost     DECIMAL(15,2) NOT NULL,
       remaining_qty DECIMAL(15,2) NOT NULL,  -- qty chưa xuất
       ...
   );
   ```
5. Report cập nhật: `stock-value` tính theo `quantity * costPrice`.

---

## 6. Import Receipt — Return/Undo (Trả hàng nhập)

### Hiện trạng
- ✅ `ImportReceipt` có cancel flow: kiểm tra unit chưa xuất → set status `REMOVED`.
- ❌ Không có flow "trả hàng cho nhà cung cấp" (return to supplier).
- Không có credit note / hoàn tiền.

### Tác động
- Khi hàng nhập bị lỗi/sai, không thể tạo chứng từ trả NCC.
- Phải dùng export `RETURN_SUPPLIER` thủ công, không link với import receipt gốc.
- Mất traceability: không biết hàng trả thuộc phiếu nhập nào.

### Giải pháp đề xuất
1. Tạo `ImportReturn` entity hoặc reuse export flow:
   ```java
   @Entity @Table(name = "import_returns")
   public class ImportReturn extends AuditableEntity {
       private String returnCode;              // auto: "IRET-{code}"
       private Long importReceiptId;           // FK → import_receipts
       private String reason;                  // enum: DEFECTIVE, WRONG_ITEM, EXCESS, etc.
       private String status;                  // PENDING → APPROVED → COMPLETED
       private Long createdBy;
       private Long approvedBy;
       private String note;
   }
   ```
2. ImportReturnItem:
   ```java
   @Entity @Table(name = "import_return_items")
   public class ImportReturnItem extends BaseEntity {
       private Long returnId;
       private Long importReceiptItemId;
       private Long productUnitId;
       private BigDecimal quantity;   // số lượng trả (BULK)
       private BigDecimal refundAmount; // số tiền được hoàn (nếu có)
   }
   ```
3. Flow:
   - User chọn import receipt → chọn sản phẩm/lô cần trả → nhập lý do.
   - Khi duyệt: tạo export receipt với `reason = RETURN_SUPPLIER`, link với import return.
   - `ProductUnit` status → `RETURNED`.
4. UI reuse export form với reason pre-filled = RETURN_SUPPLIER.

---

## 7. Export — Return/Undo (Sales Return / Hoàn trả hàng bán)

### Hiện trạng
- ✅ `ExportReceipt` có cancel flow (khi chưa duyệt hoặc reverse sau approve).
- ❌ Không có flow "khách hàng trả lại hàng".
- `WarrantyRequest` có tiếp nhận hàng BH nhưng không phải sales return.

### Tác động
- Khách hàng muốn trả/đổi hàng → không có chứng từ nhập lại kho.
- Hàng trả về muốn nhập kho phải tạo import receipt tay, mất traceability.

### Giải pháp đề xuất
1. Tạo `SalesReturn` entity:
   ```java
   @Entity @Table(name = "sales_returns")
   public class SalesReturn extends AuditableEntity {
       private String returnCode;
       private Long exportReceiptId;     // FK → export_receipts
       private Long customerId;
       private String reason;            // DEFECTIVE, CHANGE_MIND, WARRANTY, etc.
       private String status;            // PENDING → INSPECTING → APPROVED → COMPLETED
       private Long createdBy;
       private Long approvedBy;
       private String note;
   }
   ```
2. SalesReturnItem:
   ```java
   @Entity @Table(name = "sales_return_items")
   public class SalesReturnItem extends BaseEntity {
       private Long returnId;
       private Long exportReceiptItemUnitId;
       private Long productUnitId;
       private BigDecimal quantity;
       private BigDecimal refundAmount;
       private String condition;         // GOOD, DAMAGED, DEFECTIVE
       private String resolution;        // RESTOCK, REPLACE, SCRAP
   }
   ```
3. Flow:
   - Chọn export receipt → chọn sản phẩm trả → kiểm tra (inspect) → quyết định nhập lại hay hủy.
   - `condition = GOOD` và `resolution = RESTOCK`: tạo import receipt tự động, `ProductUnit` status → `IN_STOCK`.
   - `condition = DAMAGED` và `resolution = SCRAP`: tạo stock adjustment type LOST.
   - `resolution = REPLACE`: tạo export receipt mới (đổi hàng).
4. Warranty inheritance: nếu hàng còn warranty → giữ nguyên hạn BH khi nhập lại.

---

## 8. Import/Export — Batch Operations (Thao tác hàng loạt)

### Hiện trạng
- ✅ Import: multi-select product combobox, thêm hàng loạt.
- ✅ Import: batch paste serial (SKU: SN1, SN2).
- ❌ Export: chỉ add product one-by-one (single Select).
- ❌ Không có bulk approve/cancel nhiều phiếu.
- ❌ Không có Excel upload tạo phiếu (import/export).
- ❌ Import có `useBlocker` draft warning, export không.

### Tác động
- Export tạo phiếu chậm, khó chịu khi có nhiều sản phẩm.
- Manager phải approve từng phiếu một.
- Nhập kho số lượng lớn ( >20 items) phải thao tác tay từng cái.

### Giải pháp đề xuất
1. Export form:
   - Đổi `Select` single → `Popover` + `Command` multi-select (giống import).
   - Cho phép add nhiều product cùng lúc.
   - Thêm `useBlocker` draft warning.
2. Bulk API:
   - `POST /api/v1/import-receipt/bulk-approve` — nhận list ID.
   - `POST /api/v1/export-receipt/bulk-approve` — nhận list ID.
   - `POST /api/v1/import-receipt/bulk-cancel`.
   - `POST /api/v1/export-receipt/bulk-cancel`.
3. Excel upload:
   - Import: upload Excel → parse → preview → tạo phiếu.
   - Export: upload danh sách sản phẩm + số lượng → tạo phiếu.
4. Frontend: table có checkbox select + "Approve selected" button.
5. Batch edit trong form: chọn nhiều dòng → edit quantity/price cùng lúc.

---

## 9. Stock Transfer Between Warehouses (Chuyển kho)

### Hiện trạng
- ❌ Không tồn tại. Vì chưa có multi-warehouse (#1), không thể chuyển kho.

### Tác động
- Không thể luân chuyển hàng giữa các kho vật lý.
- Khi có 1 kho, không cần.

### Giải pháp đề xuất
(Phụ thuộc vào #1 — cần thêm Warehouse trước)

1. Entity `StockTransfer`:
   ```java
   @Entity @Table(name = "stock_transfers")
   public class StockTransfer extends AuditableEntity {
       private String transferCode;       // auto: "STF-{code}"
       private Long sourceWarehouseId;
       private Long destinationWarehouseId;
       private String status;             // PENDING → IN_TRANSIT → COMPLETED → CANCELLED
       private Long createdBy;
       private Long approvedBy;
       private Instant completedAt;
       private String note;
   }
   ```
2. StockTransferItem:
   ```java
   @Entity @Table(name = "stock_transfer_items")
   public class StockTransferItem extends BaseEntity {
       private Long transferId;
       private Long productId;
       private Long productUnitId;
       private BigDecimal quantity;     // BULK
   }
   ```
3. Flow nghiệp vụ:
   - User tạo transfer: chọn source warehouse → destination → sản phẩm + số lượng.
   - PENDING → select units từ source (FIFO hoặc manual chọn serial).
   - Duyệt → IN_TRANSIT:
     - Tạo export receipt từ source warehouse (reason = INTERNAL, tự động, không cần duyệt).
     - `ProductUnit.status` → `IN_TRANSIT`.
   - Khi hàng đến destination → COMPLETED:
     - Tạo import receipt vào destination warehouse (tự động, không cần duyệt).
     - `ProductUnit.warehouseId` → destination.
     - `ProductUnit.status` → `IN_STOCK`.
4. UI: trang transfer list + create form (tương tự import/export).

---

## 10. Reports/Analytics (Báo cáo & Phân tích)

### Hiện trạng
- ✅ 6 endpoints report: inventory-summary, by-category, low-stock, stock-value, activity, dead-stock.
- ✅ Dashboard: totalProducts, totalItems, lowStockCount.
- ✅ Audit log: AOP ghi nhận mọi thay đổi.
- ❌ Thiếu: inventory turnover (vòng quay tồn kho), ABC analysis, aging stock.
- ❌ Báo cáo xuất (sales): chưa có doanh số theo thời gian, theo khách hàng.
- ❌ So sánh kỳ này/kỳ trước.
- ❌ Chart trên frontend (chỉ có table).

### Tác động
- Không phân tích được hiệu quả tồn kho.
- Không biết sản phẩm nào chậm luân chuyển (dead stock có nhưng basic).
- Manager khó ra quyết định dựa trên dữ liệu.

### Giải pháp đề xuất
1. Thêm reports:
   - `report/inventory-turnover` — doanh số / tồn kho trung bình theo tháng.
   - `report/abc-analysis` — phân loại A (80%), B (15%), C (5%) theo giá trị.
   - `report/aging-stock` — phân nhóm 0-30, 31-60, 61-90, >90 ngày.
   - `report/sales-summary` — doanh số, chiết khấu, trả hàng theo thời gian.
   - `report/sales-by-customer` — top customers theo doanh số.
2. Frontend: thêm chart (recharts hoặc chart.js).
3. Export report ra Excel (full data, không truncate).
4. Scheduled report: gửi email báo cáo hàng ngày/tuần.

---

## 11. Multi-currency (Đa tiền tệ)

### Hiện trạng
- ❌ Không có. Tất cả giá dùng `BigDecimal` (precision 15, scale 2).
- ❌ Không có entity `Currency`, không có tỷ giá, không có format tiền tệ.
- Frontend: hardcode format VND (`new Intl.NumberFormat('vi-VN')`).

### Tác động
- Nếu nhập hàng từ Trung Quốc (USD/CNY), không thể ghi nhận giá gốc.
- Báo cáo tài chính có thể sai nếu tỷ giá thay đổi.
- UX: khách hàng nước ngoài không thấy được giá trị quen thuộc.

### Giải pháp đề xuất
(Chỉ triển khai nếu có nhu cầu nhập khẩu thực tế)

1. Entity `Currency`:
   ```java
   @Entity @Table(name = "currencies")
   public class Currency {
       private String code;        // "VND", "USD", "CNY"
       private String name;
       private String symbol;      // "₫", "$", "¥"
       private BigDecimal exchangeRate; // rate to VND
       private Boolean isBase;     // VND = base
   }
   ```
2. Thêm `currency VARCHAR(3)` vào `ImportReceipt` và `ImportReceiptItem`.
3. Thêm `exchangeRate DECIMAL(15,6)` vào `ImportReceipt`.
4. Khi báo cáo stock value, convert về VND theo tỷ giá tại thời điểm nhập.
5. Frontend: hiển thị giá kèm currency symbol.
6. Lưu ý: Export receipt giá bán thường là VND (bán nội địa), không cần multi-currency.

---

## 12. Price History (Lịch sử giá)

### Hiện trạng
- ⚠️ Đã có `PriceAdjustment` entity — điều chỉnh giá trên import receipt item (có duyệt).
- ❌ Không có `SellPriceHistory` — không track ai đổi `Product.sellPrice`, khi nào, từ giá nào sang giá nào.
- ❌ Không có `CostPriceHistory` — giá vốn thay đổi.

### Tác động
- Không audit được thay đổi giá bán.
- Khi có dispute, không biết giá bán tại thời điểm mua hàng là bao nhiêu.

### Giải pháp đề xuất
1. Entity `SellPriceHistory`:
   ```java
   @Entity @Table(name = "sell_price_history")
   public class SellPriceHistory extends BaseEntity {
       private Long productId;
       private BigDecimal oldPrice;
       private BigDecimal newPrice;
       private Long changedBy;
       private String reason;          // MANUAL, PROMOTION, etc.
       private Instant changedAt;
   }
   ```
2. Service: khi `Product.sellPrice` thay đổi trong `ProductService.update()`, tự động tạo `SellPriceHistory`.
3. API: `GET /products/{id}/price-history` — trả về lịch sử giá.
4. UI: modal xem lịch sử giá trên product detail.
5. `CostPriceHistory` tương tự nhưng track giá nhập (ImportReceiptItem.unitPrice). Có thể dùng chung `PriceAdjustment` cho mục đích này.

---

## 13. Barcode/RFID

### Hiện trạng
- ✅ `Product.barcode` field (optional String, max 100).
- ✅ Hiển thị/input trong product create/edit form.
- ❌ Không có barcode generation (EAN-13 / Code128).
- ❌ Không có scanning (camera / scanner hardware).
- ❌ Không có RFID support.
- ❌ `ProductUnit` không có barcode riêng.

### Tác động
- Nhập/xuất/kiểm kê phải nhập serial bằng tay (chậm, sai).
- Không tận dụng được barcode scanner giá rẻ.
- In tem nhãn cho từng unit không khả thi.

### Giải pháp đề xuất
1. Barcode generation:
   - Khi tạo `ProductUnit` (serialized), tự sinh barcode theo format: `{productCode}-{unitIndex}`.
   - Hoặc dùng thư viện (barcode4j, zxing) sinh ảnh barcode.
2. Frontend scanning:
   - Thư viện: `html5-qrcode` (camera) hoặc `quagga2` (barcode).
   - Khi scan → search product → pre-fill form.
3. Label printing:
   - Nút "In tem" trên product unit detail / import detail.
   - In ra giấy decal dán lên sản phẩm.
4. `ProductUnit.barcode` field (nullable, unique):
   ```java
   private String barcode; // barcode riêng của unit này
   ```
5. Bulk barcode generation khi import: sinh N barcode cho N unit, in hàng loạt.

---

## 14. Customer — Deduplication (Chống trùng khách hàng)

### Hiện trạng
- ❌ Không có unique constraint nào trên `Customer`.
- ❌ Không check duplicate name/phone/email khi create/update.
- ❌ Chỉ search được by name (`findByNameContainingIgnoreCase`).
- `Customer` entity: có `name`, `phone`, `email`, `address`, `note`, `isActive`.

### Tác động
- Dễ tạo customer trùng (VD: "Nguyễn Văn A" vs "Nguyễn Văn A" với phone khác).
- Khi xuất hàng, khó tìm đúng customer → chọn nhầm.
- Dữ liệu customer không clean, báo cáo sales by customer sai.

### Giải pháp đề xuất
1. Thêm unique constraint ở DB (migration):
   ```sql
   ALTER TABLE customers ADD CONSTRAINT uk_customers_phone UNIQUE (phone);
   ALTER TABLE customers ADD CONSTRAINT uk_customers_email UNIQUE (email);
   ```
2. Service validation:
   - `create`: check phone/email đã tồn tại → throw `DuplicateResourceException`.
   - `update`: check phone/email đã tồn tại ở customer khác ID.
   - Name: warning mềm (cảnh báo "Có thể trùng" nhưng vẫn cho tạo).
3. Tìm kiếm mở rộng:
   ```java
   @Query("SELECT c FROM Customer c WHERE " +
          "LOWER(c.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
          "c.phone LIKE CONCAT('%', :keyword, '%') OR " +
          "LOWER(c.email) LIKE LOWER(CONCAT('%', :keyword, '%'))")
   Page<Customer> search(@Param("keyword") String keyword, Pageable pageable);
   ```
4. Merge tool (admin):
   - Chọn customer chính → chọn customer phụ → merge dữ liệu.
   - Cập nhật `export_receipts.customerId` từ phụ → chính.
   - Soft-delete customer phụ.
5. UI: hiển thị cảnh báo khi tên/phone gần giống customer đã tồn tại.

---

## 15. Import/Export — Missing Features (Tính năng còn thiếu)

Tổng hợp các tính năng import/export đang thiếu, không nằm trong các mục riêng ở trên.

### 15.1 Import còn thiếu

| Tính năng | Mô tả | Ưu tiên |
|-----------|-------|---------|
| **Draft status** | Hiện tại tạo là `PENDING_APPROVAL` ngay. Cần `DRAFT` để save tạm, chưa gửi duyệt. | 🔴 Cao |
| **Update pending receipt** | Không thể sửa phiếu nhập sau khi tạo (chỉ approve/cancel). Manager muốn sửa trước khi duyệt. | 🔴 Cao |
| **Partial PO import** | Không thể nhập 1 phần của PO (VD: PO 100 cái, nhập 60 trước 40 sau). `updatePOProgress` đã hỗ trợ PARTIAL status nhưng UI không cho nhập partial. | 🟡 Trung |
| **Validate supplier exists** | `Supplier` ID không được validate trong `ImportReceiptService.createAndConfirm`. | 🟡 Trung |
| **Set warranty trên import** | `warrantyMonths` lưu ở `ImportReceiptItem` nhưng không copy sang `ProductUnit` khi tạo unit. Chỉ set warranty khi export (sale) — sai logic. | 🔴 Cao |
| **PENDING status** | Flow cũ design có `PENDING` (vừa tạo) → `PENDING_APPROVAL` (gửi duyệt), nhưng service tạo thẳng `PENDING_APPROVAL`. Bỏ `PENDING` khỏi state machine? | 🟡 Trung |

### 15.2 Export còn thiếu

| Tính năng | Mô tả | Ưu tiên |
|-----------|-------|---------|
| **Location picking** | User không thể chọn location nào để xuất. Hệ thống auto FIFO không quan tâm location. | 🟡 Trung |
| **Serial/lot selection** | User không thể chọn serial cụ thể để xuất. Hệ thống auto chọn FIFO. | 🔴 Cao |
| **Reason-specific logic** | `INTERNAL`, `RETURN_SUPPLIER`, `DISPOSE` đều xử lý giống `SALE` — không có hành vi riêng. | 🟡 Trung |
| **Double-booking risk** | Units được "claim" ở `create()` qua `ExportReceiptItemUnit` nhưng chưa deduct đến lúc approve. Hai phiếu tạo song song claim cùng unit → approve phiếu thứ 2 fail. Cần dùng `PESSIMISTIC_WRITE` lock hoặc reserve stock. | 🔴 Cao |
| **Export receipt units endpoint** | `GET /export-receipt/{id}/units` không tồn tại (import có). | 🟢 Thấp |

### 15.3 Chung

| Tính năng | Mô tả | Ưu tiên |
|-----------|-------|---------|
| **Soft-delete** | Không có soft-delete cho receipt (import/export). Cancel là cách duy nhất. Nếu cần xóa hẳn → không có. | 🟢 Thấp |
| **PO link trên export** | Export receipt không có `purchaseOrderId` (import có). Khi sales return, không link được với PO. | 🟢 Thấp |
| **4-eyes principle** | `createdBy != approvedBy` chưa được enforce trong service layer. | 🔴 Cao |
| **Audit log đầy đủ** | Import/Export service đã có `@AuditLog`? Cần kiểm tra và bổ sung. | 🟡 Trung |

---

## Phụ lục — Ma trận ưu tiên tổng thể

| # | Vấn đề | Nỗ lực | Tác động | Phụ thuộc | Ưu tiên |
|---|--------|--------|----------|-----------|---------|
| 4 | Location capacity | Thấp | Cao | Không | **P0** |
| 6,7 | Return flow | Cao | Cao | Không | **P0** |
| 14 | Customer dedup | Thấp | Cao | Không | **P0** |
| 15 | Draft/Pending update import | Trung | Cao | Không | **P0** |
| 15 | Set warranty trên import | Thấp | Cao | Không | **P0** |
| 15 | Serial selection export | Trung | Cao | Không | **P0** |
| 15 | 4-eyes principle | Thấp | Cao | Không | **P0** |
| 15 | Double-booking fix | Thấp | Cao | Không | **P0** |
| 3 | Batch/Lot picking | Trung | Trung | Không | **P1** |
| 5 | FIFO cost flow | Cao | Trung | Không | **P1** |
| 8 | Batch operations | Trung | Trung | Không | **P1** |
| 15 | Export multi-select | Thấp | Trung | Không | **P1** |
| 15 | Reason-specific logic | Trung | Trung | Không | **P1** |
| 10 | Advanced reports | Cao | Trung | #5 (FIFO) | **P1** |
| 2 | Low stock alert | Trung | Thấp | Không | **P2** |
| 12 | Price history | Thấp | Thấp | Không | **P2** |
| 13 | Barcode scanning | Cao | Thấp | Không | **P2** |
| 1 | Multi-warehouse | Rất cao | Cao | Tất cả | **P3** |
| 9 | Stock transfer | Cao | Trung | #1 | **P3** |
| 11 | Multi-currency | Cao | Thấp | #1 | **P4** |

### Giải thích mức ưu tiên

- **P0 (Critical)**: Lỗi nghiệp vụ hoặc thiếu flow cơ bản, ảnh hưởng trực tiếp đến accuracy của inventory hoặc không thể vận hành.
- **P1 (High)**: Tính năng quan trọng cho quản lý và báo cáo, nhưng có thể workaround.
- **P2 (Medium)**: Nice-to-have, cải thiện UX và chất lượng dữ liệu.
- **P3 (Low)**: Architecture change lớn, cần kế hoạch riêng.
- **P4 (Defer)**: Chỉ làm khi có yêu cầu thực tế.

---

## 16. Auth/Security — Missing 4-eyes Principle & Weak JWT

### 16.1 `created_by != approved_by` không được enforce
- **File:** `ImportReceiptService.approve()`, `ExportReceiptService.approve()`, `StockCheckService.approve()`, `StockAdjustmentService.approve()`
- **Hiện trạng:** ❌ Không có check nào ngăn người tạo tự duyệt phiếu của mình.
- **Tác động:** Vi phạm separation of duties. NV kho có thể tạo và tự duyệt phiếu nhập/xuất.
- **Giải pháp:** Thêm `if (receipt.getCreatedBy().equals(currentUserId)) throw new SelfApprovalException()` ở đầu mỗi method approve. Đã được document trong `known-issues.md` mục 7.9 nhưng chưa implement.

### 16.2 JWT secret yếu, hardcoded trong docker-compose.yml
- **File:** `docker-compose.yml:39`
- **Hiện trạng:** `JWT_SECRET: RGF3bkJyZWFrZXJEYXduQnJlYWtlckRhd25CcmVha2Vy` (base64 của "DawnBreakerDawnBreakerDawnBreaker" — ~28 ký tự, rất yếu).
- **Tác động:** Kẻ tấn công có thể forge JWT token nếu biết secret này.
- **Giải pháp:** Dùng biến môi trường `${JWT_SECRET}` với fallback, không hardcode.

### 16.3 AuthTokenFilter không verify user còn active
- **File:** `AuthTokenFilter.java:61-68`
- **Hiện trạng:** Filter tạo `UserDetailsImpl` từ JWT claims mà không query DB để kiểm tra user còn tồn tại/active.
- **Tác động:** User bị deactivate vẫn dùng được JWT cũ đến hết hạn.
- **Giải pháp:** Thêm `userRepository.findByIdAndIsActiveTrue()` check trong filter.

### 16.4 Không có brute-force protection trên login
- **File:** `AuthService.java`
- **Hiện trạng:** Login endpoint public, không rate limit, không lockout sau N lần fail.
- **Tác động:** Attacker có thể brute force password.
- **Giải pháp:** Thêm `@RateLimiter` (Resilience4j) hoặc login attempt counter + lockout.

### 16.5 Password policy quá yếu
- **File:** `AuthService.java:160`
- **Hiện trạng:** Chỉ check `length < 6`. Không yêu cầu uppercase, lowercase, number, special char.
- **Giải pháp:** Thêm pattern validation: ít nhất 8 ký tự, 1 uppercase, 1 lowercase, 1 number.

### 16.6 Access token lưu trong localStorage
- **File:** `frontend/src/utils/http-client.ts:27`
- **Hiện trạng:** JWT access token lưu ở localStorage, dễ bị đánh cắp qua XSS.
- **Giải pháp:** Chuyển access token vào memory (Zustand store) + httpOnly cookie cho refresh token.

### 16.7 File upload endpoint public + không giới hạn
- **File:** `SecurityConfig.java:101`
- **Hiện trạng:** `/api/v1/uploads/**` public, không auth, không size/type restriction.
- **Giải pháp:** Thêm auth + max file size + allowed content types.

## 17. Data Integrity — Locking & Transaction

### 17.1 Không có optimistic locking trên entity nào
- **File:** `BaseEntity.java` + tất cả entity
- **Hiện trạng:** ❌ Không entity nào có `@Version`. Concurrent update sẽ silent overwrite.
- **Tác động:** `ProductUnit.remainingQuantity` có thể bị ghi đè khi 2 request xuất cùng lúc → overselling.
- **Giải pháp:** Thêm `@Version private Long version;` vào `BaseEntity` hoặc entity quan trọng (`ProductUnit`, `ImportReceipt`, `ExportReceipt`).

### 17.2 ExportReceiptService.create() không có pessimistic lock
- **File:** `ExportReceiptService.java:120-135`
- **Hiện trạng:** Query stock units không dùng `FOR UPDATE`. Giữa lúc đọc stock và tạo `ExportReceiptItemUnit`, request khác có thể lấy mất units.
- **Tác động:** Double-booking: 2 phiếu xuất có thể claim cùng 1 unit → approve phiếu thứ 2 fail.
- **Giải pháp:** Thêm `@Lock(PESSIMISTIC_WRITE)` trên repository method hoặc dùng `SELECT ... FOR UPDATE`.

### 17.3 ImportReceiptService.createAndConfirm() kiểm tra serial unique không an toàn
- **File:** `ImportReceiptService.java:200-204`
- **Hiện trạng:** `findExistingSerialNumbers()` không dùng `FOR UPDATE`, 2 import concurrent có thể cùng insert serial trùng.
- **Giải pháp:** Dùng unique constraint DB làm safeguard + `try-catch DataIntegrityViolationException`.

### 17.4 Thiếu @Transactional trên một số method
- **File:** `AuthService.changePassword()`, `AuthService.forgotPassword()`
- **Hiện trạng:** Các method modify nhiều entity không có `@Transactional`. Nếu fail giữa chừng, dữ liệu không nhất quán.
- **Giải pháp:** Thêm `@Transactional`.

## 18. Performance — N+1 Queries

### 18.1 N+1 trong ImportReceiptService.findAll()
- **File:** `ImportReceiptService.java:74-95`
- **Hiện trạng:** Với mỗi receipt trong page (mặc định 20 items), code query riêng:
  - `importReceiptItemRepository.findByReceiptId()`
  - `supplierRepository.findById()`
  - `userRepository.findById()` x2
  - `purchaseOrderRepository.findById()`
  - `productUnitRepository.findByImportReceiptItemId()` per item (trong `getUnitCounts()`)
- **Tác động:** Page 20 receipts → ~80+ queries. Data lớn → slow.
- **Giải pháp:** Dùng `@EntityGraph` hoặc `JOIN FETCH` trong repository. Batch query units theo list itemId thay vì loop.

### 18.2 N+1 trong ExportReceiptService.toResponse()
- **File:** `ExportReceiptService.java:297-315`
- **Hiện trạng:** Mỗi response gọi `findById` riêng cho customer, createdBy, approvedBy.
- **Giải pháp:** Dùng `@EntityGraph` hoặc JOIN FETCH.

### 18.3 N+1 trong StockCheckService, StockAdjustmentService, PriceAdjustmentService, WarrantyRequestService
- **Hiện trạng:** Tất cả đều có pattern: query list → loop → enrich từng item bằng `findById`.
- **Tác động:** Tích lũy performance degradation khi data lớn.
- **Giải pháp:** Batch query pattern: thu thập tất cả ID → `findAllById()` 1 lần → map.

## 19. Error Handling — Exception Handler Thiếu

### 19.1 ApiExceptionHandler chỉ handle ApiException
- **File:** `ApiExceptionHandler.java`
- **Hiện trạng:** Chỉ có `@ExceptionHandler(ApiException.class)`. Các exception khác (validation, JSON parse, DB constraint, ...) trả về 500 mặc định của Spring.
- **Tác động:** Validation error trả về 500 thay vì 400. DB error leak schema.
- **Giải pháp:** Thêm handlers cho:
  - `MethodArgumentNotValidException` → 400 + field errors
  - `HttpMessageNotReadableException` → 400
  - `DataIntegrityViolationException` → 409
  - `ConstraintViolationException` → 400
  - `Exception.class` catch-all → 500 (không leak stack trace)

### 19.2 Error response format không nhất quán
- **Hiện trạng:** `ApiExceptionHandler` dùng `ExceptionMessage` (`timestamp`, `status`, `message`). `AuthEntryPointJwt` dùng `ResponseObject` (`code`, `message`, `data`).
- **Giải pháp:** Thống nhất format. Recommend dùng `ResponseObject` cho tất cả response (cả success và error).

## 20. Frontend Issues

### 20.1 Token refresh queue có thể xử lý stale token
- **File:** `frontend/src/utils/http-client.ts:18-24`
- **Hiện trạng:** Khi nhiều request fail 401 đồng thời, `failedQueue` lưu resolvers. Nếu refresh đầu success, tất cả đều dùng token mới OK. Nhưng nếu refresh fail → `processQueue(error, null)` được gọi, `isRefreshing` cleanup có thể xảy ra trước khi request mới kịp queue.
- **Giải pháp:** Dùng `Promise` queue pattern an toàn hơn (tại từng thời điểm chỉ 1 refresh active, các request khác await promise đó).

### 20.2 Thiếu staleTime/gcTime trên React Query hooks
- **Hiện trạng:** Hầu hết hooks dùng `useQuery` mặc định (`staleTime: 0`). Mỗi lần mount component → refetch.
- **Tác động:** Gọi API không cần thiết khi user chuyển tab rồi quay lại.
- **Giải pháp:** Set `staleTime: 30000` (30s) cho các danh sách ít thay đổi, `staleTime: 5000` cho stock.

### 20.3 Không có loading/error/empty state abstraction
- **Hiện trạng:** Routes dùng `Suspense` với fallback "Loading..." nhưng không có pattern nhất quán cho loading/error/empty state trên từng page.
- **Giải pháp:** Tạo wrapper components: `QueryBoundary` (loading + error + retry), `EmptyState` (icon + message + action).

## 21. DTO/Entity Mapping Mismatch

### 21.1 `InventoryItemResponse.productId` vs frontend `InventoryItem.id`
- **File:** Backend `InventoryItemResponse.java:8` vs Frontend `types.ts:81`
- **Hiện trạng:** Backend trả `productId` (Long), frontend `InventoryItem` interface định nghĩa field `id: number`.
- **Tác động:** Khi frontend gọi API inventory, access `item.id` sẽ undefined. Runtime error.
- **Giải pháp:** Đồng bộ tên field. Sửa frontend thành `productId` hoặc backend thành `id`.

### 21.2 `LocationResponse` frontend có `maxCapacity` nhưng backend chưa có
- **File:** Frontend `types.ts:196` vs Backend `Location.java`
- **Hiện trạng:** Frontend type `LocationResponse` khai báo `maxCapacity: number | null`. Backend `Location` entity không có field này.
- **Giải pháp:** Thêm `maxCapacity` vào backend `Location` (đã đề xuất ở case #4) hoặc xóa khỏi frontend type.

## 22. Configuration & DevOps

### 22.1 DB password + JWT secret + Mail credentials hardcoded
- **File:** `docker-compose.yml`, `backend/.env`
- **Hiện trạng:** `MYSQL_ROOT_PASSWORD: 123456`, `DB_PASS: 123456`, mailtrap credentials in plaintext.
- **Giải pháp:** Dùng `.env` file + `docker-compose` references `${VAR}`. KHÔNG commit `.env` file thật.

### 22.2 `.env` đã commit vào git
- **Hiện trạng:** `backend/.env` chứa credential thật (mailtrap) được track bởi git.
- **Giải pháp:** `git rm --cached backend/.env`, thêm vào `.gitignore`, chỉ commit `.env.template`.

### 22.3 `flyway.validate-on-migrate: false`
- **File:** `application.yml:35`
- **Hiện trạng:** Flyway không validate migration checksum, cho phép drift giữa code và DB.
- **Giải pháp:** Set `true` trong production profile.

### 22.4 `show-sql: true` luôn bật
- **File:** `application.yml:27`
- **Hiện trạng:** SQL queries log ra console (kể cả production).
- **Giải pháp:** Chỉ bật trong `dev` profile.

### 22.5 Backend port 8888 exposed trực tiếp (không qua nginx)
- **File:** `docker-compose.yml:55-56`
- **Hiện trạng:** Port `8888:8888` expose ra host. User có thể bypass nginx → hit backend trực tiếp.
- **Giải pháp:** Chỉ expose nginx port (80/443), backend chỉ доступний qua internal network.

## 23. Testing — Code Coverage Quá Thấp

### 23.1 Chỉ có 1 file test cho toàn bộ backend
- **File:** `WarrantyRequestServiceTests.java`
- **Hiện trạng:** 1 file test duy nhất cho 1 service. Không có test cho:
  - ImportReceiptService (nhập kho, approve, cancel)
  - ExportReceiptService (xuất kho, FIFO allocation)
  - StockCheckService (kiểm kê)
  - StockAdjustmentService
  - AuthService (login, register, forgot password)
  - ProductService, LocationService, CustomerService, ...
- **Tác động:** Mỗi lần refactor hoặc thêm tính năng, không có safety net. Bug dễ lọt vào production.
- **Giải pháp:** Viết unit test cho critical paths (approve/cancel flow, stock validation, concurrent access).

### 23.2 Không có integration test
- **Hiện trạng:** Không có `@SpringBootTest` test nào kiểm tra full flow (controller → service → repository → DB).
- **Giải pháp:** Thêm integration test cho core flows: import → approve → export → cancel.

### 23.3 Không có frontend test
- **Hiện trạng:** Frontend không có unit test (vitest) hay component test (testing-library).
- **Giải pháp:** Viết test cho critical components (import form validation, serial input).

## 24. Unused States & Dead Code

### 24.1 `ImportReceiptStatus.PENDING` không bao giờ được dùng
- **Hiện trạng:** Enum có `PENDING` nhưng `createAndConfirm()` tạo thẳng `PENDING_APPROVAL`. `PENDING` là dead state.
- **Giải pháp:** Xóa `PENDING` khỏi enum hoặc implement draft flow thực sự (tạo → PENDING → submit → PENDING_APPROVAL).

### 24.2 `PriceAdjustmentController` dùng `Map<String, String>` thay vì DTO
- **File:** `PriceAdjustmentController.java:48-56`
- **Hiện trạng:** `@RequestBody(required = false) Map<String, String> body` — không type-safe, dễ sai, không có trong API docs.
- **Giải pháp:** Tạo DTO riêng.

### 24.3 `UserService.updateStatus()` tên method gây hiểu nhầm
- **File:** `UserService.java:141`
- **Hiện trạng:** Method tên `updateStatus` nhưng thực tế toggle `isDeleted` (soft-delete), không phải `status` column.
- **Giải pháp:** Rename thành `toggleDeleted()` hoặc `softDelete()`.

## 25. ReceiptCodeGenerator — Race Condition

### 25.1 Code generation có thể trùng dưới concurrent load
- **File:** `ReceiptCodeGenerator.java`
- **Hiện trạng:** Nếu sinh code dùng timestamp + random, 2 request trong cùng millisecond có thể tạo code giống nhau. `existsByReceiptCode` check có race condition.
- **Gợi ý:** Dùng DB sequence hoặc UUID ngắn làm suffix. Hoặc unique constraint DB làm safeguard.

## 26. Migration Gaps

### 26.1 V5, V6, V7 bị skip trong schema migration
- **Hiện trạng:** Schema migrations: V1, V2, V3, V4, V8, V9, V10, V11, V12. V5, V6, V7 tồn tại trong seed directory. Flyway `validate-on-migrate: false` che giấu vấn đề này. V5 và V6 là seed data.
- **Gợi ý:** Đảm bảo numbering nhất quán. Dùng Flyway location = schema + seed với order đúng.

### 26.2 V4 `category_zones.zone_code` không có FK
- **Hiện trạng:** `category_zones.zone_code` không tham chiếu bảng `zones` nào (không tồn tại). Chỉ là string đồng bộ với `locations.zone_code` qua convention.
- **Gợi ý:** Tạo bảng `zones` hoặc chấp nhận convention code.

## 27. Audit Log Issues

### 27.1 AuditLogAspect dùng reflection get ID — dễ sai
- **File:** `AuditLogAspect.java:135-154`
- **Hiện trạng:** Dùng reflection iterate methods tìm `getId()` hoặc `id`. Nếu response có nhiều method matching → behavior undefined.
- **Gợi ý:** Dùng interface `Identifiable { Long getId(); }` hoặc annotation `@AuditId` trên field.

### 27.2 Audit log chưa ghi đầy đủ cho các module mới
- **Hiện trạng:** `PriceAdjustment`, `StockAdjustment` có `@AuditLog`? Cần kiểm tra và bổ sung.
- **Gợi ý:** Audit log AOP đã có, chỉ cần thêm `@AuditLog` annotation.

## 28. ProductUnit Status — Thiếu Một Số Status

### 28.1 `RETURNED_TO_SUPPLIER` status không tồn tại
- **Hiện trạng:** `ProductUnitStatus` enum: `IN_STOCK`, `SOLD`, `LOST`, `REMOVED`, `DEFECTIVE`, `IN_TRANSIT`, `SENT_TO_MANUFACTURER`. Không có `RETURNED_TO_SUPPLIER`.
- **Tác động:** Khi trả hàng NCC (case #6), không có status phù hợp.
- **Gợi ý:** Thêm `RETURNED_TO_SUPPLIER`, `RETURNED_BY_CUSTOMER`.

### 28.2 `warrantyStartDate` / `warrantyExpiresAt` chỉ set khi export (sale)
- **File:** `ExportReceiptService.approve()`
- **Hiện trạng:** `ProductUnit.warrantyMonths` được set từ `ImportReceiptItem` khi import, nhưng `warrantyStartDate` và `warrantyExpiresAt` chỉ được set khi xuất bán (tại approve).
- **Tác động:** Không thể biết warranty bắt đầu từ khi nào nếu chỉ nhập mà chưa xuất.
- **Gợi ý:** Set `warrantyStartDate = importDate` và `warrantyExpiresAt = importDate + warrantyMonths` khi import duyệt. Khi xuất bán, có thể reset nếu cần.

---

## Ma trận ưu tiên mở rộng

| # | Vấn đề | Nỗ lực | Tác động | Loại | Ưu tiên |
|---|--------|--------|----------|------|---------|
| 16.1 | 4-eyes principle | Thấp | Cao | Bug | **P0** |
| 17.1 | Optimistic locking | Trung | Cao | Bug | **P0** |
| 17.2 | Pessimistic lock export | Thấp | Cao | Bug | **P0** |
| 21.1 | Field name mismatch (productId vs id) | Thấp | Cao | Bug | **P0** |
| 19.1 | Exception handler thiếu | Thấp | Cao | Bug | **P0** |
| 16.2 | JWT secret yếu | Thấp | Cao | Security | **P0** |
| 22.1 | Hardcoded credentials | Thấp | Cao | Security | **P0** |
| 22.2 | .env committed | Thấp | Cao | Security | **P0** |
| 16.3 | AuthTokenFilter không verify user | Trung | Cao | Security | **P0** |
| 16.4 | Brute-force login | Trung | Cao | Security | **P0** |
| 18.1 | N+1 ImportReceipt | Trung | Trung | Performance | **P1** |
| 16.6 | Token trong localStorage | Trung | Trung | Security | **P1** |
| 23 | Thiếu test | Cao | Cao | Testing | **P1** |
| 20.2 | staleTime missing | Thấp | Trung | Performance | **P2** |
| 24 | Dead code/unused states | Thấp | Thấp | Cleanup | **P2** |
| 27 | Audit log gaps | Thấp | Trung | Feature | **P2** |
| 28 | Missing ProductUnit statuses | Thấp | Trung | Feature | **P2** |

> Tài liệu này mô tả hiện trạng code tại thời điểm 21/07/2026. Khi triển khải giải pháp, cập nhật trạng thái và bổ sung chi tiết implementation.
