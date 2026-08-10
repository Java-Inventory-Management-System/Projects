import http from "@/utils/http-client"
import { PRODUCT_UNIT_STATUS, type ProductUnit, type ProductUnitStatus, type ResponsePage } from "@/utils/types"
import { mapResponsePage, mapProductUnit } from "@/utils/mappers"

const EXPORT_SERIAL_STATUSES: Record<string, ProductUnitStatus[]> = {
  SALE: [PRODUCT_UNIT_STATUS.IN_STOCK],
  INTERNAL: [PRODUCT_UNIT_STATUS.IN_STOCK],
  RETURN_SUPPLIER: [PRODUCT_UNIT_STATUS.IN_STOCK],
  DISPOSE: [
    PRODUCT_UNIT_STATUS.IN_STOCK,
    PRODUCT_UNIT_STATUS.PENDING_QC,
    PRODUCT_UNIT_STATUS.RETURN_QC_HOLD,
  ],
  WARRANTY_REPLACEMENT: [PRODUCT_UNIT_STATUS.WAITING_RMA_EXPORT],
}

export function exportSerialsStatuses(reason?: string | null): ProductUnitStatus[] {
  return EXPORT_SERIAL_STATUSES[reason ?? ""] ?? EXPORT_SERIAL_STATUSES.SALE
}

export async function getProductUnits(
  page = 0,
  size = 20,
  sort = "importedAt,desc",
  search?: string,
  status?: string,
  productId?: number,
): Promise<ResponsePage<ProductUnit>> {
  const params: Record<string, string | number> = { page, size, sort }
  if (search) params.search = search
  if (status) params.status = status
  if (productId != null && productId !== 0) params.productId = productId
  const res = await http.get("/product-unit", { params })
  return mapResponsePage(res, mapProductUnit)
}

export async function getProductUnitsByStatus(status: string, page = 0, size = 20): Promise<ResponsePage<ProductUnit>> {
  const res = await http.get(`/product-unit/status/${status}`, { params: { page, size, sort: "importedAt,desc" } })
  return mapResponsePage(res, mapProductUnit)
}

export async function getSerialsForExport(
  productId: number,
  quantity: number,
  statuses: ProductUnitStatus[] = [PRODUCT_UNIT_STATUS.IN_STOCK],
): Promise<ProductUnit[]> {
  try {
    const res = await http.get(`/product-unit/product/${productId}`, {
      params: { page: 0, size: quantity, sort: "importedAt,asc" },
    })
    return mapResponsePage(res, mapProductUnit)
      .content.filter((u) => statuses.includes(u.status))
      .slice(0, quantity)
  } catch {
    return []
  }
}

export async function getAllSerialsForProduct(
  productId: number,
  statuses?: ProductUnitStatus | ProductUnitStatus[],
): Promise<ProductUnit[]> {
  try {
    const res = await http.get(`/product-unit/product/${productId}`, {
      params: { page: 0, size: 999, sort: "importedAt,asc" },
    })
    const expected = Array.isArray(statuses)
      ? statuses
      : [statuses ?? PRODUCT_UNIT_STATUS.IN_STOCK]
    return mapResponsePage(res, mapProductUnit).content.filter((u) => expected.includes(u.status))
  } catch {
    return []
  }
}
