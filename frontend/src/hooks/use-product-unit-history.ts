import { useQuery } from "@tanstack/react-query"
import { getProductUnitHistory } from "@/services/product-unit-service"

export function useProductUnitHistory(id: number | null) {
  return useQuery({
    queryKey: ["product-unit-history", id],
    queryFn: () => getProductUnitHistory(id as number),
    enabled: id != null,
    staleTime: 30_000,
  })
}