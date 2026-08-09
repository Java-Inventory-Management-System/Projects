// ============ Pagination ============

export interface ResponsePage<T> {
  content: T[]
  pagination: {
    totalPages: number
    totalElements: number
    size: number
    number: number
  }
}

export interface Pagination {
  page: number
  size: number
  sort?: string
}

// ============ Auth ============

export type URole = "ADMIN" | "MANAGER" | "SALES" | "STOCK"

export interface LoginRequest {
  username: string
  password: string
}

export interface JwtResponse {
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresIn: number
}

export interface RefreshTokenResponse {
  accessToken: string
  expiresIn: number
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
  lastLogin: string | null
  isPasswordReset: boolean
  isDeleted: boolean
  createdAt: string
  updatedAt: string
}

// ============ Catalog ============

export interface CatalogResponse {
  id: number
  name: string
  code: string
  description: string | null
  isActive: boolean
}

export type BrandResponse = CatalogResponse
export type CategoryResponse = CatalogResponse

export interface CreateCatalogRequest {
  name: string
  code?: string
  description?: string | null
  active?: boolean
}

// ============ Product ============

export interface CreateProductRequest {
  name: string
  sku: string
  categoryId: number | null
  brandId: number | null
  unit: string
  retailPrice: number
  costPrice?: number
  minStock?: number
  description?: string
  image?: string
  supplierIds?: number[]
}

export interface ProductResponse {
  id: number
  name: string
  sku: string | null
  barcode: string | null
  unit: string | null
  sellPrice: number
  brandId: number | null
  brandName: string | null
  categoryId: number | null
  categoryName: string | null
  trackingType: string
  minStock: number
  isActive: boolean
  supplierIds: number[]
  description: string | null
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
  exportCount?: number
  createdAt: string
  updatedAt: string
}

// ============ Location ============

export interface LocationMapBinProduct {
  productId: number
  productName: string | null
  productSku: string | null
  trackingType: string
  quantity: number
  serials: string[]
  boxId: number | null
  boxCode: string | null
  boxType: string | null
}

export interface LocationMapBin {
  id: number
  binCode: string
  fullCode: string
  productCount: number
  maxCapacity: number | null
  isActive: boolean
  productSkuList: string[]
  boxCount: number
  boxCodes: string[]
  products: LocationMapBinProduct[]
}

export interface LocationMapShelf {
  shelfCode: string
  bins: LocationMapBin[]
}

export interface LocationMapZone {
  zoneCode: string
  shelves: LocationMapShelf[]
}

export interface LocationMapData {
  zones: LocationMapZone[]
}

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

// ============ Product Unit (Actual Inventory) ============

export interface ProductUnit {
  id: number
  serialNumber: string
  productId: number
  productName: string
  productSku: string
  trackingType: string
  initialQuantity: number | null
  remainingQuantity: number | null
  importReceiptItemId: number
  locationId: number | null
  locationCode: string | null
  boxId: number | null
  boxCode: string | null
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
  | "RESERVED"
  | "QUARANTINED"
  | "RETURNED"
  | "DISPOSED"
  | "WARRANTY"
  | "WARRANTY_DONE"
  | "WARRANTY_REPLACED"
  | "DEFECTIVE"
  | "DAMAGED_IN_STORAGE"
  | "LOST"
  | "UNDER_REPAIR"
  | "SENT_TO_MANUFACTURER"
  | "RETURNED_TO_SUPPLIER"
  | "REMOVED"
  | "RETURN_QC_HOLD"
  | "WAITING_RMA_EXPORT"
  | "RMA_REPAIRED_RETURNED"
  | "RMA_UNREPAIRABLE"
  | "REJECTED_RETURN"
  | "PENDING_DISPOSAL"

export interface QcUnit {
  id: number
  serialNumber: string | null
  productId: number
  productName: string
  status: ProductUnitStatus
  locationFullCode: string | null
  initialQuantity: number | null
  remainingQuantity: number | null
  description: string | null
  evidenceImage: string | null
  processedAt: string | null
  processedByName: string | null
  exportReceiptCode: string | null
}

// ============ Import Receipt ============

export interface ImportReceipt {
  id: number
  receiptCode: string
  supplierId: number
  supplierName: string
  note: string | null
  status: ImportReceiptStatus
  totalAmount: number
  purchaseOrderId: number | null
  poCode: string | null
  originalWarrantyExportId: number | null
  createdBy: number | null
  createdByName: string | null
  approvedBy: number | null
  approvedByName: string | null
  rejectReason: string | null
  createdAt: string
  updatedAt: string
  items: ImportReceiptItem[]
  discrepancyNotes: DiscrepancyNote[]
}

export interface DiscrepancyNote {
  description: string
  estimatedQuantity: number
  reportedBy: number
  reportedAt: string
}

export type ImportReceiptStatus = "DRAFT" | "PENDING" | "PENDING_APPROVAL" | "COMPLETED" | "CANCELLED"

export interface ImportReceiptItem {
  id: number
  productId: number
  productName: string
  productSku: string | null
  expectedQuantity: number
  receivedQuantity: number
  qcPassQuantity: number
  qcFailQuantity: number
  quantity: number
  unitPrice: number
  warrantyMonths: number
  createdUnits: number
  itemStatus: "NORMAL" | "NOT_RECEIVED"
  locationId: number | null
}

// ============ Purchase Order ============

export type PurchaseOrderStatus = "DRAFT" | "PARTIAL" | "COMPLETED" | "CANCELLED"

export interface PurchaseOrderItem {
  id: number
  productId: number
  productName: string
  productSku: string | null
  quantity: number
  unitPrice: number
  receivedQuantity: number
}

export interface CreatePurchaseOrderRequest {
  supplierId: number
  expectedDate: string
  note: string | null
  items: Array<{ productId: number; quantity: number; unitPrice: number }>
}

export interface PurchaseOrder {
  id: number
  poCode: string
  supplierId: number
  supplierName: string
  items: PurchaseOrderItem[]
  totalAmount: number
  status: PurchaseOrderStatus
  expectedDate: string
  note: string | null
  createdBy: number | null
  createdByName: string
  createdAt: string
  updatedAt: string
}

// ============ Export Receipt ============

export interface ExportReceipt {
  id: number
  receiptCode: string
  reason: ExportReason
  customerId: number | null
  customerName: string | null
  note: string | null
  status: ExportReceiptStatus
  totalAmount: number
  externalReference: string | null
  createdBy: number | null
  createdByName: string | null
  approvedBy: number | null
  approvedByName: string | null
  fulfilledBy: number | null
  fulfilledByName: string | null
  fulfilledAt: string | null
  rejectedBy: number | null
  rejectedByName: string | null
  rejectedAt: string | null
  rejectReason: string | null
  createdAt: string
  updatedAt: string
  items: ExportReceiptItem[]
  statusHistory: ExportReceiptStatusHistory[]
}

export interface ExportReceiptStatusHistory {
  fromStatus: string
  toStatus: string
  createdAt: string
  changedBy: number
}

export type ExportReason = "SALE" | "INTERNAL" | "RETURN_SUPPLIER" | "DISPOSE" | "WARRANTY_REPLACEMENT"
export type ExportReceiptStatus = "PENDING" | "APPROVED" | "COMPLETED" | "CANCELLED"

export interface ExportReceiptItem {
  id: number
  productId: number
  productName: string
  productSku: string | null
  quantity: number
  unitPrice: number
  trackingType?: string
}

// ============ Stock Check ============

export type StockCheckStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "APPROVED" | "CANCELLED"
export type StockCheckScopeType = "ZONE" | "CATEGORY" | "BOX"
export type DifferenceType = "MATCH" | "MISSING" | "UNEXPECTED" | "PARTIAL_SHORTAGE"

export interface StockCheckItem {
  id: number
  productUnitId: number
  serialNumber: string
  productId: number
  productName: string
  productSku: string | null
  trackingType: "SERIALIZED" | "BULK" | null
  boxId: number | null
  boxCode: string | null
  expectedStatus: string | null
  actualStatus: string | null
  countedQuantity: number | null
  difference: DifferenceType | null
  note: string | null
  photo: string | null
  autoFilled: boolean
}

export interface StockCheck {
  id: number
  checkCode: string
  status: StockCheckStatus
  scopeType: StockCheckScopeType | null
  scopeId: number | null
  scopeName: string | null
  note: string | null
  createdBy: number | null
  createdByName: string | null
  approvedBy: number | null
  approvedByName: string | null
  approvalNote: string | null
  items: StockCheckItem[]
  totalItems: number
  matchCount: number
  missingCount: number
  unexpectedCount: number
  autoFilledCount: number
  createdAt: string
  updatedAt: string
}

// ============ Box ============

export type BoxStatus = "SEALED" | "UNSEALED"

export const BOX_STATUS = {
  SEALED: "SEALED",
  UNSEALED: "UNSEALED",
} as const

export type BoxType = "SMALL" | "MEDIUM" | "LARGE"

// ponytail: FE hiển thị N theo loại hộp — backend là nguồn sự thật (app.box.max-units)
export const BOX_TYPE_MAX: Record<BoxType, number> = { SMALL: 20, MEDIUM: 50, LARGE: 100 }

export const BOX_TYPES: BoxType[] = ["SMALL", "MEDIUM", "LARGE"]

export interface BoxUnit {
  productUnitId: number
  serialNumber: string | null
  productId: number
  productName: string | null
  productSku: string | null
  trackingType: "SERIALIZED" | "BULK" | null
  quantity: number
}

export interface BoxableImport {
  receiptId: number
  receiptCode: string
  supplierName: string | null
  importedAt: string | null
  boxableUnits: number
}

export interface Box {
  id: number
  boxCode: string
  importReceiptId: number | null
  importReceiptCode: string | null
  boxType: BoxType | null
  locationId: number
  locationCode: string | null
  status: BoxStatus
  sealedQuantity: number
  sealedBy: number | null
  sealedByName: string | null
  sealedAt: string | null
  unsealedBy: number | null
  unsealedByName: string | null
  unsealedAt: string | null
  note: string | null
  createdBy: number | null
  createdByName: string | null
  createdAt: string
  unitCount: number
  units: BoxUnit[]
}

// ============ Stock Adjustment ============

export type AdjustmentType = "DAMAGED" | "LOST" | "FOUND"
export type AdjustmentStatus = "PENDING" | "APPROVED" | "REJECTED"
export type AdjustmentSourceType = "MANUAL" | "STOCK_CHECK"

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
  locationId: number | null
  status: AdjustmentStatus
  sourceType: AdjustmentSourceType | null
  sourceId: number | null
  createdBy: number | null
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
  status: string
  createdBy: number | null
  createdByName: string | null
  approvedBy: number | null
  approvedByName: string | null
  approvalNote: string | null
  createdAt: string
  approvedAt: string | null
  updatedAt: string
}

export interface AvailableItem {
  importReceiptItemId: number
  productId: number
  productName: string | null
  productSku: string | null
  receiptCode: string
  receiptDate: string
  unitPrice: number
  hasPending: boolean
}

// ============ Inventory ============

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

export interface InventorySummary {
  totalProducts: number
  totalUnits: number
  totalStockValue: number
  lowStockCount: number
  outOfStockCount: number
  previousPeriodStockValue: number
  trendPercent: number
}

export interface CategoryStock {
  categoryId: number | null
  categoryName: string | null
  productCount: number
  totalUnits: number
  totalStockValue: number
  healthyCount: number
  lowStockCount: number
  outOfStockCount: number
}

export interface LowStockItem {
  productId: number
  productName: string
  productSku: string | null
  quantity: number
  minStock: number | null
}

export interface StockValueItem {
  productId: number
  productName: string
  productSku: string | null
  categoryName: string | null
  quantity: number
  unitPrice: number
  totalValue: number
}

export interface ActivityItem {
  type: string
  receiptCode: string
  date: string
  counterpartyName: string | null
  lineItems: number
  totalAmount: number
}

export interface DeadStockItem {
  productId: number
  productName: string
  productSku: string | null
  serialNumber: string | null
  importedAt: string
  daysInStock: number
  costPrice: number
}

// ============ Stock Check Overview ============

export interface StockCheckMonthCount {
  month: string
  count: number
}

export interface AdjustmentMonthCount {
  month: string
  lost: number
  found: number
  damaged: number
}

export interface StockCheckDiscrepancy {
  id: number
  checkCode: string
  createdAt: string
  missingCount: number
  unexpectedCount: number
}

export interface StockCheckOverview {
  checksPerMonth: StockCheckMonthCount[]
  adjustmentsPerMonth: AdjustmentMonthCount[]
  recentDiscrepancies: StockCheckDiscrepancy[]
}

// ============ Return Receipt ============

export interface ReturnReceiptItem {
  id: number
  productUnitId: number
  productId: number
  productName: string | null
  productSku: string | null
  serialNumber: string | null
  quantity: number
  condition: string
  resultingAction: string
}

export interface ReturnReceipt {
  id: number
  receiptCode: string
  customerId: number | null
  customerName: string | null
  originalExportReceiptId: number | null
  reason: string
  status: ReturnReceiptStatus
  note: string | null
  createdBy: number | null
  createdByName: string | null
  approvedBy: number | null
  approvedByName: string | null
  approvedAt: string | null
  items: ReturnReceiptItem[]
  createdAt: string
}

export type ReturnReceiptStatus = "PENDING_APPROVAL" | "COMPLETED" | "CANCELLED"

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
  roleSnapshot: string | null
  ipAddress: string | null
  requestId: string | null
  action: string
  entityName: string
  entityId: string | null
  oldValue: string | null
  newValue: string | null
  status: string
  errorMsg: string | null
  message: string | null
  messageFields: string[]
  createdAt: string
}

// ============ Import Create Page ============

export interface LineItem {
  tempId: number
  productId: number
  productName: string
  productSku: string
  categoryId: number | null
  quantity: number
  unitPrice: number
  warrantyMonths: number
  serials: string[]
  locationId: string
  itemStatus: "NORMAL" | "NOT_RECEIVED"
  notReceivedReason: string
}

export interface QcRecord {
  serial: string
  productName: string
  passed: boolean
  failReason: string
}

// ============ Status Constants ============

export const IMPORT_RECEIPT_STATUS = {
  DRAFT: "DRAFT",
  PENDING_APPROVAL: "PENDING_APPROVAL",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const

export const RETURN_RECEIPT_STATUS = {
  PENDING_APPROVAL: "PENDING_APPROVAL",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const

export const EXPORT_RECEIPT_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const

export const EXPORT_REASON = {
  SALE: "SALE",
  INTERNAL: "INTERNAL",
  RETURN_SUPPLIER: "RETURN_SUPPLIER",
  DISPOSE: "DISPOSE",
  WARRANTY_REPLACEMENT: "WARRANTY_REPLACEMENT",
} as const

export const PURCHASE_ORDER_STATUS = {
  OPEN: "OPEN",
  PARTIAL: "PARTIAL",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const

export const STOCK_CHECK_STATUS = {
  PENDING: "PENDING",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  APPROVED: "APPROVED",
  CANCELLED: "CANCELLED",
} as const

export const ADJUSTMENT_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED",
} as const

export const PRODUCT_UNIT_STATUS = {
  IN_STOCK: "IN_STOCK",
  PENDING_QC: "PENDING_QC",
  SOLD: "SOLD",
  RESERVED: "RESERVED",
  QUARANTINED: "QUARANTINED",
  RETURNED: "RETURNED",
  DISPOSED: "DISPOSED",
  DEFECTIVE: "DEFECTIVE",
  DAMAGED_IN_STORAGE: "DAMAGED_IN_STORAGE",
  LOST: "LOST",
  UNDER_REPAIR: "UNDER_REPAIR",
  SENT_TO_MANUFACTURER: "SENT_TO_MANUFACTURER",
  RETURNED_TO_SUPPLIER: "RETURNED_TO_SUPPLIER",
  REMOVED: "REMOVED",
  RETURN_QC_HOLD: "RETURN_QC_HOLD",
  WAITING_RMA_EXPORT: "WAITING_RMA_EXPORT",
  RMA_REPAIRED_RETURNED: "RMA_REPAIRED_RETURNED",
  RMA_UNREPAIRABLE: "RMA_UNREPAIRABLE",
  REJECTED_RETURN: "REJECTED_RETURN",
  PENDING_DISPOSAL: "PENDING_DISPOSAL",
} as const

export const USER_STATUS = {
  NEW: "NEW",
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
} as const

export const AUDIT_STATUS = {
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
} as const

export const AUDIT_ACTION = {
  LOGIN_SUCCESS: "LOGIN_SUCCESS",
  LOGIN_FAILED: "LOGIN_FAILED",
  LOGOUT: "LOGOUT",
  CREATE_USER: "CREATE_USER",
  UPDATE_USER_INFO: "UPDATE_USER_INFO",
  UPDATE_USER_STATUS: "UPDATE_USER_STATUS",
  UPDATE_USER_ROLE: "UPDATE_USER_ROLE",
  CHANGE_PASSWORD: "CHANGE_PASSWORD",
  RESET_PASSWORD: "RESET_PASSWORD",
  CREATE_BRAND: "CREATE_BRAND",
  UPDATE_BRAND: "UPDATE_BRAND",
  TOGGLE_BRAND: "TOGGLE_BRAND",
  CREATE_CATEGORY: "CREATE_CATEGORY",
  UPDATE_CATEGORY: "UPDATE_CATEGORY",
  TOGGLE_CATEGORY: "TOGGLE_CATEGORY",
  CREATE_SUPPLIER: "CREATE_SUPPLIER",
  UPDATE_SUPPLIER: "UPDATE_SUPPLIER",
  TOGGLE_SUPPLIER: "TOGGLE_SUPPLIER",
  CREATE_PRODUCT: "CREATE_PRODUCT",
  UPDATE_PRODUCT: "UPDATE_PRODUCT",
  TOGGLE_PRODUCT: "TOGGLE_PRODUCT",
  CREATE_IMPORT: "CREATE_IMPORT",
  CONFIRM_IMPORT: "CONFIRM_IMPORT",
  APPROVE_IMPORT: "APPROVE_IMPORT",
  CANCEL_IMPORT: "CANCEL_IMPORT",
  CREATE_LOCATION: "CREATE_LOCATION",
  UPDATE_LOCATION: "UPDATE_LOCATION",
  DELETE_LOCATION: "DELETE_LOCATION",
  TOGGLE_LOCATION: "TOGGLE_LOCATION",
  RELOCATE_LOCATION: "RELOCATE_LOCATION",
  CREATE_CUSTOMER: "CREATE_CUSTOMER",
  UPDATE_CUSTOMER: "UPDATE_CUSTOMER",
  TOGGLE_CUSTOMER: "TOGGLE_CUSTOMER",
  CREATE_EXPORT: "CREATE_EXPORT",
  FULFILL_EXPORT: "FULFILL_EXPORT",
  CANCEL_EXPORT: "CANCEL_EXPORT",
  CREATE_STOCK_CHECK: "CREATE_STOCK_CHECK",
  START_STOCK_CHECK: "START_STOCK_CHECK",
  COMPLETE_STOCK_CHECK: "COMPLETE_STOCK_CHECK",
  CANCEL_STOCK_CHECK: "CANCEL_STOCK_CHECK",
  SEAL_BOX: "SEAL_BOX",
  UNSEAL_BOX: "UNSEAL_BOX",
  MOVE_BOX: "MOVE_BOX",
  CREATE_ADJUSTMENT: "CREATE_ADJUSTMENT",
  APPROVE_ADJUSTMENT: "APPROVE_ADJUSTMENT",
  REJECT_ADJUSTMENT: "REJECT_ADJUSTMENT",
  CREATE_PURCHASE_ORDER: "CREATE_PURCHASE_ORDER",
  CANCEL_PURCHASE_ORDER: "CANCEL_PURCHASE_ORDER",
  RECORD_STOCK_CHECK: "RECORD_STOCK_CHECK",
  CREATE_PRODUCT_IMAGE: "CREATE_PRODUCT_IMAGE",
  DELETE_PRODUCT_IMAGE: "DELETE_PRODUCT_IMAGE",
  CREATE_RETURN: "CREATE_RETURN",
  APPROVE_RETURN: "APPROVE_RETURN",
  CANCEL_RETURN: "CANCEL_RETURN",
  QC_PASS: "QC_PASS",
  DISPOSE_CONFIRM: "DISPOSE_CONFIRM",
  CREATE_PRICE_ADJUSTMENT: "CREATE_PRICE_ADJUSTMENT",
  APPROVE_PRICE_ADJUSTMENT: "APPROVE_PRICE_ADJUSTMENT",
  REJECT_PRICE_ADJUSTMENT: "REJECT_PRICE_ADJUSTMENT",
  CANCEL_PRICE_ADJUSTMENT: "CANCEL_PRICE_ADJUSTMENT",
} as const

export const PRODUCT_UNIT_TYPE = {
  PIECE: "PIECE",
  BOX: "BOX",
  SET: "SET",
  METER: "METER",
  KG: "KG",
  TUBE: "TUBE",
} as const

export const TRACKING_TYPE = {
  SERIALIZED: "SERIALIZED",
  BULK: "BULK",
} as const

export const STOCK_CHECK_DIFF = {
  MATCH: "MATCH",
  MISSING: "MISSING",
  UNEXPECTED: "UNEXPECTED",
  PARTIAL_SHORTAGE: "PARTIAL_SHORTAGE",
} as const

export const ADJUSTMENT_TYPE = {
  DAMAGED: "DAMAGED",
  LOST: "LOST",
  FOUND: "FOUND",
} as const

export const RETURN_REASON = {
  CHANGE_MIND: "CHANGE_MIND",
  DEFECTIVE: "DEFECTIVE",
  WRONG_ITEM: "WRONG_ITEM",
  WARRANTY_CLAIM: "WARRANTY_CLAIM",
} as const

export const RETURN_ITEM_CONDITION = {
  GOOD: "GOOD",
  DEFECTIVE: "DEFECTIVE",
} as const

export const RETURN_RESULTING_ACTION = {
  RESTOCK: "RESTOCK",
  SCRAP: "SCRAP",
  WARRANTY_TRANSFER: "WARRANTY_TRANSFER",
  REJECT: "REJECT",
} as const
