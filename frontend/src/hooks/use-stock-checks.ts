import { useQuery } from "@tanstack/react-query"
import { getStockChecks, getMyStockChecks } from "@/services/stock-check-service"

export function useStockChecks(page = 0, size = 20) {
  return useQuery({
    queryKey: ["stock-checks", page, size],
    queryFn: () => getStockChecks(page, size),
  })
}

export function useMyStockChecks(page = 0, size = 20) {
  return useQuery({
    queryKey: ["my-stock-checks", page, size],
    queryFn: () => getMyStockChecks(page, size),
  })
}
