import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  getStockChecks,
  getMyStockChecks,
  getStockCheckById,
  getStockCheckZoneStatus,
  startStockCheck,
} from "@/services/stock-check-service"

export function useStockChecks(page = 0, size = 20, sort?: string, status?: string) {
  return useQuery({
    queryKey: ["stock-checks", page, size, sort, status],
    queryFn: () => getStockChecks(page, size, sort, status),
    placeholderData: (prev) => prev,
    staleTime: 60_000,
  })
}

export function useMyStockChecks(page = 0, size = 20, sort?: string, status?: string) {
  return useQuery({
    queryKey: ["my-stock-checks", page, size, sort, status],
    queryFn: () => getMyStockChecks(page, size, sort, status),
    placeholderData: (prev) => prev,
    staleTime: 60_000,
  })
}

export function useStockCheck(id: number | null) {
  return useQuery({
    queryKey: ["stock-check", id],
    queryFn: () => getStockCheckById(id as number),
    enabled: id != null,
    staleTime: 30_000,
  })
}

export function useStockCheckZoneStatus() {
  return useQuery({
    queryKey: ["stock-check-zone-status"],
    queryFn: getStockCheckZoneStatus,
    staleTime: 60_000,
    refetchInterval: 60_000,
  })
}

export function useStartStockCheck() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: startStockCheck,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-checks"] })
      qc.invalidateQueries({ queryKey: ["my-stock-checks"] })
      qc.invalidateQueries({ queryKey: ["stock-check-zone-status"] })
    },
  })
}