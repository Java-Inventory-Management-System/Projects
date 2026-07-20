import http from "@/utils/http-client"
import type { CreateProductRequest, UpdateProductRequest, ProductResponse, ResponsePage } from "@/utils/types"
import { mapProduct, mapResponsePage } from "@/utils/mappers"

export async function getProducts(
  page = 0,
  size = 20,
  search?: string,
  brandId?: number,
  categoryId?: number,
): Promise<ResponsePage<ProductResponse>> {
  const params: Record<string, string | number> = { page, size }
  if (search) params.search = search
  if (brandId) params.brandId = brandId
  if (categoryId) params.categoryId = categoryId
  const res = await http.get("/product", { params })
  return mapResponsePage(res, mapProduct)
}

export async function getProductById(id: number): Promise<ProductResponse> {
  const res = await http.get(`/product/${id}`)
  return mapProduct(res)
}

export async function createProduct(data: CreateProductRequest): Promise<ProductResponse> {
  const res = await http.post("/product", data)
  return mapProduct(res)
}

export async function updateProduct(id: number, data: UpdateProductRequest): Promise<ProductResponse> {
  const res = await http.put(`/product/${id}`, data)
  return mapProduct(res)
}

export async function toggleProductActive(id: number): Promise<ProductResponse> {
  const res = await http.put(`/product/${id}/toggle-active`)
  return mapProduct(res)
}
