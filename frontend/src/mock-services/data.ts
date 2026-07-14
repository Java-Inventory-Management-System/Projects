import type {
  BrandResponse,
  CategoryResponse,
  ProductResponse,
  InventoryItem,
  UserResponse,
  AuditLog,
} from "@/utils/types"

// ==================== BRANDS ====================

export const brands: BrandResponse[] = [
  { id: 1, name: "ASUS", description: "Mainboard, GPU, linh kiện cao cấp", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 2, name: "Gigabyte", description: "Mainboard, GPU, linh kiện", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 3, name: "MSI", description: "Mainboard, GPU, linh kiện gaming", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 4, name: "Intel", description: "CPU, chipset", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 5, name: "AMD", description: "CPU, GPU", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 6, name: "Samsung", description: "SSD, RAM, lưu trữ", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 7, name: "Corsair", description: "RAM, PSU, Case, Cooling", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 8, name: "Western Digital", description: "SSD, HDD", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 9, name: "Seasonic", description: "PSU cao cấp", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 10, name: "G.Skill", description: "RAM hiệu năng cao", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 11, name: "Cooler Master", description: "Case, Cooling, PSU", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 12, name: "Noctua", description: "Cooling cao cấp", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 13, name: "Kingston", description: "RAM, SSD", isActive: false, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
]

// ==================== CATEGORIES ====================

export const categories: CategoryResponse[] = [
  { id: 1, name: "CPU", description: "Bộ vi xử lý Intel, AMD", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 2, name: "RAM", description: "Bộ nhớ trong DDR4, DDR5", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 3, name: "GPU", description: "Card đồ họa VGA", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 4, name: "Mainboard", description: "Bo mạch chủ", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 5, name: "PSU", description: "Nguồn máy tính", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 6, name: "Storage", description: "SSD, HDD, NVMe", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 7, name: "Case", description: "Vỏ máy tính", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 8, name: "Cooling", description: "Tản nhiệt, quạt", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
]

// ==================== PRODUCTS ====================

export const products: ProductResponse[] = [
  { id: 1, name: "Intel Core i7-14700K", sku: "CPU-INT-001", barcode: "8801791990741", brandId: 4, brandName: "Intel", categoryId: 1, categoryName: "CPU", description: "20 nhân 28 luồng, 5.6GHz", unit: "piece", trackingType: "serialized", sellPrice: 11499000, minStock: 5, isActive: true, createdAt: "2026-01-15T00:00:00Z", updatedAt: "2026-03-01T00:00:00Z" },
  { id: 2, name: "Intel Core i5-14600K", sku: "CPU-INT-002", barcode: "8801791990758", brandId: 4, brandName: "Intel", categoryId: 1, categoryName: "CPU", description: "14 nhân 20 luồng, 5.3GHz", unit: "piece", trackingType: "serialized", sellPrice: 8499000, minStock: 5, isActive: true, createdAt: "2026-01-15T00:00:00Z", updatedAt: "2026-03-01T00:00:00Z" },
  { id: 3, name: "AMD Ryzen 7 7800X3D", sku: "CPU-AMD-001", barcode: "7301435145403", brandId: 5, brandName: "AMD", categoryId: 1, categoryName: "CPU", description: "8 nhân 16 luồng, 5.0GHz, 3D V-Cache", unit: "piece", trackingType: "serialized", sellPrice: 12499000, minStock: 5, isActive: true, createdAt: "2026-01-20T00:00:00Z", updatedAt: "2026-03-05T00:00:00Z" },
  { id: 4, name: "AMD Ryzen 5 7600", sku: "CPU-AMD-002", barcode: "7301435145410", brandId: 5, brandName: "AMD", categoryId: 1, categoryName: "CPU", description: "6 nhân 12 luồng, 5.1GHz", unit: "piece", trackingType: "serialized", sellPrice: 5999000, minStock: 5, isActive: true, createdAt: "2026-01-20T00:00:00Z", updatedAt: "2026-03-05T00:00:00Z" },
  { id: 5, name: "ASUS ROG Strix RTX 4060 OC 8GB", sku: "GPU-ASU-001", barcode: "4711081809696", brandId: 1, brandName: "ASUS", categoryId: 3, categoryName: "GPU", description: "NVIDIA GeForce RTX 4060, 8GB GDDR6", unit: "piece", trackingType: "serialized", sellPrice: 15299000, minStock: 3, isActive: true, createdAt: "2026-02-01T00:00:00Z", updatedAt: "2026-03-10T00:00:00Z" },
  { id: 6, name: "Gigabyte RTX 4070 Gaming OC 12GB", sku: "GPU-GIG-001", barcode: "4719331335252", brandId: 2, brandName: "Gigabyte", categoryId: 3, categoryName: "GPU", description: "NVIDIA GeForce RTX 4070, 12GB GDDR6X", unit: "piece", trackingType: "serialized", sellPrice: 20999000, minStock: 3, isActive: true, createdAt: "2026-02-01T00:00:00Z", updatedAt: "2026-03-10T00:00:00Z" },
  { id: 7, name: "MSI RTX 4060 Ventus 2X 8GB", sku: "GPU-MSI-001", barcode: "4719072770996", brandId: 3, brandName: "MSI", categoryId: 3, categoryName: "GPU", description: "NVIDIA GeForce RTX 4060, 8GB GDDR6", unit: "piece", trackingType: "serialized", sellPrice: 13599000, minStock: 3, isActive: true, createdAt: "2026-02-05T00:00:00Z", updatedAt: "2026-03-12T00:00:00Z" },
  { id: 8, name: "ASUS TUF Gaming RTX 4070 Ti 16GB", sku: "GPU-ASU-002", barcode: "4711081809702", brandId: 1, brandName: "ASUS", categoryId: 3, categoryName: "GPU", description: "NVIDIA GeForce RTX 4070 Ti, 16GB GDDR6X", unit: "piece", trackingType: "serialized", sellPrice: 26999000, minStock: 2, isActive: true, createdAt: "2026-02-05T00:00:00Z", updatedAt: "2026-03-12T00:00:00Z" },
  { id: 9, name: "Samsung 990 Pro 1TB NVMe", sku: "STO-SAM-001", barcode: "8801647780469", brandId: 6, brandName: "Samsung", categoryId: 6, categoryName: "Storage", description: "PCIe 4.0 NVMe, đọc 7450MB/s", unit: "piece", trackingType: "serialized", sellPrice: 4899000, minStock: 10, isActive: true, createdAt: "2026-02-10T00:00:00Z", updatedAt: "2026-03-15T00:00:00Z" },
  { id: 10, name: "Samsung 870 EVO 500GB SATA", sku: "STO-SAM-002", barcode: "8801647775335", brandId: 6, brandName: "Samsung", categoryId: 6, categoryName: "Storage", description: "SATA III, đọc 560MB/s", unit: "piece", trackingType: "serialized", sellPrice: 2199000, minStock: 10, isActive: true, createdAt: "2026-02-10T00:00:00Z", updatedAt: "2026-03-15T00:00:00Z" },
  { id: 11, name: "WD Black SN850X 2TB NVMe", sku: "STO-WD-001", barcode: "7180378869301", brandId: 8, brandName: "Western Digital", categoryId: 6, categoryName: "Storage", description: "PCIe 4.0 NVMe, đọc 7300MB/s", unit: "piece", trackingType: "serialized", sellPrice: 6799000, minStock: 5, isActive: true, createdAt: "2026-02-12T00:00:00Z", updatedAt: "2026-03-18T00:00:00Z" },
  { id: 12, name: "Corsair Vengeance DDR5 32GB 5600MHz", sku: "RAM-COR-001", barcode: "8435911058841", brandId: 7, brandName: "Corsair", categoryId: 2, categoryName: "RAM", description: "DDR5, 32GB (2x16GB), 5600MHz", unit: "piece", trackingType: "serialized", sellPrice: 3199000, minStock: 10, isActive: true, createdAt: "2026-02-15T00:00:00Z", updatedAt: "2026-03-20T00:00:00Z" },
  { id: 13, name: "Corsair Dominator DDR5 64GB 5200MHz", sku: "RAM-COR-002", barcode: "8435911058858", brandId: 7, brandName: "Corsair", categoryId: 2, categoryName: "RAM", description: "DDR5, 64GB (2x32GB), 5200MHz", unit: "piece", trackingType: "serialized", sellPrice: 5499000, minStock: 5, isActive: true, createdAt: "2026-02-15T00:00:00Z", updatedAt: "2026-03-20T00:00:00Z" },
  { id: 14, name: "G.Skill Trident Z5 DDR5 32GB 6000MHz", sku: "RAM-GSK-001", barcode: "4713294112293", brandId: 10, brandName: "G.Skill", categoryId: 2, categoryName: "RAM", description: "DDR5, 32GB (2x16GB), 6000MHz CL30", unit: "piece", trackingType: "serialized", sellPrice: 3499000, minStock: 10, isActive: true, createdAt: "2026-02-18T00:00:00Z", updatedAt: "2026-03-22T00:00:00Z" },
  { id: 15, name: "ASUS ROG Strix Z790-E Gaming", sku: "MB-ASU-001", barcode: "4711081808835", brandId: 1, brandName: "ASUS", categoryId: 4, categoryName: "Mainboard", description: "LGA1700, DDR5, PCIe 5.0, WiFi 6E", unit: "piece", trackingType: "serialized", sellPrice: 11999000, minStock: 3, isActive: true, createdAt: "2026-02-20T00:00:00Z", updatedAt: "2026-03-25T00:00:00Z" },
  { id: 16, name: "Gigabyte Z790 Aorus Elite AX", sku: "MB-GIG-001", barcode: "4719331335269", brandId: 2, brandName: "Gigabyte", categoryId: 4, categoryName: "Mainboard", description: "LGA1700, DDR5, PCIe 5.0, WiFi 6E", unit: "piece", trackingType: "serialized", sellPrice: 8499000, minStock: 3, isActive: true, createdAt: "2026-02-20T00:00:00Z", updatedAt: "2026-03-25T00:00:00Z" },
  { id: 17, name: "MSI MAG Z790 Tomahawk", sku: "MB-MSI-001", barcode: "4719072771009", brandId: 3, brandName: "MSI", categoryId: 4, categoryName: "Mainboard", description: "LGA1700, DDR5, PCIe 5.0", unit: "piece", trackingType: "serialized", sellPrice: 9499000, minStock: 3, isActive: true, createdAt: "2026-02-22T00:00:00Z", updatedAt: "2026-03-28T00:00:00Z" },
  { id: 18, name: "ASUS Prime B760-PLUS", sku: "MB-ASU-002", barcode: "4711081808842", brandId: 1, brandName: "ASUS", categoryId: 4, categoryName: "Mainboard", description: "LGA1700, DDR5, PCIe 4.0", unit: "piece", trackingType: "serialized", sellPrice: 5499000, minStock: 5, isActive: true, createdAt: "2026-02-22T00:00:00Z", updatedAt: "2026-03-28T00:00:00Z" },
  { id: 19, name: "Seasonic Focus GX-750 750W", sku: "PSU-SEA-001", barcode: "4711176752019", brandId: 9, brandName: "Seasonic", categoryId: 5, categoryName: "PSU", description: "750W, Gold, Fully Modular", unit: "piece", trackingType: "serialized", sellPrice: 2999000, minStock: 5, isActive: true, createdAt: "2026-02-25T00:00:00Z", updatedAt: "2026-04-01T00:00:00Z" },
  { id: 20, name: "Corsair RM850x 850W", sku: "PSU-COR-001", barcode: "8435911058865", brandId: 7, brandName: "Corsair", categoryId: 5, categoryName: "PSU", description: "850W, Gold, Fully Modular", unit: "piece", trackingType: "serialized", sellPrice: 3899000, minStock: 5, isActive: true, createdAt: "2026-02-25T00:00:00Z", updatedAt: "2026-04-01T00:00:00Z" },
  { id: 21, name: "Seasonic Prime TX-1000 1000W", sku: "PSU-SEA-002", barcode: "4711176752026", brandId: 9, brandName: "Seasonic", categoryId: 5, categoryName: "PSU", description: "1000W, Titanium, Fully Modular", unit: "piece", trackingType: "serialized", sellPrice: 6999000, minStock: 3, isActive: true, createdAt: "2026-02-28T00:00:00Z", updatedAt: "2026-04-02T00:00:00Z" },
  { id: 22, name: "Corsair 4000D Airflow", sku: "CSE-COR-001", barcode: "8435911058872", brandId: 7, brandName: "Corsair", categoryId: 7, categoryName: "Case", description: "Mid Tower, Tempered Glass, White", unit: "piece", trackingType: "serialized", sellPrice: 2499000, minStock: 3, isActive: true, createdAt: "2026-03-01T00:00:00Z", updatedAt: "2026-04-05T00:00:00Z" },
  { id: 23, name: "Corsair 4000D Airflow Black", sku: "CSE-COR-002", barcode: "8435911058889", brandId: 7, brandName: "Corsair", categoryId: 7, categoryName: "Case", description: "Mid Tower, Tempered Glass, Black", unit: "piece", trackingType: "serialized", sellPrice: 2499000, minStock: 3, isActive: true, createdAt: "2026-03-01T00:00:00Z", updatedAt: "2026-04-05T00:00:00Z" },
  { id: 24, name: "ASUS ROG Helios", sku: "CSE-ASU-001", barcode: "4711081808859", brandId: 1, brandName: "ASUS", categoryId: 7, categoryName: "Case", description: "Full Tower, Tempered Glass, RGB", unit: "piece", trackingType: "serialized", sellPrice: 8999000, minStock: 2, isActive: true, createdAt: "2026-03-01T00:00:00Z", updatedAt: "2026-04-05T00:00:00Z" },
  { id: 25, name: "Corsair H150i Elite Capellix 360mm", sku: "CLN-COR-001", barcode: "8435911058896", brandId: 7, brandName: "Corsair", categoryId: 8, categoryName: "Cooling", description: "AIO 360mm, RGB", unit: "piece", trackingType: "serialized", sellPrice: 5999000, minStock: 3, isActive: true, createdAt: "2026-03-05T00:00:00Z", updatedAt: "2026-04-10T00:00:00Z" },
  { id: 26, name: "Cooler Master MasterLiquid ML360L", sku: "CLN-CM-001", barcode: "4711176752033", brandId: 11, brandName: "Cooler Master", categoryId: 8, categoryName: "Cooling", description: "AIO 360mm, ARGB", unit: "piece", trackingType: "serialized", sellPrice: 3499000, minStock: 3, isActive: true, createdAt: "2026-03-05T00:00:00Z", updatedAt: "2026-04-10T00:00:00Z" },
  { id: 27, name: "ASUS ROG Ryujin III 360", sku: "CLN-ASU-001", barcode: "4711081808866", brandId: 1, brandName: "ASUS", categoryId: 8, categoryName: "Cooling", description: "AIO 360mm, LCD display", unit: "piece", trackingType: "serialized", sellPrice: 8999000, minStock: 2, isActive: true, createdAt: "2026-03-08T00:00:00Z", updatedAt: "2026-04-12T00:00:00Z" },
  { id: 28, name: "Samsung 980 Pro 500GB NVMe", sku: "STO-SAM-003", barcode: "8801647775342", brandId: 6, brandName: "Samsung", categoryId: 6, categoryName: "Storage", description: "PCIe 4.0 NVMe, đọc 6900MB/s", unit: "piece", trackingType: "serialized", sellPrice: 3499000, minStock: 10, isActive: true, createdAt: "2026-03-10T00:00:00Z", updatedAt: "2026-04-15T00:00:00Z" },
  { id: 29, name: "WD Blue SN580 1TB NVMe", sku: "STO-WD-002", barcode: "7180378869318", brandId: 8, brandName: "Western Digital", categoryId: 6, categoryName: "Storage", description: "PCIe 4.0 NVMe, đọc 4150MB/s", unit: "piece", trackingType: "serialized", sellPrice: 2999000, minStock: 10, isActive: true, createdAt: "2026-03-10T00:00:00Z", updatedAt: "2026-04-15T00:00:00Z" },
  { id: 30, name: "Noctua NH-D15 chromax.black", sku: "CLN-NOC-001", barcode: "4711176752040", brandId: 12, brandName: "Noctua", categoryId: 8, categoryName: "Cooling", description: "Tản nhiệt khí dual tower, black", unit: "piece", trackingType: "serialized", sellPrice: 2999000, minStock: 5, isActive: true, createdAt: "2026-03-12T00:00:00Z", updatedAt: "2026-04-18T00:00:00Z" },
  { id: 31, name: "Cooler Master Hyper 212 Halo", sku: "CLN-CM-002", barcode: "4711176752057", brandId: 11, brandName: "Cooler Master", categoryId: 8, categoryName: "Cooling", description: "Tản nhiệt khí single tower, ARGB", unit: "piece", trackingType: "serialized", sellPrice: 1599000, minStock: 10, isActive: true, createdAt: "2026-03-12T00:00:00Z", updatedAt: "2026-04-18T00:00:00Z" },
  { id: 32, name: "Corsair Vengeance DDR4 32GB 3200MHz", sku: "RAM-COR-003", barcode: "8435911058902", brandId: 7, brandName: "Corsair", categoryId: 2, categoryName: "RAM", description: "DDR4, 32GB (2x16GB), 3200MHz", unit: "piece", trackingType: "serialized", sellPrice: 2299000, minStock: 10, isActive: false, createdAt: "2026-03-15T00:00:00Z", updatedAt: "2026-04-20T00:00:00Z" },
]

// ==================== USERS ====================

export const users: UserResponse[] = [
  { id: 1, username: "admin", fullName: "System Admin", email: "admin@warehouse.com", role: "ADMIN", status: "ACTIVE", gender: null, dob: null, phoneNumber: null, isPasswordReset: false, isDeleted: false, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 2, username: "manager", fullName: "Nguyễn Văn A — Quản lý kho", email: "manager@warehouse.com", role: "MANAGER", status: "ACTIVE", gender: null, dob: null, phoneNumber: null, isPasswordReset: false, isDeleted: false, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 3, username: "sales", fullName: "Trần Thị B — Nhân viên bán hàng", email: "sales@warehouse.com", role: "SALES", status: "ACTIVE", gender: null, dob: null, phoneNumber: null, isPasswordReset: false, isDeleted: false, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 4, username: "stock", fullName: "Lê Văn C — Nhân viên kho", email: "stock@warehouse.com", role: "STOCK", status: "ACTIVE", gender: null, dob: null, phoneNumber: null, isPasswordReset: false, isDeleted: false, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 5, username: "phamvantuan", fullName: "Phạm Văn Tuấn", email: "tuanpv@warehouse.com", role: "MANAGER", status: "ACTIVE", gender: 1, dob: "1990-03-10T00:00:00Z", phoneNumber: "0934567890", isPasswordReset: false, isDeleted: false, createdAt: "2026-01-15T00:00:00Z", updatedAt: "2026-01-15T00:00:00Z" },
  { id: 6, username: "nguyenvanh", fullName: "Nguyễn Văn Hùng", email: "hungnv@warehouse.com", role: "STOCK", status: "ACTIVE", gender: 1, dob: "1995-06-15T00:00:00Z", phoneNumber: "0912345678", isPasswordReset: true, isDeleted: false, createdAt: "2026-02-01T00:00:00Z", updatedAt: "2026-02-01T00:00:00Z" },
  { id: 7, username: "tranthimai", fullName: "Trần Thị Mai", email: "maitt@warehouse.com", role: "SALES", status: "ACTIVE", gender: 0, dob: "1998-11-20T00:00:00Z", phoneNumber: "0923456789", isPasswordReset: false, isDeleted: false, createdAt: "2026-02-01T00:00:00Z", updatedAt: "2026-02-01T00:00:00Z" },
  { id: 8, username: "lethuhuyen", fullName: "Lê Thu Huyền", email: "huyenlt@warehouse.com", role: "STOCK", status: "INACTIVE", gender: 0, dob: "2000-09-05T00:00:00Z", phoneNumber: "0945678901", isPasswordReset: false, isDeleted: false, createdAt: "2026-03-01T00:00:00Z", updatedAt: "2026-03-01T00:00:00Z" },
  { id: 9, username: "hoangminhduc", fullName: "Hoàng Minh Đức", email: "duchm@warehouse.com", role: "ADMIN", status: "ACTIVE", gender: 1, dob: "1988-12-25T00:00:00Z", phoneNumber: "0956789012", isPasswordReset: false, isDeleted: false, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 10, username: "dangthilan", fullName: "Đặng Thị Lan", email: "landt@warehouse.com", role: "SALES", status: "ACTIVE", gender: 0, dob: "1997-07-30T00:00:00Z", phoneNumber: "0967890123", isPasswordReset: true, isDeleted: true, createdAt: "2026-02-15T00:00:00Z", updatedAt: "2026-03-15T00:00:00Z" },
]

// ==================== INVENTORY (simplified product_units) ====================

export const inventoryItems: InventoryItem[] = [
  { id: 1, productId: 1, productName: "Intel Core i7-14700K", productSku: "CPU-INT-001", quantity: 12, minStock: 5, location: "A-01-01", updatedAt: "2026-07-14T08:00:00Z" },
  { id: 2, productId: 2, productName: "Intel Core i5-14600K", productSku: "CPU-INT-002", quantity: 8, minStock: 5, location: "A-01-02", updatedAt: "2026-07-14T08:00:00Z" },
  { id: 3, productId: 3, productName: "AMD Ryzen 7 7800X3D", productSku: "CPU-AMD-001", quantity: 6, minStock: 5, location: "A-02-01", updatedAt: "2026-07-14T08:00:00Z" },
  { id: 4, productId: 4, productName: "AMD Ryzen 5 7600", productSku: "CPU-AMD-002", quantity: 15, minStock: 5, location: "A-02-02", updatedAt: "2026-07-14T08:00:00Z" },
  { id: 5, productId: 5, productName: "ASUS ROG Strix RTX 4060 OC 8GB", productSku: "GPU-ASU-001", quantity: 4, minStock: 3, location: "B-01-01", updatedAt: "2026-07-14T08:00:00Z" },
  { id: 6, productId: 6, productName: "Gigabyte RTX 4070 Gaming OC 12GB", productSku: "GPU-GIG-001", quantity: 2, minStock: 3, location: "B-01-02", updatedAt: "2026-07-14T08:00:00Z" },
  { id: 7, productId: 7, productName: "MSI RTX 4060 Ventus 2X 8GB", productSku: "GPU-MSI-001", quantity: 7, minStock: 3, location: "B-02-01", updatedAt: "2026-07-14T08:00:00Z" },
  { id: 8, productId: 8, productName: "ASUS TUF Gaming RTX 4070 Ti 16GB", productSku: "GPU-ASU-002", quantity: 1, minStock: 2, location: "B-02-02", updatedAt: "2026-07-14T08:00:00Z" },
  { id: 9, productId: 9, productName: "Samsung 990 Pro 1TB NVMe", productSku: "STO-SAM-001", quantity: 25, minStock: 10, location: "C-01-01", updatedAt: "2026-07-14T08:00:00Z" },
  { id: 10, productId: 10, productName: "Samsung 870 EVO 500GB SATA", productSku: "STO-SAM-002", quantity: 30, minStock: 10, location: "C-01-02", updatedAt: "2026-07-14T08:00:00Z" },
  { id: 11, productId: 11, productName: "WD Black SN850X 2TB NVMe", productSku: "STO-WD-001", quantity: 8, minStock: 5, location: "C-02-01", updatedAt: "2026-07-14T08:00:00Z" },
  { id: 12, productId: 12, productName: "Corsair Vengeance DDR5 32GB 5600MHz", productSku: "RAM-COR-001", quantity: 20, minStock: 10, location: "D-01-01", updatedAt: "2026-07-14T08:00:00Z" },
  { id: 13, productId: 13, productName: "Corsair Dominator DDR5 64GB 5200MHz", productSku: "RAM-COR-002", quantity: 6, minStock: 5, location: "D-01-02", updatedAt: "2026-07-14T08:00:00Z" },
  { id: 14, productId: 14, productName: "G.Skill Trident Z5 DDR5 32GB 6000MHz", productSku: "RAM-GSK-001", quantity: 15, minStock: 10, location: "D-02-01", updatedAt: "2026-07-14T08:00:00Z" },
  { id: 15, productId: 15, productName: "ASUS ROG Strix Z790-E Gaming", productSku: "MB-ASU-001", quantity: 3, minStock: 3, location: "E-01-01", updatedAt: "2026-07-14T08:00:00Z" },
  { id: 16, productId: 16, productName: "Gigabyte Z790 Aorus Elite AX", productSku: "MB-GIG-001", quantity: 5, minStock: 3, location: "E-01-02", updatedAt: "2026-07-14T08:00:00Z" },
  { id: 17, productId: 17, productName: "MSI MAG Z790 Tomahawk", productSku: "MB-MSI-001", quantity: 4, minStock: 3, location: "E-02-01", updatedAt: "2026-07-14T08:00:00Z" },
  { id: 18, productId: 18, productName: "ASUS Prime B760-PLUS", productSku: "MB-ASU-002", quantity: 10, minStock: 5, location: "E-02-02", updatedAt: "2026-07-14T08:00:00Z" },
  { id: 19, productId: 19, productName: "Seasonic Focus GX-750 750W", productSku: "PSU-SEA-001", quantity: 7, minStock: 5, location: "F-01-01", updatedAt: "2026-07-14T08:00:00Z" },
  { id: 20, productId: 20, productName: "Corsair RM850x 850W", productSku: "PSU-COR-001", quantity: 4, minStock: 5, location: "F-01-02", updatedAt: "2026-07-14T08:00:00Z" },
  { id: 21, productId: 21, productName: "Seasonic Prime TX-1000 1000W", productSku: "PSU-SEA-002", quantity: 2, minStock: 3, location: "F-02-01", updatedAt: "2026-07-14T08:00:00Z" },
  { id: 22, productId: 22, productName: "Corsair 4000D Airflow", productSku: "CSE-COR-001", quantity: 5, minStock: 3, location: "G-01-01", updatedAt: "2026-07-14T08:00:00Z" },
  { id: 23, productId: 23, productName: "Corsair 4000D Airflow Black", productSku: "CSE-COR-002", quantity: 3, minStock: 3, location: "G-01-02", updatedAt: "2026-07-14T08:00:00Z" },
  { id: 24, productId: 24, productName: "ASUS ROG Helios", productSku: "CSE-ASU-001", quantity: 1, minStock: 2, location: "G-02-01", updatedAt: "2026-07-14T08:00:00Z" },
  { id: 25, productId: 25, productName: "Corsair H150i Elite Capellix 360mm", productSku: "CLN-COR-001", quantity: 4, minStock: 3, location: "H-01-01", updatedAt: "2026-07-14T08:00:00Z" },
  { id: 26, productId: 26, productName: "Cooler Master MasterLiquid ML360L", productSku: "CLN-CM-001", quantity: 6, minStock: 3, location: "H-01-02", updatedAt: "2026-07-14T08:00:00Z" },
  { id: 27, productId: 27, productName: "ASUS ROG Ryujin III 360", productSku: "CLN-ASU-001", quantity: 2, minStock: 2, location: "H-02-01", updatedAt: "2026-07-14T08:00:00Z" },
  { id: 28, productId: 28, productName: "Samsung 980 Pro 500GB NVMe", productSku: "STO-SAM-003", quantity: 18, minStock: 10, location: "C-02-02", updatedAt: "2026-07-14T08:00:00Z" },
  { id: 29, productId: 29, productName: "WD Blue SN580 1TB NVMe", productSku: "STO-WD-002", quantity: 22, minStock: 10, location: "C-03-01", updatedAt: "2026-07-14T08:00:00Z" },
  { id: 30, productId: 30, productName: "Noctua NH-D15 chromax.black", productSku: "CLN-NOC-001", quantity: 5, minStock: 5, location: "H-02-02", updatedAt: "2026-07-14T08:00:00Z" },
]

// ==================== AUDIT LOGS ====================

export const auditLogs: AuditLog[] = [
  { userId: 1, username: "admin", ipAddress: "192.168.1.100", requestId: "req-001", action: "CREATE_PRODUCT", entityName: "PRODUCT", entityId: "1", oldValue: null, newValue: "{}", status: "SUCCESS", errorMsg: null, createdAt: "2026-07-14T08:30:00Z" },
  { userId: 2, username: "manager", ipAddress: "192.168.1.101", requestId: "req-002", action: "UPDATE_PRODUCT", entityName: "PRODUCT", entityId: "2", oldValue: "{}", newValue: "{}", status: "SUCCESS", errorMsg: null, createdAt: "2026-07-14T08:35:00Z" },
  { userId: 4, username: "stock", ipAddress: "192.168.1.102", requestId: "req-003", action: "IMPORT_RECEIPT", entityName: "IMPORT_RECEIPT", entityId: "10", oldValue: null, newValue: "{}", status: "SUCCESS", errorMsg: null, createdAt: "2026-07-14T09:00:00Z" },
  { userId: 3, username: "sales", ipAddress: "192.168.1.103", requestId: "req-004", action: "LOGIN", entityName: "AUTH", entityId: null, oldValue: null, newValue: null, status: "SUCCESS", errorMsg: null, createdAt: "2026-07-14T09:15:00Z" },
  { userId: 0, username: null, ipAddress: "192.168.1.200", requestId: "req-005", action: "LOGIN", entityName: "AUTH", entityId: null, oldValue: null, newValue: null, status: "ERROR", errorMsg: "Sai mật khẩu", createdAt: "2026-07-14T09:20:00Z" },
  { userId: 1, username: "admin", ipAddress: "192.168.1.100", requestId: "req-006", action: "UPDATE_USER_ROLE", entityName: "USER", entityId: "5", oldValue: "{}", newValue: "{}", status: "SUCCESS", errorMsg: null, createdAt: "2026-07-14T10:00:00Z" },
  { userId: 2, username: "manager", ipAddress: "192.168.1.101", requestId: "req-007", action: "CREATE_SUPPLIER", entityName: "SUPPLIER", entityId: "6", oldValue: null, newValue: "{}", status: "SUCCESS", errorMsg: null, createdAt: "2026-07-14T10:30:00Z" },
  { userId: 1, username: "admin", ipAddress: "192.168.1.100", requestId: "req-008", action: "CREATE_BRAND", entityName: "BRAND", entityId: "11", oldValue: null, newValue: "{}", status: "SUCCESS", errorMsg: null, createdAt: "2026-07-13T15:00:00Z" },
  { userId: 4, username: "stock", ipAddress: "192.168.1.102", requestId: "req-009", action: "STOCK_CHECK", entityName: "STOCK_CHECK", entityId: "5", oldValue: "{}", newValue: "{}", status: "SUCCESS", errorMsg: null, createdAt: "2026-07-13T14:45:00Z" },
  { userId: 3, username: "sales", ipAddress: "192.168.1.103", requestId: "req-010", action: "EXPORT_RECEIPT", entityName: "EXPORT_RECEIPT", entityId: "12", oldValue: null, newValue: "{}", status: "ERROR", errorMsg: "Thiếu thông tin bắt buộc", createdAt: "2026-07-13T14:00:00Z" },
  { userId: 1, username: "admin", ipAddress: "192.168.1.100", requestId: "req-011", action: "STOCK_ADJUSTMENT", entityName: "STOCK_ADJUSTMENT", entityId: "1", oldValue: null, newValue: "{}", status: "SUCCESS", errorMsg: null, createdAt: "2026-07-13T11:00:00Z" },
  { userId: 2, username: "manager", ipAddress: "192.168.1.101", requestId: "req-012", action: "WARRANTY_REQUEST", entityName: "WARRANTY_REQUEST", entityId: "3", oldValue: null, newValue: "{}", status: "SUCCESS", errorMsg: null, createdAt: "2026-07-12T16:00:00Z" },
]
