import type { ResponsePage } from "@/utils/types"

export function mapResponsePage<T>(raw: unknown, mapItem: (item: unknown) => T): ResponsePage<T> {
  const body = raw as { content?: unknown[]; pagination?: unknown }
  return {
    content: (body.content ?? []).map(mapItem),
    pagination: body.pagination as ResponsePage<T>["pagination"],
  }
}

export function mapBrand(raw: unknown) {
  const r = raw as { id: number; name: string; code: string; description?: string; isActive?: boolean }
  return { id: r.id, name: r.name, code: r.code, description: r.description ?? null, isActive: r.isActive ?? true }
}

export function mapCategory(raw: unknown) {
  const r = raw as { id: number; name: string; code: string; description?: string; isActive?: boolean }
  return { id: r.id, name: r.name, code: r.code, description: r.description ?? null, isActive: r.isActive ?? true }
}

export function mapSupplier(raw: unknown) {
  const r = raw as { id: number; name: string; code: string; phone?: string; email?: string; address?: string; taxCode?: string; isActive?: boolean }
  return { id: r.id, name: r.name, code: r.code, phone: r.phone ?? null, email: r.email ?? null, address: r.address ?? null, taxCode: r.taxCode ?? null, isActive: r.isActive ?? true }
}

export function mapLocation(raw: unknown) {
  const r = raw as { id: number; zoneCode: string; zoneName?: string; shelfCode: string; rowCode: string; fullCode: string }
  return { id: r.id, zoneCode: r.zoneCode, zoneName: r.zoneName ?? r.zoneCode, shelfCode: r.shelfCode, rowCode: r.rowCode, fullCode: r.fullCode }
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

export function mapInventoryItem(raw: unknown) {
  const r = raw as {
    id: number; productId: number; productName: string; productSku: string
    quantity: number; minStock: number; location: string; updatedAt: string
  }
  return {
    id: r.id, productId: r.productId, productName: r.productName, productSku: r.productSku,
    quantity: r.quantity, minStock: r.minStock, location: r.location, updatedAt: r.updatedAt,
  }
}

export function mapImportReceipt(raw: unknown) {
  const r = raw as {
    id: number; receiptCode: string; supplierId: number; supplierName: string
    totalAmount: number; note?: string; status: string
    createdBy: number; createdByName: string; createdAt: string
    approvedBy?: number; approvedByName?: string
    items: unknown[]
  }
  return {
    id: r.id, receiptCode: r.receiptCode, supplierId: r.supplierId, supplierName: r.supplierName,
    totalAmount: r.totalAmount, note: r.note ?? null, status: r.status,
    createdBy: r.createdBy, createdByName: r.createdByName, createdAt: r.createdAt,
    approvedBy: r.approvedBy ?? null, approvedByName: r.approvedByName ?? null,
    items: r.items ?? [],
  }
}

export function mapExportReceipt(raw: unknown) {
  const r = raw as {
    id: number; receiptCode: string; reason: string
    customerId?: number; customerName?: string
    totalAmount: number; note?: string; status: string
    createdBy: number; createdByName: string; createdAt: string
    approvedBy?: number; approvedByName?: string
    items: unknown[]
  }
  return {
    id: r.id, receiptCode: r.receiptCode, reason: r.reason,
    customerId: r.customerId ?? null, customerName: r.customerName ?? null,
    totalAmount: r.totalAmount, note: r.note ?? null, status: r.status,
    createdBy: r.createdBy, createdByName: r.createdByName, createdAt: r.createdAt,
    approvedBy: r.approvedBy ?? null, approvedByName: r.approvedByName ?? null,
    items: r.items ?? [],
  }
}

export function mapDashboardStats(raw: unknown) {
  const r = raw as { totalProducts: number; activeProducts: number; totalItems: number; lowStockCount: number }
  return {
    totalProducts: r.totalProducts ?? 0,
    activeProducts: r.activeProducts ?? 0,
    totalItems: r.totalItems ?? 0,
    lowStockCount: r.lowStockCount ?? 0,
  }
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
