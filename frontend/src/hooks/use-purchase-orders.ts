import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getPurchaseOrders,
  getPurchaseOrderById,
  getPurchaseOrderReceipts,
  createPurchaseOrder as createPOService,
  cancelPurchaseOrder,
  openPurchaseOrder as openPOService,
  updatePurchaseOrder as updatePOService,
  deletePurchaseOrder as deletePOService,
} from "@/services/purchase-order-service"
import type { CreatePurchaseOrderRequest, UpdatePurchaseOrderRequest } from "@/utils/types"

export function usePurchaseOrders(page = 0, size = 20, sort?: string, status?: string) {
  return useQuery({
    queryKey: ["purchase-orders", page, size, sort, status],
    queryFn: () => getPurchaseOrders(page, size, sort, status),
    placeholderData: (prev) => prev,
    staleTime: 60_000,
  })
}

export function usePurchaseOrderById(id: number) {
  return useQuery({
    queryKey: ["purchase-order", id],
    queryFn: () => getPurchaseOrderById(id),
    enabled: !!id,
  })
}

export function usePurchaseOrderReceipts(id: number) {
  return useQuery({
    queryKey: ["purchase-order-receipts", id],
    queryFn: () => getPurchaseOrderReceipts(id),
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

export function useOpenPurchaseOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, asnCode }: { id: number; asnCode?: string }) => openPOService(id, asnCode),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase-orders"] })
    },
  })
}

export function useUpdatePurchaseOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdatePurchaseOrderRequest }) => updatePOService(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase-orders"] })
    },
  })
}

export function useDeletePurchaseOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deletePOService(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase-orders"] })
    },
  })
}
