-- V10: QC processing zone - single handling zone for return/RMA flow
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
