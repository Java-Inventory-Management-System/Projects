import http from "@/utils/http-client"
import type { ResponsePage, PurchaseOrder, CreatePurchaseOrderRequest, UpdatePurchaseOrderRequest, ImportReceipt } from "@/utils/types"
import { mapResponsePage, mapPurchaseOrder, mapImportReceipt } from "@/utils/mappers"

export async function getPurchaseOrders(
  page = 0,
  size = 20,
  sort?: string,
  status?: string,
): Promise<ResponsePage<PurchaseOrder>> {
  const params: Record<string, string | number> = { page, size, sort: sort ?? "createdAt,desc" }
  if (status) params.status = status
  const res = await http.get("/purchase-order", { params })
  return mapResponsePage(res, mapPurchaseOrder)
}

export async function getPurchaseOrderById(id: number): Promise<PurchaseOrder> {
  const res = await http.get(`/purchase-order/${id}`)
  return mapPurchaseOrder(res)
}

export async function getPurchaseOrderReceipts(id: number): Promise<ImportReceipt[]> {
  const res = await http.get(`/purchase-order/${id}/receipts`)
  return (res as ImportReceipt[]).map(mapImportReceipt)
}

export async function getPurchaseOrderPrintHtml(id: number, lang: string): Promise<string> {
  const res = await http.get(`/purchase-order/${id}/print`, { params: { lang }, responseType: "text" })
  return res as unknown as string
}

export async function createPurchaseOrder(data: CreatePurchaseOrderRequest): Promise<PurchaseOrder> {
  const res = await http.post("/purchase-order", data)
  return mapPurchaseOrder(res)
}

export async function cancelPurchaseOrder(id: number): Promise<PurchaseOrder> {
  const res = await http.put(`/purchase-order/${id}/cancel`)
  return mapPurchaseOrder(res)
}

export async function openPurchaseOrder(id: number, asnCode?: string): Promise<PurchaseOrder> {
  const res = await http.put(`/purchase-order/${id}/open`, null, { params: { asnCode } })
  return mapPurchaseOrder(res)
}

export async function updatePurchaseOrder(id: number, data: UpdatePurchaseOrderRequest): Promise<PurchaseOrder> {
  const res = await http.put(`/purchase-order/${id}`, data)
  return mapPurchaseOrder(res)
}

export async function deletePurchaseOrder(id: number): Promise<void> {
  await http.delete(`/purchase-order/${id}`)
}
