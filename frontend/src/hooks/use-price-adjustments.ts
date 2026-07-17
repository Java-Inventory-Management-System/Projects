import { useQuery } from "@tanstack/react-query"
import { getPriceAdjustments, getMyPriceAdjustments } from "@/services/price-adjustment-service"

export function usePriceAdjustments(page = 0, size = 20, status?: string) {
  return useQuery({
    queryKey: ["price-adjustments", page, size, status],
    queryFn: () => getPriceAdjustments(page, size, status),
  })
}

export function useMyPriceAdjustments(page = 0, size = 20, status?: string) {
  return useQuery({
    queryKey: ["my-price-adjustments", page, size, status],
    queryFn: () => getMyPriceAdjustments(page, size, status),
  })
}
