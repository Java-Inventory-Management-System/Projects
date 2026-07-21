import http from "@/utils/http-client"
import type { ResponsePage, PurchaseOrder, CreatePurchaseOrderRequest } from "@/utils/types"
import { mapResponsePage, mapPurchaseOrder } from "@/utils/mappers"

export async function getPurchaseOrders(page = 0, size = 20, sort?: string, status?: string): Promise<ResponsePage<PurchaseOrder>> {
  const params: Record<string, string | number> = { page, size, sort: sort ?? "createdAt,desc" }
  if (status) params.status = status
  const res = await http.get("/purchase-order", { params })
  return mapResponsePage(res, mapPurchaseOrder)
}

export async function getPurchaseOrderById(id: number): Promise<PurchaseOrder> {
  const res = await http.get(`/purchase-order/${id}`)
  return mapPurchaseOrder(res)
}

export async function createPurchaseOrder(data: CreatePurchaseOrderRequest): Promise<PurchaseOrder> {
  const res = await http.post("/purchase-order", data)
  return mapPurchaseOrder(res)
}

export async function cancelPurchaseOrder(id: number): Promise<PurchaseOrder> {
  const res = await http.put(`/purchase-order/${id}/cancel`)
  return mapPurchaseOrder(res)
}
