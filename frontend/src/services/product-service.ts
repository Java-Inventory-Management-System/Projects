import http from "@/utils/http-client"
import type { ProductResponse, ResponsePage } from "@/utils/types"
import { mapResponsePage, mapProduct } from "@/utils/mappers"

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
