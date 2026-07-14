import type {
  BrandResponse,
  CategoryResponse,
  ProductResponse,
  UserResponse,
  AuditLog,
  InventoryItem,
  DashboardStats,
  ResponsePage,
} from "@/utils/types"
import { brands, categories, products, users, inventoryItems, auditLogs } from "./data"

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
