-- Seed: inventory — import/export receipts, product units, return test data,
-- demo boxes, QC processing zone

-- Import receipts (receiving supplier stock)
INSERT INTO import_receipts(id,receipt_code,supplier_id,status,note,created_by,approved_by,created_at,updated_at)
VALUES(1,'INIT-000001',1,'RECEIVED',NULL,4,2,'2026-07-01 08:00:00','2026-07-01 08:30:00');

-- Import receipt line items
INSERT INTO import_receipt_items(id,receipt_id,product_id,quantity,unit_price,warranty_months)WITH iri(id,rid,pid,qty,price,warranty)AS(
    SELECT 1,1,1,12,9499000,36 UNION ALL SELECT 2,1,2,8,6999000,36
    UNION ALL SELECT 3,1,3,6,10499000,36 UNION ALL SELECT 4,1,4,15,4999000,36
    UNION ALL SELECT 5,1,5,4,12499000,36 UNION ALL SELECT 6,1,6,2,17499000,36
    UNION ALL SELECT 7,1,7,7,10999000,36 UNION ALL SELECT 8,1,8,1,22499000,36
    UNION ALL SELECT 9,1,9,25,3899000,60 UNION ALL SELECT 10,1,10,30,1599000,36
    UNION ALL SELECT 11,1,11,8,5499000,60 UNION ALL SELECT 12,1,12,20,2499000,24
    UNION ALL SELECT 13,1,13,6,4299000,24 UNION ALL SELECT 14,1,14,15,2799000,24
    UNION ALL SELECT 15,1,15,3,9999000,36 UNION ALL SELECT 16,1,16,5,6999000,36
    UNION ALL SELECT 17,1,17,4,7999000,36 UNION ALL SELECT 18,1,18,10,4499000,36
    UNION ALL SELECT 19,1,19,7,2399000,60 UNION ALL SELECT 20,1,20,4,2999000,60
    UNION ALL SELECT 21,1,21,2,5999000,60 UNION ALL SELECT 22,1,22,5,1999000,12
    UNION ALL SELECT 23,1,23,3,1999000,12 UNION ALL SELECT 24,1,24,1,7499000,24
    UNION ALL SELECT 25,1,25,4,4799000,24 UNION ALL SELECT 26,1,26,6,2799000,24
    UNION ALL SELECT 27,1,27,2,7499000,24 UNION ALL SELECT 28,1,28,18,2799000,60
    UNION ALL SELECT 29,1,29,22,2399000,60 UNION ALL SELECT 30,1,30,5,2499000,24
    UNION ALL SELECT 31,1,31,16,1199000,12 UNION ALL SELECT 32,1,32,0,1799000,12
)SELECT id,rid,pid,qty,price,warranty FROM iri;

SET FOREIGN_KEY_CHECKS=0;
-- Product units (serialized inventory items)
INSERT INTO product_units(serial_number,product_id,tracking_type,import_receipt_item_id,location_id,status,imported_at,warranty_months)
WITH RECURSIVE seq(n)AS(SELECT 1 UNION ALL SELECT n+1 FROM seq WHERE n<100),loc(pid,loc1,loc2,cnt)AS(SELECT 1,1,2,2 UNION ALL SELECT 2,1,2,2 UNION ALL SELECT 3,3,4,2 UNION ALL SELECT 4,3,4,2 UNION ALL SELECT 5,5,5,1 UNION ALL SELECT 6,6,6,1 UNION ALL SELECT 7,7,7,1 UNION ALL SELECT 8,8,8,1 UNION ALL SELECT 9,9,10,2 UNION ALL SELECT 10,9,10,2 UNION ALL SELECT 11,11,11,1 UNION ALL SELECT 12,14,15,2 UNION ALL SELECT 13,14,15,2 UNION ALL SELECT 14,16,16,1 UNION ALL SELECT 15,17,17,1 UNION ALL SELECT 16,18,18,1 UNION ALL SELECT 17,19,19,1 UNION ALL SELECT 18,20,20,1 UNION ALL SELECT 19,21,21,1 UNION ALL SELECT 20,22,22,1 UNION ALL SELECT 21,23,23,1 UNION ALL SELECT 22,24,24,1 UNION ALL SELECT 23,25,25,1 UNION ALL SELECT 24,26,26,1 UNION ALL SELECT 25,27,27,1 UNION ALL SELECT 26,28,28,1 UNION ALL SELECT 27,29,29,1 UNION ALL SELECT 28,12,12,1 UNION ALL SELECT 29,13,13,1 UNION ALL SELECT 30,30,30,1 UNION ALL SELECT 31,27,28,2)
SELECT CONCAT('INIT-',i.id,'-',LPAD(ROW_NUMBER()OVER(PARTITION BY i.product_id ORDER BY s.n),3,'0')),i.product_id,'SERIALIZED',i.id,CASE (s.n-1)%loc.cnt WHEN 0 THEN loc.loc1 ELSE loc.loc2 END,'IN_STOCK','2026-07-01 08:00:00',i.warranty_months
FROM import_receipt_items i JOIN seq s ON s.n<=i.quantity JOIN loc ON loc.pid=i.product_id ORDER BY i.product_id,s.n;

-- Export receipts: #1 (SALE, CPU+DDR4+Win11, approved+fulfilled)
INSERT INTO export_receipts(id,receipt_code,reason,customer_id,total_amount,status,note,created_by,approved_by,created_at,updated_at)
VALUES(1,'EXP-20260702-001','SALE',1,58992000,'COMPLETED',NULL,4,2,'2026-07-02 14:00:00','2026-07-02 16:00:00');
INSERT INTO export_receipt_items VALUES(1,1,1,3,11499000,34497000),(2,1,9,5,4899000,24495000);
INSERT INTO export_receipt_item_units(export_receipt_item_id,product_unit_id,quantity,sell_price)SELECT 1,id,1,11499000 FROM product_units WHERE product_id=1 AND status='IN_STOCK' ORDER BY imported_at LIMIT 3;
INSERT INTO export_receipt_item_units(export_receipt_item_id,product_unit_id,quantity,sell_price)SELECT 2,id,1,4899000 FROM product_units WHERE product_id=9 AND status='IN_STOCK' ORDER BY imported_at LIMIT 5;
UPDATE product_units SET status='EXPORTED',
    warranty_start_date = '2026-07-02 08:00:00',
    warranty_expires_at = DATE_ADD('2026-07-02 08:00:00', INTERVAL warranty_months MONTH)
WHERE id IN(SELECT product_unit_id FROM export_receipt_item_units WHERE export_receipt_item_id IN(1,2));
-- Export #2 (SALE, CPU+DDR4, waiting approval, pending test)
INSERT INTO export_receipts(id,receipt_code,reason,customer_id,total_amount,status,note,created_by,created_at,updated_at)
VALUES(2,'EXP-20260708-001','SALE',3,30598000,'PENDING','Chờ duyệt xuất',3,'2026-07-08 11:00:00','2026-07-08 11:00:00');
INSERT INTO export_receipt_items VALUES(3,2,5,2,15299000,30598000);

-- ============================================================
-- Return test data: import/export for BULK + SERIALIZED mix,
-- multi-serial same product, expired CHANGE_MIND window
-- ============================================================

INSERT INTO import_receipts (id, receipt_code, supplier_id, status, note, created_by, approved_by, created_at, updated_at)
VALUES (100, 'INIT-SEED-100', 1, 'RECEIVED', 'Stock cho return tests', 4, 2, '2026-07-25 08:00:00', '2026-07-25 08:30:00');

INSERT INTO import_receipt_items (id, receipt_id, product_id, quantity, unit_price, warranty_months)
VALUES
  (100, 100, 1,  5,  9499000, 36),
  (101, 100, 9, 10,  3899000, 60),
  (102, 100, 32, 8,  1799000, 24),
  (103, 100, 33, 100, 150000, 12);

INSERT INTO product_units (serial_number, product_id, tracking_type, import_receipt_item_id, location_id, status, imported_at, warranty_months)
SELECT CONCAT('RET-CPU-', LPAD(n, 3, '0')), 1, 'SERIALIZED', 100, 1, 'IN_STOCK', '2026-07-25 08:00:00', 36
FROM (SELECT 1 n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5) nums;

INSERT INTO product_units (serial_number, product_id, tracking_type, import_receipt_item_id, location_id, status, imported_at, warranty_months)
SELECT CONCAT('RET-SSD-', LPAD(n, 3, '0')), 9, 'SERIALIZED', 101, 1, 'IN_STOCK', '2026-07-25 08:00:00', 60
FROM (SELECT 1 n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10) nums;

INSERT INTO product_units (serial_number, product_id, tracking_type, import_receipt_item_id, location_id, status, imported_at, warranty_months)
SELECT CONCAT('RET-DDR4-', LPAD(n, 3, '0')), 32, 'SERIALIZED', 102, 1, 'IN_STOCK', '2026-07-25 08:00:00', 24
FROM (SELECT 1 n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8) nums;

INSERT INTO product_units (serial_number, product_id, tracking_type, initial_quantity, remaining_quantity, import_receipt_item_id, location_id, status, imported_at, warranty_months)
VALUES (NULL, 33, 'BULK', 100, 100, 103, 33, 'IN_STOCK', '2026-07-25 08:00:00', 12);

-- Export 100 — within 7-day CHANGE_MIND window, BULK + SERIALIZED mix
INSERT INTO export_receipts (id, receipt_code, reason, customer_id, total_amount, status, note, created_by, approved_by, fulfilled_by, fulfilled_at, created_at, updated_at)
VALUES (100, 'EXP-20260728-100', 'SALE', 1, 23996000, 'COMPLETED', 'BULK + SERIALIZED mix', 4, 2, 2, '2026-07-28 10:00:00', '2026-07-28 08:00:00', '2026-07-28 10:00:00');

INSERT INTO export_receipt_items (id, receipt_id, product_id, quantity, unit_price, total_price)
VALUES (100, 100, 1, 2, 11499000, 22998000), (101, 100, 33, 5, 199000, 995000);

SET @cpu1 = (SELECT id FROM product_units WHERE serial_number = 'RET-CPU-001');
SET @cpu2 = (SELECT id FROM product_units WHERE serial_number = 'RET-CPU-002');
INSERT INTO export_receipt_item_units (export_receipt_item_id, product_unit_id, quantity, sell_price)
VALUES (100, @cpu1, 1, 11499000), (100, @cpu2, 1, 11499000);

UPDATE product_units
SET status = 'EXPORTED',
    warranty_start_date = '2026-07-28 08:00:00',
    warranty_expires_at = DATE_ADD('2026-07-28 08:00:00', INTERVAL warranty_months MONTH)
WHERE id IN (@cpu1, @cpu2);

UPDATE product_units SET remaining_quantity = remaining_quantity - 5
WHERE product_id = 33 AND tracking_type = 'BULK';

-- Export 101 — multi-serial same product (3 SSDs)
INSERT INTO export_receipts (id, receipt_code, reason, customer_id, total_amount, status, note, created_by, approved_by, fulfilled_by, fulfilled_at, created_at, updated_at)
VALUES (101, 'EXP-20260727-101', 'SALE', 1, 14697000, 'COMPLETED', 'Multi-serial SSDs', 4, 2, 2, '2026-07-27 14:00:00', '2026-07-27 10:00:00', '2026-07-27 14:00:00');

INSERT INTO export_receipt_items (id, receipt_id, product_id, quantity, unit_price, total_price)
VALUES (104, 101, 9, 3, 4899000, 14697000);

SET @ssd1 = (SELECT id FROM product_units WHERE serial_number = 'RET-SSD-001');
SET @ssd2 = (SELECT id FROM product_units WHERE serial_number = 'RET-SSD-002');
SET @ssd3 = (SELECT id FROM product_units WHERE serial_number = 'RET-SSD-003');
INSERT INTO export_receipt_item_units (export_receipt_item_id, product_unit_id, quantity, sell_price)
VALUES (104, @ssd1, 1, 4899000), (104, @ssd2, 1, 4899000), (104, @ssd3, 1, 4899000);

UPDATE product_units
SET status = 'EXPORTED',
    warranty_start_date = '2026-07-27 10:00:00',
    warranty_expires_at = DATE_ADD('2026-07-27 10:00:00', INTERVAL warranty_months MONTH)
WHERE id IN (@ssd1, @ssd2, @ssd3);

-- Export 102 — expired CHANGE_MIND window (1 CPU + 1 DDR4)
INSERT INTO export_receipts (id, receipt_code, reason, customer_id, total_amount, status, note, created_by, approved_by, fulfilled_by, fulfilled_at, created_at, updated_at)
VALUES (102, 'EXP-20260715-102', 'SALE', 1, 13298000, 'COMPLETED', 'Old export — expired CHANGE_MIND', 4, 2, 2, '2026-07-15 14:00:00', '2026-07-15 10:00:00', '2026-07-15 14:00:00');

INSERT INTO export_receipt_items (id, receipt_id, product_id, quantity, unit_price, total_price)
VALUES (105, 102, 1, 1, 11499000, 11499000), (106, 102, 32, 1, 1799000, 1799000);

SET @cpu3 = (SELECT id FROM product_units WHERE serial_number = 'RET-CPU-003');
SET @ddr4_1 = (SELECT id FROM product_units WHERE serial_number = 'RET-DDR4-001');
INSERT INTO export_receipt_item_units (export_receipt_item_id, product_unit_id, quantity, sell_price)
VALUES (105, @cpu3, 1, 11499000), (106, @ddr4_1, 1, 1799000);

UPDATE product_units
SET status = 'EXPORTED',
    warranty_start_date = '2026-07-15 10:00:00',
    warranty_expires_at = DATE_ADD('2026-07-15 10:00:00', INTERVAL warranty_months MONTH)
WHERE id IN (@cpu3, @ddr4_1);

SET FOREIGN_KEY_CHECKS=1;

-- ============================================================
-- Demo seed for warranty/return flows (terminal + PENDING records)
-- ============================================================

SET @sold1 = (SELECT id FROM product_units WHERE status = 'EXPORTED' ORDER BY id LIMIT 1 OFFSET 0);
SET @sold2 = (SELECT id FROM product_units WHERE status = 'EXPORTED' ORDER BY id LIMIT 1 OFFSET 1);
SET @sold3 = (SELECT id FROM product_units WHERE status = 'EXPORTED' ORDER BY id LIMIT 1 OFFSET 2);
SET @sold4 = (SELECT id FROM product_units WHERE status = 'EXPORTED' ORDER BY id LIMIT 1 OFFSET 3);
SET @product1 = (SELECT product_id FROM product_units WHERE id = @sold1);

UPDATE product_units
SET warranty_start_date = imported_at,
    warranty_expires_at = DATE_ADD(imported_at, INTERVAL warranty_months MONTH)
WHERE status = 'EXPORTED' AND warranty_start_date IS NULL;

-- Return receipts
INSERT INTO return_receipts (receipt_code, customer_id, original_export_receipt_id, reason, status, note, created_by, created_at)
VALUES ('RR-000002', 1, 1, 'CHANGE_MIND', 'PENDING_APPROVAL', 'Khách đổi ý — trả lại CPU trong 7 ngày', 4, '2026-07-14 10:00:00');
SET @rr_pending = LAST_INSERT_ID();
INSERT INTO return_receipt_items (return_receipt_id, product_unit_id, product_id, quantity, `condition`, resulting_action)
VALUES (@rr_pending, @sold4, @product1, 1, 'GOOD', 'RESTOCK');

INSERT INTO return_receipts (receipt_code, customer_id, original_export_receipt_id, reason, status, note, created_by, approved_by, approved_at, created_at)
VALUES ('RR-000001', 1, 1, 'DEFECTIVE', 'COMPLETED', 'Khách trả CPU do lỗi không boot — đã kiểm tra xác nhận lỗi thật', 4, 2, '2026-07-11 10:00:00', '2026-07-11 09:00:00');
INSERT INTO return_receipt_items (return_receipt_id, product_unit_id, product_id, quantity, `condition`, resulting_action)
VALUES (LAST_INSERT_ID(), @sold1, @product1, 1, 'GOOD', 'RESTOCK');

-- ============= DEMO BOXES =============

-- Box 8: serialized (SSD x2 + DDR4 x1) SEALED tại A-01-01
-- Box 9: keo tản nhiệt BULK SEALED tại A-01-03 (toàn bộ remaining)
INSERT INTO boxes (id, box_code, location_id, status, sealed_quantity, sealed_by, sealed_at, note, created_by, created_at)
VALUES (8, 'BOX-20260730-0008', 1, 'SEALED', 3, 2, '2026-07-30 09:00:00', 'Hàng lẻ đóng hộp chờ xuất', 2, '2026-07-30 09:00:00');

INSERT INTO boxes (id, box_code, location_id, status, sealed_quantity, sealed_by, sealed_at, note, created_by, created_at)
SELECT 9, 'BOX-20260730-0009', location_id, 'SEALED', remaining_quantity, 2, '2026-07-30 09:10:00', 'Keo tản nhiệt BULK đóng hộp', 2, '2026-07-30 09:10:00'
FROM product_units WHERE import_receipt_item_id = 103 AND tracking_type = 'BULK';

UPDATE product_units SET box_id = 8
WHERE serial_number IN ('RET-SSD-004', 'RET-SSD-005', 'RET-DDR4-002')
  AND status = 'IN_STOCK' AND box_id IS NULL;

UPDATE product_units SET box_id = 9
WHERE import_receipt_item_id = 103 AND tracking_type = 'BULK'
  AND status = 'IN_STOCK' AND box_id IS NULL;

-- ============= QC PROCESSING ZONE =============

-- Deactivated zones (kept for FK integrity, is_active=FALSE instead of DELETE):
--   X-01-01, X-01-02, X-02-01, X-02-02 (old isolation/test zones)
--   R-01-01 (old return staging, V9), I-01-01 (old waste sorting)
UPDATE locations SET is_active = FALSE
WHERE full_code IN ('X-01-01', 'X-01-02', 'X-02-01', 'X-02-02', 'R-01-01', 'I-01-01');

UPDATE locations
SET description = 'Trạm QC bắt buộc trước khi nhập lại kho bán / khu xử lý hàng trả-RMA'
WHERE full_code = 'QC-QC-HOLD';

-- 4 physical shelves inside QC zone (bins, not separate zones)
INSERT INTO locations (zone_code, shelf_code, bin_code, full_code, description, is_active)
VALUES ('QC', '01', '01', 'QC-01-01', 'Hàng mới trả về - chờ xử lý / chờ QC', TRUE),
       ('QC', '01', '02', 'QC-01-02', 'Hàng lỗi - chờ đủ lô gửi NCC (RMA)', TRUE),
       ('QC', '01', '03', 'QC-01-03', 'Hàng NCC vừa trả về - chưa qua QC', TRUE),
       ('QC', '01', '04', 'QC-01-04', 'Hàng chết - chờ hủy / trả hẳn NCC', TRUE);

-- ============= QC TEST SEED =============

-- 1. RETURN_QC_HOLD: returned CPU (customer returned marked as restock)
INSERT INTO return_receipts (id, receipt_code, customer_id, original_export_receipt_id, reason, status, note, created_by, approved_by, approved_at, created_at)
VALUES (5, 'RR-QC-0005', 1, 1, 'CHANGE_MIND', 'COMPLETED',
        'Khach doi y, tra lai CPU', 4, 2, '2026-08-05 09:00:00', '2026-08-05 08:30:00');

INSERT INTO return_receipt_items (return_receipt_id, product_unit_id, product_id, quantity, `condition`, resulting_action, description, evidence_image)
SELECT 5, id, product_id, 1, 'GOOD', 'RESTOCK', 'Den tra lai ban, hien trang tot', NULL
FROM product_units WHERE serial_number IN ('INIT-1-002', 'INIT-1-003');

UPDATE product_units
SET status = 'RETURN_QC_HOLD', location_id = (SELECT id FROM locations WHERE full_code = 'QC-01-01')
WHERE serial_number IN ('INIT-1-002', 'INIT-1-003');

-- 2. WAITING_RMA_EXPORT: defective SSDs waiting to batch to supplier
INSERT INTO return_receipts (id, receipt_code, customer_id, original_export_receipt_id, reason, status, note, version, created_by, approved_by, approved_at, created_at)
VALUES (6, 'RR-2026-0006', 1, 1, 'DEFECTIVE', 'COMPLETED',
        'SSD loi doc/ghi, cho gop du luong gui bao hanh (RMA)', 0, 3, 2, '2026-08-05 10:00:00', '2026-08-05 09:45:00');

INSERT INTO return_receipt_items (return_receipt_id, product_unit_id, product_id, quantity, `condition`, resulting_action, description, evidence_image)
SELECT 6, id, product_id, 1, 'DEFECTIVE', 'WARRANTY_TRANSFER', 'SMART error, loi doc/ghi cham', NULL
FROM product_units WHERE serial_number IN ('INIT-9-002', 'INIT-9-003');

UPDATE product_units
SET status = 'WAITING_RMA_EXPORT', location_id = (SELECT id FROM locations WHERE full_code = 'QC-01-02')
WHERE serial_number IN ('INIT-9-002', 'INIT-9-003');

-- 3. Warranty imports (REPAIRED + REJECTED) back from supplier
INSERT INTO import_receipts (id, receipt_code, supplier_id, status, note, created_by, approved_by, original_warranty_export_id, created_at, updated_at)
VALUES (510, 'INIT-RMA-0001', 1, 'RECEIVED', 'NCC bao hanh SSD tra ve - REPAIRED', 3, 2, 1, '2026-08-05 11:00:00', '2026-08-05 11:30:00');

INSERT INTO import_receipt_items (id, receipt_id, product_id, quantity, unit_price, warranty_months, warranty_result_type)
VALUES (510, 510, 9, 1, 3899000, 60, 'REPAIRED');

UPDATE product_units SET import_receipt_item_id = 510 WHERE serial_number = 'INIT-9-002';

-- REJECTED: DDR4 refused, RMA_UNREPAIRABLE (QC shelf 4)
INSERT INTO import_receipts (id, receipt_code, supplier_id, status, note, created_by, approved_by, original_warranty_export_id, created_at, updated_at)
VALUES (511, 'INIT-RMA-0002', 1, 'REJECTED', 'NCC tu choi bao hanh - loi vi nguoi dung', 3, 2, 102, '2026-08-05 11:15:00', '2026-08-05 11:45:00');

INSERT INTO import_receipt_items (id, receipt_id, product_id, quantity, unit_price, warranty_months, warranty_result_type)
VALUES (511, 511, 32, 1, 1799000, 24, 'REJECTED');

UPDATE product_units
SET status = 'RMA_REPAIRED_RETURNED', location_id = (SELECT id FROM locations WHERE full_code = 'QC-01-03'), import_receipt_item_id = 510
WHERE serial_number = 'INIT-9-002';

UPDATE product_units
SET status = 'RMA_UNREPAIRABLE', location_id = (SELECT id FROM locations WHERE full_code = 'QC-01-04')
WHERE serial_number = 'RET-DDR4-001';

-- 4. PENDING_DISPOSAL: rejected/scrapped returned unit
INSERT INTO return_receipts (id, receipt_code, customer_id, original_export_receipt_id, reason, status, note, version, created_by, approved_by, approved_at, created_at)
VALUES (7, 'RR-2026-0007', 1, 1, 'DEFECTIVE', 'COMPLETED', 'Tra ve core vi tu chua bao hanh', 0, 3, 2, '2026-08-05 12:00:00', '2026-08-05 11:50:00');

INSERT INTO return_receipt_items (return_receipt_id, product_unit_id, product_id, quantity, `condition`, resulting_action, description, evidence_image)
SELECT 7, id, product_id, 1, 'DEFECTIVE', 'SCRAP', 'Den bien do, khong dang sua', 'seed/evidence/rma-rejected.png'
FROM product_units WHERE serial_number = 'INIT-9-005';

UPDATE product_units
SET status = 'PENDING_DISPOSAL', location_id = (SELECT id FROM locations WHERE full_code = 'QC-01-04')
WHERE serial_number = 'INIT-9-005';

-- 5. PENDING_APPROVAL: return awaiting approval
INSERT INTO return_receipts (id, receipt_code, customer_id, original_export_receipt_id, reason, status, note, version, created_by, created_at)
VALUES (9, 'RR-2026-0009', 1, 1, 'WRONG_ITEM', 'PENDING_APPROVAL', 'Giao nham ma, cho duyet', 0, 3, '2026-08-06 14:00:00');

INSERT INTO return_receipt_items (return_receipt_id, product_unit_id, product_id, quantity, `condition`, resulting_action, description)
SELECT 9, id, product_id, 1, 'GOOD', 'RESTOCK', 'Giao nham, hong nguyen ven'
FROM product_units WHERE serial_number = 'INIT-9-004';
