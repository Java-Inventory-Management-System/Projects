-- Reset passwords for all seeded users (password: 123456)
UPDATE users SET password = '$2b$10$WUCuZtOYfGNQAgc4/0Xd.uVTfAfw8G/A0zDptAt.xSsfuDrd9welG' WHERE username IN ('admin', 'manager', 'sales', 'stock');

-- Brands
INSERT INTO brands (id, name, description, is_active) VALUES
    (1, 'ASUS', 'Mainboard, GPU, linh kiện cao cấp', TRUE),
    (2, 'Gigabyte', 'Mainboard, GPU, linh kiện', TRUE),
    (3, 'MSI', 'Mainboard, GPU, linh kiện gaming', TRUE),
    (4, 'Intel', 'CPU, chipset', TRUE),
    (5, 'AMD', 'CPU, GPU', TRUE),
    (6, 'Samsung', 'SSD, RAM, lưu trữ', TRUE),
    (7, 'Corsair', 'RAM, PSU, Case, Cooling', TRUE),
    (8, 'Western Digital', 'SSD, HDD', TRUE),
    (9, 'Seasonic', 'PSU cao cấp', TRUE),
    (10, 'G.Skill', 'RAM hiệu năng cao', TRUE),
    (11, 'Cooler Master', 'Case, Cooling, PSU', TRUE),
    (12, 'Noctua', 'Cooling cao cấp', TRUE),
    (13, 'Kingston', 'RAM, SSD', FALSE);

-- Suppliers
INSERT INTO suppliers (id, name, contact_person, phone, email, address, tax_code, note, is_active) VALUES
    (1, 'Intel Vietnam', 'John Smith', '02812345678', 'sales@intel.vn', 'Số 1, Lê Duẩn, Q.1, TP.HCM', '1234567890', NULL, TRUE),
    (2, 'Corsair Asia Pte Ltd', 'Sarah Lee', '02823456789', 'orders@corsair.sg', '2 Jurong East, Singapore', NULL, 'NCC quốc tế, cần đặt trước 7 ngày', TRUE),
    (3, 'Samsung Vina', 'Trần Văn A', '02834567890', 'samsung@sam.vn', '123 Nguyễn Văn Linh, Q.7, TP.HCM', '0987654321', NULL, TRUE),
    (4, 'ASUS Technology Vietnam', 'Phạm Văn B', '02845678901', 'asus@asus.vn', '456 Lê Lợi, Q.1, TP.HCM', NULL, NULL, TRUE),
    (5, 'Western Digital Vietnam', 'Lê Thị C', '02856789012', 'wd@wd.vn', '789 Nguyễn Thị Minh Khai, Q.3, TP.HCM', NULL, NULL, TRUE),
    (6, 'Gigabyte Technology', NULL, NULL, NULL, NULL, NULL, 'NCC mới — chờ cập nhật thông tin', TRUE);

-- Locations
INSERT INTO locations (id, zone_code, shelf_code, bin_code, full_code, description, is_active) VALUES
    (1, 'A', '01', '01', 'A-01-01', 'CPU Intel', TRUE),
    (2, 'A', '01', '02', 'A-01-02', 'CPU Intel', TRUE),
    (3, 'A', '02', '01', 'A-02-01', 'CPU AMD', TRUE),
    (4, 'A', '02', '02', 'A-02-02', 'CPU AMD', TRUE),
    (5, 'B', '01', '01', 'B-01-01', 'GPU ASUS', TRUE),
    (6, 'B', '01', '02', 'B-01-02', 'GPU Gigabyte', TRUE),
    (7, 'B', '02', '01', 'B-02-01', 'GPU MSI', TRUE),
    (8, 'B', '02', '02', 'B-02-02', 'GPU ASUS TUF', TRUE),
    (9, 'C', '01', '01', 'C-01-01', 'SSD Samsung', TRUE),
    (10, 'C', '01', '02', 'C-01-02', 'SSD Samsung', TRUE),
    (11, 'C', '02', '01', 'C-02-01', 'SSD WD', TRUE),
    (12, 'C', '02', '02', 'C-02-02', 'SSD Samsung 980', TRUE),
    (13, 'C', '03', '01', 'C-03-01', 'SSD WD Blue', TRUE),
    (14, 'D', '01', '01', 'D-01-01', 'RAM Corsair', TRUE),
    (15, 'D', '01', '02', 'D-01-02', 'RAM Corsair Dominator', TRUE),
    (16, 'D', '02', '01', 'D-02-01', 'RAM G.Skill', TRUE),
    (17, 'E', '01', '01', 'E-01-01', 'Mainboard ASUS ROG', TRUE),
    (18, 'E', '01', '02', 'E-01-02', 'Mainboard Gigabyte', TRUE),
    (19, 'E', '02', '01', 'E-02-01', 'Mainboard MSI', TRUE),
    (20, 'E', '02', '02', 'E-02-02', 'Mainboard ASUS Prime', TRUE),
    (21, 'F', '01', '01', 'F-01-01', 'PSU Seasonic Focus', TRUE),
    (22, 'F', '01', '02', 'F-01-02', 'PSU Corsair RM', TRUE),
    (23, 'F', '02', '01', 'F-02-01', 'PSU Seasonic Prime', TRUE),
    (24, 'G', '01', '01', 'G-01-01', 'Case Corsair 4000D White', TRUE),
    (25, 'G', '01', '02', 'G-01-02', 'Case Corsair 4000D Black', TRUE),
    (26, 'G', '02', '01', 'G-02-01', 'Case ASUS Helios', TRUE),
    (27, 'H', '01', '01', 'H-01-01', 'Cooling Corsair AIO', TRUE),
    (28, 'H', '01', '02', 'H-01-02', 'Cooling Cooler Master', TRUE),
    (29, 'H', '02', '01', 'H-02-01', 'Cooling ASUS ROG', TRUE),
    (30, 'H', '02', '02', 'H-02-02', 'Cooling Noctua', TRUE),
    (31, 'I', '01', '01', 'I-01-01', 'Linh kiện lẻ — chờ phân loại', TRUE),
    (32, 'X', '01', '01', 'X-01-01', 'Khu vực cách ly — hàng hỏng/lỗi', TRUE);

-- Customers
INSERT INTO customers (id, name, phone, email, address, note, is_active) VALUES
    (1, 'Công ty TNHH ABC', '02812345678', 'info@abc.vn', '123 Nguyễn Huệ, Q.1, TP.HCM', NULL, TRUE),
    (2, 'Cửa hàng PC Plus', '02823456789', NULL, '456 Lê Lợi, Q.1, TP.HCM', 'KH quen, thường mua số lượng lớn', TRUE),
    (3, 'Nguyễn Văn Minh', '0909123456', 'minhnv@gmail.com', '789 Trần Hưng Đạo, Q.5, TP.HCM', NULL, TRUE),
    (4, 'Trần Thị Lan', '0918234567', NULL, NULL, 'KH mới', TRUE),
    (5, 'Công ty TNHH Thiết bị số Hoàng Gia', '02834567890', 'sales@hoanggia.vn', '321 Nguyễn Thị Minh Khai, Q.3, TP.HCM', NULL, TRUE),
    (6, 'Phạm Hoàng Quân', '0978563412', NULL, '654 Lý Tự Trọng, Q.10, TP.HCM', NULL, FALSE);

-- Products
INSERT INTO products (id, name, sku, barcode, brand_id, category_id, description, unit, tracking_type, sell_price, min_stock, is_active) VALUES
    (1, 'Intel Core i7-14700K', 'CPU-INT-001', '8801791990741', 4, 1, '20 nhân 28 luồng, 5.6GHz', 'PIECE', 'SERIALIZED', 11499000, 5, TRUE),
    (2, 'Intel Core i5-14600K', 'CPU-INT-002', '8801791990758', 4, 1, '14 nhân 20 luồng, 5.3GHz', 'PIECE', 'SERIALIZED', 8499000, 5, TRUE),
    (3, 'AMD Ryzen 7 7800X3D', 'CPU-AMD-001', '7301435145403', 5, 1, '8 nhân 16 luồng, 5.0GHz, 3D V-Cache', 'PIECE', 'SERIALIZED', 12499000, 5, TRUE),
    (4, 'AMD Ryzen 5 7600', 'CPU-AMD-002', '7301435145410', 5, 1, '6 nhân 12 luồng, 5.1GHz', 'PIECE', 'SERIALIZED', 5999000, 5, TRUE),
    (5, 'ASUS ROG Strix RTX 4060 OC 8GB', 'GPU-ASU-001', '4711081809696', 1, 3, 'NVIDIA GeForce RTX 4060, 8GB GDDR6', 'PIECE', 'SERIALIZED', 15299000, 3, TRUE),
    (6, 'Gigabyte RTX 4070 Gaming OC 12GB', 'GPU-GIG-001', '4719331335252', 2, 3, 'NVIDIA GeForce RTX 4070, 12GB GDDR6X', 'PIECE', 'SERIALIZED', 20999000, 3, TRUE),
    (7, 'MSI RTX 4060 Ventus 2X 8GB', 'GPU-MSI-001', '4719072770996', 3, 3, 'NVIDIA GeForce RTX 4060, 8GB GDDR6', 'PIECE', 'SERIALIZED', 13599000, 3, TRUE),
    (8, 'ASUS TUF Gaming RTX 4070 Ti 16GB', 'GPU-ASU-002', '4711081809702', 1, 3, 'NVIDIA GeForce RTX 4070 Ti, 16GB GDDR6X', 'PIECE', 'SERIALIZED', 26999000, 2, TRUE),
    (9, 'Samsung 990 Pro 1TB NVMe', 'STO-SAM-001', '8801647780469', 6, 6, 'PCIe 4.0 NVMe, đọc 7450MB/s', 'PIECE', 'SERIALIZED', 4899000, 10, TRUE),
    (10, 'Samsung 870 EVO 500GB SATA', 'STO-SAM-002', '8801647775335', 6, 6, 'SATA III, đọc 560MB/s', 'PIECE', 'SERIALIZED', 2199000, 10, TRUE),
    (11, 'WD Black SN850X 2TB NVMe', 'STO-WD-001', '7180378869301', 8, 6, 'PCIe 4.0 NVMe, đọc 7300MB/s', 'PIECE', 'SERIALIZED', 6799000, 5, TRUE),
    (12, 'Corsair Vengeance DDR5 32GB 5600MHz', 'RAM-COR-001', '8435911058841', 7, 2, 'DDR5, 32GB (2x16GB), 5600MHz', 'PIECE', 'SERIALIZED', 3199000, 10, TRUE),
    (13, 'Corsair Dominator DDR5 64GB 5200MHz', 'RAM-COR-002', '8435911058858', 7, 2, 'DDR5, 64GB (2x32GB), 5200MHz', 'PIECE', 'SERIALIZED', 5499000, 5, TRUE),
    (14, 'G.Skill Trident Z5 DDR5 32GB 6000MHz', 'RAM-GSK-001', '4713294112293', 10, 2, 'DDR5, 32GB (2x16GB), 6000MHz CL30', 'PIECE', 'SERIALIZED', 3499000, 10, TRUE),
    (15, 'ASUS ROG Strix Z790-E Gaming', 'MB-ASU-001', '4711081808835', 1, 4, 'LGA1700, DDR5, PCIe 5.0, WiFi 6E', 'PIECE', 'SERIALIZED', 11999000, 3, TRUE),
    (16, 'Gigabyte Z790 Aorus Elite AX', 'MB-GIG-001', '4719331335269', 2, 4, 'LGA1700, DDR5, PCIe 5.0, WiFi 6E', 'PIECE', 'SERIALIZED', 8499000, 3, TRUE),
    (17, 'MSI MAG Z790 Tomahawk', 'MB-MSI-001', '4719072771009', 3, 4, 'LGA1700, DDR5, PCIe 5.0', 'PIECE', 'SERIALIZED', 9499000, 3, TRUE),
    (18, 'ASUS Prime B760-PLUS', 'MB-ASU-002', '4711081808842', 1, 4, 'LGA1700, DDR5, PCIe 4.0', 'PIECE', 'SERIALIZED', 5499000, 5, TRUE),
    (19, 'Seasonic Focus GX-750 750W', 'PSU-SEA-001', '4711176752019', 9, 5, '750W, Gold, Fully Modular', 'PIECE', 'SERIALIZED', 2999000, 5, TRUE),
    (20, 'Corsair RM850x 850W', 'PSU-COR-001', '8435911058865', 7, 5, '850W, Gold, Fully Modular', 'PIECE', 'SERIALIZED', 3899000, 5, TRUE),
    (21, 'Seasonic Prime TX-1000 1000W', 'PSU-SEA-002', '4711176752026', 9, 5, '1000W, Titanium, Fully Modular', 'PIECE', 'SERIALIZED', 6999000, 3, TRUE),
    (22, 'Corsair 4000D Airflow', 'CSE-COR-001', '8435911058872', 7, 7, 'Mid Tower, Tempered Glass, White', 'PIECE', 'SERIALIZED', 2499000, 3, TRUE),
    (23, 'Corsair 4000D Airflow Black', 'CSE-COR-002', '8435911058889', 7, 7, 'Mid Tower, Tempered Glass, Black', 'PIECE', 'SERIALIZED', 2499000, 3, TRUE),
    (24, 'ASUS ROG Helios', 'CSE-ASU-001', '4711081808859', 1, 7, 'Full Tower, Tempered Glass, RGB', 'PIECE', 'SERIALIZED', 8999000, 2, TRUE),
    (25, 'Corsair H150i Elite Capellix 360mm', 'CLN-COR-001', '8435911058896', 7, 8, 'AIO 360mm, RGB', 'PIECE', 'SERIALIZED', 5999000, 3, TRUE),
    (26, 'Cooler Master MasterLiquid ML360L', 'CLN-CM-001', '4711176752033', 11, 8, 'AIO 360mm, ARGB', 'PIECE', 'SERIALIZED', 3499000, 3, TRUE),
    (27, 'ASUS ROG Ryujin III 360', 'CLN-ASU-001', '4711081808866', 1, 8, 'AIO 360mm, LCD display', 'PIECE', 'SERIALIZED', 8999000, 2, TRUE),
    (28, 'Samsung 980 Pro 500GB NVMe', 'STO-SAM-003', '8801647775342', 6, 6, 'PCIe 4.0 NVMe, đọc 6900MB/s', 'PIECE', 'SERIALIZED', 3499000, 10, TRUE),
    (29, 'WD Blue SN580 1TB NVMe', 'STO-WD-002', '7180378869318', 8, 6, 'PCIe 4.0 NVMe, đọc 4150MB/s', 'PIECE', 'SERIALIZED', 2999000, 10, TRUE),
    (30, 'Noctua NH-D15 chromax.black', 'CLN-NOC-001', '4711176752040', 12, 8, 'Tản nhiệt khí dual tower, black', 'PIECE', 'SERIALIZED', 2999000, 5, TRUE),
    (31, 'Cooler Master Hyper 212 Halo', 'CLN-CM-002', '4711176752057', 11, 8, 'Tản nhiệt khí single tower, ARGB', 'PIECE', 'SERIALIZED', 1599000, 10, TRUE),
    (32, 'Corsair Vengeance DDR4 32GB 3200MHz', 'RAM-COR-003', '8435911058902', 7, 2, 'DDR4, 32GB (2x16GB), 3200MHz', 'PIECE', 'SERIALIZED', 2299000, 10, FALSE);
