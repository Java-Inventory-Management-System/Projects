import http from "@/utils/http-client"
import type { ResponsePage, ReturnReceipt } from "@/utils/types"
import { mapResponsePage, mapReturnReceipt } from "@/utils/mappers"

export async function getReturnReceipts(page = 0, size = 20): Promise<ResponsePage<ReturnReceipt>> {
  const res = await http.get("/return-receipts", { params: { page, size, sort: "createdAt,desc" } })
  return mapResponsePage(res, mapReturnReceipt)
}

export async function getReturnReceiptById(id: number): Promise<ReturnReceipt> {
  const res = await http.get(`/return-receipts/${id}`)
  return mapReturnReceipt(res)
}

export async function createReturnReceipt(data: {
  customerId: number
  originalExportReceiptId: number
  reason: string
  note?: string
  items: Array<{
    productUnitId: number
    productId: number
    quantity: number
    condition: string
    resultingAction: string
  }>
}): Promise<ReturnReceipt> {
  const res = await http.post("/return-receipts", data)
  return mapReturnReceipt(res)
}

export async function approveReturnReceipt(id: number): Promise<ReturnReceipt> {
  const res = await http.put(`/return-receipts/${id}/approve`)
  return mapReturnReceipt(res)
}

export async function cancelReturnReceipt(id: number): Promise<ReturnReceipt> {
  const res = await http.put(`/return-receipts/${id}/cancel`)
  return mapReturnReceipt(res)
}
