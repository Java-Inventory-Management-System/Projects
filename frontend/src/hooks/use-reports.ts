import { useQuery } from "@tanstack/react-query"
import { getInventorySummary, getInventoryByCategory, getLowStock, getStockValue, getActivity, getDeadStock } from "@/services/report-service"

export function useInventorySummary() {
  return useQuery({
    queryKey: ["inventory-summary"],
    queryFn: getInventorySummary,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
  })
}

export function useInventoryByCategory() {
  return useQuery({
    queryKey: ["inventory-by-category"],
    queryFn: getInventoryByCategory,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
  })
}

export function useLowStock(page = 0, size = 20) {
  return useQuery({
    queryKey: ["low-stock", page, size],
    queryFn: () => getLowStock(page, size),
    staleTime: 1000 * 60 * 2,
  })
}

export function useStockValue() {
  return useQuery({
    queryKey: ["stock-value"],
    queryFn: getStockValue,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
  })
}

export function useActivity(from: string, to: string) {
  return useQuery({
    queryKey: ["activity", from, to],
    queryFn: () => getActivity(from, to),
    enabled: !!from && !!to,
    staleTime: 1000 * 60 * 2,
  })
}

export function useDeadStock(daysThreshold = 90) {
  return useQuery({
    queryKey: ["dead-stock", daysThreshold],
    queryFn: () => getDeadStock(daysThreshold),
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
  })
}
