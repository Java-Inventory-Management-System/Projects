import http from "@/utils/http-client"
import type { ResponsePage, ExportReceipt } from "@/utils/types"
import { mapResponsePage, mapExportReceipt } from "@/utils/mappers"

export async function getExportReceipts(
  page = 0,
  size = 20,
  sort?: string,
  status?: string,
): Promise<ResponsePage<ExportReceipt>> {
  const res = await http.get("/export-receipt", {
    params: { page, size, sort: sort ?? "createdAt,desc", ...(status && { status }) },
  })
  return mapResponsePage(res, mapExportReceipt)
}

export async function getExportReceiptById(id: number): Promise<ExportReceipt> {
  const res = await http.get(`/export-receipt/${id}`)
  return mapExportReceipt(res)
}

export async function createExportReceipt(data: {
  reason: string
  customerId?: number | null
  note?: string | null
  items: Array<{
    productId: number
    quantity: number
    unitPrice: number
  }>
}): Promise<ExportReceipt> {
  const res = await http.post("/export-receipt", data)
  return mapExportReceipt(res)
}

export async function approveExportReceipt(id: number): Promise<ExportReceipt> {
  const res = await http.put(`/export-receipt/${id}/approve`)
  return mapExportReceipt(res)
}

export async function cancelExportReceipt(id: number): Promise<ExportReceipt> {
  const res = await http.put(`/export-receipt/${id}/cancel`)
  return mapExportReceipt(res)
}
