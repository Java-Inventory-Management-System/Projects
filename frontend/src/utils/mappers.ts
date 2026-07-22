import type { ResponsePage, StockCheckStatus, DifferenceType } from "@/utils/types"

export function mapResponsePage<T>(raw: unknown, mapItem: (item: unknown) => T): ResponsePage<T> {
  const body = raw as { content?: unknown[]; pagination?: unknown }
  return {
    content: (body.content ?? []).map(mapItem),
    pagination: body.pagination as ResponsePage<T>["pagination"],
  }
}

function mapCatalog(raw: unknown) {
  const r = raw as { id: number; name: string; code: string; description?: string; isActive?: boolean }
  return { id: r.id, name: r.name, code: r.code, description: r.description ?? null, isActive: r.isActive ?? true }
}

export const mapBrand = mapCatalog
export const mapCategory = mapCatalog

export function mapSupplier(raw: unknown) {
  const r = raw as { id: number; name: string; contactPerson?: string; phone?: string; email?: string; address?: string; taxCode?: string; note?: string; isActive?: boolean; createdAt?: string; updatedAt?: string }
  return { id: r.id, name: r.name, contactPerson: r.contactPerson ?? null, phone: r.phone ?? null, email: r.email ?? null, address: r.address ?? null, taxCode: r.taxCode ?? null, note: r.note ?? null, isActive: r.isActive ?? true, createdAt: r.createdAt ?? "", updatedAt: r.updatedAt ?? "" }
}

export function mapLocation(raw: unknown) {
  const r = raw as { id: number; zoneCode: string; zoneName?: string; shelfCode: string; binCode: string; fullCode: string; description?: string; isActive?: boolean; maxCapacity?: number | null; createdAt?: string; updatedAt?: string }
  return { id: r.id, zoneCode: r.zoneCode, zoneName: r.zoneName ?? r.zoneCode, shelfCode: r.shelfCode, binCode: r.binCode, fullCode: r.fullCode, description: r.description ?? null, isActive: r.isActive ?? true, maxCapacity: r.maxCapacity ?? null, createdAt: r.createdAt ?? "", updatedAt: r.updatedAt ?? "" }
}

export function mapCustomer(raw: unknown) {
  const r = raw as { id: number; name: string; phone?: string; email?: string; address?: string; note?: string; isActive?: boolean; createdAt: string }
  return { id: r.id, name: r.name, phone: r.phone ?? null, email: r.email ?? null, address: r.address ?? null, note: r.note ?? null, isActive: r.isActive ?? true, createdAt: r.createdAt }
}

export function mapProduct(raw: unknown) {
  const r = raw as {
    id: number; name: string; sku?: string; barcode?: string; unit?: string; sellPrice?: number
    brandId?: number; brandName?: string; categoryId?: number; categoryName?: string
    trackingType?: string; minStock?: number; isActive?: boolean; description?: string
    createdAt: string; updatedAt: string
  }
  return {
    id: r.id, name: r.name, sku: r.sku ?? null, barcode: r.barcode ?? null, unit: r.unit ?? null,
    sellPrice: r.sellPrice ?? 0, brandId: r.brandId ?? null, brandName: r.brandName ?? null,
    categoryId: r.categoryId ?? null, categoryName: r.categoryName ?? null,
    trackingType: r.trackingType ?? "BULK", minStock: r.minStock ?? 0, isActive: r.isActive ?? true,
    description: r.description ?? null, createdAt: r.createdAt, updatedAt: r.updatedAt,
  }
}

export function mapImportItem(raw: unknown) {
  const r = raw as {
    id: number; productId: number; productName: string; productSku: string
    quantity: number; unitPrice: number; warrantyMonths: number; createdUnits: number
  }
  return {
    id: r.id, productId: r.productId, productName: r.productName, productSku: r.productSku,
    quantity: r.quantity, unitPrice: r.unitPrice, warrantyMonths: r.warrantyMonths,
    createdUnits: r.createdUnits,
  }
}

export function mapImportReceipt(raw: unknown) {
  const r = raw as {
    id: number; receiptCode: string; supplierId: number; supplierName: string | null
    totalAmount: number; note?: string; status: string
    createdBy: number; createdByName: string | null; createdAt: string
    approvedBy?: number; approvedByName?: string
    purchaseOrderId?: number; poCode?: string
    items: unknown[]
  }
  return {
    id: r.id, receiptCode: r.receiptCode, supplierId: r.supplierId, supplierName: r.supplierName ?? "—",
    totalAmount: r.totalAmount, note: r.note ?? null, status: r.status,
    createdBy: r.createdBy, createdByName: r.createdByName ?? "—", createdAt: r.createdAt,
    approvedBy: r.approvedBy ?? null, approvedByName: r.approvedByName ?? null,
    purchaseOrderId: r.purchaseOrderId ?? null, poCode: r.poCode ?? null,
    items: (r.items ?? []).map(mapImportItem),
  }
}

export function mapExportItem(raw: unknown) {
  const r = raw as {
    id: number; productId: number; productName: string; productSku: string
    quantity: number; unitPrice: number
  }
  return {
    id: r.id, productId: r.productId, productName: r.productName, productSku: r.productSku,
    quantity: r.quantity, unitPrice: r.unitPrice,
  }
}

export function mapExportReceipt(raw: unknown) {
  const r = raw as {
    id: number; receiptCode: string; reason: string
    customerId?: number; customerName?: string
    totalAmount: number; note?: string; status: string
    createdBy: number; createdByName: string | null; createdAt: string
    approvedBy?: number; approvedByName?: string
    items: unknown[]
  }
  return {
    id: r.id, receiptCode: r.receiptCode, reason: r.reason,
    customerId: r.customerId ?? null, customerName: r.customerName ?? null,
    totalAmount: r.totalAmount, note: r.note ?? null, status: r.status,
    createdBy: r.createdBy, createdByName: r.createdByName ?? "—", createdAt: r.createdAt,
    approvedBy: r.approvedBy ?? null, approvedByName: r.approvedByName ?? null,
    items: (r.items ?? []).map(mapExportItem),
  }
}

export function mapStockCheckItem(raw: unknown) {
  const r = raw as {
    id: number; productUnitId: number; serialNumber?: string; productId: number
    productName?: string; productSku?: string; expectedStatus: string
    actualStatus?: string | null; countedQuantity?: number | null; difference?: string | null
    note?: string | null
  }
  return {
    id: r.id, productUnitId: r.productUnitId, serialNumber: r.serialNumber ?? "",
    productId: r.productId, productName: r.productName ?? "", productSku: r.productSku ?? "",
    expectedStatus: r.expectedStatus,
    actualStatus: r.actualStatus ?? null,
    countedQuantity: r.countedQuantity ?? null,
    difference: (r.difference ?? null) as DifferenceType | null,
    note: r.note ?? null,
  }
}

export function mapStockCheck(raw: unknown) {
  const r = raw as {
    id: number; checkCode: string; status: string; note?: string | null
    createdBy: number; createdByName: string | null; createdAt: string
    approvedBy?: number | null; approvedByName?: string | null; approvalNote?: string | null
    items: unknown[]; totalItems: number; matchCount: number; missingCount: number
    unexpectedCount: number; updatedAt: string
  }
  return {
    id: r.id, checkCode: r.checkCode, status: r.status as StockCheckStatus,
    note: r.note ?? null,
    createdBy: r.createdBy, createdByName: r.createdByName ?? "—", createdAt: r.createdAt,
    approvedBy: r.approvedBy ?? null, approvedByName: r.approvedByName ?? null,
    approvalNote: r.approvalNote ?? null,
    items: (r.items ?? []).map(mapStockCheckItem),
    totalItems: r.totalItems, matchCount: r.matchCount,
    missingCount: r.missingCount, unexpectedCount: r.unexpectedCount,
    updatedAt: r.updatedAt,
  }
}

export function mapStockAdjustment(raw: unknown) {
  const r = raw as {
    id: number; adjustCode: string; type: string
    productUnitId?: number | null; serialNumber?: string | null
    productId?: number | null; productName?: string | null; productSku?: string | null
    quantity?: number | null; reason: string; imageUrl?: string | null; status: string
    createdBy: number; createdByName: string | null; createdAt: string
    approvedBy?: number | null; approvedByName?: string | null; approvalNote?: string | null
    updatedAt: string
  }
  return {
    id: r.id, adjustCode: r.adjustCode,
    type: r.type as "DAMAGED" | "LOST" | "FOUND",
    productUnitId: r.productUnitId ?? null, serialNumber: r.serialNumber ?? null,
    productId: r.productId ?? null, productName: r.productName ?? null, productSku: r.productSku ?? null,
    quantity: r.quantity ?? null, reason: r.reason, imageUrl: r.imageUrl ?? null,
    status: r.status as "PENDING" | "APPROVED" | "REJECTED",
    createdBy: r.createdBy, createdByName: r.createdByName ?? "—", createdAt: r.createdAt,
    approvedBy: r.approvedBy ?? null, approvedByName: r.approvedByName ?? null,
    approvalNote: r.approvalNote ?? null, updatedAt: r.updatedAt,
  }
}

export function mapPriceAdjustment(raw: unknown) {
  const r = raw as {
    id: number; adjustCode: string; importReceiptItemId: number
    productName?: string; productSku?: string
    oldPrice: number; newPrice: number; reason: string; status: string
    createdBy: number; createdByName?: string
    approvedBy?: number; approvedByName?: string; approvalNote?: string
    createdAt: string; updatedAt: string
  }
  return {
    id: r.id, adjustCode: r.adjustCode, importReceiptItemId: r.importReceiptItemId,
    productName: r.productName ?? null, productSku: r.productSku ?? null,
    oldPrice: r.oldPrice, newPrice: r.newPrice, reason: r.reason,
    status: r.status as "PENDING" | "APPROVED" | "REJECTED",
    createdBy: r.createdBy, createdByName: r.createdByName ?? null,
    approvedBy: r.approvedBy ?? null, approvedByName: r.approvedByName ?? null,
    approvalNote: r.approvalNote ?? null,
    createdAt: r.createdAt, updatedAt: r.updatedAt,
  }
}

export function mapInventorySummary(raw: unknown) {
  const r = raw as { totalProducts: number; totalUnits: number; totalStockValue: number; lowStockCount: number; outOfStockCount: number }
  return { totalProducts: r.totalProducts, totalUnits: r.totalUnits, totalStockValue: r.totalStockValue, lowStockCount: r.lowStockCount, outOfStockCount: r.outOfStockCount }
}
export function mapLowStockItem(raw: unknown) {
  const r = raw as { productId: number; productName: string; productSku: string; quantity: number; minStock: number }
  return { productId: r.productId, productName: r.productName, productSku: r.productSku, quantity: r.quantity, minStock: r.minStock }
}
export function mapCategoryStock(raw: unknown) {
  const r = raw as { categoryId?: number | null; categoryName?: string | null; productCount: number; totalUnits: number; totalStockValue: number }
  return { categoryId: r.categoryId ?? null, categoryName: r.categoryName ?? null, productCount: r.productCount, totalUnits: r.totalUnits, totalStockValue: r.totalStockValue }
}
export function mapStockValueItem(raw: unknown) {
  const r = raw as { productId: number; productName: string; productSku: string; categoryName?: string | null; quantity: number; unitPrice: number; totalValue: number }
  return { productId: r.productId, productName: r.productName, productSku: r.productSku, categoryName: r.categoryName ?? null, quantity: r.quantity, unitPrice: r.unitPrice, totalValue: r.totalValue }
}
export function mapActivityItem(raw: unknown) {
  const r = raw as { type: string; receiptCode: string; date: string; counterpartyName?: string | null; lineItems: number; totalAmount: number }
  return { type: r.type as "IMPORT" | "EXPORT", receiptCode: r.receiptCode, date: r.date, counterpartyName: r.counterpartyName ?? null, lineItems: r.lineItems, totalAmount: r.totalAmount }
}
export function mapDeadStockItem(raw: unknown) {
  const r = raw as { productId: number; productName: string; productSku: string; serialNumber?: string | null; importedAt: string; daysInStock: number; costPrice: number }
  return { productId: r.productId, productName: r.productName, productSku: r.productSku, serialNumber: r.serialNumber ?? null, importedAt: r.importedAt, daysInStock: r.daysInStock, costPrice: r.costPrice }
}

export function mapProductUnit(raw: unknown) {
  const r = raw as {
    id: number; serialNumber: string; productId: number; productName: string; productSku: string
    trackingType: string; initialQuantity: number | null; remainingQuantity: number | null
    importReceiptItemId: number; locationId: number | null; locationCode: string | null
    status: string; importedAt: string; warrantyMonths: number
    warrantyStartDate: string | null; warrantyExpiresAt: string | null
    createdAt: string; updatedAt: string
  }
  return {
    id: r.id, serialNumber: r.serialNumber, productId: r.productId, productName: r.productName, productSku: r.productSku,
    trackingType: r.trackingType as "SERIALIZED" | "BULK",
    initialQuantity: r.initialQuantity ?? null, remainingQuantity: r.remainingQuantity ?? null,
    importReceiptItemId: r.importReceiptItemId, locationId: r.locationId ?? null, locationCode: r.locationCode ?? null,
    status: r.status as "IN_STOCK" | "SOLD" | "DEFECTIVE" | "DAMAGED_IN_STORAGE",
    importedAt: r.importedAt, warrantyMonths: r.warrantyMonths,
    warrantyStartDate: r.warrantyStartDate ?? null, warrantyExpiresAt: r.warrantyExpiresAt ?? null,
    createdAt: r.createdAt, updatedAt: r.updatedAt,
  }
}

export function mapProductImage(raw: unknown) {
  const r = raw as { id: number; productId: number; url: string; isPrimary: boolean; sortOrder: number; createdAt: string }
  return { id: r.id, productId: r.productId, url: r.url, isPrimary: r.isPrimary, sortOrder: r.sortOrder, createdAt: r.createdAt }
}

export function mapPurchaseOrderItem(raw: unknown) {
  const r = raw as { id: number; productId: number; productName: string; productSku: string; quantity: number; unitPrice: number; receivedQuantity: number }
  return { id: r.id, productId: r.productId, productName: r.productName, productSku: r.productSku, quantity: r.quantity, unitPrice: r.unitPrice, receivedQuantity: r.receivedQuantity }
}

export function mapPurchaseOrder(raw: unknown) {
  const r = raw as {
    id: number; poCode: string; supplierId: number; supplierName: string | null
    status: string; expectedDate: string; note?: string; totalAmount: number
    createdBy: number; createdByName: string | null
    createdAt: string; updatedAt: string; items: unknown[]
  }
  return {
    id: r.id, poCode: r.poCode, supplierId: r.supplierId, supplierName: r.supplierName ?? "—",
    status: r.status as import("@/utils/types").PurchaseOrderStatus,
    expectedDate: r.expectedDate, note: r.note ?? null, totalAmount: r.totalAmount,
    createdBy: r.createdBy, createdByName: r.createdByName ?? "—",
    createdAt: r.createdAt, updatedAt: r.updatedAt,
    items: (r.items ?? []).map(mapPurchaseOrderItem),
  }
}
