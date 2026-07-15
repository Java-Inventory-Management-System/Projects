import type {
  ProductResponse,
  SupplierResponse,
  CustomerResponse,
  ImportReceipt,
  ImportReceiptItem,
  ExportReceipt,
  ExportReceiptItem,
  ProductUnit,
  InventoryItem,
  UserResponse,
  LocationResponse,
} from "@/utils/types"
import { brands, categories, locations, users } from "./data"

type Rng = () => number

function mulberry32(seed: number): Rng {
  let s = seed | 0
  return () => {
    s = s + 0x6D2B79F5 | 0
    let t = Math.imul(s ^ s >>> 15, 1 | s)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

const pad3 = (n: number) => String(n).padStart(3, "0")

const LOCATION_CODES = locations.map((l) => l.fullCode)

const BRAND_SHORT: Record<number, string> = {
  1: "ASU", 2: "GIG", 3: "MSI", 4: "INT", 5: "AMD",
  6: "SAM", 7: "COR", 8: "WD", 9: "SEA", 10: "GSK",
  11: "CM", 12: "NOC", 13: "KNG",
}

const CAT_SHORT: Record<number, string> = {
  1: "CPU", 2: "RAM", 3: "GPU", 4: "MB", 5: "PSU", 6: "STO", 7: "CSE", 8: "CLN",
}

const CAT_NAME: Record<number, string> = {
  1: "CPU", 2: "RAM", 3: "GPU", 4: "Mainboard", 5: "PSU", 6: "Storage", 7: "Case", 8: "Cooling",
}

const BRAND_NAME: Record<number, string> = {
  1: "ASUS", 2: "Gigabyte", 3: "MSI", 4: "Intel", 5: "AMD",
  6: "Samsung", 7: "Corsair", 8: "Western Digital", 9: "Seasonic", 10: "G.Skill",
  11: "Cooler Master", 12: "Noctua", 13: "Kingston",
}

interface ProductDef {
  name: string
  brandId: number
  description: string
  sellPrice: number
}

const PRODUCT_DEFS: Record<number, ProductDef[]> = {
  1: [
    { name: "Intel Core i7-14700K", brandId: 4, description: "20 nhân 28 luồng, 5.6GHz", sellPrice: 11499000 },
    { name: "Intel Core i5-14600K", brandId: 4, description: "14 nhân 20 luồng, 5.3GHz", sellPrice: 8499000 },
    { name: "Intel Core i9-14900K", brandId: 4, description: "24 nhân 32 luồng, 6.0GHz", sellPrice: 15999000 },
    { name: "Intel Core i3-14100F", brandId: 4, description: "4 nhân 8 luồng, 4.7GHz", sellPrice: 3299000 },
    { name: "AMD Ryzen 7 7800X3D", brandId: 5, description: "8 nhân 16 luồng, 5.0GHz, 3D V-Cache", sellPrice: 12499000 },
    { name: "AMD Ryzen 5 7600X", brandId: 5, description: "6 nhân 12 luồng, 5.3GHz", sellPrice: 6999000 },
    { name: "AMD Ryzen 9 7950X", brandId: 5, description: "16 nhân 32 luồng, 5.7GHz", sellPrice: 21999000 },
  ],
  2: [
    { name: "Corsair Vengeance DDR5 32GB 5600MHz", brandId: 7, description: "DDR5, 32GB (2x16GB), 5600MHz", sellPrice: 3199000 },
    { name: "Corsair Dominator DDR5 64GB 5200MHz", brandId: 7, description: "DDR5, 64GB (2x32GB), 5200MHz", sellPrice: 5499000 },
    { name: "Corsair Vengeance DDR4 32GB 3200MHz", brandId: 7, description: "DDR4, 32GB (2x16GB), 3200MHz", sellPrice: 2299000 },
    { name: "G.Skill Trident Z5 DDR5 32GB 6000MHz", brandId: 10, description: "DDR5, 32GB (2x16GB), 6000MHz CL30", sellPrice: 3499000 },
    { name: "G.Skill Ripjaws DDR4 16GB 3200MHz", brandId: 10, description: "DDR4, 16GB (2x8GB), 3200MHz", sellPrice: 1299000 },
    { name: "Samsung DDR5 16GB 4800MHz", brandId: 6, description: "DDR5, 16GB, 4800MHz", sellPrice: 1599000 },
    { name: "Kingston Fury DDR5 32GB 5600MHz", brandId: 13, description: "DDR5, 32GB (2x16GB), 5600MHz", sellPrice: 2999000 },
    { name: "Kingston Fury DDR4 16GB 3200MHz", brandId: 13, description: "DDR4, 16GB (2x8GB), 3200MHz", sellPrice: 999000 },
  ],
  3: [
    { name: "ASUS ROG Strix RTX 4060 OC 8GB", brandId: 1, description: "NVIDIA GeForce RTX 4060, 8GB GDDR6", sellPrice: 15299000 },
    { name: "ASUS TUF Gaming RTX 4070 Ti 16GB", brandId: 1, description: "NVIDIA GeForce RTX 4070 Ti, 16GB GDDR6X", sellPrice: 26999000 },
    { name: "Gigabyte RTX 4070 Gaming OC 12GB", brandId: 2, description: "NVIDIA GeForce RTX 4070, 12GB GDDR6X", sellPrice: 20999000 },
    { name: "Gigabyte RTX 4060 Eagle 8GB", brandId: 2, description: "NVIDIA GeForce RTX 4060, 8GB GDDR6", sellPrice: 12999000 },
    { name: "MSI RTX 4060 Ventus 2X 8GB", brandId: 3, description: "NVIDIA GeForce RTX 4060, 8GB GDDR6", sellPrice: 13599000 },
    { name: "MSI RTX 4070 Ti Gaming X 12GB", brandId: 3, description: "NVIDIA GeForce RTX 4070 Ti, 12GB GDDR6X", sellPrice: 24999000 },
    { name: "ASUS Dual RTX 3050 8GB", brandId: 1, description: "NVIDIA GeForce RTX 3050, 8GB GDDR6", sellPrice: 8999000 },
  ],
  4: [
    { name: "ASUS ROG Strix Z790-E Gaming", brandId: 1, description: "LGA1700, DDR5, PCIe 5.0, WiFi 6E", sellPrice: 11999000 },
    { name: "ASUS Prime B760-PLUS", brandId: 1, description: "LGA1700, DDR5, PCIe 4.0", sellPrice: 5499000 },
    { name: "ASUS ROG Crosshair X670E Hero", brandId: 1, description: "AM5, DDR5, PCIe 5.0, WiFi 6E", sellPrice: 15999000 },
    { name: "Gigabyte Z790 Aorus Elite AX", brandId: 2, description: "LGA1700, DDR5, PCIe 5.0, WiFi 6E", sellPrice: 8499000 },
    { name: "Gigabyte B760M Gaming Plus", brandId: 2, description: "LGA1700, DDR5, PCIe 4.0", sellPrice: 3999000 },
    { name: "MSI MAG Z790 Tomahawk", brandId: 3, description: "LGA1700, DDR5, PCIe 5.0", sellPrice: 9499000 },
    { name: "MSI B760M Mortar WiFi", brandId: 3, description: "LGA1700, DDR5, PCIe 4.0, WiFi 6E", sellPrice: 5499000 },
    { name: "MSI PRO Z790-P", brandId: 3, description: "LGA1700, DDR5, PCIe 5.0", sellPrice: 6999000 },
  ],
  5: [
    { name: "Seasonic Focus GX-750 750W", brandId: 9, description: "750W, Gold, Fully Modular", sellPrice: 2999000 },
    { name: "Seasonic Prime TX-1000 1000W", brandId: 9, description: "1000W, Titanium, Fully Modular", sellPrice: 6999000 },
    { name: "Seasonic Core GM-650 650W", brandId: 9, description: "650W, Gold, Semi-Modular", sellPrice: 2199000 },
    { name: "Corsair RM850x 850W", brandId: 7, description: "850W, Gold, Fully Modular", sellPrice: 3899000 },
    { name: "Corsair RM750x 750W", brandId: 7, description: "750W, Gold, Fully Modular", sellPrice: 3499000 },
    { name: "Cooler Master MWE Gold 750 750W", brandId: 11, description: "750W, Gold, Fully Modular", sellPrice: 2699000 },
    { name: "Cooler Master V850 850W", brandId: 11, description: "850W, Gold, Fully Modular", sellPrice: 3299000 },
  ],
  6: [
    { name: "Samsung 990 Pro 1TB NVMe", brandId: 6, description: "PCIe 4.0 NVMe, đọc 7450MB/s", sellPrice: 4899000 },
    { name: "Samsung 870 EVO 500GB SATA", brandId: 6, description: "SATA III, đọc 560MB/s", sellPrice: 2199000 },
    { name: "Samsung 980 Pro 500GB NVMe", brandId: 6, description: "PCIe 4.0 NVMe, đọc 6900MB/s", sellPrice: 3499000 },
    { name: "Samsung 990 Pro 2TB NVMe", brandId: 6, description: "PCIe 4.0 NVMe, đọc 7450MB/s", sellPrice: 8499000 },
    { name: "WD Black SN850X 2TB NVMe", brandId: 8, description: "PCIe 4.0 NVMe, đọc 7300MB/s", sellPrice: 6799000 },
    { name: "WD Blue SN580 1TB NVMe", brandId: 8, description: "PCIe 4.0 NVMe, đọc 4150MB/s", sellPrice: 2999000 },
    { name: "WD Blue SN580 500GB NVMe", brandId: 8, description: "PCIe 4.0 NVMe, đọc 4000MB/s", sellPrice: 1999000 },
    { name: "Kingston NV2 1TB NVMe", brandId: 13, description: "PCIe 4.0 NVMe, đọc 3500MB/s", sellPrice: 2699000 },
  ],
  7: [
    { name: "Corsair 4000D Airflow", brandId: 7, description: "Mid Tower, Tempered Glass, White", sellPrice: 2499000 },
    { name: "Corsair 4000D Airflow Black", brandId: 7, description: "Mid Tower, Tempered Glass, Black", sellPrice: 2499000 },
    { name: "Corsair 5000D Airflow", brandId: 7, description: "Mid Tower, Tempered Glass, Black", sellPrice: 3499000 },
    { name: "Cooler Master MasterBox NR600", brandId: 11, description: "Mid Tower, Mesh, Black", sellPrice: 1799000 },
    { name: "Cooler Master MasterCase H500", brandId: 11, description: "Mid Tower, Mesh, ARGB", sellPrice: 2999000 },
    { name: "ASUS ROG Helios", brandId: 1, description: "Full Tower, Tempered Glass, RGB", sellPrice: 8999000 },
    { name: "ASUS TUF Gaming GT501", brandId: 1, description: "Mid Tower, Tempered Glass", sellPrice: 3499000 },
  ],
  8: [
    { name: "Corsair H150i Elite Capellix 360mm", brandId: 7, description: "AIO 360mm, RGB", sellPrice: 5999000 },
    { name: "Corsair H100i Elite Capellix 240mm", brandId: 7, description: "AIO 240mm, RGB", sellPrice: 4499000 },
    { name: "Cooler Master MasterLiquid ML360L", brandId: 11, description: "AIO 360mm, ARGB", sellPrice: 3499000 },
    { name: "Cooler Master Hyper 212 Halo", brandId: 11, description: "Tản nhiệt khí single tower, ARGB", sellPrice: 1599000 },
    { name: "Noctua NH-D15 chromax.black", brandId: 12, description: "Tản nhiệt khí dual tower, black", sellPrice: 2999000 },
    { name: "Noctua NH-U12S", brandId: 12, description: "Tản nhiệt khí single tower, brown", sellPrice: 2199000 },
    { name: "ASUS ROG Ryujin III 360", brandId: 1, description: "AIO 360mm, LCD display", sellPrice: 8999000 },
    { name: "ASUS ROG Strix LC II 240", brandId: 1, description: "AIO 240mm, ARGB", sellPrice: 4499000 },
  ],
}

const SUPPLIER_NAMES = [
  "Công ty TNHH Công nghệ An Phát",
  "Công ty Cổ phần Thiết bị Viễn thông Nam Long",
  "Công ty TNHH Thương mại Dịch vụ Hoàng Minh",
  "Công ty Cổ phần Phần cứng Đại Nam",
  "Doanh nghiệp tư nhân Sơn Hà",
  "Công ty TNHH Kỹ thuật số Minh Đức",
  "Công ty Cổ phần Công nghệ Bảo An",
  "Công ty TNHH Sản xuất và Thương mại Phú Cường",
  "Công ty Cổ phần Đầu tư Công nghệ Việt",
  "Công ty TNHH Một thành viên Thái Sơn",
]

const SUPPLIER_CONTACTS = [
  "Nguyễn Văn An", "Trần Thị Bình", "Lê Hoàng Cường", "Phạm Thị Dung", "Vũ Văn Đức",
  "Hoàng Thị Hạnh", "Đặng Văn Huy", "Bùi Thị Khánh", "Đỗ Văn Long", "Hồ Thị My",
]

const SUPPLIER_PHONES = [
  "02812345601", "02812345602", "02812345603", "02812345604", "02812345605",
  "02812345606", "02812345607", "02812345608", "02812345609", "02812345610",
]

const SUPPLIER_EMAILS = [
  "info@anphat.vn", "sales@namlong.vn", "contact@hoangminh.vn", "order@dainam.vn",
  "sonha@dntn.vn", "info@minhduc.vn", "baoan@cpto.vn", "phucuong@tnhh.vn",
  "invest@viettech.vn", "thaison@1mem.vn",
]

const SUPPLIER_ADDRESSES = [
  "123 Lê Lợi, Q.1, TP.HCM", "456 Nguyễn Huệ, Q.1, TP.HCM", "789 Trần Hưng Đạo, Q.5, TP.HCM",
  "321 Nguyễn Thị Minh Khai, Q.3, TP.HCM", "654 Lý Tự Trọng, Q.10, TP.HCM",
  "987 Võ Văn Tần, Q.3, TP.HCM", "159 Nguyễn Văn Linh, Q.7, TP.HCM",
  "753 Phạm Văn Đồng, Thủ Đức, TP.HCM", "951 Xô Viết Nghệ Tĩnh, Q.Bình Thạnh, TP.HCM",
  "357 Cộng Hòa, Q.Tân Bình, TP.HCM",
]

const SUPPLIER_TAX: (string | null)[] = [
  "1234567891", "1234567892", null, "1234567894", null,
  "1234567896", null, "1234567898", "1234567899", null,
]

const CUSTOMER_NAMES = [
  "Công ty TNHH Giải pháp Công nghệ An Bình",
  "Cửa hàng Máy tính Minh Quân",
  "Nguyễn Văn Đức",
  "Trần Thị Hà",
  "Công ty Cổ phần Đầu tư và Phát triển Hưng Thịnh",
  "Phạm Văn Lộc",
  "Lê Thị Hồng Nhung",
  "Công ty TNHH Thương mại Điện tử Ánh Dương",
  "Hoàng Minh Tuấn",
  "Đặng Thị Phương",
  "Cửa hàng Laptop 24h",
  "Vũ Văn Hải",
  "Bùi Thị Mai Linh",
  "Công ty TNHH Thiết bị Văn phòng Gia Khang",
  "Đỗ Văn Thắng",
  "Hồ Thị Yến",
  "Công ty Cổ phần Công nghệ Số Tân Phát",
  "Nguyễn Thị Thu Hương",
  "Trần Văn Khánh",
  "Công ty TNHH Máy tính và Phụ kiện Hoàng Long",
]

const CUSTOMER_PHONES = [
  "0909123401", "0918234502", "0978563403", "0934567804", "0281234505",
  "0905123406", "0912123407", "0282345608", "0967123409", "0988123410",
  "0903123411", "0977123412", "0933123413", "0283456714", "0944123415",
  "0915123416", "0284567817", "0979123418", "0901123419", "0285678920",
]

const CUSTOMER_EMAILS: (string | null)[] = [
  "info@anbinh.vn", null, "ducnv@gmail.com", "hath@yahoo.com", "sales@hungthinh.vn",
  "loepv@outlook.com", "nhunglth@gmail.com", "info@anhduong.vn", "tuanhm@yahoo.com",
  "phuongdt@gmail.com", null, "haivv@gmail.com", "linhbtm@outlook.com",
  "sales@giakhang.vn", "thangdv@yahoo.com", "yenhothi@gmail.com", "info@tanphat.vn",
  "huongntt@gmail.com", "khanhtv@outlook.com", "sales@hoanglong.vn",
]

const CUSTOMER_ADDRESSES: (string | null)[] = [
  "123 Nguyễn Huệ, Q.1, TP.HCM", "456 Lê Lợi, Q.1, TP.HCM", null, null,
  "789 Trần Hưng Đạo, Q.5, TP.HCM", "321 Lý Tự Trọng, Q.10, TP.HCM", "654 Nguyễn Thị Minh Khai, Q.3, TP.HCM",
  "987 Võ Văn Tần, Q.3, TP.HCM", "159 Phạm Văn Đồng, Thủ Đức, TP.HCM", null,
  "753 Xô Viết Nghệ Tĩnh, Q.Bình Thạnh, TP.HCM", null, "951 Cộng Hòa, Q.Tân Bình, TP.HCM",
  "357 Lê Văn Sỹ, Q.3, TP.HCM", null, "258 Nguyễn Văn Linh, Q.7, TP.HCM",
  "147 Trần Quốc Toản, Q.3, TP.HCM", null, "369 Phạm Ngũ Lão, Q.1, TP.HCM",
  "482 Cách Mạng Tháng 8, Q.10, TP.HCM",
]

const CUSTOMER_NOTES: (string | null)[] = [
  null, "KH doanh nghiệp, thường mua số lượng lớn", null, "KH mới",
  null, null, "KH khó tính, cần tư vấn kỹ", null, "KH quen, ưu tiên xử lý nhanh",
  null, "KH online", "KH mới", null, "KH doanh nghiệp, thanh toán chậm 30 ngày",
  null, null, "KH VIP", null, "KH tiềm năng", null,
]

function randomDate(rng: Rng, startMonth: number, endMonth: number): string {
  const day = Math.floor(rng() * 28) + 1
  const month = Math.floor(rng() * (endMonth - startMonth + 1)) + startMonth
  const hour = Math.floor(rng() * 12) + 8
  const minute = Math.floor(rng() * 60)
  const mStr = String(month).padStart(2, "0")
  const dStr = String(day).padStart(2, "0")
  const hStr = String(hour).padStart(2, "0")
  const miStr = String(minute).padStart(2, "0")
  return `2026-${mStr}-${dStr}T${hStr}:${miStr}:00Z`
}

function addHours(iso: string, hours: number): string {
  const d = new Date(iso)
  d.setHours(d.getHours() + hours)
  return d.toISOString()
}

function warrantyExpiry(importedAt: string, months: number): string {
  const d = new Date(importedAt)
  d.setMonth(d.getMonth() + months)
  return d.toISOString()
}

function genBarcode(rng: Rng): string {
  let s = ""
  for (let i = 0; i < 13; i++) s += Math.floor(rng() * 10)
  return s
}

export interface GeneratedData {
  products: ProductResponse[]
  suppliers: SupplierResponse[]
  customers: CustomerResponse[]
  importReceipts: ImportReceipt[]
  exportReceipts: ExportReceipt[]
  productUnits: ProductUnit[]
  inventoryItems: InventoryItem[]
}

export function generateMockData(): GeneratedData {
  const rng = mulberry32(42)
  const products: ProductResponse[] = []
  const skuCounter: Record<string, number> = {}

  // === PRODUCTS ===
  const catOrder = [1, 2, 3, 4, 5, 6, 7, 8]
  for (const catId of catOrder) {
    const defs = PRODUCT_DEFS[catId]
    for (const def of defs) {
      const catShort = CAT_SHORT[catId]
      const brandShort = BRAND_SHORT[def.brandId]
      const key = `${catShort}-${brandShort}`
      skuCounter[key] = (skuCounter[key] || 0) + 1
      const sku = `${catShort}-${brandShort}-${pad3(skuCounter[key])}`
      products.push({
        id: products.length + 1,
        name: def.name,
        sku,
        barcode: genBarcode(rng),
        brandId: def.brandId,
        brandName: BRAND_NAME[def.brandId],
        categoryId: catId,
        categoryName: CAT_NAME[catId],
        description: def.description,
        unit: "piece",
        trackingType: "SERIALIZED",
        sellPrice: def.sellPrice,
        minStock: catId === 3 || catId === 4 || catId === 5 || catId === 7 || catId === 8 ? 3 : 5,
        isActive: true,
        createdAt: "2026-01-15T00:00:00Z",
        updatedAt: "2026-03-01T00:00:00Z",
      })
    }
  }

  const stockUsers = [4, 6, 8]
  const managerUsers = [2, 5, 9]

  function pickUser(ids: number[]): { id: number; name: string } {
    const u = ids[Math.floor(rng() * ids.length)]
    return { id: u, name: users.find((x) => x.id === u)!.fullName }
  }

  function pickManagerOrNull(): { id: number; name: string } | null {
    if (rng() < 0.6) return null
    return pickUser(managerUsers)
  }

  const suppliers: SupplierResponse[] = SUPPLIER_NAMES.map((name, i) => ({
    id: i + 1,
    name,
    contactPerson: SUPPLIER_CONTACTS[i],
    phone: SUPPLIER_PHONES[i],
    email: SUPPLIER_EMAILS[i],
    address: SUPPLIER_ADDRESSES[i],
    taxCode: SUPPLIER_TAX[i],
    note: null,
    isActive: true,
    createdAt: "2026-01-15T00:00:00Z",
    updatedAt: "2026-01-15T00:00:00Z",
  }))

  const customers: CustomerResponse[] = CUSTOMER_NAMES.map((name, i) => ({
    id: i + 1,
    name,
    phone: CUSTOMER_PHONES[i],
    email: CUSTOMER_EMAILS[i],
    address: CUSTOMER_ADDRESSES[i],
    note: CUSTOMER_NOTES[i],
    isActive: i !== 5 && i !== 18,
    createdAt: "2026-02-01T00:00:00Z",
    updatedAt: "2026-02-01T00:00:00Z",
  }))

  // === IMPORT RECEIPTS ===
  const importReceipts: ImportReceipt[] = []
  const importStatuses = [
    "COMPLETED", "COMPLETED", "COMPLETED",
    "PENDING_APPROVAL", "PENDING_APPROVAL",
    "PENDING", "PENDING",
    "CANCELLED", "CANCELLED",
  ]
  let itemId = 0
  const impSeq: Record<string, number> = {}

  function nextImpSeq(dateStr: string): string {
    const key = dateStr.replace(/-/g, "")
    impSeq[key] = (impSeq[key] || 0) + 1
    return `IMP-${key}-${pad3(impSeq[key])}`
  }

  for (let ri = 0; ri < 50; ri++) {
    const rId = ri + 1
    const numItems = Math.floor(rng() * 10) + 3
    const status = importStatuses[Math.floor(rng() * importStatuses.length)] as ImportReceipt["status"]
    const impDate = randomDate(rng, 3, 7)
    const updDate = status === "COMPLETED" || status === "CANCELLED" ? addHours(impDate, 3 + Math.floor(rng() * 4)) : impDate
    const code = nextImpSeq(impDate.slice(0, 10))
    const supplier = suppliers[Math.floor(rng() * suppliers.length)]
    const creator = pickUser(stockUsers)
    const approver = status === "COMPLETED" ? pickManagerOrNull() : null

    const items: ImportReceiptItem[] = []
    let total = 0
    const usedProducts = new Set<number>()

    for (let ii = 0; ii < numItems; ii++) {
      itemId++
      let p: ProductResponse
      let attempts = 0
      do {
        p = products[Math.floor(rng() * products.length)]
        attempts++
      } while (usedProducts.has(p.id!) && attempts < 30)
      usedProducts.add(p.id!)

      const qty = Math.floor(rng() * 471) + 30
      const unitPrice = Math.round((p.sellPrice! * (0.65 + rng() * 0.2)) / 1000) * 1000
      total += qty * unitPrice
      items.push({
        id: itemId,
        productId: p.id!,
        productName: p.name,
        productSku: p.sku!,
        quantity: qty,
        unitPrice,
        warrantyMonths: [12, 24, 36, 60][Math.floor(rng() * 4)],
        createdUnits: qty,
      })
    }

    importReceipts.push({
      id: rId,
      receiptCode: code,
      supplierId: supplier.id,
      supplierName: supplier.name,
      status,
      createdBy: creator.id,
      createdByName: creator.name,
      approvedBy: approver?.id ?? null,
      approvedByName: approver?.name ?? null,
      note: status === "PENDING_APPROVAL" ? "Chờ QL kiểm tra số lượng thực tế" : null,
      totalAmount: total,
      createdAt: impDate,
      updatedAt: updDate,
      items,
    })
  }

  // === EXPORT RECEIPTS ===
  const exportReceipts: ExportReceipt[] = []
  const exportStatuses = [
    "COMPLETED", "COMPLETED", "COMPLETED", "COMPLETED",
    "PENDING_APPROVAL", "PENDING_APPROVAL", "PENDING_APPROVAL",
    "CANCELLED", "CANCELLED", "CANCELLED",
  ]
  const expSeq: Record<string, number> = {}
  let exportItemId = 0

  function nextExpSeq(dateStr: string): string {
    const key = dateStr.replace(/-/g, "")
    expSeq[key] = (expSeq[key] || 0) + 1
    return `EXP-${key}-${pad3(expSeq[key])}`
  }

  for (let ri = 0; ri < 30; ri++) {
    const rId = ri + 1
    const numItems = Math.floor(rng() * 8) + 2
    const status = exportStatuses[Math.floor(rng() * exportStatuses.length)] as ExportReceipt["status"]
    const expDate = randomDate(rng, 4, 7)
    const updDate = status === "COMPLETED" || status === "CANCELLED" ? addHours(expDate, 2 + Math.floor(rng() * 3)) : expDate
    const code = nextExpSeq(expDate.slice(0, 10))
    const customer = customers[Math.floor(rng() * customers.length)]
    const isSale = rng() > 0.2
    const creator = pickUser(stockUsers)
    const approver = status === "COMPLETED" ? pickManagerOrNull() : null

    const items: ExportReceiptItem[] = []
    let total = 0

    for (let ii = 0; ii < numItems; ii++) {
      exportItemId++
      const p = products[Math.floor(rng() * products.length)]
      const qty = Math.floor(rng() * 191) + 10
      total += qty * p.sellPrice!
      items.push({
        id: exportItemId,
        productId: p.id!,
        productName: p.name,
        productSku: p.sku!,
        quantity: qty,
        unitPrice: p.sellPrice!,
      })
    }

    exportReceipts.push({
      id: rId,
      receiptCode: code,
      reason: isSale ? "SALE" : "INTERNAL",
      customerId: isSale ? customer.id : null,
      customerName: isSale ? customer.name : null,
      status,
      createdBy: creator.id,
      createdByName: creator.name,
      approvedBy: approver?.id ?? null,
      approvedByName: approver?.name ?? null,
      note: status === "PENDING_APPROVAL" ? "Chờ duyệt xuất" : null,
      totalAmount: total,
      createdAt: expDate,
      updatedAt: updDate,
      items,
    })
  }

  // === PRODUCT UNITS ===
  const productUnits: ProductUnit[] = []
  let unitId = 0

  for (const receipt of importReceipts) {
    if (receipt.status !== "COMPLETED") continue
    for (const item of receipt.items) {
      const importedAt = receipt.updatedAt
      const locCode = LOCATION_CODES[Math.floor(rng() * LOCATION_CODES.length)]
      for (let i = 0; i < item.quantity; i++) {
        unitId++
        productUnits.push({
          id: unitId,
          serialNumber: `${item.productSku}-${pad3(i + 1)}`,
          productId: item.productId,
          productName: item.productName,
          productSku: item.productSku,
          trackingType: "SERIALIZED",
          initialQuantity: 1,
          remainingQuantity: 1,
          importReceiptItemId: item.id,
          locationId: null,
          locationCode: locCode,
          status: "IN_STOCK",
          importedAt,
          warrantyMonths: item.warrantyMonths,
          warrantyStartDate: importedAt,
          warrantyExpiresAt: warrantyExpiry(importedAt, item.warrantyMonths),
          createdAt: importedAt,
          updatedAt: importedAt,
        })
      }
    }
  }

  // === INVENTORY ITEMS ===
  const invMap = new Map<number, { product: ProductResponse; qty: number; locs: string[] }>()
  for (const pu of productUnits) {
    if (!invMap.has(pu.productId)) {
      const p = products.find((x) => x.id === pu.productId)!
      invMap.set(pu.productId, { product: p, qty: 0, locs: [] })
    }
    const entry = invMap.get(pu.productId)!
    entry.qty += pu.remainingQuantity ?? 1
    if (pu.locationCode && !entry.locs.includes(pu.locationCode)) {
      entry.locs.push(pu.locationCode)
    }
  }

  const inventoryItems: InventoryItem[] = []
  let invId = 0
  for (const [, entry] of invMap) {
    invId++
    inventoryItems.push({
      id: invId,
      productId: entry.product.id!,
      productName: entry.product.name,
      productSku: entry.product.sku!,
      quantity: entry.qty,
      minStock: entry.product.minStock ?? 5,
      location: entry.locs[0] || "I-01-01",
      updatedAt: "2026-07-15T00:00:00Z",
    })
  }

  return { products, suppliers, customers, importReceipts, exportReceipts, productUnits, inventoryItems }
}
