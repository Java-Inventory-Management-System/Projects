import { useQuery } from "@tanstack/react-query"
import { getStockAdjustments, getMyStockAdjustments } from "@/services/stock-adjustment-service"

export function useStockAdjustments(page = 0, size = 20, sort?: string, type?: string, status?: string) {
  return useQuery({
    queryKey: ["stock-adjustments", page, size, sort, type, status],
    queryFn: () => getStockAdjustments(page, size, sort, type, status),
    placeholderData: (prev) => prev,
    staleTime: 60_000,
  })
}

export function useMyStockAdjustments(page = 0, size = 20, sort?: string, type?: string, status?: string) {
  return useQuery({
    queryKey: ["my-stock-adjustments", page, size, sort, type, status],
    queryFn: () => getMyStockAdjustments(page, size, sort, type, status),
    placeholderData: (prev) => prev,
    staleTime: 60_000,
  })
}
