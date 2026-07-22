UPDATE users SET password='$2b$10$WUCuZtOYfGNQAgc4/0Xd.uVTfAfw8G/A0zDptAt.xSsfuDrd9welG' WHERE username IN ('admin','manager','sales','stock');

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

INSERT INTO category_zones(category_id,zone_code)WITH cz(cid,zone)AS(SELECT 1,'A'UNION ALL SELECT 2,'D'UNION ALL SELECT 3,'B'UNION ALL SELECT 4,'E'UNION ALL SELECT 5,'F'UNION ALL SELECT 6,'C'UNION ALL SELECT 7,'G'UNION ALL SELECT 8,'H')SELECT cid,zone FROM cz;

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

INSERT INTO suppliers(id,name,contact_person,phone,email,address,tax_code,note,is_active)WITH s(id,name,contact,phone,email,address,tax,note,active)AS(
    SELECT 1,'Intel Vietnam','John Smith','02812345678','sales@intel.vn','Số 1, Lê Duẩn, Q.1, TP.HCM','1234567890',NULL,TRUE
    UNION ALL SELECT 2,'Corsair Asia Pte Ltd','Sarah Lee','02823456789','orders@corsair.sg','2 Jurong East, Singapore',NULL,'NCC quốc tế, cần đặt trước 7 ngày',TRUE
    UNION ALL SELECT 3,'Samsung Vina','Trần Văn A','02834567890','samsung@sam.vn','123 Nguyễn Văn Linh, Q.7, TP.HCM','0987654321',NULL,TRUE
    UNION ALL SELECT 4,'ASUS Technology Vietnam','Phạm Văn B','02845678901','asus@asus.vn','456 Lê Lợi, Q.1, TP.HCM',NULL,NULL,TRUE
    UNION ALL SELECT 5,'Western Digital Vietnam','Lê Thị C','02856789012','wd@wd.vn','789 Nguyễn Thị Minh Khai, Q.3, TP.HCM',NULL,NULL,TRUE
    UNION ALL SELECT 6,'Gigabyte Technology',NULL,NULL,NULL,NULL,NULL,'NCC mới — chờ cập nhật thông tin',TRUE
)SELECT id,name,contact,phone,email,address,tax,note,active FROM s;

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
)SELECT z,s,b,f,d,active FROM l;

INSERT INTO customers(id,name,phone,email,address,note,is_active)WITH c(id,name,phone,email,address,note,active)AS(
    SELECT 1,'Công ty TNHH ABC','02812345678','info@abc.vn','123 Nguyễn Huệ, Q.1, TP.HCM',NULL,TRUE
    UNION ALL SELECT 2,'Cửa hàng PC Plus','02823456789',NULL,'456 Lê Lợi, Q.1, TP.HCM','KH quen, thường mua số lượng lớn',TRUE
    UNION ALL SELECT 3,'Nguyễn Văn Minh','0909123456','minhnv@gmail.com','789 Trần Hưng Đạo, Q.5, TP.HCM',NULL,TRUE
    UNION ALL SELECT 4,'Trần Thị Lan','0918234567',NULL,NULL,'KH mới',TRUE
    UNION ALL SELECT 5,'Công ty TNHH Thiết bị số Hoàng Gia','02834567890','sales@hoanggia.vn','321 Nguyễn Thị Minh Khai, Q.3, TP.HCM',NULL,TRUE
    UNION ALL SELECT 6,'Phạm Hoàng Quân','0978563412',NULL,'654 Lý Tự Trọng, Q.10, TP.HCM',NULL,FALSE
)SELECT id,name,phone,email,address,note,active FROM c;

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
    UNION ALL SELECT 29,'WD Blue SN580 1TB NVMe','STO-WD-002','7180378869318',8,6,'PCIe 4.0 NVMe, đọc 4150MB/s','PIECE','SERIALIZED',2999000,10,TRUE
    UNION ALL SELECT 30,'Noctua NH-D15 chromax.black','CLN-NOC-001','4711176752040',12,8,'Tản nhiệt khí dual tower, black','PIECE','SERIALIZED',2999000,5,TRUE
    UNION ALL SELECT 31,'Cooler Master Hyper 212 Halo','CLN-CM-002','4711176752057',11,8,'Tản nhiệt khí single tower, ARGB','PIECE','SERIALIZED',1599000,10,TRUE
    UNION ALL SELECT 32,'Corsair Vengeance DDR4 32GB 3200MHz','RAM-COR-003','8435911058902',7,2,'DDR4, 32GB (2x16GB), 3200MHz','PIECE','SERIALIZED',2299000,10,FALSE
)SELECT id,name,sku,barcode,bid,cid,`desc`,unit,track,price,min,active FROM p;

INSERT INTO import_receipts(id,receipt_code,supplier_id,status,note,created_by,approved_by,created_at,updated_at)
VALUES(1,'INIT-000001',1,'COMPLETED',NULL,4,2,'2026-07-01 08:00:00','2026-07-01 08:30:00');

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
INSERT INTO product_units(serial_number,product_id,tracking_type,import_receipt_item_id,location_id,status,imported_at,warranty_months)
WITH RECURSIVE seq(n)AS(SELECT 1 UNION ALL SELECT n+1 FROM seq WHERE n<100),loc(pid,loc1,loc2,cnt)AS(SELECT 1,1,2,2 UNION ALL SELECT 2,1,2,2 UNION ALL SELECT 3,3,4,2 UNION ALL SELECT 4,3,4,2 UNION ALL SELECT 5,5,5,1 UNION ALL SELECT 6,6,6,1 UNION ALL SELECT 7,7,7,1 UNION ALL SELECT 8,8,8,1 UNION ALL SELECT 9,9,10,2 UNION ALL SELECT 10,9,10,2 UNION ALL SELECT 11,11,11,1 UNION ALL SELECT 12,14,15,2 UNION ALL SELECT 13,14,15,2 UNION ALL SELECT 14,16,16,1 UNION ALL SELECT 15,17,17,1 UNION ALL SELECT 16,18,18,1 UNION ALL SELECT 17,19,19,1 UNION ALL SELECT 18,20,20,1 UNION ALL SELECT 19,21,21,1 UNION ALL SELECT 20,22,22,1 UNION ALL SELECT 21,23,23,1 UNION ALL SELECT 22,24,24,1 UNION ALL SELECT 23,25,25,1 UNION ALL SELECT 24,26,26,1 UNION ALL SELECT 25,27,27,1 UNION ALL SELECT 26,28,28,1 UNION ALL SELECT 27,29,29,1 UNION ALL SELECT 28,12,12,1 UNION ALL SELECT 29,13,13,1 UNION ALL SELECT 30,30,30,1 UNION ALL SELECT 31,27,28,2)
SELECT CONCAT('INIT-',i.id,'-',LPAD(ROW_NUMBER()OVER(PARTITION BY i.product_id ORDER BY s.n),3,'0')),i.product_id,'SERIALIZED',i.id,CASE (s.n-1)%loc.cnt WHEN 0 THEN loc.loc1 ELSE loc.loc2 END,'IN_STOCK','2026-07-01 08:00:00',i.warranty_months
FROM import_receipt_items i JOIN seq s ON s.n<=i.quantity JOIN loc ON loc.pid=i.product_id ORDER BY i.product_id,s.n;

INSERT INTO export_receipts(id,receipt_code,reason,customer_id,total_amount,status,note,created_by,approved_by,created_at,updated_at)
VALUES(1,'EXP-20260702-001','SALE',1,58992000,'COMPLETED',NULL,4,2,'2026-07-02 14:00:00','2026-07-02 16:00:00');
INSERT INTO export_receipt_items VALUES(1,1,1,3,11499000,34497000),(2,1,9,5,4899000,24495000);
INSERT INTO export_receipt_item_units(export_receipt_item_id,product_unit_id,quantity,sell_price)SELECT 1,id,1,11499000 FROM product_units WHERE product_id=1 AND status='IN_STOCK' ORDER BY imported_at LIMIT 3;
INSERT INTO export_receipt_item_units(export_receipt_item_id,product_unit_id,quantity,sell_price)SELECT 2,id,1,4899000 FROM product_units WHERE product_id=9 AND status='IN_STOCK' ORDER BY imported_at LIMIT 5;
UPDATE product_units SET status='SOLD' WHERE id IN(SELECT product_unit_id FROM export_receipt_item_units WHERE export_receipt_item_id IN(1,2));
INSERT INTO export_receipts(id,receipt_code,reason,customer_id,total_amount,status,note,created_by,created_at,updated_at)
VALUES(2,'EXP-20260708-001','SALE',3,30598000,'PENDING_APPROVAL','Chờ duyệt xuất',3,'2026-07-08 11:00:00','2026-07-08 11:00:00');
INSERT INTO export_receipt_items VALUES(3,2,5,2,15299000,30598000);
SET FOREIGN_KEY_CHECKS=1;
