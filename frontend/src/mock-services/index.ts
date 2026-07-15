import type {
  BrandResponse,
  CategoryResponse,
  ProductResponse,
  UserResponse,
  AuditLog,
  InventoryItem,
  DashboardStats,
  ResponsePage,
  CustomerResponse,
  ImportReceipt,
  ExportReceipt,
  LocationResponse,
  SupplierResponse,
  ProductUnit,
} from "@/utils/types"
import { brands, categories, locations, users, auditLogs } from "./data"
import { generateMockData } from "./generator"

const {
  products,
  suppliers,
  customers,
  importReceipts,
  exportReceipts,
  productUnits,
  inventoryItems,
} = generateMockData()

function delay(ms = 250) {
  return new Promise((r) => setTimeout(r, ms))
}

function paginate<T>(items: T[], page: number, size: number): ResponsePage<T> {
  const start = page * size
  return {
    content: items.slice(start, start + size),
    pagination: {
      pageNumber: page,
      pageSize: size,
      totalElements: items.length,
      totalPages: Math.ceil(items.length / size),
    },
  }
}

// ponytail: quy tắc gợi ý vị trí theo danh mục — backend sẽ trả về thực tế sau
export const categoryZone: Record<number, string> = {
  1: "A", 2: "D", 3: "B", 4: "E",
  5: "F", 6: "C", 7: "G", 8: "H",
}

export function suggestLocation(categoryId: number | null, locs: LocationResponse[], fallbackCode = "I-01-01"): LocationResponse | null {
  if (!categoryId) return locs.find((l) => l.fullCode === fallbackCode) ?? null
  const zone = categoryZone[categoryId]
  if (!zone) return locs.find((l) => l.fullCode === fallbackCode) ?? null
  return locs.find((l) => l.zoneCode === zone && l.isActive) ?? null
}

// ==================== Suppliers ====================

export async function getSuppliers(): Promise<SupplierResponse[]> {
  await delay(100)
  return suppliers.filter((s) => s.isActive)
}

// ==================== Locations ====================

export async function getLocations(): Promise<LocationResponse[]> {
  await delay(100)
  return locations.filter((l) => l.isActive)
}

// ==================== Brands ====================

export async function getBrands(): Promise<BrandResponse[]> {
  await delay(100)
  return brands.filter((b) => b.isActive)
}

// ==================== Categories ====================

export async function getCategories(): Promise<CategoryResponse[]> {
  await delay(100)
  return categories.filter((c) => c.isActive)
}

// ==================== Products ====================

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
  return paginate(filtered, page, size)
}

export async function getProductById(id: number): Promise<ProductResponse | null> {
  await delay(100)
  return products.find((p) => p.id === id) ?? null
}

// ==================== Users ====================

export async function getUsers(page = 0, size = 20): Promise<ResponsePage<UserResponse>> {
  await delay()
  const filtered = users.filter((u) => !u.isDeleted)
  return paginate(filtered, page, size)
}

// ==================== Inventory ====================

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
  return paginate(filtered, page, size)
}

export async function getDashboardStats(): Promise<DashboardStats> {
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

// ==================== Customers ====================

export async function getCustomers(page = 0, size = 20, search?: string): Promise<ResponsePage<CustomerResponse>> {
  await delay(100)
  let filtered = customers.filter((c) => c.isActive)
  if (search) {
    const q = search.toLowerCase()
    filtered = filtered.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.phone ?? "").includes(q) || (c.email ?? "").toLowerCase().includes(q),
    )
  }
  return paginate(filtered, page, size)
}

export async function createCustomer(data: Omit<CustomerResponse, "id" | "createdAt" | "updatedAt" | "isActive">): Promise<CustomerResponse> {
  await delay(250)

  if (!data.name?.trim()) {
    throw new Error("Tên khách hàng không được để trống")
  }

  if (data.phone) {
    const cleaned = data.phone.replace(/\D/g, "")
    if (cleaned.length < 10 || cleaned.length > 11) {
      throw new Error("Số điện thoại không hợp lệ (phải 10-11 số)")
    }
    const duplicate = customers.find((c) => c.phone?.replace(/\D/g, "") === cleaned && c.isActive)
    if (duplicate) {
      throw new Error(`Số điện thoại "${data.phone}" đã được sử dụng bởi "${duplicate.name}"`)
    }
  }

  if (data.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(data.email)) {
      throw new Error("Email không đúng định dạng")
    }
    const duplicate = customers.find((c) => c.email?.toLowerCase() === data.email?.toLowerCase() && c.isActive)
    if (duplicate) {
      throw new Error(`Email "${data.email}" đã được sử dụng bởi "${duplicate.name}"`)
    }
  }

  const id = customers.length > 0 ? Math.max(...customers.map((c) => c.id)) + 1 : 1
  const customer: CustomerResponse = {
    ...data,
    id,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  customers.push(customer)
  return customer
}

// ==================== Import Receipts ====================

export async function getImportReceipts(page = 0, size = 20): Promise<ResponsePage<ImportReceipt>> {
  await delay()
  const sorted = [...importReceipts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  return paginate(sorted, page, size)
}

let nextImportId = importReceipts.length + 1
let nextImportItemId = importReceipts.reduce((max, r) => Math.max(max, ...r.items.map((i) => i.id)), 0) + 1

export async function createImportReceipt(
  data: Omit<ImportReceipt, "id" | "receiptCode" | "status" | "approvedBy" | "approvedByName" | "createdAt" | "updatedAt" | "createdByName">,
  userId: number,
  userName: string,
  serialMap?: Record<number, string[]>,
): Promise<ImportReceipt> {
  await delay(300)

  if (serialMap) {
    const allExistingSerials = new Set<string>()
    for (const r of importReceipts) {
      for (const line of r.items) {
        for (let i = 0; i < line.quantity; i++) {
          allExistingSerials.add(`${line.productSku}-SERIAL-${line.id}-${i}`)
        }
      }
    }
    for (const [, serials] of Object.entries(serialMap)) {
      for (const serial of serials) {
        if (allExistingSerials.has(serial)) {
          throw new Error(`Serial "${serial}" đã tồn tại trong hệ thống`)
        }
      }
    }
  }

  const now = new Date()
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "")
  const seq = String(importReceipts.filter((r) => r.receiptCode.includes(dateStr)).length + 1).padStart(3, "0")
  const items = data.items.map((item) => ({ ...item, id: nextImportItemId++, createdUnits: item.quantity }))
  const totalAmount = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0)
  const receipt: ImportReceipt = {
    ...data,
    id: nextImportId++,
    receiptCode: `IMP-${dateStr}-${seq}`,
    status: "PENDING",
    totalAmount,
    createdBy: userId,
    createdByName: userName,
    approvedBy: null,
    approvedByName: null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    items,
  }
  importReceipts.push(receipt)
  return receipt
}

export async function cancelImportReceipt(id: number): Promise<ImportReceipt> {
  await delay(200)
  const idx = importReceipts.findIndex((r) => r.id === id)
  if (idx === -1) throw new Error("Không tìm thấy phiếu nhập")
  importReceipts[idx] = { ...importReceipts[idx], status: "CANCELLED", updatedAt: new Date().toISOString() }
  return importReceipts[idx]
}

export async function approveImportReceipt(id: number, userId: number, userName: string): Promise<ImportReceipt> {
  await delay(200)
  const idx = importReceipts.findIndex((r) => r.id === id)
  if (idx === -1) throw new Error("Không tìm thấy phiếu nhập")
  if (importReceipts[idx].status !== "PENDING_APPROVAL") throw new Error("Phiếu không ở trạng thái chờ duyệt")
  importReceipts[idx] = {
    ...importReceipts[idx],
    status: "COMPLETED",
    approvedBy: userId,
    approvedByName: userName,
    updatedAt: new Date().toISOString(),
  }
  return importReceipts[idx]
}

// ==================== Export Receipts ====================

export async function getExportReceipts(page = 0, size = 20): Promise<ResponsePage<ExportReceipt>> {
  await delay()
  const sorted = [...exportReceipts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  return paginate(sorted, page, size)
}

let nextExportId = exportReceipts.length + 1
let nextExportItemId = exportReceipts.reduce((max, r) => Math.max(max, ...r.items.map((i) => i.id)), 0) + 1

export async function createExportReceipt(
  data: Omit<ExportReceipt, "id" | "receiptCode" | "status" | "approvedBy" | "approvedByName" | "createdAt" | "updatedAt" | "createdByName">,
  userId: number,
  userName: string,
): Promise<ExportReceipt> {
  await delay(300)
  const now = new Date()
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "")
  const seq = String(exportReceipts.filter((r) => r.receiptCode.includes(dateStr)).length + 1).padStart(3, "0")
  const items = data.items.map((item) => ({ ...item, id: nextExportItemId++ }))
  const totalAmount = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0)
  const receipt: ExportReceipt = {
    ...data,
    id: nextExportId++,
    receiptCode: `EXP-${dateStr}-${seq}`,
    status: "PENDING_APPROVAL",
    totalAmount,
    createdBy: userId,
    createdByName: userName,
    approvedBy: null,
    approvedByName: null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    items,
  }
  exportReceipts.push(receipt)
  return receipt
}

export async function cancelExportReceipt(id: number): Promise<ExportReceipt> {
  await delay(200)
  const idx = exportReceipts.findIndex((r) => r.id === id)
  if (idx === -1) throw new Error("Không tìm thấy phiếu xuất")
  exportReceipts[idx] = { ...exportReceipts[idx], status: "CANCELLED", updatedAt: new Date().toISOString() }
  return exportReceipts[idx]
}

export async function approveExportReceipt(id: number, userId: number, userName: string): Promise<ExportReceipt> {
  await delay(200)
  const idx = exportReceipts.findIndex((r) => r.id === id)
  if (idx === -1) throw new Error("Không tìm thấy phiếu xuất")
  if (exportReceipts[idx].status !== "PENDING_APPROVAL") throw new Error("Phiếu không ở trạng thái chờ duyệt")
  exportReceipts[idx] = {
    ...exportReceipts[idx],
    status: "COMPLETED",
    approvedBy: userId,
    approvedByName: userName,
    updatedAt: new Date().toISOString(),
  }
  return exportReceipts[idx]
}

// ==================== Serials / Product Units ====================

export async function getSerialsForExport(productId: number, quantity: number): Promise<ProductUnit[]> {
  await delay(50)
  return productUnits
    .filter((u) => u.productId === productId && u.status === "IN_STOCK")
    .sort((a, b) => new Date(a.importedAt).getTime() - new Date(b.importedAt).getTime())
    .slice(0, quantity)
}

// ==================== Audit Logs ====================

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
  return paginate(filtered, page, size)
}
