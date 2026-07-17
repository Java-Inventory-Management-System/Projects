import http from "@/utils/http-client"
import type { PriceAdjustment, ResponsePage } from "@/utils/types"
import { mapResponsePage, mapPriceAdjustment } from "@/utils/mappers"

export async function getPriceAdjustments(page = 0, size = 20, status?: string): Promise<ResponsePage<PriceAdjustment>> {
  const params: Record<string, string | number> = { page, size }
  if (status) params.status = status
  const res = await http.get("/price-adjustment", { params })
  return mapResponsePage(res, mapPriceAdjustment)
}

export async function getMyPriceAdjustments(page = 0, size = 20, status?: string): Promise<ResponsePage<PriceAdjustment>> {
  const params: Record<string, string | number> = { page, size }
  if (status) params.status = status
  const res = await http.get("/price-adjustment/my", { params })
  return mapResponsePage(res, mapPriceAdjustment)
}

export async function getPriceAdjustmentById(id: number): Promise<PriceAdjustment> {
  const res = await http.get(`/price-adjustment/${id}`)
  return mapPriceAdjustment(res)
}

export async function createPriceAdjustment(data: {
  importReceiptItemId: number
  newPrice: number
  reason: string
}): Promise<PriceAdjustment> {
  const res = await http.post("/price-adjustment", data)
  return mapPriceAdjustment(res)
}

export async function approvePriceAdjustment(id: number, approvalNote?: string): Promise<PriceAdjustment> {
  const res = await http.put(`/price-adjustment/${id}/approve`, { approvalNote })
  return mapPriceAdjustment(res)
}

export async function rejectPriceAdjustment(id: number, approvalNote?: string): Promise<PriceAdjustment> {
  const res = await http.put(`/price-adjustment/${id}/reject`, { approvalNote })
  return mapPriceAdjustment(res)
}
