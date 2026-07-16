import { useQuery } from "@tanstack/react-query"
import { getBrands } from "@/services/brand-service"

export function useBrands() {
  return useQuery({
    queryKey: ["brands"],
    queryFn: getBrands,
    staleTime: 10 * 60 * 1000,
  })
}
