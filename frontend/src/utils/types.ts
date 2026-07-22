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
  userId: number
  username: string
  fullName: string
  isPasswordReset: boolean
}

export interface RefreshTokenResponse {
  accessToken: string
  userId: number
  username: string
  fullName: string
  role: string
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

export type BrandResponse = CatalogResponse
export type CategoryResponse = CatalogResponse

export interface CreateCatalogRequest {
  name: string
  description: string | null
}

// ============ Inventory Item (tồn kho tổng hợp) ============

export interface InventoryItem {
  id: number
  productId: number
  productName: string
  productSku: string
  quantity: number
  minStock: number
  location: string
  updatedAt: string
}

// ============ Product ============

export interface CreateProductRequest {
  name: string
  sku: string | null
  barcode: string | null
  brandId: number | null
  categoryId: number | null
  description: string | null
  unit: string | null
  trackingType: string | null
  sellPrice: number | null
  minStock: number | null
}

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

export type UpdateProductRequest = CreateProductRequest

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

// ============ Customer ============

export interface CustomerResponse {
  id: number
  name: string
  phone: string | null
  email: string | null
  address: string | null
  note: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// ============ Location Map ============

export interface LocationMapData {
  zones: Array<{
    zoneCode: string
    shelves: Array<{
      shelfCode: string
      bins: Array<{
        id: number
        binCode: string
        fullCode: string
        productCount: number
        maxCapacity: number | null
      }>
    }>
  }>
}

// ============ Location ============

export interface LocationResponse {
  id: number
  zoneCode: string
  shelfCode: string
  binCode: string
  fullCode: string
  description: string | null
  isActive: boolean
  maxCapacity: number | null
  createdAt: string
  updatedAt: string
}

// ============ Product Unit (Inventory) ============

export interface ProductUnit {
  id: number
  serialNumber: string
  productId: number
  productName: string
  productSku: string
  trackingType: "SERIALIZED" | "BULK"
  initialQuantity: number | null
  remainingQuantity: number | null
  importReceiptItemId: number
  locationId: number | null
  locationCode: string | null
  status: ProductUnitStatus
  importedAt: string
  warrantyMonths: number
  warrantyStartDate: string | null
  warrantyExpiresAt: string | null
  createdAt: string
  updatedAt: string
}

export type ProductUnitStatus =
  | "IN_STOCK"
  | "SOLD"
  | "DEFECTIVE"
  | "DAMAGED_IN_STORAGE"
  | "LOST"
  | "UNDER_REPAIR"
  | "SENT_TO_MANUFACTURER"
  | "RETURNED"
  | "RETURNED_TO_SUPPLIER"
  | "REMOVED"
  | "DISPOSED"

// ============ Import Receipt ============

export interface ImportReceipt {
  id: number
  receiptCode: string
  supplierId: number
  supplierName: string
  status: ImportReceiptStatus
  purchaseOrderId: number | null
  poCode: string | null
  createdBy: number
  createdByName: string
  approvedBy: number | null
  approvedByName: string | null
  note: string | null
  totalAmount: number
  createdAt: string
  updatedAt: string
  items: ImportReceiptItem[]
}

export type ImportReceiptStatus = "PENDING" | "PENDING_APPROVAL" | "COMPLETED" | "CANCELLED"

export interface ImportReceiptItem {
  id: number
  productId: number
  productName: string
  productSku: string
  quantity: number
  unitPrice: number
  warrantyMonths: number
  createdUnits: number
}

// ============ Purchase Order ============

export type PurchaseOrderStatus = "DRAFT" | "PARTIAL" | "COMPLETED" | "CANCELLED"

export interface PurchaseOrderItem {
  id: number
  productId: number
  productName: string
  productSku: string
  quantity: number
  unitPrice: number
  receivedQuantity: number
}

export interface PurchaseOrder {
  id: number
  poCode: string
  supplierId: number
  supplierName: string
  status: PurchaseOrderStatus
  expectedDate: string
  note: string | null
  totalAmount: number
  createdBy: number
  createdByName: string
  createdAt: string
  updatedAt: string
  items: PurchaseOrderItem[]
}

export interface CreatePurchaseOrderRequest {
  supplierId: number
  expectedDate: string
  note: string | null
  items: { productId: number; quantity: number; unitPrice: number }[]
}

// ============ Export Receipt ============

export interface ExportReceipt {
  id: number
  receiptCode: string
  reason: ExportReason
  customerId: number | null
  customerName: string | null
  status: ExportReceiptStatus
  totalAmount: number
  createdBy: number
  createdByName: string
  approvedBy: number | null
  approvedByName: string | null
  note: string | null
  createdAt: string
  updatedAt: string
  items: ExportReceiptItem[]
}

export type ExportReason = "SALE" | "INTERNAL" | "RETURN_SUPPLIER" | "DISPOSE"
export type ExportReceiptStatus = "PENDING_APPROVAL" | "COMPLETED" | "CANCELLED"

export interface ExportReceiptItem {
  id: number
  productId: number
  productName: string
  productSku: string
  quantity: number
  unitPrice: number
}

// ============ Stock Check ============

export type StockCheckStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "APPROVED" | "REJECTED"

export type DifferenceType = "MATCH" | "MISSING" | "UNEXPECTED" | "PARTIAL_SHORTAGE"

export interface StockCheckItem {
  id: number
  productUnitId: number
  serialNumber: string
  productId: number
  productName: string
  productSku: string
  expectedStatus: string
  actualStatus: string | null
  countedQuantity: number | null
  difference: DifferenceType | null
  note: string | null
}

export interface StockCheck {
  id: number
  checkCode: string
  status: StockCheckStatus
  note: string | null
  createdBy: number
  createdByName: string
  approvedBy: number | null
  approvedByName: string | null
  approvalNote: string | null
  items: StockCheckItem[]
  totalItems: number
  matchCount: number
  missingCount: number
  unexpectedCount: number
  createdAt: string
  updatedAt: string
}

// ============ Stock Adjustment ============

export type AdjustmentType = "DAMAGED" | "LOST" | "FOUND"
export type AdjustmentStatus = "PENDING" | "APPROVED" | "REJECTED"

export interface StockAdjustment {
  id: number
  adjustCode: string
  type: AdjustmentType
  productUnitId: number | null
  serialNumber: string | null
  productId: number | null
  productName: string | null
  productSku: string | null
  quantity: number | null
  reason: string
  imageUrl: string | null
  status: AdjustmentStatus
  createdBy: number
  createdByName: string | null
  approvedBy: number | null
  approvedByName: string | null
  approvalNote: string | null
  createdAt: string
  updatedAt: string
}

// ============ Price Adjustment ============

export interface PriceAdjustment {
  id: number
  adjustCode: string
  importReceiptItemId: number
  productName: string | null
  productSku: string | null
  oldPrice: number
  newPrice: number
  reason: string
  status: "PENDING" | "APPROVED" | "REJECTED"
  createdBy: number
  createdByName: string | null
  approvedBy: number | null
  approvedByName: string | null
  approvalNote: string | null
  createdAt: string
  updatedAt: string
}

// ============ Report ============

export interface InventorySummary {
  totalProducts: number
  totalUnits: number
  totalStockValue: number
  lowStockCount: number
  outOfStockCount: number
}

export interface CategoryStock {
  categoryId: number | null
  categoryName: string | null
  productCount: number
  totalUnits: number
  totalStockValue: number
}

export interface LowStockItem {
  productId: number
  productName: string
  productSku: string
  quantity: number
  minStock: number
}

export interface StockValueItem {
  productId: number
  productName: string
  productSku: string
  categoryName: string | null
  quantity: number
  unitPrice: number
  totalValue: number
}

export interface ActivityItem {
  type: "IMPORT" | "EXPORT"
  receiptCode: string
  date: string
  counterpartyName: string | null
  lineItems: number
  totalAmount: number
}

export interface DeadStockItem {
  productId: number
  productName: string
  productSku: string
  serialNumber: string | null
  importedAt: string
  daysInStock: number
  costPrice: number
}

// ============ Product Image ============

export interface ProductImage {
  id: number
  productId: number
  url: string
  isPrimary: boolean
  sortOrder: number
  createdAt: string
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
