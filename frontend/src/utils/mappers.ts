import type {
  ResponsePage,
  SupplierResponse,
  LocationResponse,
  CustomerResponse,
  ProductResponse,
  ImportReceipt,
  ImportReceiptItem,
  ExportReceipt,
  ExportReceiptItem,
  StockCheckStatus,
  StockCheckScopeType,
  StockCheck,
  StockCheckItem,
  StockAdjustment,
  AdjustmentSourceType,
  PriceAdjustment,
  InventorySummary,
  LowStockItem,
  CategoryStock,
  StockValueItem,
  ActivityItem,
  DeadStockItem,
  ProductUnit,
  ProductImage,
  PurchaseOrderItem,
  PurchaseOrder,
  ReturnReceipt,
  ReturnReceiptItem,
} from "@/utils/types"

export function mapResponsePage<T>(raw: unknown, mapItem: (item: unknown) => T): ResponsePage<T> {
  const body = raw as {
    content?: unknown[]
    totalPages?: number
    totalElements?: number
    size?: number
    number?: number
    pagination?: {
      pageNumber?: number
      pageSize?: number
      totalElements?: number
      totalPages?: number
    }
  }
  return {
    content: (body.content ?? []).map(mapItem),
    pagination: {
      totalPages: body.totalPages ?? body.pagination?.totalPages ?? 0,
      totalElements: body.totalElements ?? body.pagination?.totalElements ?? 0,
      size: body.size ?? body.pagination?.pageSize ?? 20,
      number: body.number ?? body.pagination?.pageNumber ?? 0,
    },
  }
}

function mapCatalog(raw: unknown) {
  const r = raw as { id: number; name: string; code: string; description?: string; isActive?: boolean }
  return { id: r.id, name: r.name, code: r.code, description: r.description ?? null, isActive: r.isActive ?? true }
}

export const mapBrand = mapCatalog
export const mapCategory = mapCatalog

export function mapSupplier(raw: unknown): SupplierResponse {
  const r = raw as SupplierResponse
  return {
    id: r.id,
    name: r.name,
    contactPerson: r.contactPerson ?? null,
    phone: r.phone ?? null,
    email: r.email ?? null,
    address: r.address ?? null,
    taxCode: r.taxCode ?? null,
    note: r.note ?? null,
    isActive: r.isActive ?? true,
    createdAt: r.createdAt ?? "",
    updatedAt: r.updatedAt ?? "",
  }
}

export function mapLocation(raw: unknown): LocationResponse {
  const r = raw as LocationResponse
  return {
    id: r.id,
    zoneCode: r.zoneCode,
    shelfCode: r.shelfCode,
    binCode: r.binCode,
    fullCode: r.fullCode,
    description: r.description ?? null,
    isActive: r.isActive ?? true,
    maxCapacity: r.maxCapacity ?? null,
    createdAt: r.createdAt ?? "",
    updatedAt: r.updatedAt ?? "",
  }
}

export function mapCustomer(raw: unknown): CustomerResponse {
  const r = raw as CustomerResponse
  return {
    id: r.id,
    name: r.name,
    phone: r.phone ?? null,
    email: r.email ?? null,
    address: r.address ?? null,
    note: r.note ?? null,
    isActive: r.isActive ?? true,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt ?? "",
  }
}

export function mapProduct(raw: unknown): ProductResponse {
  const r = raw as ProductResponse
  return {
    id: r.id,
    name: r.name,
    sku: r.sku ?? null,
    barcode: r.barcode ?? null,
    unit: r.unit ?? null,
    sellPrice: r.sellPrice ?? 0,
    brandId: r.brandId ?? null,
    brandName: r.brandName ?? null,
    categoryId: r.categoryId ?? null,
    categoryName: r.categoryName ?? null,
    trackingType: r.trackingType ?? "BULK",
    minStock: r.minStock ?? 0,
    isActive: r.isActive ?? true,
    supplierIds: r.supplierIds ?? [],
    description: r.description ?? null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }
}

export function mapImportItem(raw: unknown): ImportReceiptItem {
  const r = raw as ImportReceiptItem
  return {
    id: r.id,
    productId: r.productId,
    productName: r.productName,
    productSku: r.productSku,
    quantity: r.quantity,
    expectedQuantity: r.expectedQuantity ?? r.quantity,
    receivedQuantity: r.receivedQuantity ?? 0,
    qcPassQuantity: r.qcPassQuantity ?? 0,
    qcFailQuantity: r.qcFailQuantity ?? 0,
    unitPrice: r.unitPrice,
    warrantyMonths: r.warrantyMonths,
    createdUnits: r.createdUnits,
    itemStatus: r.itemStatus ?? "NORMAL",
    locationId: r.locationId ?? null,
  }
}

export function mapImportReceipt(raw: unknown): ImportReceipt {
  const r = raw as unknown as ImportReceipt & { items: unknown[] }
  return {
    id: r.id,
    receiptCode: r.receiptCode,
    supplierId: r.supplierId,
    supplierName: r.supplierName ?? "—",
    totalAmount: r.totalAmount,
    note: r.note ?? null,
    status: r.status,
    createdBy: r.createdBy,
    createdByName: r.createdByName ?? "—",
    createdAt: r.createdAt,
    approvedBy: r.approvedBy ?? null,
    approvedByName: r.approvedByName ?? null,
    purchaseOrderId: r.purchaseOrderId ?? null,
    poCode: r.poCode ?? null,
    rejectReason: r.rejectReason ?? null,
    updatedAt: r.updatedAt ?? r.createdAt,
    items: (r.items ?? []).map(mapImportItem),
    discrepancyNotes: r.discrepancyNotes ?? [],
  }
}

export function mapExportItem(raw: unknown): ExportReceiptItem {
  const r = raw as ExportReceiptItem
  return {
    id: r.id,
    productId: r.productId,
    productName: r.productName,
    productSku: r.productSku,
    quantity: r.quantity,
    unitPrice: r.unitPrice,
    trackingType: r.trackingType,
  }
}

export function mapExportReceipt(raw: unknown): ExportReceipt {
  const r = raw as unknown as ExportReceipt & { items: unknown[] }
  return {
    id: r.id,
    receiptCode: r.receiptCode,
    reason: r.reason,
    customerId: r.customerId ?? null,
    customerName: r.customerName ?? null,
    totalAmount: r.totalAmount,
    note: r.note ?? null,
    status: r.status,
    externalReference: r.externalReference ?? null,
    createdBy: r.createdBy,
    createdByName: r.createdByName ?? "—",
    createdAt: r.createdAt,
    approvedBy: r.approvedBy ?? null,
    approvedByName: r.approvedByName ?? null,
    fulfilledBy: r.fulfilledBy ?? null,
    fulfilledByName: r.fulfilledByName ?? null,
    fulfilledAt: r.fulfilledAt ?? null,
    rejectedBy: r.rejectedBy ?? null,
    rejectedByName: r.rejectedByName ?? null,
    rejectedAt: r.rejectedAt ?? null,
    rejectReason: r.rejectReason ?? null,
    updatedAt: r.updatedAt ?? r.createdAt,
    items: (r.items ?? []).map(mapExportItem),
  }
}

export function mapStockCheckItem(raw: unknown): StockCheckItem {
  const r = raw as StockCheckItem
  return {
    id: r.id,
    productUnitId: r.productUnitId,
    serialNumber: r.serialNumber ?? "",
    productId: r.productId,
    productName: r.productName ?? "",
    productSku: r.productSku ?? null,
    trackingType: (r.trackingType as "SERIALIZED" | "BULK") ?? null,
    boxId: r.boxId ?? null,
    boxCode: r.boxCode ?? null,
    expectedStatus: r.expectedStatus,
    actualStatus: r.actualStatus ?? null,
    countedQuantity: r.countedQuantity ?? null,
    difference: r.difference ?? null,
    note: r.note ?? null,
    photo: r.photo ?? null,
    autoFilled: r.autoFilled ?? false,
  }
}

export function mapStockCheck(raw: unknown): StockCheck {
  const r = raw as unknown as StockCheck & { items: unknown[] }
  return {
    id: r.id,
    checkCode: r.checkCode,
    status: r.status as StockCheckStatus,
    scopeType: (r.scopeType as StockCheckScopeType) ?? null,
    scopeId: r.scopeId ?? null,
    note: r.note ?? null,
    createdBy: r.createdBy,
    createdByName: r.createdByName ?? "—",
    createdAt: r.createdAt,
    approvedBy: r.approvedBy ?? null,
    approvedByName: r.approvedByName ?? null,
    approvalNote: r.approvalNote ?? null,
    items: (r.items ?? []).map(mapStockCheckItem),
    totalItems: r.totalItems,
    matchCount: r.matchCount,
    missingCount: r.missingCount,
    unexpectedCount: r.unexpectedCount,
    autoFilledCount: r.autoFilledCount ?? 0,
    updatedAt: r.updatedAt,
  }
}

export function mapStockAdjustment(raw: unknown): StockAdjustment {
  const r = raw as StockAdjustment
  return {
    id: r.id,
    adjustCode: r.adjustCode,
    type: r.type as StockAdjustment["type"],
    productUnitId: r.productUnitId ?? null,
    serialNumber: r.serialNumber ?? null,
    productId: r.productId ?? null,
    productName: r.productName ?? null,
    productSku: r.productSku ?? null,
    quantity: r.quantity ?? null,
    reason: r.reason,
    imageUrl: r.imageUrl ?? null,
    status: r.status as StockAdjustment["status"],
    sourceType: (r.sourceType as AdjustmentSourceType) ?? null,
    sourceId: r.sourceId ?? null,
    createdBy: r.createdBy,
    createdByName: r.createdByName ?? "—",
    createdAt: r.createdAt,
    approvedBy: r.approvedBy ?? null,
    approvedByName: r.approvedByName ?? null,
    approvalNote: r.approvalNote ?? null,
    updatedAt: r.updatedAt,
  }
}

export function mapPriceAdjustment(raw: unknown): PriceAdjustment {
  const r = raw as PriceAdjustment
  return {
    id: r.id,
    adjustCode: r.adjustCode,
    importReceiptItemId: r.importReceiptItemId,
    productName: r.productName ?? null,
    productSku: r.productSku ?? null,
    oldPrice: r.oldPrice,
    newPrice: r.newPrice,
    reason: r.reason,
    status: r.status as PriceAdjustment["status"],
    createdBy: r.createdBy,
    createdByName: r.createdByName ?? null,
    approvedBy: r.approvedBy ?? null,
    approvedByName: r.approvedByName ?? null,
    approvalNote: r.approvalNote ?? null,
    createdAt: r.createdAt,
    approvedAt: r.approvedAt ?? null,
    updatedAt: r.updatedAt,
  }
}

export function mapInventorySummary(raw: unknown): InventorySummary {
  const r = raw as InventorySummary
  return {
    totalProducts: r.totalProducts,
    totalUnits: r.totalUnits,
    totalStockValue: r.totalStockValue,
    lowStockCount: r.lowStockCount,
    outOfStockCount: r.outOfStockCount,
    previousPeriodStockValue: r.previousPeriodStockValue ?? 0,
    trendPercent: r.trendPercent ?? 0,
  }
}
export function mapLowStockItem(raw: unknown): LowStockItem {
  const r = raw as LowStockItem
  return {
    productId: r.productId,
    productName: r.productName,
    productSku: r.productSku,
    quantity: r.quantity,
    minStock: r.minStock,
  }
}
export function mapCategoryStock(raw: unknown): CategoryStock {
  const r = raw as CategoryStock
  return {
    categoryId: r.categoryId ?? null,
    categoryName: r.categoryName ?? null,
    productCount: r.productCount,
    totalUnits: r.totalUnits,
    totalStockValue: r.totalStockValue,
    healthyCount: r.healthyCount ?? 0,
    lowStockCount: r.lowStockCount ?? 0,
    outOfStockCount: r.outOfStockCount ?? 0,
  }
}
export function mapStockValueItem(raw: unknown): StockValueItem {
  const r = raw as StockValueItem
  return {
    productId: r.productId,
    productName: r.productName,
    productSku: r.productSku,
    categoryName: r.categoryName ?? null,
    quantity: r.quantity,
    unitPrice: r.unitPrice,
    totalValue: r.totalValue,
  }
}
export function mapActivityItem(raw: unknown): ActivityItem {
  const r = raw as ActivityItem
  return {
    type: r.type as ActivityItem["type"],
    receiptCode: r.receiptCode,
    date: r.date,
    counterpartyName: r.counterpartyName ?? null,
    lineItems: r.lineItems,
    totalAmount: r.totalAmount,
  }
}
export function mapDeadStockItem(raw: unknown): DeadStockItem {
  const r = raw as DeadStockItem
  return {
    productId: r.productId,
    productName: r.productName,
    productSku: r.productSku,
    serialNumber: r.serialNumber ?? null,
    importedAt: r.importedAt,
    daysInStock: r.daysInStock,
    costPrice: r.costPrice,
  }
}

export function mapProductUnit(raw: unknown): ProductUnit {
  const r = raw as ProductUnit
  return {
    id: r.id,
    serialNumber: r.serialNumber,
    productId: r.productId,
    productName: r.productName,
    productSku: r.productSku,
    trackingType: r.trackingType as ProductUnit["trackingType"],
    initialQuantity: r.initialQuantity ?? null,
    remainingQuantity: r.remainingQuantity ?? null,
    importReceiptItemId: r.importReceiptItemId,
    locationId: r.locationId ?? null,
    locationCode: r.locationCode ?? null,
    boxId: r.boxId ?? null,
    status: r.status as ProductUnit["status"],
    importedAt: r.importedAt,
    warrantyMonths: r.warrantyMonths,
    warrantyStartDate: r.warrantyStartDate ?? null,
    warrantyExpiresAt: r.warrantyExpiresAt ?? null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }
}

export function mapReturnReceiptItem(raw: unknown): ReturnReceiptItem {
  const r = raw as ReturnReceiptItem
  return {
    id: r.id,
    productUnitId: r.productUnitId,
    productId: r.productId,
    productName: r.productName ?? null,
    productSku: r.productSku ?? null,
    serialNumber: r.serialNumber ?? null,
    quantity: r.quantity,
    condition: r.condition,
    resultingAction: r.resultingAction,
  }
}

export function mapReturnReceipt(raw: unknown): ReturnReceipt {
  const r = raw as unknown as ReturnReceipt & { items: unknown[] }
  return {
    id: r.id,
    receiptCode: r.receiptCode,
    customerId: r.customerId ?? null,
    customerName: r.customerName ?? null,
    originalExportReceiptId: r.originalExportReceiptId ?? null,
    reason: r.reason,
    status: r.status,
    note: r.note ?? null,
    createdBy: r.createdBy,
    createdByName: r.createdByName ?? "—",
    createdAt: r.createdAt,
    approvedBy: r.approvedBy ?? null,
    approvedByName: r.approvedByName ?? null,
    approvedAt: r.approvedAt ?? null,
    items: (r.items ?? []).map(mapReturnReceiptItem),
  }
}

export function mapProductImage(raw: unknown): ProductImage {
  const r = raw as ProductImage
  return {
    id: r.id,
    productId: r.productId,
    url: r.url,
    isPrimary: r.isPrimary,
    sortOrder: r.sortOrder,
    createdAt: r.createdAt,
  }
}

export function mapPurchaseOrderItem(raw: unknown): PurchaseOrderItem {
  const r = raw as PurchaseOrderItem
  return {
    id: r.id,
    productId: r.productId,
    productName: r.productName,
    productSku: r.productSku,
    quantity: r.quantity,
    unitPrice: r.unitPrice,
    receivedQuantity: r.receivedQuantity,
  }
}

export function mapPurchaseOrder(raw: unknown): PurchaseOrder {
  const r = raw as unknown as PurchaseOrder & { items: unknown[] }
  return {
    id: r.id,
    poCode: r.poCode,
    supplierId: r.supplierId,
    supplierName: r.supplierName ?? "—",
    status: r.status as PurchaseOrder["status"],
    expectedDate: r.expectedDate,
    note: r.note ?? null,
    totalAmount: r.totalAmount,
    createdBy: r.createdBy,
    createdByName: r.createdByName ?? "—",
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    items: (r.items ?? []).map(mapPurchaseOrderItem),
  }
}
