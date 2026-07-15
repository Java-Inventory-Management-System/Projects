import http from "@/utils/http-client"
import type { BrandResponse } from "@/utils/types"
import { mapResponsePage, mapBrand } from "@/utils/mappers"

export async function getBrands(): Promise<BrandResponse[]> {
  const res = await http.get("/brand", { params: { size: 200 } })
  return mapResponsePage(res, mapBrand).content
}
