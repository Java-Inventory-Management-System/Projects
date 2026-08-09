import { useQuery, type QueryClient } from "@tanstack/react-query"
import {
  getInventorySummary,
  getInventoryByCategory,
  getLowStock,
  getStockValue,
  getActivity,
  getDeadStock,
  getStockCheckOverview,
} from "@/services/report-service"

export function useInventorySummary() {
  return useQuery({
    queryKey: ["inventory-summary"],
    queryFn: getInventorySummary,
    staleTime: 1000 * 60 * 5,
  })
}

export function useInventoryByCategory() {
  return useQuery({
    queryKey: ["inventory-by-category"],
    queryFn: getInventoryByCategory,
    staleTime: 1000 * 60 * 5,
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

export function useDeadStock(daysThreshold = 90, keyword?: string, categoryId?: number) {
  return useQuery({
    queryKey: ["dead-stock", daysThreshold, keyword, categoryId],
    queryFn: () => getDeadStock(daysThreshold, keyword, categoryId),
    staleTime: 1000 * 60 * 5,
  })
}

export function useStockCheckOverview(from: string, to: string) {
  return useQuery({
    queryKey: ["stock-check-overview", from, to],
    queryFn: () => getStockCheckOverview(from, to),
    enabled: !!from && !!to,
    staleTime: 1000 * 60 * 2,
  })
}

export function invalidateDashboard(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ["inventory-summary"] })
  qc.invalidateQueries({ queryKey: ["inventory-by-category"] })
  qc.invalidateQueries({ queryKey: ["stock-value"] })
  qc.invalidateQueries({ queryKey: ["activity"] })
  qc.invalidateQueries({ queryKey: ["dead-stock"] })
  qc.invalidateQueries({ queryKey: ["stock-check-overview"] })
  qc.invalidateQueries({ queryKey: ["low-stock"] })
}
