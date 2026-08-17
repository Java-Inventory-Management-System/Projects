import http from "@/utils/http-client"
import type { ResponsePage, ImportReceipt, ProductUnit } from "@/utils/types"
import { mapResponsePage, mapImportReceipt, mapProductUnit } from "@/utils/mappers"

export async function getImportReceiptUnits(receiptId: number): Promise<ProductUnit[]> {
  const res = await http.get(`/import-receipt/${receiptId}/units`)
  return (res as unknown as unknown[]).map(mapProductUnit)
}

export async function getImportReceipts(
  page = 0,
  size = 20,
  sort?: string,
  status?: string,
  unresolved?: boolean,
): Promise<ResponsePage<ImportReceipt>> {
  const res = await http.get("/import-receipt", {
    params: {
      page,
      size,
      sort: sort ?? "createdAt,desc",
      ...(status && { status }),
      ...(unresolved && { unresolved }),
    },
  })
  return mapResponsePage(res, mapImportReceipt)
}

export async function getImportReceiptById(id: number): Promise<ImportReceipt> {
  const res = await http.get(`/import-receipt/${id}`)
  return mapImportReceipt(res)
}

export async function getImportPrintFile(id: number, lang: string, format: "pdf" | "excel"): Promise<Blob> {
  const res = await http.get(`/import-receipt/${id}/print`, { params: { lang, format }, responseType: "blob" })
  return res as unknown as Blob
}

export async function createImportReceipt(data: {
  receiptCode?: string
  supplierId?: number | null
  note?: string
  purchaseOrderId?: number
  originalWarrantyExportId?: number
  items: Array<{
    productId: number
    quantity: number
    unitPrice: number
    warrantyMonths?: number
    warrantyResultType?: string
    serialNumbers?: string[]
    replacementSourceSerials?: string[]
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
      allocations?: Array<{
        locationId: number
        quantity: number
        serialNumbers: string[]
      }>
    }>
    note?: string
    rejectedSerials?: Array<{ serial: string; reason: string }>
    notReceivedItemIds?: number[]
  },
): Promise<ImportReceipt> {
  const res = await http.put(`/import-receipt/${id}/confirm`, data)
  return mapImportReceipt(res)
}

export async function resolveImportReceipt(
  id: number,
  data: { resolution: string; note?: string },
): Promise<ImportReceipt> {
  const res = await http.put(`/import-receipt/${id}/resolve`, data)
  return mapImportReceipt(res)
}

export async function rejectImportReceipt(
  id: number,
  data: { reason: string; evidenceImageUrl: string },
): Promise<ImportReceipt> {
  const res = await http.put(`/import-receipt/${id}/reject`, data)
  return mapImportReceipt(res)
}

export async function cancelImportReceipt(id: number): Promise<ImportReceipt> {
  const res = await http.put(`/import-receipt/${id}/cancel`)
  return mapImportReceipt(res)
}
