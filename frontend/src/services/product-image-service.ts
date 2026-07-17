import http from "@/utils/http-client"
import type { ProductImage } from "@/utils/types"
import { mapProductImage } from "@/utils/mappers"

export async function getProductImages(productId: number): Promise<ProductImage[]> {
  const res = await http.get(`/product-image/product/${productId}`)
  return (res as []).map(mapProductImage)
}

export async function createProductImage(data: {
  productId: number
  url: string
  isPrimary?: boolean
  sortOrder?: number
}): Promise<ProductImage> {
  const res = await http.post("/product-image", data)
  return mapProductImage(res)
}

export async function deleteProductImage(id: number): Promise<void> {
  await http.delete(`/product-image/${id}`)
}

export async function deleteAllProductImages(productId: number): Promise<void> {
  await http.delete(`/product-image/product/${productId}`)
}
