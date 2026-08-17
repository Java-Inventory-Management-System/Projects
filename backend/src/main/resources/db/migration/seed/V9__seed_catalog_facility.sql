-- Seed: catalog & facility master data — categories, category_zones, brands,
-- suppliers, locations, customers, products, product_suppliers

-- Categories
INSERT INTO categories(id,name,description,is_active)WITH cat(id,name,`desc`,active)AS(
    SELECT 1,'CPU','Bộ vi xử lý Intel, AMD',TRUE
    UNION ALL SELECT 2,'RAM','Bộ nhớ trong DDR4, DDR5',TRUE
    UNION ALL SELECT 3,'GPU','Card đồ họa VGA',TRUE
    UNION ALL SELECT 4,'Mainboard','Bo mạch chủ',TRUE
    UNION ALL SELECT 5,'PSU','Nguồn máy tính',TRUE
    UNION ALL SELECT 6,'Storage','SSD, HDD, NVMe',TRUE
    UNION ALL SELECT 7,'Case','Vỏ máy tính',TRUE
    UNION ALL SELECT 8,'Cooling','Tản nhiệt, quạt',TRUE
)SELECT id,name,`desc`,active FROM cat;

-- Category zone assignments (which zone each category is stored in)
INSERT INTO category_zones(category_id,zone_code)WITH cz(cid,zone)AS(SELECT 1,'A'UNION ALL SELECT 2,'D'UNION ALL SELECT 3,'B'UNION ALL SELECT 4,'E'UNION ALL SELECT 5,'F'UNION ALL SELECT 6,'C'UNION ALL SELECT 7,'G'UNION ALL SELECT 8,'H')SELECT cid,zone FROM cz;

-- Brands
INSERT INTO brands(id,name,description,is_active)WITH b(id,name,`desc`,active)AS(
    SELECT 1,'ASUS','Mainboard, GPU, linh kiện cao cấp',TRUE
    UNION ALL SELECT 2,'Gigabyte','Mainboard, GPU, linh kiện',TRUE
    UNION ALL SELECT 3,'MSI','Mainboard, GPU, linh kiện gaming',TRUE
    UNION ALL SELECT 4,'Intel','CPU, chipset',TRUE
    UNION ALL SELECT 5,'AMD','CPU, GPU',TRUE
    UNION ALL SELECT 6,'Samsung','SSD, RAM, lưu trữ',TRUE
    UNION ALL SELECT 7,'Corsair','RAM, PSU, Case, Cooling',TRUE
    UNION ALL SELECT 8,'Western Digital','SSD, HDD',TRUE
    UNION ALL SELECT 9,'Seasonic','PSU cao cấp',TRUE
    UNION ALL SELECT 10,'G.Skill','RAM hiệu năng cao',TRUE
    UNION ALL SELECT 11,'Cooler Master','Case, Cooling, PSU',TRUE
    UNION ALL SELECT 12,'Noctua','Cooling cao cấp',TRUE
    UNION ALL SELECT 13,'Kingston','RAM, SSD',FALSE
)SELECT id,name,`desc`,active FROM b;

-- Suppliers
INSERT INTO suppliers(id,name,contact_person,phone,email,address,tax_code,note,is_active)WITH s(id,name,contact,phone,email,address,tax,note,active)AS(
    SELECT 1,'Intel Vietnam','John Smith','02812345678','sales@intel.vn','Số 1, Lê Duẩn, Q.1, TP.HCM','1234567890',NULL,TRUE
    UNION ALL SELECT 2,'Corsair Asia Pte Ltd','Sarah Lee','02823456789','orders@corsair.sg','2 Jurong East, Singapore',NULL,'NCC quốc tế, cần đặt trước 7 ngày',TRUE
    UNION ALL SELECT 3,'Samsung Vina','Trần Văn A','02834567890','samsung@sam.vn','123 Nguyễn Văn Linh, Q.7, TP.HCM','0987654321',NULL,TRUE
    UNION ALL SELECT 4,'ASUS Technology Vietnam','Phạm Văn B','02845678901','asus@asus.vn','456 Lê Lợi, Q.1, TP.HCM',NULL,NULL,TRUE
    UNION ALL SELECT 5,'Western Digital Vietnam','Lê Thị C','02856789012','wd@wd.vn','789 Nguyễn Thị Minh Khai, Q.3, TP.HCM',NULL,NULL,TRUE
    UNION ALL SELECT 6,'Gigabyte Technology',NULL,NULL,NULL,NULL,NULL,'NCC mới — chờ cập nhật thông tin',TRUE
)SELECT id,name,contact,phone,email,address,tax,note,active FROM s;

-- Locations (warehouse bins)
INSERT INTO locations(zone_code,shelf_code,bin_code,full_code,description,is_active)WITH l(z,s,b,f,d,active)AS(
    SELECT'A','01','01','A-01-01','CPU Intel',TRUE
    UNION ALL SELECT'A','01','02','A-01-02','CPU Intel',TRUE
    UNION ALL SELECT'A','02','01','A-02-01','CPU AMD',TRUE
    UNION ALL SELECT'A','02','02','A-02-02','CPU AMD',TRUE
    UNION ALL SELECT'B','01','01','B-01-01','GPU ASUS',TRUE
    UNION ALL SELECT'B','01','02','B-01-02','GPU Gigabyte',TRUE
    UNION ALL SELECT'B','02','01','B-02-01','GPU MSI',TRUE
    UNION ALL SELECT'B','02','02','B-02-02','GPU ASUS TUF',TRUE
    UNION ALL SELECT'C','01','01','C-01-01','SSD Samsung',TRUE
    UNION ALL SELECT'C','01','02','C-01-02','SSD Samsung',TRUE
    UNION ALL SELECT'C','02','01','C-02-01','SSD WD',TRUE
    UNION ALL SELECT'C','02','02','C-02-02','SSD Samsung 980',TRUE
    UNION ALL SELECT'C','03','01','C-03-01','SSD WD Blue',TRUE
    UNION ALL SELECT'D','01','01','D-01-01','RAM Corsair',TRUE
    UNION ALL SELECT'D','01','02','D-01-02','RAM Corsair Dominator',TRUE
    UNION ALL SELECT'D','02','01','D-02-01','RAM G.Skill',TRUE
    UNION ALL SELECT'E','01','01','E-01-01','Mainboard ASUS ROG',TRUE
    UNION ALL SELECT'E','01','02','E-01-02','Mainboard Gigabyte',TRUE
    UNION ALL SELECT'E','02','01','E-02-01','Mainboard MSI',TRUE
    UNION ALL SELECT'E','02','02','E-02-02','Mainboard ASUS Prime',TRUE
    UNION ALL SELECT'F','01','01','F-01-01','PSU Seasonic Focus',TRUE
    UNION ALL SELECT'F','01','02','F-01-02','PSU Corsair RM',TRUE
    UNION ALL SELECT'F','02','01','F-02-01','PSU Seasonic Prime',TRUE
    UNION ALL SELECT'G','01','01','G-01-01','Case Corsair 4000D White',TRUE
    UNION ALL SELECT'G','01','02','G-01-02','Case Corsair 4000D Black',TRUE
    UNION ALL SELECT'G','02','01','G-02-01','Case ASUS Helios',TRUE
    UNION ALL SELECT'H','01','01','H-01-01','Cooling Corsair AIO',TRUE
    UNION ALL SELECT'H','01','02','H-01-02','Cooling Cooler Master',TRUE
    UNION ALL SELECT'H','02','01','H-02-01','Cooling ASUS ROG',TRUE
    UNION ALL SELECT'H','02','02','H-02-02','Cooling Noctua',TRUE
    UNION ALL SELECT'I','01','01','I-01-01','Linh kiện lẻ — chờ phân loại',TRUE
    UNION ALL SELECT'X','01','01','X-01-01','Khu vực cách ly — hàng hỏng/lỗi',TRUE
    UNION ALL SELECT'A','01','03','A-01-03','CPU Intel',TRUE
    UNION ALL SELECT'A','01','04','A-01-04','CPU Intel',TRUE
    UNION ALL SELECT'A','02','03','A-02-03','CPU AMD',TRUE
    UNION ALL SELECT'A','02','04','A-02-04','CPU AMD',TRUE
    UNION ALL SELECT'A','03','01','A-03-01','CPU Intel thế hệ cũ',TRUE
    UNION ALL SELECT'A','03','02','A-03-02','CPU Intel thế hệ cũ',TRUE
    UNION ALL SELECT'A','03','03','A-03-03','CPU AMD thế hệ cũ',TRUE
    UNION ALL SELECT'A','04','01','A-04-01','CPU Server Intel Xeon',TRUE
    UNION ALL SELECT'A','04','02','A-04-02','CPU Server AMD EPYC',TRUE
    UNION ALL SELECT'A','04','03','A-04-03','CPU Server dự phòng',TRUE
    UNION ALL SELECT'B','01','03','B-01-03','GPU ASUS',TRUE
    UNION ALL SELECT'B','01','04','B-01-04','GPU ASUS',TRUE
    UNION ALL SELECT'B','02','03','B-02-03','GPU MSI',TRUE
    UNION ALL SELECT'B','02','04','B-02-04','GPU MSI',TRUE
    UNION ALL SELECT'B','03','01','B-03-01','GPU Gigabyte',TRUE
    UNION ALL SELECT'B','03','02','B-03-02','GPU Gigabyte',TRUE
    UNION ALL SELECT'B','03','03','B-03-03','GPU Gigabyte',TRUE
    UNION ALL SELECT'B','04','01','B-04-01','GPU Palit / Zotac',TRUE
    UNION ALL SELECT'B','04','02','B-04-02','GPU Palit / Zotac',TRUE
    UNION ALL SELECT'B','04','03','B-04-03','GPU Palit / Zotac',TRUE
    UNION ALL SELECT'C','01','03','C-01-03','SSD Samsung',TRUE
    UNION ALL SELECT'C','01','04','C-01-04','SSD Samsung',TRUE
    UNION ALL SELECT'C','02','03','C-02-03','SSD WD',TRUE
    UNION ALL SELECT'C','02','04','C-02-04','SSD WD',TRUE
    UNION ALL SELECT'C','03','02','C-03-02','SSD WD Blue',TRUE
    UNION ALL SELECT'C','03','03','C-03-03','SSD WD Blue',TRUE
    UNION ALL SELECT'C','04','01','C-04-01','SSD Kingston',TRUE
    UNION ALL SELECT'C','04','02','C-04-02','SSD Kingston',TRUE
    UNION ALL SELECT'C','04','03','C-04-03','SSD Kingston',TRUE
    UNION ALL SELECT'C','04','04','C-04-04','SSD Kingston',TRUE
    UNION ALL SELECT'D','01','03','D-01-03','RAM Corsair',TRUE
    UNION ALL SELECT'D','01','04','D-01-04','RAM Corsair',TRUE
    UNION ALL SELECT'D','02','02','D-02-02','RAM G.Skill',TRUE
    UNION ALL SELECT'D','02','03','D-02-03','RAM G.Skill',TRUE
    UNION ALL SELECT'D','03','01','D-03-01','RAM Kingston',TRUE
    UNION ALL SELECT'D','03','02','D-03-02','RAM Kingston',TRUE
    UNION ALL SELECT'D','03','03','D-03-03','RAM Kingston',TRUE
    UNION ALL SELECT'D','03','04','D-03-04','RAM DDR4 cũ',TRUE
    UNION ALL SELECT'D','04','01','D-04-01','RAM Server ECC',TRUE
    UNION ALL SELECT'D','04','02','D-04-02','RAM Server ECC',TRUE
    UNION ALL SELECT'E','01','03','E-01-03','Mainboard ASUS ROG',TRUE
    UNION ALL SELECT'E','01','04','E-01-04','Mainboard ASUS TUF',TRUE
    UNION ALL SELECT'E','02','03','E-02-03','Mainboard MSI',TRUE
    UNION ALL SELECT'E','02','04','E-02-04','Mainboard MSI',TRUE
    UNION ALL SELECT'E','03','01','E-03-01','Mainboard Gigabyte',TRUE
    UNION ALL SELECT'E','03','02','E-03-02','Mainboard Gigabyte',TRUE
    UNION ALL SELECT'E','03','03','E-03-03','Mainboard ASRock',TRUE
    UNION ALL SELECT'E','03','04','E-03-04','Mainboard ASRock',TRUE
    UNION ALL SELECT'F','01','03','F-01-03','PSU Seasonic Focus',TRUE
    UNION ALL SELECT'F','02','02','F-02-02','PSU Seasonic Prime',TRUE
    UNION ALL SELECT'F','02','03','F-02-03','PSU Seasonic Prime',TRUE
    UNION ALL SELECT'F','03','01','F-03-01','PSU Corsair',TRUE
    UNION ALL SELECT'F','03','02','F-03-02','PSU Corsair',TRUE
    UNION ALL SELECT'F','03','03','F-03-03','PSU Corsair',TRUE
    UNION ALL SELECT'F','04','01','F-04-01','PSU Gigabyte / Cooler Master',TRUE
    UNION ALL SELECT'F','04','02','F-04-02','PSU Gigabyte / Cooler Master',TRUE
    UNION ALL SELECT'G','01','03','G-01-03','Case Corsair',TRUE
    UNION ALL SELECT'G','01','04','G-01-04','Case Corsair',TRUE
    UNION ALL SELECT'G','02','02','G-02-02','Case ASUS',TRUE
    UNION ALL SELECT'G','02','03','G-02-03','Case ASUS',TRUE
    UNION ALL SELECT'G','03','01','G-03-01','Case NZXT / Fractal',TRUE
    UNION ALL SELECT'G','03','02','G-03-02','Case NZXT / Fractal',TRUE
    UNION ALL SELECT'G','03','03','G-03-03','Case NZXT / Fractal',TRUE
    UNION ALL SELECT'H','01','03','H-01-03','Cooling Corsair AIO',TRUE
    UNION ALL SELECT'H','01','04','H-01-04','Cooling Corsair AIO',TRUE
    UNION ALL SELECT'H','02','03','H-02-03','Cooling ASUS ROG',TRUE
    UNION ALL SELECT'H','02','04','H-02-04','Cooling ASUS ROG',TRUE
    UNION ALL SELECT'H','03','01','H-03-01','Cooling Noctua',TRUE
    UNION ALL SELECT'H','03','02','H-03-02','Cooling Noctua',TRUE
    UNION ALL SELECT'H','03','03','H-03-03','Cooling Cooler Master',TRUE
    UNION ALL SELECT'H','03','04','H-03-04','Cooling be quiet!',TRUE
    UNION ALL SELECT'I','01','02','I-01-02','Linh kiện lẻ — dây cáp, adapter',TRUE
    UNION ALL SELECT'I','01','03','I-01-03','Linh kiện lẻ — quạt tản nhiệt rời',TRUE
    UNION ALL SELECT'I','01','04','I-01-04','Linh kiện lẻ — keo tản nhiệt, giá đỡ',TRUE
    UNION ALL SELECT'I','02','01','I-02-01','Phụ kiện — ốc vít, bracket',TRUE
    UNION ALL SELECT'I','02','02','I-02-02','Phụ kiện — RGB controller',TRUE
    UNION ALL SELECT'I','02','03','I-02-03','Phụ kiện — cable extension',TRUE
    UNION ALL SELECT'X','01','02','X-01-02','Hàng lỗi — chờ RMA',TRUE
    UNION ALL SELECT'X','02','01','X-02-01','Hàng thu hồi — chờ kiểm định',TRUE
    UNION ALL SELECT'X','02','02','X-02-02','Hàng test — chờ kết luận',TRUE
    UNION ALL SELECT'Z','01','01','Z-01-01','Hàng mới nhập — chờ phân loại',TRUE
    UNION ALL SELECT'Z','01','02','Z-01-02','Hàng mới nhập — chờ phân loại',TRUE
    UNION ALL SELECT'Z','02','01','Z-02-01','Hàng chuyển kho — tạm thời',TRUE
    UNION ALL SELECT'Z','02','02','Z-02-02','Hàng chờ xuất — tạm thời',TRUE
    UNION ALL SELECT'QC','QC','HOLD','QC-QC-HOLD','QC hold quarantine zone',TRUE
)SELECT z,s,b,f,d,active FROM l;

-- Return staging location (auto-assigned on return restock approval)
INSERT INTO locations (zone_code, shelf_code, bin_code, full_code, description, is_active)
VALUES ('R', '01', '01', 'R-01-01', 'Khu chờ phân loại hàng trả', TRUE);

-- Customers
INSERT INTO customers(id,name,phone,email,address,note,is_active)WITH c(id,name,phone,email,address,note,active)AS(
    SELECT 1,'Công ty TNHH ABC','02812345678','info@abc.vn','123 Nguyễn Huệ, Q.1, TP.HCM',NULL,TRUE
    UNION ALL SELECT 2,'Cửa hàng PC Plus','02823456789',NULL,'456 Lê Lợi, Q.1, TP.HCM','KH quen, thường mua số lượng lớn',TRUE
    UNION ALL SELECT 3,'Nguyễn Văn Minh','0909123456','minhnv@gmail.com','789 Trần Hưng Đạo, Q.5, TP.HCM',NULL,TRUE
    UNION ALL SELECT 4,'Trần Thị Lan','0918234567',NULL,NULL,'KH mới',TRUE
    UNION ALL SELECT 5,'Công ty TNHH Thiết bị số Hoàng Gia','02834567890','sales@hoanggia.vn','321 Nguyễn Thị Minh Khai, Q.3, TP.HCM',NULL,TRUE
    UNION ALL SELECT 6,'Phạm Hoàng Quân','0978563412',NULL,'654 Lý Tự Trọng, Q.10, TP.HCM',NULL,FALSE
)SELECT id,name,phone,email,address,note,active FROM c;

-- Products (mix of SERIALIZED and BULK tracking)
INSERT INTO products(id,name,sku,barcode,brand_id,category_id,description,unit,tracking_type,sell_price,min_stock,is_active)WITH p(id,name,sku,barcode,bid,cid,`desc`,unit,track,price,min,active)AS(
    SELECT 1,'Intel Core i7-14700K','CPU-INT-001','8801791990741',4,1,'20 nhân 28 luồng, 5.6GHz','PIECE','SERIALIZED',11499000,5,TRUE
    UNION ALL SELECT 2,'Intel Core i5-14600K','CPU-INT-002','8801791990758',4,1,'14 nhân 20 luồng, 5.3GHz','PIECE','SERIALIZED',8499000,5,TRUE
    UNION ALL SELECT 3,'AMD Ryzen 7 7800X3D','CPU-AMD-001','7301435145403',5,1,'8 nhân 16 luồng, 5.0GHz, 3D V-Cache','PIECE','SERIALIZED',12499000,5,TRUE
    UNION ALL SELECT 4,'AMD Ryzen 5 7600','CPU-AMD-002','7301435145410',5,1,'6 nhân 12 luồng, 5.1GHz','PIECE','SERIALIZED',5999000,5,TRUE
    UNION ALL SELECT 5,'ASUS ROG Strix RTX 4060 OC 8GB','GPU-ASU-001','4711081809696',1,3,'NVIDIA GeForce RTX 4060, 8GB GDDR6','PIECE','SERIALIZED',15299000,3,TRUE
    UNION ALL SELECT 6,'Gigabyte RTX 4070 Gaming OC 12GB','GPU-GIG-001','4719331335252',2,3,'NVIDIA GeForce RTX 4070, 12GB GDDR6X','PIECE','SERIALIZED',20999000,3,TRUE
    UNION ALL SELECT 7,'MSI RTX 4060 Ventus 2X 8GB','GPU-MSI-001','4719072770996',3,3,'NVIDIA GeForce RTX 4060, 8GB GDDR6','PIECE','SERIALIZED',13599000,3,TRUE
    UNION ALL SELECT 8,'ASUS TUF Gaming RTX 4070 Ti 16GB','GPU-ASU-002','4711081809702',1,3,'NVIDIA GeForce RTX 4070 Ti, 16GB GDDR6X','PIECE','SERIALIZED',26999000,2,TRUE
    UNION ALL SELECT 9,'Samsung 990 Pro 1TB NVMe','STO-SAM-001','8801647780469',6,6,'PCIe 4.0 NVMe, đọc 7450MB/s','PIECE','SERIALIZED',4899000,10,TRUE
    UNION ALL SELECT 10,'Samsung 870 EVO 500GB SATA','STO-SAM-002','8801647775335',6,6,'SATA III, đọc 560MB/s','PIECE','SERIALIZED',2199000,10,TRUE
    UNION ALL SELECT 11,'WD Black SN850X 2TB NVMe','STO-WD-001','7180378869301',8,6,'PCIe 4.0 NVMe, đọc 7300MB/s','PIECE','SERIALIZED',6799000,5,TRUE
    UNION ALL SELECT 12,'Corsair Vengeance DDR5 32GB 5600MHz','RAM-COR-001','8435911058841',7,2,'DDR5, 32GB (2x16GB), 5600MHz','PIECE','SERIALIZED',3199000,10,TRUE
    UNION ALL SELECT 13,'Corsair Dominator DDR5 64GB 5200MHz','RAM-COR-002','8435911058858',7,2,'DDR5, 64GB (2x32GB), 5200MHz','PIECE','SERIALIZED',5499000,5,TRUE
    UNION ALL SELECT 14,'G.Skill Trident Z5 DDR5 32GB 6000MHz','RAM-GSK-001','4713294112293',10,2,'DDR5, 32GB (2x16GB), 6000MHz CL30','PIECE','SERIALIZED',3499000,10,TRUE
    UNION ALL SELECT 15,'ASUS ROG Strix Z790-E Gaming','MB-ASU-001','4711081808835',1,4,'LGA1700, DDR5, PCIe 5.0, WiFi 6E','PIECE','SERIALIZED',11999000,3,TRUE
    UNION ALL SELECT 16,'Gigabyte Z790 Aorus Elite AX','MB-GIG-001','4719331335269',2,4,'LGA1700, DDR5, PCIe 5.0, WiFi 6E','PIECE','SERIALIZED',8499000,3,TRUE
    UNION ALL SELECT 17,'MSI MAG Z790 Tomahawk','MB-MSI-001','4719072771009',3,4,'LGA1700, DDR5, PCIe 5.0','PIECE','SERIALIZED',9499000,3,TRUE
    UNION ALL SELECT 18,'ASUS Prime B760-PLUS','MB-ASU-002','4711081808842',1,4,'LGA1700, DDR5, PCIe 4.0','PIECE','SERIALIZED',5499000,5,TRUE
    UNION ALL SELECT 19,'Seasonic Focus GX-750 750W','PSU-SEA-001','4711176752019',9,5,'750W, Gold, Fully Modular','PIECE','SERIALIZED',2999000,5,TRUE
    UNION ALL SELECT 20,'Corsair RM850x 850W','PSU-COR-001','8435911058865',7,5,'850W, Gold, Fully Modular','PIECE','SERIALIZED',3899000,5,TRUE
    UNION ALL SELECT 21,'Seasonic Prime TX-1000 1000W','PSU-SEA-002','4711176752026',9,5,'1000W, Titanium, Fully Modular','PIECE','SERIALIZED',6999000,3,TRUE
    UNION ALL SELECT 22,'Corsair 4000D Airflow','CSE-COR-001','8435911058872',7,7,'Mid Tower, Tempered Glass, White','PIECE','SERIALIZED',2499000,3,TRUE
    UNION ALL SELECT 23,'Corsair 4000D Airflow Black','CSE-COR-002','8435911058889',7,7,'Mid Tower, Tempered Glass, Black','PIECE','SERIALIZED',2499000,3,TRUE
    UNION ALL SELECT 24,'ASUS ROG Helios','CSE-ASU-001','4711081808859',1,7,'Full Tower, Tempered Glass, RGB','PIECE','SERIALIZED',8999000,2,TRUE
    UNION ALL SELECT 25,'Corsair H150i Elite Capellix 360mm','CLN-COR-001','8435911058896',7,8,'AIO 360mm, RGB','PIECE','SERIALIZED',5999000,3,TRUE
    UNION ALL SELECT 26,'Cooler Master MasterLiquid ML360L','CLN-CM-001','4711176752033',11,8,'AIO 360mm, ARGB','PIECE','SERIALIZED',3499000,3,TRUE
    UNION ALL SELECT 27,'ASUS ROG Ryujin III 360','CLN-ASU-001','4711081808866',1,8,'AIO 360mm, LCD display','PIECE','SERIALIZED',8999000,2,TRUE
    UNION ALL SELECT 28,'Samsung 980 Pro 500GB NVMe','STO-SAM-003','8801647775342',6,6,'PCIe 4.0 NVMe, đọc 6900MB/s','PIECE','SERIALIZED',3499000,10,TRUE
    UNION ALL SELECT 29,'WD Blue SN580 1TB NVMe','STO-WD-002','7180378869318',8,6,'PCe 4.0 NVMe, đọc 4150MB/s','PIECE','SERIALIZED',2999000,10,TRUE
    UNION ALL SELECT 30,'Noctua NH-D15 chromax.black','CLN-NOC-001','4711176752040',12,8,'Tản nhiệt khí dual tower, black','PIECE','SERIALIZED',2999000,5,TRUE
    UNION ALL SELECT 31,'Cooler Master Hyper 212 Halo','CLN-CM-002','4711176752057',11,8,'Tản nhiệt khí single tower, ARGB','PIECE','SERIALIZED',1599000,10,TRUE
    UNION ALL SELECT 32,'Corsair Vengeance DDR4 32GB 3200MHz','RAM-COR-003','8435911058902',7,2,'DDR4, 32GB (2x16GB), 3200MHz','PIECE','SERIALIZED',2299000,10,TRUE
    UNION ALL SELECT 33,'Thermal Grizzly Kryonaut 1g','THR-TG-001','4260719050015',12,8,'Thermal pasIte high-end, 1g tube','TUBE','BULK',199000,20,TRUE
)SELECT id,name,sku,barcode,bid,cid,`desc`,unit,track,price,min,active FROM p;

-- Product-supplier assignments (which suppliers can supply each product)
INSERT INTO product_suppliers(product_id,supplier_id)WITH ps(pid,sid)AS(
    SELECT 1,1 UNION ALL SELECT 2,1 UNION ALL SELECT 3,4 UNION ALL SELECT 4,4
    UNION ALL SELECT 5,4 UNION ALL SELECT 6,6 UNION ALL SELECT 7,6 UNION ALL SELECT 8,4
    UNION ALL SELECT 9,3 UNION ALL SELECT 10,3 UNION ALL SELECT 11,5 UNION ALL SELECT 12,2
    UNION ALL SELECT 13,2 UNION ALL SELECT 14,2 UNION ALL SELECT 15,4 UNION ALL SELECT 16,6
    UNION ALL SELECT 17,6 UNION ALL SELECT 18,4 UNION ALL SELECT 19,2 UNION ALL SELECT 20,2
    UNION ALL SELECT 21,2 UNION ALL SELECT 22,2 UNION ALL SELECT 23,2 UNION ALL SELECT 24,4
    UNION ALL SELECT 25,2 UNION ALL SELECT 26,2 UNION ALL SELECT 27,4 UNION ALL SELECT 28,3
    UNION ALL SELECT 29,5 UNION ALL SELECT 30,2 UNION ALL SELECT 31,2 UNION ALL SELECT 32,2
    UNION ALL SELECT 33,2
)SELECT pid,sid FROM ps;

-- Default bin capacity: 100 items per bin (NULL = unlimited)
UPDATE locations SET max_capacity = 100 WHERE max_capacity IS NULL;
