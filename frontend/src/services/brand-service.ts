import http from "@/utils/http-client"
import type { BrandResponse, CreateCatalogRequest } from "@/utils/types"
import { mapResponsePage, mapBrand } from "@/utils/mappers"

export async function getBrands(): Promise<BrandResponse[]> {
  const res = await http.get("/brand", { params: { size: 200 } })
  return mapResponsePage(res, mapBrand).content
}

export async function createBrand(data: CreateCatalogRequest): Promise<BrandResponse> {
  const res = await http.post("/brand", data)
  return mapBrand(res)
}

export async function updateBrand(id: number, data: CreateCatalogRequest): Promise<BrandResponse> {
  const res = await http.put(`/brand/${id}`, data)
  return mapBrand(res)
}

export async function toggleBrandActive(id: number): Promise<void> {
  await http.put(`/brand/${id}/toggle-active`)
}
