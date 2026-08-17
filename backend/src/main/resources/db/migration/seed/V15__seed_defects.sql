-- V15: Seed defect categories

INSERT INTO defect_categories (code, name, description, is_repairable, is_replaceable)
VALUES ('SCRATCH',     'Trầy xước vỏ ngoài',      'Trầy xước nhẹ không ảnh hưởng hoạt động', 0, 0),
       ('DEAD_ON_ARRIVAL', 'Chết ngay khi nhận',    'Không khởi động được ngay từ lần đầu',     0, 1),
       ('NOT_BOOT',    'Không lên nguồn',          'Không nhận nguồn / không bật được',       1, 1),
       ('SCREEN',      'Lỗi màn hình',             'Đốm sáng, vỡ màn hình, ám màu',           1, 1),
       ('BATTERY',     'Lỗi pin / sạc',            'Pin chai, sạc không vào',                 1, 1),
       ('OS_ERROR',    'Lỗi phần mềm',             'Lỗi hệ điều hành, treo máy',              1, 0),
       ('OVERHEAT',    'Nóng máy bất thường',      'Tản nhiệt kém, nóng khi tải nhẹ',         1, 1),
       ('OTHER',       'Lỗi khác',                 'Không thuộc các nhóm trên',               1, 1);