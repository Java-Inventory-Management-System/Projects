import http from "@/utils/http-client"
import { PRODUCT_UNIT_STATUS, type ProductUnit, type ResponsePage } from "@/utils/types"
import { mapResponsePage, mapProductUnit } from "@/utils/mappers"

export async function getProductUnits(
  page = 0,
  size = 20,
  sort = "importedAt,desc",
): Promise<ResponsePage<ProductUnit>> {
  const res = await http.get("/product-unit", { params: { page, size, sort } })
  return mapResponsePage(res, mapProductUnit)
}

export async function getProductUnitsByStatus(status: string, page = 0, size = 20): Promise<ResponsePage<ProductUnit>> {
  const res = await http.get(`/product-unit/status/${status}`, { params: { page, size, sort: "importedAt,desc" } })
  return mapResponsePage(res, mapProductUnit)
}

export async function getSerialsForExport(productId: number, quantity: number): Promise<ProductUnit[]> {
  try {
    const res = await http.get(`/import-receipt/product-unit/product/${productId}`, {
      params: { page: 0, size: quantity, sort: "importedAt,asc" },
    })
    return mapResponsePage(res, mapProductUnit)
      .content.filter((u) => u.status === PRODUCT_UNIT_STATUS.IN_STOCK)
      .slice(0, quantity)
  } catch {
    return []
  }
}
