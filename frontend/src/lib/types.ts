// ============ Common ============

export interface ResponsePage<T> {
  content: T[]
  pagination: Pagination
}

export interface Pagination {
  pageNumber: number
  pageSize: number
  totalElements: number
  totalPages: number
}

export type URole = "ADMIN" | "MANAGER" | "SALES" | "STOCK"

// ============ Auth ============

export interface LoginRequest {
  username: string
  password: string
}

export interface JwtResponse {
  accessToken: string
  refreshToken: string
  userId: number
  username: string
  isPasswordReset: boolean
}

// ============ User ============

export interface UserResponse {
  id: number
  username: string
  fullName: string
  email: string
  role: URole
  status: string
  gender: number | null
  dob: string | null
  phoneNumber: string | null
  isPasswordReset: boolean
  isDeleted: boolean
  createdAt: string
  updatedAt: string
}

// ============ Brand / Category (catalog) ============

export interface CatalogResponse {
  id: number
  name: string
  description: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// ============ Product ============

export interface ProductResponse {
  id: number
  name: string
  sku: string | null
  barcode: string | null
  brandId: number | null
  brandName: string | null
  categoryId: number | null
  categoryName: string | null
  description: string | null
  unit: string | null
  trackingType: string | null
  sellPrice: number | null
  minStock: number | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// ============ Supplier ============

export interface SupplierResponse {
  id: number
  name: string
  contactPerson: string | null
  phone: string | null
  email: string | null
  address: string | null
  taxCode: string | null
  note: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// ============ Inventory (UI mock) ============

export interface InventoryItem {
  id: number
  productId: number
  productName: string
  productSku: string
  quantity: number
  minStock: number
  location: string | null
  updatedAt: string
}

// ============ Audit Log ============

export interface AuditLog {
  userId: number | null
  username: string | null
  ipAddress: string | null
  requestId: string | null
  action: string
  entityName: string
  entityId: string | null
  oldValue: string | null
  newValue: string | null
  status: string
  errorMsg: string | null
  createdAt: string
}
