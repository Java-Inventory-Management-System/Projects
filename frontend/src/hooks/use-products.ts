import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createProduct, getProducts, getProductById, updateProduct, toggleProductActive } from "@/services/product-service"
import type { CreateProductRequest, UpdateProductRequest } from "@/utils/types"

export function useProducts(page = 0, size = 20, sort?: string, search?: string, brandId?: number, categoryId?: number) {
  return useQuery({
    queryKey: ["products", page, size, sort, search, brandId, categoryId],
    queryFn: () => getProducts(page, size, sort, search, brandId, categoryId),
  })
}

export function useProductById(id: number) {
  return useQuery({
    queryKey: ["product", id],
    queryFn: () => getProductById(id),
    enabled: !!id,
  })
}

export function useCreateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateProductRequest) => createProduct(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  })
}

export function useUpdateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateProductRequest }) => updateProduct(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products"] }); qc.invalidateQueries({ queryKey: ["product"] }) },
  })
}

export function useToggleProductActive() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => toggleProductActive(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products"] }); qc.invalidateQueries({ queryKey: ["product"] }) },
  })
}
