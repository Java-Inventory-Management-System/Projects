import http from "@/utils/http-client"
import type { ResponsePage, ReturnReceipt } from "@/utils/types"
import { mapResponsePage, mapReturnReceipt } from "@/utils/mappers"

export async function getReturnReceipts(
  page = 0,
  size = 20,
  status?: string,
  reason?: string,
  search?: string,
): Promise<ResponsePage<ReturnReceipt>> {
  const res = await http.get("/return-receipts", {
    params: { page, size, sort: "createdAt,desc", ...(status && { status }), ...(reason && { reason }), ...(search && { search }) },
  })
  return mapResponsePage(res, mapReturnReceipt)
}

export async function getReturnPrintHtml(id: number, lang: string): Promise<string> {
  const res = await http.get(`/return-receipts/${id}/print`, { params: { lang }, responseType: "text" })
  return res as unknown as string
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
    productUnitId: number | null
    productId: number
    quantity: number
    condition: string
    resultingAction: string
    description?: string
    evidenceImage?: string
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

export interface UnitLookupResult {
  found: boolean
  inExport: boolean
  productUnitId: number | null
  productId: number | null
  productName: string | null
  productSku: string | null
  serialNumber: string | null
  status: string | null
}

export async function lookupReturnUnit(serial: string, exportReceiptId: number): Promise<UnitLookupResult> {
  const res = await http.get("/return-receipts/lookup-unit", { params: { serial, exportReceiptId } })
  return res.data as UnitLookupResult
}
