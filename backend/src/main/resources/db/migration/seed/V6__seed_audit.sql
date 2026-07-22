-- Audit log seed — chạy trước seed business data
INSERT INTO audit_logs (user_id, username, ip_address, request_id, action, entity_name, entity_id, old_value, new_value, status, error_msg, created_at)
VALUES
-- User logins
(1, 'admin',    '127.0.0.1', UUID(), 'LOGIN', 'User', '1', NULL, NULL, 'SUCCESS', NULL, '2026-07-01 07:55:00'),
(2, 'manager',  '127.0.0.1', UUID(), 'LOGIN', 'User', '2', NULL, NULL, 'SUCCESS', NULL, '2026-07-01 07:55:30'),
(4, 'stock',    '192.168.1.10', UUID(), 'LOGIN', 'User', '4', NULL, NULL, 'SUCCESS', NULL, '2026-07-01 07:58:00'),
(3, 'sales',    '192.168.1.20', UUID(), 'LOGIN', 'User', '3', NULL, NULL, 'SUCCESS', NULL, '2026-07-01 08:00:00'),

-- Admin quản lý danh mục
(1, 'admin', '127.0.0.1', UUID(), 'CREATE', 'Category', '1', NULL, '{"name":"CPU","description":"Bộ vi xử lý Intel, AMD"}', 'SUCCESS', NULL, '2026-07-01 07:30:00'),
(1, 'admin', '127.0.0.1', UUID(), 'CREATE', 'Category', '2', NULL, '{"name":"RAM","description":"Bộ nhớ trong DDR4, DDR5"}', 'SUCCESS', NULL, '2026-07-01 07:30:05'),
(1, 'admin', '127.0.0.1', UUID(), 'CREATE', 'Category', '3', NULL, '{"name":"GPU","description":"Card đồ họa VGA"}', 'SUCCESS', NULL, '2026-07-01 07:30:10'),
(1, 'admin', '127.0.0.1', UUID(), 'CREATE', 'Brand', '1', NULL, '{"name":"ASUS","description":"Mainboard, GPU, linh kiện cao cấp"}', 'SUCCESS', NULL, '2026-07-01 07:31:00'),
(1, 'admin', '127.0.0.1', UUID(), 'CREATE', 'Brand', '2', NULL, '{"name":"Gigabyte","description":"Mainboard, GPU, linh kiện"}', 'SUCCESS', NULL, '2026-07-01 07:31:05'),
(1, 'admin', '127.0.0.1', UUID(), 'CREATE', 'Brand', '5', NULL, '{"name":"AMD","description":"CPU, GPU"}', 'SUCCESS', NULL, '2026-07-01 07:31:15'),
(1, 'admin', '127.0.0.1', UUID(), 'UPDATE', 'Brand', '13', '{"isActive":true}', '{"isActive":false}', 'SUCCESS', NULL, '2026-07-01 07:32:00'),

-- Admin quản lý nhà cung cấp
(1, 'admin', '127.0.0.1', UUID(), 'CREATE', 'Supplier', '1', NULL, '{"name":"Intel Vietnam","contactPerson":"John Smith"}', 'SUCCESS', NULL, '2026-07-01 07:33:00'),
(1, 'admin', '127.0.0.1', UUID(), 'CREATE', 'Supplier', '5', NULL, '{"name":"Western Digital Vietnam","contactPerson":"Lê Thị C"}', 'SUCCESS', NULL, '2026-07-01 07:33:30'),

-- Admin quản lý vị trí kho
(1, 'admin', '127.0.0.1', UUID(), 'CREATE', 'Location', '1', NULL, '{"zoneCode":"A","shelfCode":"01","binCode":"01","fullCode":"A-01-01"}', 'SUCCESS', NULL, '2026-07-01 07:34:00'),
(1, 'admin', '127.0.0.1', UUID(), 'CREATE', 'Location', '5', NULL, '{"zoneCode":"B","shelfCode":"01","binCode":"01","fullCode":"B-01-01"}', 'SUCCESS', NULL, '2026-07-01 07:34:15'),
(1, 'admin', '127.0.0.1', UUID(), 'CREATE', 'Location', '170', NULL, '{"zoneCode":"Z","shelfCode":"02","binCode":"02","fullCode":"Z-02-02"}', 'SUCCESS', NULL, '2026-07-01 07:35:00'),
(1, 'admin', '127.0.0.1', UUID(), 'UPDATE', 'Location', '75', '{"description":"Khu vực cách ly — hàng hỏng/lỗi"}', '{"description":"Khu vực cách ly mở rộng"}', 'SUCCESS', NULL, '2026-07-01 07:36:00'),

-- Khách hàng được tạo
(3, 'sales', '192.168.1.20', UUID(), 'CREATE', 'Customer', '1', NULL, '{"name":"Công ty TNHH ABC","phone":"02812345678"}', 'SUCCESS', NULL, '2026-07-01 08:05:00'),
(3, 'sales', '192.168.1.20', UUID(), 'CREATE', 'Customer', '3', NULL, '{"name":"Nguyễn Văn Minh","phone":"0909123456"}', 'SUCCESS', NULL, '2026-07-01 08:06:00'),
(3, 'sales', '192.168.1.20', UUID(), 'CREATE', 'Customer', '4', NULL, '{"name":"Trần Thị Lan","phone":"0918234567"}', 'SUCCESS', NULL, '2026-07-05 09:15:00'),
(3, 'sales', '192.168.1.20', UUID(), 'CREATE', 'Customer', '6', NULL, '{"name":"Phạm Hoàng Quân","phone":"0978563412"}', 'SUCCESS', NULL, '2026-07-06 10:00:00'),
(2, 'manager','127.0.0.1', UUID(), 'UPDATE', 'Customer', '6', '{"isActive":true}', '{"isActive":false}', 'SUCCESS', NULL, '2026-07-06 14:30:00'),

-- Sản phẩm được tạo
(2, 'manager','127.0.0.1', UUID(), 'CREATE', 'Product', '1', NULL, '{"name":"Intel Core i7-14700K","sku":"CPU-INT-001","sellPrice":11499000}', 'SUCCESS', NULL, '2026-07-01 08:10:00'),
(2, 'manager','127.0.0.1', UUID(), 'CREATE', 'Product', '9', NULL, '{"name":"Samsung 990 Pro 1TB NVMe","sku":"STO-SAM-001","sellPrice":4899000}', 'SUCCESS', NULL, '2026-07-01 08:10:10'),
(2, 'manager','127.0.0.1', UUID(), 'CREATE', 'Product', '32', NULL, '{"name":"Corsair Vengeance DDR4 32GB 3200MHz","sku":"RAM-COR-003","isActive":true}', 'SUCCESS', NULL, '2026-07-01 08:12:00'),
(2, 'manager','127.0.0.1', UUID(), 'UPDATE', 'Product', '32', '{"isActive":true}', '{"isActive":false}', 'SUCCESS', NULL, '2026-07-03 10:00:00'),

-- Nhập kho INIT-000001
(4, 'stock', '192.168.1.10', UUID(), 'CREATE', 'ImportReceipt', '1', NULL, '{"receiptCode":"INIT-000001","supplierId":1,"totalItems":32}', 'SUCCESS', NULL, '2026-07-01 08:00:00'),
(2, 'manager','127.0.0.1', UUID(), 'APPROVE', 'ImportReceipt', '1', '{"status":"PENDING"}', '{"status":"COMPLETED"}', 'SUCCESS', NULL, '2026-07-01 08:30:00'),

-- Xuất kho EXP-20260702-001
(2, 'manager','127.0.0.1', UUID(), 'CREATE', 'ExportReceipt', '1', NULL, '{"receiptCode":"EXP-20260702-001","customerId":1,"totalAmount":58992000}', 'SUCCESS', NULL, '2026-07-02 14:00:00'),
(2, 'manager','127.0.0.1', UUID(), 'APPROVE', 'ExportReceipt', '1', '{"status":"PENDING_APPROVAL"}', '{"status":"COMPLETED"}', 'SUCCESS', NULL, '2026-07-02 16:00:00'),

-- Xuất kho EXP-20260708-001 (chờ duyệt)
(4, 'stock', '192.168.1.10', UUID(), 'CREATE', 'ExportReceipt', '2', NULL, '{"receiptCode":"EXP-20260708-001","customerId":3,"totalAmount":30598000}', 'SUCCESS', NULL, '2026-07-08 11:00:00'),

-- Cập nhật giá bán sản phẩm
(2, 'manager','127.0.0.1', UUID(), 'UPDATE', 'Product', '11', '{"sellPrice":7499000}', '{"sellPrice":6799000}', 'SUCCESS', NULL, '2026-07-04 09:00:00'),
(2, 'manager','127.0.0.1', UUID(), 'UPDATE', 'Product', '19', '{"sellPrice":3299000}', '{"sellPrice":2999000}', 'SUCCESS', NULL, '2026-07-04 09:05:00'),

-- Kiểm kê kho
(4, 'stock', '192.168.1.10', UUID(), 'CREATE', 'StockCheck', NULL, NULL, '{"checkCode":"SC-20260705-001","status":"PENDING"}', 'SUCCESS', NULL, '2026-07-05 08:00:00'),
(2, 'manager','127.0.0.1', UUID(), 'APPROVE', 'StockCheck', NULL, '{"status":"PENDING"}', '{"status":"COMPLETED"}', 'SUCCESS', NULL, '2026-07-05 10:00:00'),

-- Điều chỉnh tồn kho (hàng lỗi)
(4, 'stock', '192.168.1.10', UUID(), 'CREATE', 'StockAdjustment', NULL, NULL, '{"adjustCode":"ADJ-20260706-001","type":"DAMAGE","reason":"Hỏng do vận chuyển"}', 'SUCCESS', NULL, '2026-07-06 09:00:00'),
(2, 'manager','127.0.0.1', UUID(), 'APPROVE', 'StockAdjustment', NULL, '{"status":"PENDING"}', '{"status":"APPROVED"}', 'SUCCESS', NULL, '2026-07-06 11:00:00'),

-- Điều chỉnh giá nhập
(4, 'stock', '192.168.1.10', UUID(), 'CREATE', 'PriceAdjustment', NULL, NULL, '{"adjustCode":"PA-20260707-001","oldPrice":4499000,"newPrice":3999000}', 'SUCCESS', NULL, '2026-07-07 14:00:00'),
(2, 'manager','127.0.0.1', UUID(), 'APPROVE', 'PriceAdjustment', NULL, '{"status":"PENDING"}', '{"status":"APPROVED"}', 'SUCCESS', NULL, '2026-07-07 15:00:00'),

-- Bảo hành
(3, 'sales', '127.0.0.1', UUID(), 'CREATE', 'WarrantyRequest', NULL, NULL, '{"requestCode":"WR-20260709-001","productUnitId":1,"issueDescription":"Lỗi không boot"}', 'SUCCESS', NULL, '2026-07-09 10:00:00'),

-- Thao tác thất bại
(1, 'admin', '127.0.0.1', UUID(), 'CREATE', 'User', NULL, NULL, '{"email":"admin@system.com","username":"admin2"}', 'FAILURE', 'Email already exists', '2026-07-04 08:00:00'),
(4, 'stock', '127.0.0.1', UUID(), 'CREATE', 'Product', NULL, NULL, '{"sku":"CPU-INT-001"}', 'FAILURE', 'SKU already exists', '2026-07-05 11:00:00'),
(2, 'manager','127.0.0.1', UUID(), 'RESET_PASSWORD', 'User', '4', NULL, NULL, 'SUCCESS', NULL, '2026-07-06 14:00:00');
