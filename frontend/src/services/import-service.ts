import http from "@/utils/http-client"
import type { ResponsePage, ImportReceipt, ProductUnit } from "@/utils/types"
import { mapResponsePage, mapImportReceipt, mapProductUnit } from "@/utils/mappers"

export async function getImportReceiptUnits(receiptId: number): Promise<ProductUnit[]> {
  const res = await http.get(`/import-receipt/${receiptId}/units`)
  return (res as unknown[]).map(mapProductUnit)
}

export async function getImportReceipts(
  page = 0,
  size = 20,
  sort?: string,
  status?: string,
): Promise<ResponsePage<ImportReceipt>> {
  const res = await http.get("/import-receipt", {
    params: { page, size, sort: sort ?? "createdAt,desc", ...(status && { status }) },
  })
  return mapResponsePage(res, mapImportReceipt)
}

export async function getImportReceiptById(id: number): Promise<ImportReceipt> {
  const res = await http.get(`/import-receipt/${id}`)
  return mapImportReceipt(res)
}

export async function getImportPrintHtml(id: number, lang: string): Promise<string> {
  const res = await http.get(`/import-receipt/${id}/print`, { params: { lang }, responseType: "text" })
  return res as string
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
  }>
}): Promise<ImportReceipt> {
  const res = await http.post("/import-receipt", data)
  return mapImportReceipt(res)
}

export async function confirmImportReceipt(
  id: number,
  data: {
    receiptId: number
    serials: Array<{
      itemId: number
      serialNumbers: string[]
      locationId: number | null
    }>
  },
): Promise<ImportReceipt> {
  const res = await http.put(`/import-receipt/${id}/confirm`, data)
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
