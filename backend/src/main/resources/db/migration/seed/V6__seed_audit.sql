-- Audit log seed data tương ứng với dữ liệu đã seed ở V5
INSERT INTO audit_logs (user_id, username, ip_address, request_id, action, entity_name, entity_id, old_value, new_value, status, error_msg, created_at)
VALUES
-- Admin đăng nhập
(1, 'admin', '127.0.0.1', UUID(), 'LOGIN', 'User', '1', NULL, NULL, 'SUCCESS', NULL, '2026-07-01 07:55:00'),

-- Stock tạo phiếu nhập INIT-000001
(4, 'stock', '127.0.0.1', UUID(), 'CREATE', 'ImportReceipt', '1', NULL, '{"receiptCode":"INIT-000001","supplierId":1,"totalItems":32}', 'SUCCESS', NULL, '2026-07-01 08:00:00'),

-- Manager duyệt phiếu nhập
(2, 'manager', '127.0.0.1', UUID(), 'APPROVE', 'ImportReceipt', '1', '{"status":"PENDING"}', '{"status":"COMPLETED"}', 'SUCCESS', NULL, '2026-07-01 08:30:00'),

-- Manager tạo phiếu xuất EXP-20260702-001
(2, 'manager', '127.0.0.1', UUID(), 'CREATE', 'ExportReceipt', '1', NULL, '{"receiptCode":"EXP-20260702-001","customerId":1,"totalAmount":58992000}', 'SUCCESS', NULL, '2026-07-02 14:00:00'),

-- Manager duyệt phiếu xuất
(2, 'manager', '127.0.0.1', UUID(), 'APPROVE', 'ExportReceipt', '1', '{"status":"PENDING_APPROVAL"}', '{"status":"COMPLETED"}', 'SUCCESS', NULL, '2026-07-02 16:00:00'),

-- Stock tạo phiếu xuất EXP-20260708-001
(4, 'stock', '127.0.0.1', UUID(), 'CREATE', 'ExportReceipt', '2', NULL, '{"receiptCode":"EXP-20260708-001","customerId":3,"totalAmount":30598000}', 'SUCCESS', NULL, '2026-07-08 11:00:00'),

-- Seller tạo khách hàng mới
(3, 'sales', '127.0.0.1', UUID(), 'CREATE', 'Customer', '4', NULL, '{"name":"Trần Thị Lan","phone":"0918234567"}', 'SUCCESS', NULL, '2026-07-05 09:15:00'),

-- Manager cập nhật sản phẩm
(2, 'manager', '127.0.0.1', UUID(), 'UPDATE', 'Product', '32', '{"isActive":true}', '{"isActive":false}', 'SUCCESS', NULL, '2026-07-03 10:00:00'),

-- Admin tạo người dùng mới (thất bại — email đã tồn tại)
(1, 'admin', '127.0.0.1', UUID(), 'CREATE', 'User', NULL, NULL, '{"email":"admin@system.com","username":"admin2"}', 'FAILURE', 'Email already exists', '2026-07-04 08:00:00'),

-- Manager reset mật khẩu cho stock
(2, 'manager', '127.0.0.1', UUID(), 'RESET_PASSWORD', 'User', '4', NULL, NULL, 'SUCCESS', NULL, '2026-07-06 14:00:00');
