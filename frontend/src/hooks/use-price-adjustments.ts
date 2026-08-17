import { useQuery } from "@tanstack/react-query"
import {
  getPriceAdjustments,
  getMyPriceAdjustments,
  getPriceAdjustmentHistory,
} from "@/services/price-adjustment-service"

export function usePriceAdjustments(page = 0, size = 20, sort?: string, status?: string, search?: string) {
  return useQuery({
    queryKey: ["price-adjustments", page, size, sort, status, search],
    queryFn: () => getPriceAdjustments(page, size, sort, status, search),
    placeholderData: (prev) => prev,
    staleTime: 60_000,
  })
}

export function useMyPriceAdjustments(page = 0, size = 20, sort?: string, status?: string, search?: string) {
  return useQuery({
    queryKey: ["my-price-adjustments", page, size, sort, status, search],
    queryFn: () => getMyPriceAdjustments(page, size, sort, status, search),
    placeholderData: (prev) => prev,
    staleTime: 60_000,
  })
}

export function usePriceAdjustmentHistory(productId: number | null) {
  return useQuery({
    queryKey: ["price-adjustment-history", productId],
    queryFn: () => getPriceAdjustmentHistory(productId as number),
    enabled: productId != null,
    staleTime: 30_000,
  })
}