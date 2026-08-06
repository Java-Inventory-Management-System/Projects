-- V12: fill remaining status cases for test coverage
-- Gaps fixed vs V7+V11:
--   stock checks   : +IN_PROGRESS +APPROVED +CANCELLED +scope (ZONE/CATEGORY/BOX) +UNEXPECTED diff
--   stock adjust   : +FOUND +REJECTED +CANCELLED +source STOCK_CHECK
--   price adjust   : +REJECTED +CANCELLED
--   purchase orders: NONE existed -> all 4 statuses (OPEN/PARTIAL/COMPLETED/CANCELLED)

-- ==================== STOCK CHECKS ====================

-- 1) IN_PROGRESS, scope ZONE (loc 1 = A-01-01), one unit already counted
INSERT INTO stock_checks (check_code, status, scope_type, scope_id, note, created_by, created_at)
VALUES ('SC-000002', 'IN_PROGRESS', 'ZONE', 1, 'Kiem ke cuoc - khu A dang tien hanh', 4, '2026-08-03 08:00:00');
SET @sc_inprogress = LAST_INSERT_ID();

INSERT INTO stock_check_items (stock_check_id, product_unit_id, tracking_type, expected_status, actual_status, counted_quantity, difference, note)
VALUES
(@sc_inprogress, 4, 'SERIALIZED', 'IN_STOCK', 'IN_STOCK', 1, 'MATCH', NULL),
(@sc_inprogress, 5, 'SERIALIZED', 'IN_STOCK', NULL, NULL, NULL, 'chua kiem'),
(@sc_inprogress, 6, 'SERIALIZED', 'IN_STOCK', NULL, NULL, NULL, NULL);

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

-- ==================== STOCK ADJUSTMENTS ====================

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
VALUES ('ADJ-20260806-001', 'LOST', 7, 1, 1, 'Phat sinh tu kiem ke khu A - thieu 1 CPU', 'STOCK_CHECK', @sc_inprogress, 'PENDING', 4, '2026-08-06 09:00:00');

-- ==================== PRICE ADJUSTMENTS ====================

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