import { useQuery } from "@tanstack/react-query"
import { getStockChecks, getMyStockChecks } from "@/services/stock-check-service"

export function useStockChecks(page = 0, size = 20, sort?: string) {
  return useQuery({
    queryKey: ["stock-checks", page, size, sort],
    queryFn: () => getStockChecks(page, size, sort),
  })
}

export function useMyStockChecks(page = 0, size = 20, sort?: string) {
  return useQuery({
    queryKey: ["my-stock-checks", page, size, sort],
    queryFn: () => getMyStockChecks(page, size, sort),
  })
}
