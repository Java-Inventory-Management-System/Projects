import { useQuery } from "@tanstack/react-query"
import { getStockAdjustments, getMyStockAdjustments } from "@/services/stock-adjustment-service"

export function useStockAdjustments(page = 0, size = 20, type?: string, status?: string) {
  return useQuery({
    queryKey: ["stock-adjustments", page, size, type, status],
    queryFn: () => getStockAdjustments(page, size, type, status),
  })
}

export function useMyStockAdjustments(page = 0, size = 20, type?: string, status?: string) {
  return useQuery({
    queryKey: ["my-stock-adjustments", page, size, type, status],
    queryFn: () => getMyStockAdjustments(page, size, type, status),
  })
}
