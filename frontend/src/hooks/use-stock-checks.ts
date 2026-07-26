import { useQuery } from "@tanstack/react-query"
import { getStockChecks, getMyStockChecks } from "@/services/stock-check-service"

export function useStockChecks(page = 0, size = 20, sort?: string, status?: string) {
  return useQuery({
    queryKey: ["stock-checks", page, size, sort, status],
    queryFn: () => getStockChecks(page, size, sort, status),
    placeholderData: (prev) => prev,
  })
}

export function useMyStockChecks(page = 0, size = 20, sort?: string, status?: string) {
  return useQuery({
    queryKey: ["my-stock-checks", page, size, sort, status],
    queryFn: () => getMyStockChecks(page, size, sort, status),
    placeholderData: (prev) => prev,
  })
}
