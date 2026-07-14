import type {
  BrandResponse,
  CategoryResponse,
  ProductResponse,
  SupplierResponse,
  UserResponse,
  AuditLog,
  InventoryItem,
  ResponsePage,
} from "./types"

function delay(ms = 250) {
  return new Promise((r) => setTimeout(r, ms))
}

// ==================== BRANDS ====================

export const brands: BrandResponse[] = [
  { id: 1, name: "Acecook", description: "Thương hiệu mì ăn liền hàng đầu", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 2, name: "Masan", description: "Hàng tiêu dùng thiết yếu", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 3, name: "TH True Milk", description: "Sữa tươi sạch", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 4, name: "Coca-Cola", description: "Nước giải khát có ga", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 5, name: "Orion", description: "Bánh kẹo nhập khẩu Hàn Quốc", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 6, name: "Vinamilk", description: "Sữa và sản phẩm từ sữa", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 7, name: "Nestlé", description: "Thực phẩm và đồ uống đa quốc gia", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 8, name: "Unilever", description: "Hàng tiêu dùng nhanh", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 9, name: "P&G", description: "Chăm sóc gia đình", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 10, name: "Bibica", description: "Bánh kẹo nội địa", isActive: false, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
]

export async function getBrands(): Promise<BrandResponse[]> {
  await delay(100)
  return brands.filter((b) => b.isActive)
}

// ==================== CATEGORIES ====================

export const categories: CategoryResponse[] = [
  { id: 1, name: "Mì & Phở", description: "Mì ăn liền, phở, miến", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 2, name: "Đồ uống", description: "Nước ngọt, nước khoáng, nước trái cây", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 3, name: "Bánh kẹo", description: "Bánh quy, kẹo, snack", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 4, name: "Sữa & Sản phẩm từ sữa", description: "Sữa tươi, sữa chua, phô mai", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 5, name: "Gia vị", description: "Nước mắm, hạt nêm, tiêu, muối", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 6, name: "Đồ hộp", description: "Cá hộp, thịt hộp, pate", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 7, name: "Chăm sóc cá nhân", description: "Sữa tắm, dầu gội, kem đánh răng", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 8, name: "Vệ sinh nhà cửa", description: "Nước rửa chén, nước lau sàn", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 9, name: "Thực phẩm đông lạnh", description: "Hải sản, thịt đông lạnh", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 10, name: "Nguyên liệu nấu ăn", description: "Dầu ăn, bột mì, đường", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
]

export async function getCategories(): Promise<CategoryResponse[]> {
  await delay(100)
  return categories.filter((c) => c.isActive)
}

// ==================== PRODUCTS ====================

export const products: ProductResponse[] = [
  { id: 1, name: "Mì Hảo Hảo tôm chua cay", sku: "HH001", barcode: "8934561001001", brandId: 1, brandName: "Acecook", categoryId: 1, categoryName: "Mì & Phở", description: "Gói 75g", unit: "gói", trackingType: "UNIT", sellPrice: 4500, minStock: 500, isActive: true, createdAt: "2026-01-15T00:00:00Z", updatedAt: "2026-03-01T00:00:00Z" },
  { id: 2, name: "Mì Kokomi", sku: "KM001", barcode: "8934561002002", brandId: 1, brandName: "Acecook", categoryId: 1, categoryName: "Mì & Phở", description: "Thùng 30 gói", unit: "thùng", trackingType: "UNIT", sellPrice: 125000, minStock: 50, isActive: true, createdAt: "2026-01-15T00:00:00Z", updatedAt: "2026-03-01T00:00:00Z" },
  { id: 3, name: "Coca-Cola 330ml", sku: "CC330", barcode: "8934561003003", brandId: 4, brandName: "Coca-Cola", categoryId: 2, categoryName: "Đồ uống", description: "Lon 330ml", unit: "lon", trackingType: "UNIT", sellPrice: 10000, minStock: 200, isActive: true, createdAt: "2026-01-20T00:00:00Z", updatedAt: "2026-02-15T00:00:00Z" },
  { id: 4, name: "Pepsi 330ml", sku: "PS330", barcode: "8934561004004", brandId: 4, brandName: "Coca-Cola", categoryId: 2, categoryName: "Đồ uống", description: "Lon 330ml", unit: "lon", trackingType: "UNIT", sellPrice: 10000, minStock: 200, isActive: true, createdAt: "2026-01-20T00:00:00Z", updatedAt: "2026-02-15T00:00:00Z" },
  { id: 5, name: "Bánh Chocopie", sku: "OC001", barcode: "8934561005005", brandId: 5, brandName: "Orion", categoryId: 3, categoryName: "Bánh kẹo", description: "Hộp 12 cái", unit: "hộp", trackingType: "UNIT", sellPrice: 35000, minStock: 80, isActive: true, createdAt: "2026-02-01T00:00:00Z", updatedAt: "2026-03-10T00:00:00Z" },
  { id: 6, name: "Bánh An Chay", sku: "OC002", barcode: "8934561006006", brandId: 5, brandName: "Orion", categoryId: 3, categoryName: "Bánh kẹo", description: "Hộp 30 cái", unit: "hộp", trackingType: "UNIT", sellPrice: 42000, minStock: 60, isActive: true, createdAt: "2026-02-01T00:00:00Z", updatedAt: "2026-03-10T00:00:00Z" },
  { id: 7, name: "Sữa tươi TH True Milk 1L", sku: "TH001", barcode: "8934561007007", brandId: 3, brandName: "TH True Milk", categoryId: 4, categoryName: "Sữa & Sản phẩm từ sữa", description: "Hộp 1L", unit: "hộp", trackingType: "UNIT", sellPrice: 32000, minStock: 100, isActive: true, createdAt: "2026-01-10T00:00:00Z", updatedAt: "2026-03-05T00:00:00Z" },
  { id: 8, name: "Sữa chua TH True Milk", sku: "TH002", barcode: "8934561008008", brandId: 3, brandName: "TH True Milk", categoryId: 4, categoryName: "Sữa & Sản phẩm từ sữa", description: "Hũ 100g", unit: "hũ", trackingType: "UNIT", sellPrice: 8000, minStock: 300, isActive: true, createdAt: "2026-01-10T00:00:00Z", updatedAt: "2026-03-05T00:00:00Z" },
  { id: 9, name: "Nước mắm Nam Ngư 500ml", sku: "MN001", barcode: "8934561009009", brandId: 2, brandName: "Masan", categoryId: 5, categoryName: "Gia vị", description: "Chai 500ml", unit: "chai", trackingType: "UNIT", sellPrice: 15000, minStock: 150, isActive: true, createdAt: "2026-02-10T00:00:00Z", updatedAt: "2026-03-12T00:00:00Z" },
  { id: 10, name: "Hạt nêm Knorr", sku: "NK001", barcode: "8934561010001", brandId: 7, brandName: "Nestlé", categoryId: 5, categoryName: "Gia vị", description: "Gói 400g", unit: "gói", trackingType: "UNIT", sellPrice: 28000, minStock: 100, isActive: true, createdAt: "2026-02-10T00:00:00Z", updatedAt: "2026-03-12T00:00:00Z" },
  { id: 11, name: "Cá hộp Hạ Long", sku: "HL001", barcode: "8934561011008", brandId: 2, brandName: "Masan", categoryId: 6, categoryName: "Đồ hộp", description: "Hộp 155g", unit: "hộp", trackingType: "UNIT", sellPrice: 18000, minStock: 120, isActive: true, createdAt: "2026-02-15T00:00:00Z", updatedAt: "2026-03-20T00:00:00Z" },
  { id: 12, name: "Pate Gan Hộp", sku: "PT001", barcode: "8934561012005", brandId: 2, brandName: "Masan", categoryId: 6, categoryName: "Đồ hộp", description: "Hộp 200g", unit: "hộp", trackingType: "UNIT", sellPrice: 22000, minStock: 80, isActive: true, createdAt: "2026-02-15T00:00:00Z", updatedAt: "2026-03-20T00:00:00Z" },
  { id: 13, name: "Dầu gội Sunsilk", sku: "UL001", barcode: "8934561013002", brandId: 8, brandName: "Unilever", categoryId: 7, categoryName: "Chăm sóc cá nhân", description: "Chai 650ml", unit: "chai", trackingType: "UNIT", sellPrice: 45000, minStock: 60, isActive: true, createdAt: "2026-02-20T00:00:00Z", updatedAt: "2026-03-15T00:00:00Z" },
  { id: 14, name: "Sữa tắm Lifebuoy", sku: "UL002", barcode: "8934561014009", brandId: 8, brandName: "Unilever", categoryId: 7, categoryName: "Chăm sóc cá nhân", description: "Chai 900ml", unit: "chai", trackingType: "UNIT", sellPrice: 52000, minStock: 50, isActive: true, createdAt: "2026-02-20T00:00:00Z", updatedAt: "2026-03-15T00:00:00Z" },
  { id: 15, name: "Nước rửa chén Sunlight", sku: "UL003", barcode: "8934561015006", brandId: 8, brandName: "Unilever", categoryId: 8, categoryName: "Vệ sinh nhà cửa", description: "Chai 750ml", unit: "chai", trackingType: "UNIT", sellPrice: 25000, minStock: 100, isActive: true, createdAt: "2026-02-20T00:00:00Z", updatedAt: "2026-03-15T00:00:00Z" },
  { id: 16, name: "Kem đánh răng P/S", sku: "PG001", barcode: "8934561016003", brandId: 9, brandName: "P&G", categoryId: 7, categoryName: "Chăm sóc cá nhân", description: "Tuýp 180g", unit: "tuýp", trackingType: "UNIT", sellPrice: 19000, minStock: 120, isActive: true, createdAt: "2026-02-22T00:00:00Z", updatedAt: "2026-03-18T00:00:00Z" },
  { id: 17, name: "Bột giặt Tide", sku: "PG002", barcode: "8934561017000", brandId: 9, brandName: "P&G", categoryId: 8, categoryName: "Vệ sinh nhà cửa", description: "Gói 4kg", unit: "gói", trackingType: "UNIT", sellPrice: 98000, minStock: 40, isActive: true, createdAt: "2026-02-22T00:00:00Z", updatedAt: "2026-03-18T00:00:00Z" },
  { id: 18, name: "Sữa đặc Ông Thọ", sku: "VM001", barcode: "8934561018007", brandId: 6, brandName: "Vinamilk", categoryId: 4, categoryName: "Sữa & Sản phẩm từ sữa", description: "Hộp 380g", unit: "hộp", trackingType: "UNIT", sellPrice: 24000, minStock: 150, isActive: true, createdAt: "2026-01-05T00:00:00Z", updatedAt: "2026-03-01T00:00:00Z" },
  { id: 19, name: "Milo UHT 180ml", sku: "VM002", barcode: "8934561019004", brandId: 6, brandName: "Vinamilk", categoryId: 4, categoryName: "Sữa & Sản phẩm từ sữa", description: "Hộp 180ml", unit: "hộp", trackingType: "UNIT", sellPrice: 7000, minStock: 400, isActive: true, createdAt: "2026-01-05T00:00:00Z", updatedAt: "2026-03-01T00:00:00Z" },
  { id: 20, name: "Dầu ăn Tường An 1L", sku: "TA001", barcode: "8934561020000", brandId: 2, brandName: "Masan", categoryId: 10, categoryName: "Nguyên liệu nấu ăn", description: "Chai 1L", unit: "chai", trackingType: "UNIT", sellPrice: 35000, minStock: 80, isActive: true, createdAt: "2026-02-25T00:00:00Z", updatedAt: "2026-03-20T00:00:00Z" },
  { id: 21, name: "Đường cát trắng 1kg", sku: "DC001", barcode: "8934561021007", brandId: 2, brandName: "Masan", categoryId: 10, categoryName: "Nguyên liệu nấu ăn", description: "Gói 1kg", unit: "gói", trackingType: "UNIT", sellPrice: 18000, minStock: 100, isActive: true, createdAt: "2026-02-25T00:00:00Z", updatedAt: "2026-03-20T00:00:00Z" },
  { id: 22, name: "Cà phê Nescafé 200g", sku: "NS001", barcode: "8934561022004", brandId: 7, brandName: "Nestlé", categoryId: 2, categoryName: "Đồ uống", description: "Hũ 200g", unit: "hũ", trackingType: "UNIT", sellPrice: 62000, minStock: 50, isActive: true, createdAt: "2026-03-01T00:00:00Z", updatedAt: "2026-03-25T00:00:00Z" },
  { id: 23, name: "Maggi chai 250ml", sku: "NS002", barcode: "8934561023001", brandId: 7, brandName: "Nestlé", categoryId: 5, categoryName: "Gia vị", description: "Chai 250ml", unit: "chai", trackingType: "UNIT", sellPrice: 12000, minStock: 180, isActive: true, createdAt: "2026-03-01T00:00:00Z", updatedAt: "2026-03-25T00:00:00Z" },
  { id: 24, name: "Mì Ly 3 Miền", sku: "3M001", barcode: "8934561024008", brandId: 1, brandName: "Acecook", categoryId: 1, categoryName: "Mì & Phở", description: "Ly 67g", unit: "ly", trackingType: "UNIT", sellPrice: 6000, minStock: 300, isActive: true, createdAt: "2026-03-05T00:00:00Z", updatedAt: "2026-04-01T00:00:00Z" },
  { id: 25, name: "Bánh quy Orion", sku: "OC003", barcode: "8934561025005", brandId: 5, brandName: "Orion", categoryId: 3, categoryName: "Bánh kẹo", description: "Gói 168g", unit: "gói", trackingType: "UNIT", sellPrice: 15000, minStock: 200, isActive: true, createdAt: "2026-03-05T00:00:00Z", updatedAt: "2026-04-01T00:00:00Z" },
  { id: 26, name: "Aquafina 500ml", sku: "AQ500", barcode: "8934561026002", brandId: 4, brandName: "Coca-Cola", categoryId: 2, categoryName: "Đồ uống", description: "Chai 500ml", unit: "chai", trackingType: "UNIT", sellPrice: 5000, minStock: 400, isActive: true, createdAt: "2026-03-10T00:00:00Z", updatedAt: "2026-04-02T00:00:00Z" },
  { id: 27, name: "Bò kho hộp", sku: "BK001", barcode: "8934561027009", brandId: 2, brandName: "Masan", categoryId: 6, categoryName: "Đồ hộp", description: "Hộp 200g", unit: "hộp", trackingType: "UNIT", sellPrice: 26000, minStock: 70, isActive: true, createdAt: "2026-03-10T00:00:00Z", updatedAt: "2026-04-02T00:00:00Z" },
  { id: 28, name: "Dầu gội Pantene", sku: "PG003", barcode: "8934561028006", brandId: 9, brandName: "P&G", categoryId: 7, categoryName: "Chăm sóc cá nhân", description: "Chai 600ml", unit: "chai", trackingType: "UNIT", sellPrice: 38000, minStock: 60, isActive: true, createdAt: "2026-03-15T00:00:00Z", updatedAt: "2026-04-05T00:00:00Z" },
  { id: 29, name: "Nước lau sàn Vim", sku: "UL004", barcode: "8934561029003", brandId: 8, brandName: "Unilever", categoryId: 8, categoryName: "Vệ sinh nhà cửa", description: "Chai 1L", unit: "chai", trackingType: "UNIT", sellPrice: 20000, minStock: 100, isActive: true, createdAt: "2026-03-15T00:00:00Z", updatedAt: "2026-04-05T00:00:00Z" },
  { id: 30, name: "Bánh Gạo Hàn Quốc", sku: "OC004", barcode: "8934561030000", brandId: 5, brandName: "Orion", categoryId: 3, categoryName: "Bánh kẹo", description: "Gói 130g", unit: "gói", trackingType: "UNIT", sellPrice: 12000, minStock: 250, isActive: false, createdAt: "2026-03-20T00:00:00Z", updatedAt: "2026-04-10T00:00:00Z" },
]

export async function getProducts(
  page = 0,
  size = 20,
  search?: string,
  brandId?: number,
  categoryId?: number,
): Promise<ResponsePage<ProductResponse>> {
  await delay()
  let filtered = products.filter((p) => p.isActive)
  if (search) {
    const q = search.toLowerCase()
    filtered = filtered.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.sku ?? "").toLowerCase().includes(q),
    )
  }
  if (brandId) filtered = filtered.filter((p) => p.brandId === brandId)
  if (categoryId) filtered = filtered.filter((p) => p.categoryId === categoryId)

  const start = page * size
  const content = filtered.slice(start, start + size)
  return {
    content,
    pagination: {
      pageNumber: page,
      pageSize: size,
      totalElements: filtered.length,
      totalPages: Math.ceil(filtered.length / size),
    },
  }
}

export async function getProductById(id: number): Promise<ProductResponse | null> {
  await delay(100)
  return products.find((p) => p.id === id) ?? null
}

// ==================== SUPPLIERS ====================

export const suppliers: SupplierResponse[] = [
  { id: 1, name: "Công ty TNHH Acecook Việt Nam", contactPerson: "Nguyễn Văn A", phone: "0901111111", email: "acecook@example.com", address: "KCN Tân Bình, HCM", taxCode: "0101111111", note: "Đối tác chiến lược", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 2, name: "Masan Consumer", contactPerson: "Trần Thị B", phone: "0902222222", email: "masan@example.com", address: "KCN Biên Hòa, Đồng Nai", taxCode: "0102222222", note: null, isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 3, name: "TH Milk Food", contactPerson: "Lê Văn C", phone: "0903333333", email: "thmilk@example.com", address: "Nghệ An", taxCode: "0103333333", note: "Sữa tươi sạch", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 4, name: "Coca-Cola Beverages Vietnam", contactPerson: "Phạm Văn D", phone: "0904444444", email: "cocacola@example.com", address: "KCN Sóng Thần, Bình Dương", taxCode: "0104444444", note: null, isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 5, name: "Orion Food Vina", contactPerson: "Hoàng Thị E", phone: "0905555555", email: "orion@example.com", address: "KCN Mỹ Phước, Bình Dương", taxCode: "0105555555", note: null, isActive: false, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
]

export async function getSuppliers(): Promise<SupplierResponse[]> {
  await delay(100)
  return suppliers.filter((s) => s.isActive)
}

// ==================== USERS ====================

export const users: UserResponse[] = [
  { id: 1, username: "admin", fullName: "System Admin", email: "admin@warehouse.com", role: "ADMIN", status: "ACTIVE", gender: null, dob: null, phoneNumber: null, isPasswordReset: false, isDeleted: false, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 2, username: "manager", fullName: "Quản lý kho", email: "manager@warehouse.com", role: "MANAGER", status: "ACTIVE", gender: null, dob: null, phoneNumber: null, isPasswordReset: false, isDeleted: false, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 3, username: "sales", fullName: "Nhân viên bán hàng", email: "sales@warehouse.com", role: "SALES", status: "ACTIVE", gender: null, dob: null, phoneNumber: null, isPasswordReset: false, isDeleted: false, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 4, username: "stock", fullName: "Nhân viên kho", email: "stock@warehouse.com", role: "STOCK", status: "ACTIVE", gender: null, dob: null, phoneNumber: null, isPasswordReset: false, isDeleted: false, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 5, username: "nguyenvanh", fullName: "Nguyễn Văn Hùng", email: "hungnv@warehouse.com", role: "STOCK", status: "ACTIVE", gender: 1, dob: "1995-06-15T00:00:00Z", phoneNumber: "0912345678", isPasswordReset: true, isDeleted: false, createdAt: "2026-02-01T00:00:00Z", updatedAt: "2026-02-01T00:00:00Z" },
  { id: 6, username: "tranthimai", fullName: "Trần Thị Mai", email: "maitt@warehouse.com", role: "SALES", status: "ACTIVE", gender: 0, dob: "1998-11-20T00:00:00Z", phoneNumber: "0923456789", isPasswordReset: false, isDeleted: false, createdAt: "2026-02-01T00:00:00Z", updatedAt: "2026-02-01T00:00:00Z" },
  { id: 7, username: "phamvantuan", fullName: "Phạm Văn Tuấn", email: "tuanpv@warehouse.com", role: "MANAGER", status: "ACTIVE", gender: 1, dob: "1990-03-10T00:00:00Z", phoneNumber: "0934567890", isPasswordReset: false, isDeleted: false, createdAt: "2026-01-15T00:00:00Z", updatedAt: "2026-01-15T00:00:00Z" },
  { id: 8, username: "lethuhuyen", fullName: "Lê Thu Huyền", email: "huyenlt@warehouse.com", role: "STOCK", status: "INACTIVE", gender: 0, dob: "2000-09-05T00:00:00Z", phoneNumber: "0945678901", isPasswordReset: false, isDeleted: false, createdAt: "2026-03-01T00:00:00Z", updatedAt: "2026-03-01T00:00:00Z" },
  { id: 9, username: "hoangminhduc", fullName: "Hoàng Minh Đức", email: "duchm@warehouse.com", role: "ADMIN", status: "ACTIVE", gender: 1, dob: "1988-12-25T00:00:00Z", phoneNumber: "0956789012", isPasswordReset: false, isDeleted: false, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: 10, username: "dangthilan", fullName: "Đặng Thị Lan", email: "landt@warehouse.com", role: "SALES", status: "ACTIVE", gender: 0, dob: "1997-07-30T00:00:00Z", phoneNumber: "0967890123", isPasswordReset: true, isDeleted: true, createdAt: "2026-02-15T00:00:00Z", updatedAt: "2026-03-15T00:00:00Z" },
]

export async function getUsers(
  page = 0,
  size = 20,
): Promise<ResponsePage<UserResponse>> {
  await delay()
  const filtered = users.filter((u) => !u.isDeleted)
  const start = page * size
  const content = filtered.slice(start, start + size)
  return {
    content,
    pagination: {
      pageNumber: page,
      pageSize: size,
      totalElements: filtered.length,
      totalPages: Math.ceil(filtered.length / size),
    },
  }
}

// ==================== INVENTORY ====================

export const inventoryItems: InventoryItem[] = [
  { id: 1, productId: 1, productName: "Mì Hảo Hảo tôm chua cay", productSku: "HH001", quantity: 1200, minStock: 500, location: "A-01-01", updatedAt: "2026-07-14T08:00:00Z" },
  { id: 2, productId: 2, productName: "Mì Kokomi", productSku: "KM001", quantity: 85, minStock: 50, location: "A-01-02", updatedAt: "2026-07-14T08:00:00Z" },
  { id: 3, productId: 3, productName: "Coca-Cola 330ml", productSku: "CC330", quantity: 540, minStock: 200, location: "B-02-01", updatedAt: "2026-07-14T08:00:00Z" },
  { id: 4, productId: 4, productName: "Pepsi 330ml", productSku: "PS330", quantity: 320, minStock: 200, location: "B-02-02", updatedAt: "2026-07-14T08:00:00Z" },
  { id: 5, productId: 5, productName: "Bánh Chocopie", productSku: "OC001", quantity: 45, minStock: 80, location: "C-03-01", updatedAt: "2026-07-14T08:00:00Z" },
  { id: 6, productId: 6, productName: "Bánh An Chay", productSku: "OC002", quantity: 120, minStock: 60, location: "C-03-02", updatedAt: "2026-07-14T08:00:00Z" },
  { id: 7, productId: 7, productName: "Sữa tươi TH True Milk 1L", productSku: "TH001", quantity: 200, minStock: 100, location: "D-04-01", updatedAt: "2026-07-14T08:00:00Z" },
  { id: 8, productId: 8, productName: "Sữa chua TH True Milk", productSku: "TH002", quantity: 150, minStock: 300, location: "D-04-02", updatedAt: "2026-07-14T08:00:00Z" },
  { id: 9, productId: 9, productName: "Nước mắm Nam Ngư 500ml", productSku: "MN001", quantity: 280, minStock: 150, location: "E-05-01", updatedAt: "2026-07-14T08:00:00Z" },
  { id: 10, productId: 10, productName: "Hạt nêm Knorr", productSku: "NK001", quantity: 90, minStock: 100, location: "E-05-02", updatedAt: "2026-07-14T08:00:00Z" },
  { id: 11, productId: 11, productName: "Cá hộp Hạ Long", productSku: "HL001", quantity: 200, minStock: 120, location: "F-06-01", updatedAt: "2026-07-14T08:00:00Z" },
  { id: 12, productId: 12, productName: "Pate Gan Hộp", productSku: "PT001", quantity: 35, minStock: 80, location: "F-06-02", updatedAt: "2026-07-14T08:00:00Z" },
  { id: 13, productId: 13, productName: "Dầu gội Sunsilk", productSku: "UL001", quantity: 110, minStock: 60, location: "G-07-01", updatedAt: "2026-07-14T08:00:00Z" },
  { id: 14, productId: 14, productName: "Sữa tắm Lifebuoy", productSku: "UL002", quantity: 75, minStock: 50, location: "G-07-02", updatedAt: "2026-07-14T08:00:00Z" },
  { id: 15, productId: 15, productName: "Nước rửa chén Sunlight", productSku: "UL003", quantity: 180, minStock: 100, location: "H-08-01", updatedAt: "2026-07-14T08:00:00Z" },
  { id: 16, productId: 16, productName: "Kem đánh răng P/S", productSku: "PG001", quantity: 250, minStock: 120, location: "G-07-03", updatedAt: "2026-07-14T08:00:00Z" },
  { id: 17, productId: 17, productName: "Bột giặt Tide", productSku: "PG002", quantity: 30, minStock: 40, location: "H-08-02", updatedAt: "2026-07-14T08:00:00Z" },
  { id: 18, productId: 18, productName: "Sữa đặc Ông Thọ", productSku: "VM001", quantity: 320, minStock: 150, location: "D-04-03", updatedAt: "2026-07-14T08:00:00Z" },
  { id: 19, productId: 19, productName: "Milo UHT 180ml", productSku: "VM002", quantity: 600, minStock: 400, location: "D-04-04", updatedAt: "2026-07-14T08:00:00Z" },
  { id: 20, productId: 20, productName: "Dầu ăn Tường An 1L", productSku: "TA001", quantity: 140, minStock: 80, location: "I-09-01", updatedAt: "2026-07-14T08:00:00Z" },
]

export async function getInventory(
  page = 0,
  size = 20,
  search?: string,
): Promise<ResponsePage<InventoryItem>> {
  await delay()
  let filtered = [...inventoryItems]
  if (search) {
    const q = search.toLowerCase()
    filtered = filtered.filter(
      (i) => i.productName.toLowerCase().includes(q) || i.productSku.toLowerCase().includes(q),
    )
  }
  const start = page * size
  const content = filtered.slice(start, start + size)
  return {
    content,
    pagination: {
      pageNumber: page,
      pageSize: size,
      totalElements: filtered.length,
      totalPages: Math.ceil(filtered.length / size),
    },
  }
}

export async function getInventoryStats() {
  await delay(100)
  const totalItems = inventoryItems.reduce((sum, i) => sum + i.quantity, 0)
  const lowStock = inventoryItems.filter((i) => i.quantity <= i.minStock)
  return {
    totalProducts: products.filter((p) => p.isActive).length,
    totalItems,
    lowStockCount: lowStock.length,
    activeProducts: products.filter((p) => p.isActive).length,
  }
}

// ==================== AUDIT LOGS ====================

export const auditLogs: AuditLog[] = [
  { userId: 1, username: "admin", ipAddress: "192.168.1.100", requestId: "req-001", action: "CREATE_PRODUCT", entityName: "PRODUCT", entityId: "1", oldValue: null, newValue: "{}", status: "SUCCESS", errorMsg: null, createdAt: "2026-07-14T08:30:00Z" },
  { userId: 2, username: "manager", ipAddress: "192.168.1.101", requestId: "req-002", action: "UPDATE_PRODUCT", entityName: "PRODUCT", entityId: "2", oldValue: "{}", newValue: "{}", status: "SUCCESS", errorMsg: null, createdAt: "2026-07-14T08:35:00Z" },
  { userId: 4, username: "stock", ipAddress: "192.168.1.102", requestId: "req-003", action: "TOGGLE_ACTIVE", entityName: "PRODUCT", entityId: "30", oldValue: "{}", newValue: "{}", status: "SUCCESS", errorMsg: null, createdAt: "2026-07-14T09:00:00Z" },
  { userId: 3, username: "sales", ipAddress: "192.168.1.103", requestId: "req-004", action: "LOGIN", entityName: "AUTH", entityId: null, oldValue: null, newValue: null, status: "SUCCESS", errorMsg: null, createdAt: "2026-07-14T09:15:00Z" },
  { userId: 0, username: null, ipAddress: "192.168.1.200", requestId: "req-005", action: "LOGIN", entityName: "AUTH", entityId: null, oldValue: null, newValue: null, status: "ERROR", errorMsg: "Sai mật khẩu", createdAt: "2026-07-14T09:20:00Z" },
  { userId: 1, username: "admin", ipAddress: "192.168.1.100", requestId: "req-006", action: "UPDATE_USER_ROLE", entityName: "USER", entityId: "5", oldValue: "{}", newValue: "{}", status: "SUCCESS", errorMsg: null, createdAt: "2026-07-14T10:00:00Z" },
  { userId: 2, username: "manager", ipAddress: "192.168.1.101", requestId: "req-007", action: "CREATE_SUPPLIER", entityName: "SUPPLIER", entityId: "6", oldValue: null, newValue: "{}", status: "SUCCESS", errorMsg: null, createdAt: "2026-07-14T10:30:00Z" },
  { userId: 1, username: "admin", ipAddress: "192.168.1.100", requestId: "req-008", action: "CREATE_BRAND", entityName: "BRAND", entityId: "11", oldValue: null, newValue: "{}", status: "SUCCESS", errorMsg: null, createdAt: "2026-07-13T15:00:00Z" },
  { userId: 4, username: "stock", ipAddress: "192.168.1.102", requestId: "req-009", action: "UPDATE_INVENTORY", entityName: "INVENTORY", entityId: "5", oldValue: "{}", newValue: "{}", status: "SUCCESS", errorMsg: null, createdAt: "2026-07-13T14:45:00Z" },
  { userId: 3, username: "sales", ipAddress: "192.168.1.103", requestId: "req-010", action: "CREATE_PRODUCT", entityName: "PRODUCT", entityId: "28", oldValue: null, newValue: "{}", status: "ERROR", errorMsg: "Thiếu thông tin bắt buộc", createdAt: "2026-07-13T14:00:00Z" },
]

export async function getAuditLogs(
  page = 0,
  size = 20,
  action?: string,
  entity?: string,
  status?: string,
): Promise<ResponsePage<AuditLog>> {
  await delay()
  let filtered = [...auditLogs]
  if (action) filtered = filtered.filter((l) => l.action === action)
  if (entity) filtered = filtered.filter((l) => l.entityName === entity)
  if (status) filtered = filtered.filter((l) => l.status === status)

  const start = page * size
  const content = filtered.slice(start, start + size)
  return {
    content,
    pagination: {
      pageNumber: page,
      pageSize: size,
      totalElements: filtered.length,
      totalPages: Math.ceil(filtered.length / size),
    },
  }
}
