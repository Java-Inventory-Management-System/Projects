import { useQuery } from "@tanstack/react-query"
import { getPriceAdjustments, getMyPriceAdjustments } from "@/services/price-adjustment-service"

export function usePriceAdjustments(page = 0, size = 20, sort?: string, status?: string) {
  return useQuery({
    queryKey: ["price-adjustments", page, size, sort, status],
    queryFn: () => getPriceAdjustments(page, size, sort, status),
    placeholderData: (prev) => prev,
    staleTime: 60_000,
  })
}

export function useMyPriceAdjustments(page = 0, size = 20, sort?: string, status?: string) {
  return useQuery({
    queryKey: ["my-price-adjustments", page, size, sort, status],
    queryFn: () => getMyPriceAdjustments(page, size, sort, status),
    placeholderData: (prev) => prev,
    staleTime: 60_000,
  })
}
