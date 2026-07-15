INSERT INTO categories (id, name, description, is_active) VALUES
    (1, 'CPU', 'Bộ vi xử lý Intel, AMD', TRUE),
    (2, 'RAM', 'Bộ nhớ trong DDR4, DDR5', TRUE),
    (3, 'GPU', 'Card đồ họa VGA', TRUE),
    (4, 'Mainboard', 'Bo mạch chủ', TRUE),
    (5, 'PSU', 'Nguồn máy tính', TRUE),
    (6, 'Storage', 'SSD, HDD, NVMe', TRUE),
    (7, 'Case', 'Vỏ máy tính', TRUE),
    (8, 'Cooling', 'Tản nhiệt, quạt', TRUE);

INSERT INTO category_zones (category_id, zone_code) VALUES
    (1, 'A'), (2, 'D'), (3, 'B'), (4, 'E'),
    (5, 'F'), (6, 'C'), (7, 'G'), (8, 'H');
