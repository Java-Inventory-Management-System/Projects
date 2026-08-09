-- Seed: stock count — stock checks, stock adjustments, price adjustments,
-- remaining status cases (IN_PROGRESS/APPROVED/CANCELLED scoped checks, PO statuses)

SET @stock1 = (SELECT id FROM product_units WHERE status = 'IN_STOCK' ORDER BY id LIMIT 1 OFFSET 0);
SET @stock2 = (SELECT id FROM product_units WHERE status = 'IN_STOCK' ORDER BY id LIMIT 1 OFFSET 1);
SET @stock3 = (SELECT id FROM product_units WHERE status = 'IN_STOCK' ORDER BY id LIMIT 1 OFFSET 2);
SET @stock4 = (SELECT id FROM product_units WHERE status = 'IN_STOCK' ORDER BY id LIMIT 1 OFFSET 3);
SET @stock5 = (SELECT id FROM product_units WHERE status = 'IN_STOCK' ORDER BY id LIMIT 1 OFFSET 4);
SET @stock6 = (SELECT id FROM product_units WHERE status = 'IN_STOCK' ORDER BY id LIMIT 1 OFFSET 5);
SET @product1 = (SELECT product_id FROM product_units WHERE id = @stock1);
SET @product9 = (SELECT product_id FROM product_units WHERE id = (SELECT id FROM product_units WHERE status = 'EXPORTED' ORDER BY id LIMIT 1 OFFSET 1));

-- Stock checks
INSERT INTO stock_checks (check_code, status, note, created_by, created_at)
VALUES ('SC-000001', 'PENDING', 'Kiểm kê đột xuất khu vực A — hàng tồn lâu', 4, '2026-07-14 08:00:00');
SET @sc_pending = LAST_INSERT_ID();
INSERT INTO stock_check_items (stock_check_id, product_unit_id, expected_status, actual_status, counted_quantity, difference, note)
VALUES
(@sc_pending, @stock1, 'IN_STOCK', NULL, NULL, NULL, NULL),
(@sc_pending, @stock2, 'IN_STOCK', NULL, NULL, NULL, NULL),
(@sc_pending, @stock3, 'IN_STOCK', NULL, NULL, NULL, NULL);

INSERT INTO stock_checks (check_code, status, note, created_by, approved_by, approval_note, created_at)
VALUES ('SC-20260705-001', 'COMPLETED', 'Kiểm kê định kỳ khu vực A', 4, 2, 'Đã đối soát — approved', '2026-07-05 08:00:00');
SET @sc_id = LAST_INSERT_ID();
INSERT INTO stock_check_items (stock_check_id, product_unit_id, expected_status, actual_status, counted_quantity, difference, note)
VALUES
(@sc_id, @stock4, 'IN_STOCK', 'IN_STOCK', 1, 'MATCH', NULL),
(@sc_id, @stock5, 'IN_STOCK', 'IN_STOCK', 1, 'MATCH', NULL),
(@sc_id, @stock6, 'IN_STOCK', NULL, NULL, 'MISSING', 'Không tìm thấy tại vị trí'),
(@sc_id, @stock1, 'IN_STOCK', 'IN_STOCK', 1, 'MATCH', NULL);

-- Stock adjustments
INSERT INTO stock_adjustments (adjust_code, type, product_unit_id, product_id, quantity, reason, status, created_by, created_at)
VALUES ('ADJ-000001', 'LOST', @stock2, @product1, 1, 'Thất lạc trong quá trình kiểm kê — không tìm thấy tại vị trí lưu trữ', 'PENDING', 4, '2026-07-14 09:00:00');

INSERT INTO stock_adjustments (adjust_code, type, product_unit_id, product_id, quantity, reason, status, created_by, approved_by, approval_note, created_at)
VALUES ('ADJ-20260706-001', 'DAMAGED', @stock3, @product1, 1, 'Hỏng do vận chuyển — vỡ PCB', 'APPROVED', 4, 2, 'Xác nhận — chuyển quarantine', '2026-07-06 09:00:00');

-- Price adjustments
SET @import_item = (SELECT id FROM import_receipt_items WHERE product_id = @product9 ORDER BY id LIMIT 1);
INSERT INTO price_adjustments (adjust_code, import_receipt_item_id, old_price, new_price, reason, status, created_by, created_at)
VALUES ('PA-000001', @import_item, 3899000, 3499000, 'Giá SSD Samsung 990 Pro giảm theo thị trường — đề xuất điều chỉnh giá nhập', 'PENDING', 3, '2026-07-14 10:00:00');

INSERT INTO price_adjustments (adjust_code, import_receipt_item_id, old_price, new_price, reason, status, created_by, approved_by, approval_note, created_at)
VALUES ('PA-20260707-001', @import_item, 9499000, 8999000, 'Điều chỉnh giá nhập theo thỏa thuận NCC', 'APPROVED', 4, 2, 'OK', '2026-07-07 14:00:00');

-- ==================== STOCK CHECKS — remaining status cases ====================

-- 1) IN_PROGRESS, scope ZONE (loc 21 = F-01-01, khu F — tránh khu A test dùng), one unit already counted
INSERT INTO stock_checks (check_code, status, scope_type, scope_id, note, created_by, created_at)
VALUES ('SC-000002', 'IN_PROGRESS', 'ZONE', 21, 'Kiem ke cuoc - khu F dang tien hanh', 4, '2026-08-03 08:00:00');
SET @sc_inprogress = LAST_INSERT_ID();

INSERT INTO stock_check_items (stock_check_id, product_unit_id, tracking_type, expected_status, actual_status, counted_quantity, difference, note)
VALUES
(@sc_inprogress, 182, 'SERIALIZED', 'IN_STOCK', 'IN_STOCK', 1, 'MATCH', NULL),
(@sc_inprogress, 183, 'SERIALIZED', 'IN_STOCK', NULL, NULL, NULL, 'chua kiem'),
(@sc_inprogress, 184, 'SERIALIZED', 'IN_STOCK', NULL, NULL, NULL, NULL);

-- 2) APPROVED, scope CATEGORY (cat 1 = CPU), includes UNEXPECTED diff
INSERT INTO stock_checks (check_code, status, scope_type, scope_id, note, created_by, approved_by, approval_note, created_at)
VALUES ('SC-20260801-001', 'APPROVED', 'CATEGORY', 1, 'Kiem ke CPU theo loai', 4, 2, 'Khop voi thuc te - duyet', '2026-08-01 09:00:00');
SET @sc_approved = LAST_INSERT_ID();

INSERT INTO stock_check_items (stock_check_id, product_unit_id, tracking_type, expected_status, actual_status, counted_quantity, difference, note)
VALUES
(@sc_approved, 21, 'SERIALIZED', 'IN_STOCK', 'IN_STOCK', 1, 'MATCH', NULL),
(@sc_approved, 22, 'SERIALIZED', 'IN_STOCK', 'IN_STOCK', 1, 'MATCH', NULL),
(@sc_approved, 23, 'SERIALIZED', 'IN_STOCK', 'DISPOSED', 0, 'UNEXPECTED', 'Tim thay tai bin khac');

-- 3) CANCELLED, no scope, cancelled before counting
INSERT INTO stock_checks (check_code, status, note, created_by, created_at)
VALUES ('SC-20260802-001', 'CANCELLED', 'Huy - trung lich kiem ke dinh ky', 4, '2026-08-02 10:00:00');

-- 4) PENDING, scope BOX (box 8)
INSERT INTO stock_checks (check_code, status, scope_type, scope_id, note, created_by, created_at)
VALUES ('SC-20260803-001', 'PENDING', 'BOX', 8, 'Kiem ke hong trong box 8', 4, '2026-08-06 08:30:00');
SET @sc_box = LAST_INSERT_ID();

INSERT INTO stock_check_items (stock_check_id, product_unit_id, tracking_type, expected_status, actual_status, counted_quantity, difference, note)
VALUES
(@sc_box, 522, 'SERIALIZED', 'IN_STOCK', NULL, NULL, NULL, NULL),
(@sc_box, 523, 'SERIALIZED', 'IN_STOCK', NULL, NULL, NULL, NULL),
(@sc_box, 535, 'SERIALIZED', 'IN_STOCK', NULL, NULL, NULL, NULL);

-- ==================== STOCK ADJUSTMENTS — remaining status cases ====================

-- FOUND + APPROVED
INSERT INTO stock_adjustments (adjust_code, type, product_unit_id, product_id, quantity, reason, status, created_by, approved_by, approval_note, created_at)
VALUES ('ADJ-20260801-001', 'FOUND', 10, 1, 1, 'Phat hien thua 1 CPU tai bin A-01-02 - nhap lai kho', 'APPROVED', 4, 2, 'Dong y nhap lai', '2026-08-01 11:00:00');

-- LOST + REJECTED
INSERT INTO stock_adjustments (adjust_code, type, product_unit_id, product_id, quantity, reason, status, created_by, approved_by, approval_note, created_at)
VALUES ('ADJ-20260802-001', 'LOST', 11, 1, 1, 'Thieu CPU theo kiem ke', 'REJECTED', 4, 2, 'Chua du bang chung - tu choi', '2026-08-02 14:00:00');

-- DAMAGED + CANCELLED
INSERT INTO stock_adjustments (adjust_code, type, product_unit_id, product_id, quantity, reason, status, created_by, created_at)
VALUES ('ADJ-20260803-001', 'DAMAGED', 12, 1, 1, 'Huong vo do va roi - chuyen phan loai', 'CANCELLED', 4, '2026-08-03 15:00:00');

-- LOST + PENDING, source STOCK_CHECK (references the IN_PROGRESS check)
INSERT INTO stock_adjustments (adjust_code, type, product_unit_id, product_id, quantity, reason, source_type, source_id, status, created_by, created_at)
VALUES ('ADJ-20260806-001', 'LOST', 7, 1, 1, 'Phat sinh tu kiem ke khu F - thieu 1 CPU', 'STOCK_CHECK', @sc_inprogress, 'PENDING', 4, '2026-08-06 09:00:00');

-- ==================== PRICE ADJUSTMENTS — remaining status cases ====================

-- REJECTED
INSERT INTO price_adjustments (adjust_code, import_receipt_item_id, old_price, new_price, reason, status, created_by, approved_by, approval_note, created_at)
VALUES ('PA-20260801-001', 3, 10499000, 9999000, 'De xuat giam gia theo thi truong', 'REJECTED', 3, 2, 'Chua du co so - tu choi', '2026-08-01 16:00:00');

-- CANCELLED
INSERT INTO price_adjustments (adjust_code, import_receipt_item_id, old_price, new_price, reason, status, created_by, created_at)
VALUES ('PA-20260802-001', 4, 4999000, 4599000, 'Nha cung cap rui lai de xuat - huy', 'CANCELLED', 3, '2026-08-02 10:30:00');

-- ==================== PURCHASE ORDERS ====================

-- OPEN
INSERT INTO purchase_orders (id, po_code, supplier_id, total_amount, status, expected_date, note, created_by, created_at)
VALUES (1, 'PO-20260701-0001', 1, 86485000, 'OPEN', '2026-08-20', 'Dat bo sung CPU + SSD cho thang 8', 4, '2026-07-01 09:00:00');

INSERT INTO purchase_order_items (po_id, product_id, quantity, unit_price, received_quantity)
VALUES (1, 1, 5, 9499000, 0), (1, 9, 10, 3899000, 0);

-- PARTIAL (received 4/10)
INSERT INTO purchase_orders (id, po_code, supplier_id, total_amount, status, expected_date, note, created_by, created_at)
VALUES (2, 'PO-20260710-0002', 2, 24990000, 'PARTIAL', '2026-08-10', 'Nhap RAM Corsair - nhan 1 phan', 4, '2026-07-10 10:00:00');

INSERT INTO purchase_order_items (po_id, product_id, quantity, unit_price, received_quantity)
VALUES (2, 12, 10, 2499000, 4);

-- COMPLETED
INSERT INTO purchase_orders (id, po_code, supplier_id, total_amount, status, expected_date, note, created_by, created_at)
VALUES (3, 'PO-20260620-0003', 3, 19495000, 'COMPLETED', '2026-07-15', 'Da nhan du SSD', 4, '2026-06-20 08:00:00');

INSERT INTO purchase_order_items (po_id, product_id, quantity, unit_price, received_quantity)
VALUES (3, 9, 5, 3899000, 5);

-- CANCELLED
INSERT INTO purchase_orders (id, po_code, supplier_id, total_amount, status, expected_date, note, created_by, created_at)
VALUES (4, 'PO-20260705-0004', 4, 14998000, 'CANCELLED', '2026-07-30', 'Huy - chuyen sang NCC khac', 4, '2026-07-05 14:00:00');

INSERT INTO purchase_order_items (po_id, product_id, quantity, unit_price, received_quantity)
VALUES (4, 24, 2, 7499000, 0);
