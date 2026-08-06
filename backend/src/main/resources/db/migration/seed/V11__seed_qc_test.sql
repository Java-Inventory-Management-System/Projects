-- V11: seed data for QC processing station + pending approval flow
-- Populates stations that were empty:
--   RETURN_QC_HOLD        (QC-01-01) - return restock, waiting QC pass
--   WAITING_RMA_EXPORT    (QC-01-02) - defective waiting batch to send to supplier
--   RMA_REPAIRED_RETURNED (QC-01-03) - repaired by supplier, waiting QC pass
--   PENDING_DISPOSAL      (QC-01-04) - rejected/scrap return, waiting dispose confirm
--   RMA_UNREPAIRABLE      (QC-01-04) - supplier refused warranty
-- Plus 1 PENDING_APPROVAL return for the approval test.

-- ============ 1. RETURN_QC_HOLD: returned CPU (customer returned marked as restock) ============
INSERT INTO return_receipts (id, receipt_code, customer_id, original_export_receipt_id, reason, status, note, created_by, approved_by, approved_at, created_at)
VALUES (5, 'RR-QC-0005', 1, 1, 'CHANGE_MIND', 'COMPLETED',
        'Khach doi y, tra lai CPU', 4, 2, '2026-08-05 09:00:00', '2026-08-05 08:30:00');

INSERT INTO return_receipt_items (return_receipt_id, product_unit_id, product_id, quantity, `condition`, resulting_action, description, evidence_image)
SELECT 5, id, product_id, 1, 'GOOD', 'RESTOCK', 'Den tra lai ban, hien trang tot', NULL
FROM product_units WHERE serial_number IN ('INIT-1-002', 'INIT-1-003');

UPDATE product_units
SET status = 'RETURN_QC_HOLD', location_id = 129
WHERE serial_number IN ('INIT-1-002', 'INIT-1-003');

-- ============ 2. WAITING_RMA_EXPORT: defective SSDs waiting to batch to supplier ============
INSERT INTO return_receipts (id, receipt_code, customer_id, original_export_receipt_id, reason, status, note, version, created_by, approved_by, approved_at, created_at)
VALUES (6, 'RR-2026-0006', 1, 1, 'DEFECTIVE', 'COMPLETED',
        'SSD loi doc/ghi, cho gop du luong gui bao hanh (RMA)', 0, 3, 2, '2026-08-05 10:00:00', '2026-08-05 09:45:00');

INSERT INTO return_receipt_items (return_receipt_id, product_unit_id, product_id, quantity, `condition`, resulting_action, description, evidence_image)
SELECT 6, id, product_id, 1, 'DEFECTIVE', 'WARRANTY_TRANSFER', 'SMART error, loi doc/ghi cham', NULL
FROM product_units WHERE serial_number IN ('INIT-9-002', 'INIT-9-003');

UPDATE product_units
SET status = 'WAITING_RMA_EXPORT', location_id = 130
WHERE serial_number IN ('INIT-9-002', 'INIT-9-003');

-- ============ 3. Warranty imports (REPAIRED + REJECTED) back from supplier ============
-- REPATTR: SSD returned repaired -> QC shelf 3, waiting QC pass
INSERT INTO import_receipts (id, receipt_code, supplier_id, status, note, created_by, approved_by, original_warranty_export_id, created_at, updated_at)
VALUES (510, 'INIT-RMA-0001', 1, 'COMPLETED', 'NCC bao hanh SSD tra ve - REPAIRED', 3, 2, 1, '2026-08-05 11:00:00', '2026-08-05 11:30:00');

INSERT INTO import_receipt_items (id, receipt_id, product_id, quantity, unit_price, warranty_months, warranty_result_type)
VALUES (510, 510, 9, 1, 3899000, 60, 'REPAIRED');

SET @repaired_serial = 'INIT-9-002';
UPDATE product_units SET import_receipt_item_id = 510 WHERE serial_number = @repaired_serial;

-- REJECTED: DDR4 refused, RMA_UNREPAIRABLE (QC shelf 4)
INSERT INTO import_receipts (id, receipt_code, supplier_id, status, note, created_by, approved_by, original_warranty_export_id, created_at, updated_at)
VALUES (511, 'INIT-RMA-0002', 1, 'COMPLETED', 'NCC tu choi bao hanh - loi vi nguoi dung', 3, 2, 102, '2026-08-05 11:15:00', '2026-08-05 11:45:00');

INSERT INTO import_receipt_items (id, receipt_id, product_id, quantity, unit_price, warranty_months, warranty_result_type)
VALUES (511, 511, 32, 1, 1799000, 24, 'REJECTED');

UPDATE product_units
SET status = 'RMA_REPAIRED_RETURNED', location_id = 131, import_receipt_item_id = 510
WHERE serial_number = 'INIT-9-002';

UPDATE product_units
SET status = 'RMA_UNREPAIRABLE', location_id = 132
WHERE serial_number = 'RET-DDR4-001';

-- ============ 4. PENDING_DISPOSAL: rejected/scrapped returned unit ============
INSERT INTO return_receipts (id, receipt_code, customer_id, original_export_receipt_id, reason, status, note, version, created_by, approved_by, approved_at, created_at)
VALUES (7, 'RR-2026-0007', 1, 1, 'DEFECTIVE', 'COMPLETED', 'Tra ve core vi tu chua bao hanh', 0, 3, 2, '2026-08-05 12:00:00', '2026-08-05 11:50:00');

INSERT INTO return_receipt_items (return_receipt_id, product_unit_id, product_id, quantity, `condition`, resulting_action, description, evidence_image)
SELECT 7, id, product_id, 1, 'DEFECTIVE', 'SCRAP', 'Den bien do, khong dang sua', 'seed/evidence/rma-rejected.png'
FROM product_units WHERE serial_number = 'INIT-9-005';

UPDATE product_units
SET status = 'PENDING_DISPOSAL', location_id = 132
WHERE serial_number = 'INIT-9-005';

-- ============ 5. PENDING_APPROVAL: return awaiting approval ============
INSERT INTO return_receipts (id, receipt_code, customer_id, original_export_receipt_id, reason, status, note, version, created_by, created_at)
VALUES (9, 'RR-2026-0009', 1, 1, 'WRONG_ITEM', 'PENDING_APPROVAL', 'Giao nham ma, cho duyet', 0, 3, '2026-08-06 14:00:00');

INSERT INTO return_receipt_items (return_receipt_id, product_unit_id, product_id, quantity, `condition`, resulting_action, description)
SELECT 9, id, product_id, 1, 'GOOD', 'RESTOCK', 'Giao nham, hong nguyen ven'
FROM product_units WHERE serial_number = 'INIT-9-004';