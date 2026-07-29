import http from "@/utils/http-client"
import type { ResponsePage, StockAdjustment } from "@/utils/types"
import { mapResponsePage, mapStockAdjustment } from "@/utils/mappers"

export async function getStockAdjustments(
  page = 0,
  size = 20,
  sort?: string,
  type?: string,
  status?: string,
): Promise<ResponsePage<StockAdjustment>> {
  const params: Record<string, string | number> = { page, size, sort: sort ?? "createdAt,desc" }
  if (type) params.type = type
  if (status) params.status = status
  const res = await http.get("/stock-adjustment", { params })
  return mapResponsePage(res, mapStockAdjustment)
}

export async function getStockAdjustmentsByUnit(
  productUnitId: number,
  size = 5,
): Promise<ResponsePage<StockAdjustment>> {
  const res = await http.get(`/stock-adjustment/by-unit/${productUnitId}`, { params: { size } })
  return mapResponsePage(res, mapStockAdjustment)
}

export async function getMyStockAdjustments(
  page = 0,
  size = 20,
  sort?: string,
  type?: string,
  status?: string,
): Promise<ResponsePage<StockAdjustment>> {
  const params: Record<string, string | number> = { page, size, sort: sort ?? "createdAt,desc" }
  if (type) params.type = type
  if (status) params.status = status
  const res = await http.get("/stock-adjustment/my", { params })
  return mapResponsePage(res, mapStockAdjustment)
}

export async function getStockAdjustmentById(id: number): Promise<StockAdjustment> {
  const res = await http.get(`/stock-adjustment/${id}`)
  return mapStockAdjustment(res)
}

export async function createStockAdjustment(data: {
  type: string
  productUnitId?: number
  productId?: number
  quantity?: number
  reason: string
  imageUrl?: string
  sourceType?: string
  sourceId?: number
  serialNumber?: string
  locationId?: number
}): Promise<StockAdjustment> {
  const res = await http.post("/stock-adjustment", data)
  return mapStockAdjustment(res)
}

export async function approveStockAdjustment(id: number, approvalNote?: string): Promise<StockAdjustment> {
  const res = await http.put(`/stock-adjustment/${id}/approve`, { approvalNote })
  return mapStockAdjustment(res)
}

export async function rejectStockAdjustment(id: number, approvalNote?: string): Promise<StockAdjustment> {
  const res = await http.put(`/stock-adjustment/${id}/reject`, { approvalNote })
  return mapStockAdjustment(res)
}
