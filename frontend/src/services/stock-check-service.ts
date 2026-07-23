import http from "@/utils/http-client"
import type { ResponsePage, StockCheck } from "@/utils/types"
import { mapResponsePage, mapStockCheck } from "@/utils/mappers"

export async function getStockChecks(page = 0, size = 20, sort?: string): Promise<ResponsePage<StockCheck>> {
  const res = await http.get("/stock-check", { params: { page, size, sort: sort ?? "createdAt,desc" } })
  return mapResponsePage(res, mapStockCheck)
}

export async function getMyStockChecks(page = 0, size = 20, sort?: string): Promise<ResponsePage<StockCheck>> {
  const res = await http.get("/stock-check/my", { params: { page, size, sort: sort ?? "createdAt,desc" } })
  return mapResponsePage(res, mapStockCheck)
}

export async function getStockCheckById(id: number): Promise<StockCheck> {
  const res = await http.get(`/stock-check/${id}`)
  return mapStockCheck(res)
}

export async function createStockCheck(data: { note?: string; productUnitIds: number[] }): Promise<StockCheck> {
  const res = await http.post("/stock-check", data)
  return mapStockCheck(res)
}

export async function recordStockCheckItems(
  id: number,
  data: {
    items: Array<{
      productUnitId: number
      actualStatus?: string
      countedQuantity?: number
      note?: string
    }>
  },
): Promise<StockCheck> {
  const res = await http.put(`/stock-check/${id}/items`, data)
  return mapStockCheck(res)
}

export async function completeStockCheck(id: number): Promise<StockCheck> {
  const res = await http.put(`/stock-check/${id}/complete`)
  return mapStockCheck(res)
}

export async function approveStockCheck(id: number, approvalNote?: string): Promise<StockCheck> {
  const res = await http.put(`/stock-check/${id}/approve`, { approvalNote })
  return mapStockCheck(res)
}

export async function rejectStockCheck(id: number, approvalNote?: string): Promise<StockCheck> {
  const res = await http.put(`/stock-check/${id}/reject`, { approvalNote })
  return mapStockCheck(res)
}
