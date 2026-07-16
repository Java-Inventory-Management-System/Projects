import { useQuery } from "@tanstack/react-query"
import { getProducts } from "@/services/product-service"

export function useProducts(page = 0, size = 20, search?: string, brandId?: number, categoryId?: number) {
  return useQuery({
    queryKey: ["products", page, size, search, brandId, categoryId],
    queryFn: () => getProducts(page, size, search, brandId, categoryId),
  })
}
