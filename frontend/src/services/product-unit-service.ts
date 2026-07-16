import http from "@/utils/http-client"
import type { ProductUnit } from "@/utils/types"
import { mapResponsePage, mapProductUnit } from "@/utils/mappers"

export async function getSerialsForExport(productId: number, quantity: number): Promise<ProductUnit[]> {
  try {
    const res = await http.get(`/import-receipt/product-unit/product/${productId}`, {
      params: { page: 0, size: quantity, sort: "importedAt,asc" },
    })
    return mapResponsePage(res, mapProductUnit).content.filter((u) => u.status === "IN_STOCK").slice(0, quantity)
  } catch {
    return []
  }
}
