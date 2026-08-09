-- Seed: auth — roles, users, demo audit log data

INSERT INTO roles (name, description)
VALUES ('ADMIN', 'System Administrator'),
       ('MANAGER', 'Warehouse Manager'),
       ('SALES', 'Sales Person'),
       ('STOCK', 'Stock Keeper');

INSERT INTO users (username, full_name, password, email, status, role_id, is_password_reset)
VALUES ('admin', 'Administrator',
        '$2a$10$eK.JsUViqKjM9drfhi4dlu/XiLY0E4JO3Ccd2IzmhbNfdZEDeFnay',
        'admin@system.com', 'ACTIVE', (SELECT id FROM roles WHERE name = 'ADMIN'), 0);
INSERT INTO users (username, full_name, password, email, status, role_id, is_password_reset)
VALUES ('manager', 'Manager',
        '$2a$10$yDJg1GQnTrIAtljWPaI9f.E3sgcmD4MrBntLhMJd2B8VtP30ZcprC',
        'manager@system.com', 'ACTIVE', (SELECT id FROM roles WHERE name = 'MANAGER'), 0);
INSERT INTO users (username, full_name, password, email, status, role_id, is_password_reset)
VALUES ('sales', 'Sales',
        '$2a$10$ho16i2KPpfklD3a49hichOmUL0K06xmKQedGBZsidecteOWDmofbG',
        'sales@system.com', 'ACTIVE', (SELECT id FROM roles WHERE name = 'SALES'), 0);
INSERT INTO users (username, full_name, password, email, status, role_id, is_password_reset)
VALUES ('stock', 'Stock',
        '$2a$10$j1r5z1n5sIeyVAzsEjv6ieg6Zi6aLIJDRQ9bTtonaDocyfsYAlDdS',
        'stock@system.com', 'ACTIVE', (SELECT id FROM roles WHERE name = 'STOCK'), 0);

-- Demo login password: "123456" (bcrypt)
UPDATE users SET password='$2b$10$WUCuZtOYfGNQAgc4/0Xd.uVTfAfw8G/A0zDptAt.xSsfuDrd9welG' WHERE username IN ('admin','manager','sales','stock');

-- Audit logs: covers every @AuditLog action+entity combination in the system
INSERT INTO audit_logs (user_id, username, ip_address, request_id, action, entity_name, entity_id, old_value, new_value, status, error_msg, message, created_at)
VALUES
-- ==================== AUTH (login/logout) ====================
(1, 'admin',   '127.0.0.1',   UUID(), 'LOGIN_SUCCESS',   'USER', '1', NULL, NULL, 'SUCCESS', NULL, NULL, '2026-07-01 07:55:00'),
(2, 'manager', '127.0.0.1',   UUID(), 'LOGIN_SUCCESS',   'USER', '2', NULL, NULL, 'SUCCESS', NULL, NULL, '2026-07-01 07:55:30'),
(4, 'stock',   '192.168.1.10',UUID(), 'LOGIN_SUCCESS',   'USER', '4', NULL, NULL, 'SUCCESS', NULL, NULL, '2026-07-01 07:58:00'),
(3, 'sales',   '192.168.1.20',UUID(), 'LOGIN_SUCCESS',   'USER', '3', NULL, NULL, 'SUCCESS', NULL, NULL, '2026-07-01 08:00:00'),
(1, 'admin',   '127.0.0.1',   UUID(), 'LOGIN_FAILED',    'USER', '1', NULL, NULL, 'FAILED', 'Invalid password', NULL, '2026-07-10 09:00:00'),

-- ==================== USER management ====================
(1, 'admin',   '127.0.0.1',   UUID(), 'CREATE_USER',     'USER', '5', NULL, '{"username":"accountant","fullName":"Accountant","role":"STOCK"}', 'SUCCESS', NULL, NULL, '2026-07-02 08:00:00'),
(1, 'admin',   '127.0.0.1',   UUID(), 'CREATE_USER',     'USER', NULL, NULL, '{"username":"admin2","email":"admin@system.com"}', 'FAILED', 'Email already exists', NULL, '2026-07-04 08:00:00'),
(1, 'admin',   '127.0.0.1',   UUID(), 'UPDATE_USER_INFO', 'USER', '3', '{"fullName":"Sales","phoneNumber":null}', '{"fullName":"Sales Person","phoneNumber":"0909123000"}', 'SUCCESS', NULL, NULL, '2026-07-04 09:00:00'),
(1, 'admin',   '127.0.0.1',   UUID(), 'UPDATE_USER_ROLE', 'USER', '5', '{"role":"STOCK"}', '{"role":"MANAGER"}', 'SUCCESS', NULL, NULL, '2026-07-05 10:00:00'),
(1, 'admin',   '127.0.0.1',   UUID(), 'UPDATE_USER_STATUS', 'USER', '5', '{"status":"ACTIVE"}', '{"status":"INACTIVE"}', 'SUCCESS', NULL, NULL, '2026-07-06 11:00:00'),
(2, 'manager', '127.0.0.1',   UUID(), 'RESET_PASSWORD',  'USER', '4', NULL, NULL, 'SUCCESS', NULL, NULL, '2026-07-06 14:00:00'),
(3, 'sales',   '127.0.0.1',   UUID(), 'CHANGE_PASSWORD', 'USER', '3', NULL, NULL, 'SUCCESS', NULL, NULL, '2026-07-07 08:00:00'),
(3, 'sales',   '127.0.0.1',   UUID(), 'CHANGE_PASSWORD', 'USER', '3', NULL, NULL, 'FAILED', 'Current password does not match', NULL, '2026-07-07 08:05:00'),

-- ==================== CATEGORY management ====================
(1, 'admin',   '127.0.0.1',   UUID(), 'CREATE_CATEGORY', 'CATEGORY', '1', NULL, '{"name":"CPU","description":"Bộ vi xử lý Intel, AMD"}', 'SUCCESS', NULL, NULL, '2026-07-01 07:30:00'),
(1, 'admin',   '127.0.0.1',   UUID(), 'CREATE_CATEGORY', 'CATEGORY', '2', NULL, '{"name":"RAM","description":"Bộ nhớ trong DDR4, DDR5"}', 'SUCCESS', NULL, NULL, '2026-07-01 07:30:05'),
(1, 'admin',   '127.0.0.1',   UUID(), 'CREATE_CATEGORY', 'CATEGORY', '3', NULL, '{"name":"GPU","description":"Card đồ họa VGA"}', 'SUCCESS', NULL, NULL, '2026-07-01 07:30:10'),
(2, 'manager', '127.0.0.1',   UUID(), 'UPDATE_CATEGORY', 'CATEGORY', '2', '{"name":"RAM","description":"Bộ nhớ trong DDR4, DDR5"}', '{"name":"RAM & Memory","description":"DDR4, DDR5, ECC"}', 'SUCCESS', NULL, NULL, '2026-07-02 09:00:00'),
(2, 'manager', '127.0.0.1',   UUID(), 'TOGGLE_CATEGORY', 'CATEGORY', '4', NULL, NULL, 'FAILED', 'Category has active products', NULL, '2026-07-03 10:00:00'),

-- ==================== BRAND management ====================
(1, 'admin',   '127.0.0.1',   UUID(), 'CREATE_BRAND',    'BRAND', '1', NULL, '{"name":"ASUS","description":"Mainboard, GPU, linh kiện cao cấp"}', 'SUCCESS', NULL, NULL, '2026-07-01 07:31:00'),
(1, 'admin',   '127.0.0.1',   UUID(), 'CREATE_BRAND',    'BRAND', '2', NULL, '{"name":"Gigabyte","description":"Mainboard, GPU, linh kiện"}', 'SUCCESS', NULL, NULL, '2026-07-01 07:31:05'),
(1, 'admin',   '127.0.0.1',   UUID(), 'CREATE_BRAND',    'BRAND', '5', NULL, '{"name":"AMD","description":"CPU, GPU"}', 'SUCCESS', NULL, NULL, '2026-07-01 07:31:15'),
(1, 'admin',   '127.0.0.1',   UUID(), 'UPDATE_BRAND',    'BRAND', '13', '{"isActive":true}', '{"isActive":false}', 'SUCCESS', NULL, NULL, '2026-07-01 07:32:00'),
(2, 'manager', '127.0.0.1',   UUID(), 'TOGGLE_BRAND',    'BRAND', '13', NULL, NULL, 'FAILED', 'Brand has active products', NULL, '2026-07-04 11:00:00'),

-- ==================== SUPPLIER management ====================
(1, 'admin',   '127.0.0.1',   UUID(), 'CREATE_SUPPLIER', 'SUPPLIER', '1', NULL, '{"name":"Intel Vietnam","contactPerson":"John Smith"}', 'SUCCESS', NULL, NULL, '2026-07-01 07:33:00'),
(1, 'admin',   '127.0.0.1',   UUID(), 'CREATE_SUPPLIER', 'SUPPLIER', '5', NULL, '{"name":"Western Digital Vietnam","contactPerson":"Lê Thị C"}', 'SUCCESS', NULL, NULL, '2026-07-01 07:33:30'),
(2, 'manager', '127.0.0.1',   UUID(), 'UPDATE_SUPPLIER', 'SUPPLIER', '6', '{"name":"Gigabyte Technology","contactPerson":null}', '{"name":"Gigabyte Technology VN","contactPerson":"Nguyễn Văn A"}', 'SUCCESS', NULL, NULL, '2026-07-05 09:00:00'),
(2, 'manager', '127.0.0.1',   UUID(), 'TOGGLE_SUPPLIER', 'SUPPLIER', '6', NULL, NULL, 'FAILED', 'Supplier has pending imports', NULL, '2026-07-06 10:00:00'),

-- ==================== LOCATION management ====================
(1, 'admin',   '127.0.0.1',   UUID(), 'CREATE_LOCATION', 'LOCATION', '1', NULL, '{"zoneCode":"A","shelfCode":"01","binCode":"01","fullCode":"A-01-01"}', 'SUCCESS', NULL, NULL, '2026-07-01 07:34:00'),
(1, 'admin',   '127.0.0.1',   UUID(), 'CREATE_LOCATION', 'LOCATION', '5', NULL, '{"zoneCode":"B","shelfCode":"01","binCode":"01","fullCode":"B-01-01"}', 'SUCCESS', NULL, NULL, '2026-07-01 07:34:15'),
(1, 'admin',   '127.0.0.1',   UUID(), 'CREATE_LOCATION', 'LOCATION', '170', NULL, '{"zoneCode":"Z","shelfCode":"02","binCode":"02","fullCode":"Z-02-02"}', 'SUCCESS', NULL, NULL, '2026-07-01 07:35:00'),
(1, 'admin',   '127.0.0.1',   UUID(), 'UPDATE_LOCATION', 'LOCATION', '75', '{"description":"Khu vực cách ly — hàng hỏng/lỗi"}', '{"description":"Khu vực cách ly mở rộng"}', 'SUCCESS', NULL, NULL, '2026-07-01 07:36:00'),
(2, 'manager', '127.0.0.1',   UUID(), 'TOGGLE_LOCATION', 'LOCATION', '15', NULL, NULL, 'SUCCESS', NULL, NULL, '2026-07-03 09:00:00'),
(2, 'manager', '127.0.0.1',   UUID(), 'DELETE_LOCATION', 'LOCATION', '15', '{"fullCode":"A-02-03"}', NULL, 'SUCCESS', NULL, NULL, '2026-07-06 15:00:00'),
(2, 'manager', '127.0.0.1',   UUID(), 'DELETE_LOCATION', 'LOCATION', '999', NULL, NULL, 'FAILED', 'Location not found', NULL, '2026-07-06 15:30:00'),

-- ==================== CUSTOMER management ====================
(3, 'sales',   '192.168.1.20',UUID(), 'CREATE_CUSTOMER', 'CUSTOMER', '1', NULL, '{"name":"Công ty TNHH ABC","phone":"02812345678"}', 'SUCCESS', NULL, NULL, '2026-07-01 08:05:00'),
(3, 'sales',   '192.168.1.20',UUID(), 'CREATE_CUSTOMER', 'CUSTOMER', '3', NULL, '{"name":"Nguyễn Văn Minh","phone":"0909123456"}', 'SUCCESS', NULL, NULL, '2026-07-01 08:06:00'),
(3, 'sales',   '192.168.1.20',UUID(), 'CREATE_CUSTOMER', 'CUSTOMER', '4', NULL, '{"name":"Trần Thị Lan","phone":"0918234567"}', 'SUCCESS', NULL, NULL, '2026-07-05 09:15:00'),
(3, 'sales',   '192.168.1.20',UUID(), 'CREATE_CUSTOMER', 'CUSTOMER', '6', NULL, '{"name":"Phạm Hoàng Quân","phone":"0978563412"}', 'SUCCESS', NULL, NULL, '2026-07-06 10:00:00'),
(2, 'manager', '127.0.0.1',   UUID(), 'UPDATE_CUSTOMER', 'CUSTOMER', '6', '{"isActive":true}', '{"isActive":false}', 'SUCCESS', NULL, NULL, '2026-07-06 14:30:00'),
(3, 'sales',   '127.0.0.1',   UUID(), 'TOGGLE_CUSTOMER', 'CUSTOMER', '6', NULL, NULL, 'SUCCESS', NULL, NULL, '2026-07-07 09:00:00'),

-- ==================== PRODUCT management ====================
(2, 'manager', '127.0.0.1',   UUID(), 'CREATE_PRODUCT',  'PRODUCT', '1', NULL, '{"name":"Intel Core i7-14700K","sku":"CPU-INT-001","sellPrice":11499000}', 'SUCCESS', NULL, NULL, '2026-07-01 08:10:00'),
(2, 'manager', '127.0.0.1',   UUID(), 'CREATE_PRODUCT',  'PRODUCT', '9', NULL, '{"name":"Samsung 990 Pro 1TB NVMe","sku":"STO-SAM-001","sellPrice":4899000}', 'SUCCESS', NULL, NULL, '2026-07-01 08:10:10'),
(2, 'manager', '127.0.0.1',   UUID(), 'CREATE_PRODUCT',  'PRODUCT', '32', NULL, '{"name":"Corsair Vengeance DDR4 32GB 3200MHz","sku":"RAM-COR-003","isActive":true}', 'SUCCESS', NULL, NULL, '2026-07-01 08:12:00'),
(2, 'manager', '127.0.0.1',   UUID(), 'UPDATE_PRODUCT',  'PRODUCT', '32', '{"isActive":true}', '{"isActive":false}', 'SUCCESS', NULL, NULL, '2026-07-03 10:00:00'),
(2, 'manager', '127.0.0.1',   UUID(), 'UPDATE_PRODUCT',  'PRODUCT', '11', '{"sellPrice":7499000}', '{"sellPrice":6799000}', 'SUCCESS', NULL, NULL, '2026-07-04 09:00:00'),
(2, 'manager', '127.0.0.1',   UUID(), 'UPDATE_PRODUCT',  'PRODUCT', '19', '{"sellPrice":3299000}', '{"sellPrice":2999000}', 'SUCCESS', NULL, NULL, '2026-07-04 09:05:00'),
(4, 'stock',   '127.0.0.1',   UUID(), 'TOGGLE_PRODUCT',  'PRODUCT', '32', NULL, NULL, 'SUCCESS', NULL, NULL, '2026-07-05 11:00:00'),
(4, 'stock',   '127.0.0.1',   UUID(), 'CREATE_PRODUCT',  'PRODUCT', NULL, NULL, '{"sku":"CPU-INT-001"}', 'FAILED', 'SKU already exists', NULL, '2026-07-05 11:00:00'),

-- ==================== PRODUCT IMAGE management ====================
(2, 'manager', '127.0.0.1',   UUID(), 'CREATE_PRODUCT_IMAGE', 'PRODUCT_IMAGE', '1', NULL, '{"productId":1,"url":"/images/cpu-i7-14700k.jpg","isPrimary":true}', 'SUCCESS', NULL, NULL, '2026-07-01 08:15:00'),
(2, 'manager', '127.0.0.1',   UUID(), 'DELETE_PRODUCT_IMAGE', 'PRODUCT_IMAGE', '1', '{"productId":1,"url":"/images/cpu-i7-14700k.jpg"}', NULL, 'SUCCESS', NULL, NULL, '2026-07-02 10:00:00'),

-- ==================== PURCHASE ORDER ====================
(4, 'stock',   '192.168.1.10',UUID(), 'CREATE_PURCHASE_ORDER', 'PURCHASE_ORDER', '1', NULL, '{"poCode":"PO-20260701-001","supplierId":1,"status":"DRAFT"}', 'SUCCESS', NULL, NULL, '2026-07-01 09:00:00'),
(4, 'stock',   '192.168.1.10',UUID(), 'CANCEL_PURCHASE_ORDER','PURCHASE_ORDER', '1', '{"status":"DRAFT"}', '{"status":"CANCELLED"}', 'SUCCESS', NULL, NULL, '2026-07-02 09:00:00'),
(4, 'stock',   '192.168.1.10',UUID(), 'CANCEL_PURCHASE_ORDER','PURCHASE_ORDER', '999', NULL, NULL, 'FAILED', 'Purchase order not found', NULL, '2026-07-02 10:00:00'),

-- ==================== IMPORT RECEIPT ====================
(4, 'stock',   '192.168.1.10',UUID(), 'CREATE_IMPORT',   'IMPORT_RECEIPT', '1', NULL, '{"receiptCode":"INIT-000001","supplierId":1,"totalItems":32}', 'SUCCESS', NULL, NULL, '2026-07-01 08:00:00'),
(4, 'stock',   '192.168.1.10',UUID(), 'CONFIRM_IMPORT',  'IMPORT_RECEIPT', '1', '{"status":"PENDING"}', '{"status":"CONFIRMED"}', 'SUCCESS', NULL, NULL, '2026-07-01 08:15:00'),
(2, 'manager', '127.0.0.1',   UUID(), 'APPROVE_IMPORT',  'IMPORT_RECEIPT', '1', '{"status":"CONFIRMED"}', '{"status":"COMPLETED"}', 'SUCCESS', NULL, NULL, '2026-07-01 08:30:00'),
(4, 'stock',   '192.168.1.10',UUID(), 'CANCEL_IMPORT',   'IMPORT_RECEIPT', '2', NULL, NULL, 'FAILED', 'Import already completed', NULL, '2026-07-03 10:00:00'),
(4, 'stock',   '127.0.0.1',   UUID(), 'EDIT_SERIAL',    'PRODUCT_UNIT', '5', '{"serialNumber":"INIT-1-005"}', '{"serialNumber":"INIT-1-005-R"}', 'SUCCESS', NULL, NULL, '2026-07-04 14:00:00'),

-- ==================== EXPORT RECEIPT ====================
(2, 'manager', '127.0.0.1',   UUID(), 'CREATE_EXPORT',   'EXPORT_RECEIPT', '1', NULL, '{"receiptCode":"EXP-20260702-001","customerId":1,"totalAmount":58992000}', 'SUCCESS', NULL, NULL, '2026-07-02 14:00:00'),
(2, 'manager', '127.0.0.1',   UUID(), 'APPROVE_EXPORT',  'EXPORT_RECEIPT', '1', '{"status":"PENDING_APPROVAL"}', '{"status":"COMPLETED"}', 'SUCCESS', NULL, NULL, '2026-07-02 16:00:00'),
(2, 'manager', '127.0.0.1',   UUID(), 'FULFILL_EXPORT',  'EXPORT_RECEIPT', '1', '{"status":"COMPLETED"}', '{"status":"FULFILLED"}', 'SUCCESS', NULL, NULL, '2026-07-02 17:00:00'),
(4, 'stock',   '192.168.1.10',UUID(), 'CREATE_EXPORT',   'EXPORT_RECEIPT', '2', NULL, '{"receiptCode":"EXP-20260708-001","customerId":3,"totalAmount":30598000}', 'SUCCESS', NULL, NULL, '2026-07-08 11:00:00'),
(2, 'manager', '127.0.0.1',   UUID(), 'REJECT_EXPORT',   'EXPORT_RECEIPT', '2', '{"status":"PENDING_APPROVAL"}', '{"status":"REJECTED"}', 'SUCCESS', 'Khách hàng nợ công nợ', NULL, '2026-07-09 10:00:00'),
(4, 'stock',   '192.168.1.10',UUID(), 'CREATE_EXPORT',   'EXPORT_RECEIPT', '3', NULL, NULL, 'FAILED', 'Insufficient stock', NULL, '2026-07-10 11:00:00'),
(4, 'stock',   '192.168.1.10',UUID(), 'CANCEL_EXPORT',   'EXPORT_RECEIPT', '3', NULL, NULL, 'FAILED', 'Export receipt not found', NULL, '2026-07-10 11:30:00'),

-- ==================== RETURN RECEIPT ====================
(4, 'stock',   '192.168.1.10',UUID(), 'CREATE_RETURN',   'RETURN_RECEIPT', '1', NULL, '{"receiptCode":"RR-000001","customerId":1,"originalExportReceiptId":1,"reason":"DEFECTIVE"}', 'SUCCESS', NULL, NULL, '2026-07-11 09:00:00'),
(2, 'manager', '127.0.0.1',   UUID(), 'APPROVE_RETURN',  'RETURN_RECEIPT', '1', '{"status":"PENDING_APPROVAL"}', '{"status":"COMPLETED"}', 'SUCCESS', NULL, NULL, '2026-07-11 10:00:00'),
(4, 'stock',   '192.168.1.10',UUID(), 'CREATE_RETURN',   'RETURN_RECEIPT', '2', NULL, '{"receiptCode":"RR-000002","originalExportReceiptId":1,"reason":"CHANGE_MIND"}', 'SUCCESS', NULL, NULL, '2026-07-14 10:00:00'),
(4, 'stock',   '192.168.1.10',UUID(), 'CANCEL_RETURN',   'RETURN_RECEIPT', '2', '{"status":"PENDING_APPROVAL"}', '{"status":"CANCELLED"}', 'SUCCESS', 'Khách hàng huỷ yêu cầu', NULL, '2026-07-14 14:00:00'),
(4, 'stock',   '192.168.1.10',UUID(), 'CREATE_RETURN',   'RETURN_RECEIPT', NULL, NULL, NULL, 'FAILED', 'Export receipt not eligible for return', NULL, '2026-07-15 09:00:00'),

-- ==================== STOCK CHECK ====================
(4, 'stock',   '192.168.1.10',UUID(), 'CREATE_STOCK_CHECK', 'STOCK_CHECK', '1', NULL, '{"checkCode":"SC-20260705-001","status":"PENDING"}', 'SUCCESS', NULL, NULL, '2026-07-05 08:00:00'),
(4, 'stock',   '192.168.1.10',UUID(), 'START_STOCK_CHECK',  'STOCK_CHECK', '1', '{"status":"PENDING"}', '{"status":"IN_PROGRESS"}', 'SUCCESS', NULL, NULL, '2026-07-05 08:30:00'),
(4, 'stock',   '192.168.1.10',UUID(), 'RECORD_STOCK_CHECK', 'STOCK_CHECK', '1', '{"status":"IN_PROGRESS"}', NULL, 'SUCCESS', NULL, NULL, '2026-07-05 09:00:00'),
(4, 'stock',   '192.168.1.10',UUID(), 'COMPLETE_STOCK_CHECK','STOCK_CHECK', '1', '{"status":"IN_PROGRESS"}', '{"status":"COMPLETED"}', 'SUCCESS', NULL, NULL, '2026-07-05 09:30:00'),
(2, 'manager', '127.0.0.1',   UUID(), 'APPROVE_STOCK_CHECK','STOCK_CHECK', '1', '{"status":"COMPLETED"}', '{"status":"APPROVED"}', 'SUCCESS', NULL, NULL, '2026-07-05 10:00:00'),
(4, 'stock',   '192.168.1.10',UUID(), 'REJECT_STOCK_CHECK', 'STOCK_CHECK', '2', '{"status":"IN_PROGRESS"}', '{"status":"REJECTED"}', 'SUCCESS', 'Discrepancy too large', NULL, '2026-07-06 10:00:00'),

-- ==================== STOCK ADJUSTMENT ====================
(4, 'stock',   '192.168.1.10',UUID(), 'CREATE_ADJUSTMENT', 'STOCK_ADJUSTMENT', '1', NULL, '{"adjustCode":"ADJ-20260706-001","type":"DAMAGE","reason":"Hỏng do vận chuyển"}', 'SUCCESS', NULL, NULL, '2026-07-06 09:00:00'),
(2, 'manager', '127.0.0.1',   UUID(), 'APPROVE_ADJUSTMENT','STOCK_ADJUSTMENT', '1', '{"status":"PENDING"}', '{"status":"APPROVED"}', 'SUCCESS', NULL, NULL, '2026-07-06 11:00:00'),
(4, 'stock',   '192.168.1.10',UUID(), 'CREATE_ADJUSTMENT', 'STOCK_ADJUSTMENT', '2', NULL, '{"adjustCode":"ADJ-000002","type":"LOST","reason":"Mất trong kiểm kê"}', 'SUCCESS', NULL, NULL, '2026-07-07 09:00:00'),
(2, 'manager', '127.0.0.1',   UUID(), 'REJECT_ADJUSTMENT','STOCK_ADJUSTMENT', '2', '{"status":"PENDING"}', '{"status":"REJECTED"}', 'SUCCESS', 'Insufficient evidence', NULL, '2026-07-07 11:00:00'),

-- ==================== PRICE ADJUSTMENT ====================
(4, 'stock',   '192.168.1.10',UUID(), 'CREATE_PRICE_ADJUSTMENT', 'PRICE_ADJUSTMENT', '1', NULL, '{"adjustCode":"PA-20260707-001","oldPrice":4499000,"newPrice":3999000}', 'SUCCESS', NULL, NULL, '2026-07-07 14:00:00'),
(2, 'manager', '127.0.0.1',   UUID(), 'APPROVE_PRICE_ADJUSTMENT','PRICE_ADJUSTMENT', '1', '{"status":"PENDING"}', '{"status":"APPROVED"}', 'SUCCESS', NULL, NULL, '2026-07-07 15:00:00'),
(4, 'stock',   '192.168.1.10',UUID(), 'CREATE_PRICE_ADJUSTMENT', 'PRICE_ADJUSTMENT', '2', NULL, '{"adjustCode":"PA-000001","oldPrice":3899000,"newPrice":3499000}', 'SUCCESS', NULL, NULL, '2026-07-14 10:00:00'),
(2, 'manager', '127.0.0.1',   UUID(), 'REJECT_PRICE_ADJUSTMENT','PRICE_ADJUSTMENT', '2', '{"status":"PENDING"}', '{"status":"REJECTED"}', 'SUCCESS', 'Proposed price not suitable', NULL, '2026-07-14 14:00:00'),
(2, 'manager', '127.0.0.1',   UUID(), 'CANCEL_PRICE_ADJUSTMENT','PRICE_ADJUSTMENT', '3', NULL, NULL, 'FAILED', 'Adjustment not found', NULL, '2026-07-15 09:00:00'),

-- Auth demo rows with human-readable message
(1, 'admin',   '192.168.1.15', UUID(), 'LOGIN_SUCCESS', 'USER', '1', NULL, NULL, 'SUCCESS', NULL, 'admin logged in', '2026-07-20 08:00:00'),
(1, 'admin',   '192.168.1.15', UUID(), 'LOGIN_FAILED',   'USER', NULL, NULL, NULL, 'FAILED', 'Invalid password', 'login failed: Invalid password', '2026-07-20 08:05:00'),
(1, 'admin',   '192.168.1.15', UUID(), 'LOGOUT',         'USER', '1', NULL, NULL, 'SUCCESS', NULL, 'admin logged out', '2026-07-20 12:00:00');
