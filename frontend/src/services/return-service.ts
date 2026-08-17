import http from "@/utils/http-client"
import type { ResponsePage, ReturnReceipt } from "@/utils/types"
import { mapResponsePage, mapReturnReceipt } from "@/utils/mappers"

export async function getReturnReceipts(
  page = 0,
  size = 20,
  status?: string,
  reason?: string,
  search?: string,
  createdBy?: number,
): Promise<ResponsePage<ReturnReceipt>> {
  const res = await http.get("/return-receipts", {
    params: { page, size, sort: "createdAt,desc", ...(status && { status }), ...(reason && { reason }), ...(search && { search }), ...(createdBy && { createdBy }) },
  })
  return mapResponsePage(res, mapReturnReceipt)
}

export async function getReturnPrintFile(id: number, lang: string, format: "pdf" | "excel"): Promise<Blob> {
  const res = await http.get(`/return-receipts/${id}/print`, { params: { lang, format }, responseType: "blob" })
  return res as unknown as Blob
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
      defectCategoryId?: number | null
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

export interface ReturnableUnit {
  unitId: number
  serialNumber: string
  productId: number
  productName: string | null
  productSku: string | null
  held: boolean
  warrantyExpiresAt: string | null
}

export interface BulkSummary {
  productId: number
  productName: string
  productSku: string
  trackingType: string
  soldQty: number
  returnedQty: number
  remainingQty: number
}

export interface ReturnableUnitsInfo {
  units: ReturnableUnit[]
  bulkSummary: BulkSummary[]
}

export async function getReturnableUnits(exportReceiptId: number): Promise<ReturnableUnitsInfo> {
  const res = await http.get("/return-receipts/returnable-units", { params: { exportReceiptId } })
  return res as ReturnableUnitsInfo
}

export async function lookupReturnUnit(serial: string, exportReceiptId: number): Promise<UnitLookupResult> {
  const res = await http.get("/return-receipts/lookup-unit", { params: { serial, exportReceiptId } })
  return res.data as UnitLookupResult
}

export interface WarrantyExchangeInfo {
  originalUnitId: number | null
  serialNumber: string | null
  productId: number | null
  productName: string | null
  originalSellPrice: number
  warrantyExpiresAt: string | null
  defectCategoryId: number | null
  defectName: string | null
  replaceable: boolean
}

export interface WarrantyExchangeResult {
  receiptCode: string
  exportReceiptId: number
  replacementUnitId: number
  replacementSerial: string
  originalPrice: number
  newPrice: number
  chargeAmount: number
  warrantyExpiresAt: string
}

export async function getWarrantyExchangeInfo(returnReceiptId: number): Promise<WarrantyExchangeInfo> {
  const res = await http.get(`/return-receipts/${returnReceiptId}/warranty-exchange-info`)
  return res.data as WarrantyExchangeInfo
}

export async function warrantyExchange(
  returnReceiptId: number,
  payload: { replacementUnitId: number; discountAmount?: number; note?: string },
): Promise<WarrantyExchangeResult> {
  const res = await http.put(`/return-receipts/${returnReceiptId}/warranty-exchange`, payload)
  return res.data as WarrantyExchangeResult
}
