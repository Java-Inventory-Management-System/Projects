import http from "@/utils/http-client"
import type { ResponsePage, ExportReceipt, ExportReason } from "@/utils/types"
import { mapResponsePage, mapExportReceipt } from "@/utils/mappers"

export async function getExportReceipts(
  page = 0,
  size = 20,
  sort?: string,
  status?: string,
  customerId?: number,
  createdBy?: number,
): Promise<ResponsePage<ExportReceipt>> {
  const res = await http.get("/export-receipt", {
    params: { page, size, sort: sort ?? "createdAt,desc", ...(status && { status }), ...(customerId && { customerId }), ...(createdBy && { createdBy }) },
  })
  return mapResponsePage(res, mapExportReceipt)
}

export async function getExportReceiptById(id: number): Promise<ExportReceipt> {
  const res = await http.get(`/export-receipt/${id}`)
  return mapExportReceipt(res)
}

export async function getExportPrintHtml(id: number, lang: string): Promise<string> {
  const res = await http.get(`/export-receipt/${id}/print`, { params: { lang }, responseType: "text" })
  return res as unknown as string
}

export async function createExportReceipt(data: {
  type: ExportReason
  reason?: string | null
  customerId?: number | null
  supplierId?: number | null
  note?: string | null
  externalReference?: string | null
  items: Array<{
    productId: number
    quantity: number
    unitPrice: number
  }>
}): Promise<ExportReceipt> {
  const res = await http.post("/export-receipt", data)
  return mapExportReceipt(res)
}

export async function fulfillExportReceipt(
  id: number,
  data: {
    note: string
    evidenceImages: string[]
    items: Array<{
      itemId: number
      serialNumbers?: string[]
      actualQuantity?: number
    }>
  },
): Promise<ExportReceipt> {
  const res = await http.put(`/export-receipt/${id}/fulfill`, data)
  return mapExportReceipt(res)
}

export async function cancelExportReceipt(id: number): Promise<ExportReceipt> {
  const res = await http.put(`/export-receipt/${id}/cancel`)
  return mapExportReceipt(res)
}

export interface ExportUnit {
  id: number
  serialNumber: string
  productId: number
  productName: string
  productSku: string
  trackingType: string
  status: string
}

export async function getExportUnits(id: number, productId?: number): Promise<ExportUnit[]> {
  const res = await http.get(`/export-receipt/${id}/units`, { params: { productId } })
  return res as unknown as ExportUnit[]
}
