import http from "@/utils/http-client"
import type { CategoryResponse, CreateCatalogRequest } from "@/utils/types"
import { mapResponsePage, mapCategory } from "@/utils/mappers"

export async function getCategories(): Promise<CategoryResponse[]> {
  const res = await http.get("/category", { params: { size: 200 } })
  return mapResponsePage(res, mapCategory).content
}

export async function createCategory(data: CreateCatalogRequest): Promise<CategoryResponse> {
  const res = await http.post("/category", data)
  return mapCategory(res)
}

export async function updateCategory(id: number, data: CreateCatalogRequest): Promise<CategoryResponse> {
  const res = await http.put(`/category/${id}`, data)
  return mapCategory(res)
}

export async function toggleCategoryActive(id: number): Promise<void> {
  await http.put(`/category/${id}/toggle-active`)
}
