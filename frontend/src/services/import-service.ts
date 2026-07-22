import http from "@/utils/http-client"
import type { ResponsePage, ImportReceipt } from "@/utils/types"
import { mapResponsePage, mapImportReceipt } from "@/utils/mappers"

export async function getImportReceipts(page = 0, size = 20, sort?: string, status?: string): Promise<ResponsePage<ImportReceipt>> {
  const res = await http.get("/import-receipt", { params: { page, size, sort: sort ?? "createdAt,desc", ...(status && { status }) } })
  return mapResponsePage(res, mapImportReceipt)
}

export async function getImportReceiptById(id: number): Promise<ImportReceipt> {
  const res = await http.get(`/import-receipt/${id}`)
  return mapImportReceipt(res)
}

export async function createImportReceipt(data: {
  receiptCode?: string
  supplierId: number
  note?: string
  purchaseOrderId?: number
  items: Array<{
    productId: number
    quantity: number
    unitPrice: number
    warrantyMonths?: number
    serialNumbers?: string[]
    locationId?: number
  }>
}): Promise<ImportReceipt> {
  const res = await http.post("/import-receipt", data)
  return mapImportReceipt(res)
}

export async function approveImportReceipt(id: number): Promise<ImportReceipt> {
  const res = await http.put(`/import-receipt/${id}/approve`)
  return mapImportReceipt(res)
}

export async function cancelImportReceipt(id: number): Promise<ImportReceipt> {
  const res = await http.put(`/import-receipt/${id}/cancel`)
  return mapImportReceipt(res)
}
