import http from "@/utils/http-client"
import type { SupplierResponse } from "@/utils/types"
import { mapResponsePage, mapSupplier } from "@/utils/mappers"

export async function getSuppliers(): Promise<SupplierResponse[]> {
  const res = await http.get("/supplier", { params: { size: 200 } })
  return mapResponsePage(res, mapSupplier).content
}
