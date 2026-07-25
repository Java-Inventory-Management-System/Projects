import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder as createPOService,
  cancelPurchaseOrder,
} from "@/services/purchase-order-service"
import type { CreatePurchaseOrderRequest } from "@/utils/types"

export function usePurchaseOrders(page = 0, size = 20, sort?: string, status?: string) {
  return useQuery({
    queryKey: ["purchase-orders", page, size, sort, status],
    queryFn: () => getPurchaseOrders(page, size, sort, status),
    placeholderData: (prev) => prev,
  })
}

export function usePurchaseOrderById(id: number) {
  return useQuery({
    queryKey: ["purchase-order", id],
    queryFn: () => getPurchaseOrderById(id),
    enabled: !!id,
  })
}

export function useCreatePurchaseOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreatePurchaseOrderRequest) => createPOService(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["purchase-orders"] }),
  })
}

export function useCancelPurchaseOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => cancelPurchaseOrder(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase-orders"] })
    },
  })
}
