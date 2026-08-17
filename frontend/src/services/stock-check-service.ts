import http from "@/utils/http-client"
import type { ResponsePage, StockCheck, StockCheckSchedule, StockCheckScopeType, StockCheckZoneStatus } from "@/utils/types"
import { mapResponsePage, mapStockCheck } from "@/utils/mappers"

export async function getStockChecks(
  page = 0, size = 20, sort?: string, status?: string,
): Promise<ResponsePage<StockCheck>> {
  const params: Record<string, string | number> = { page, size, sort: sort ?? "createdAt,desc" }
  if (status) params.status = status
  const res = await http.get("/stock-check", { params })
  return mapResponsePage(res, mapStockCheck)
}

export async function getMyStockChecks(
  page = 0, size = 20, sort?: string, status?: string,
): Promise<ResponsePage<StockCheck>> {
  const params: Record<string, string | number> = { page, size, sort: sort ?? "createdAt,desc" }
  if (status) params.status = status
  const res = await http.get("/stock-check/my", { params })
  return mapResponsePage(res, mapStockCheck)
}

export async function getStockCheckById(id: number): Promise<StockCheck> {
  const res = await http.get(`/stock-check/${id}`)
  return mapStockCheck(res)
}

export async function getStockCheckPrintHtml(id: number, lang: string): Promise<string> {
  const res = await http.get(`/stock-check/${id}/print`, { params: { lang }, responseType: "text" })
  return res as unknown as string
}

export async function getStockCheckCount(): Promise<number> {
  const res = await http.get("/stock-check/count")
  return res as number
}

export async function getStockCheckZoneStatus(): Promise<StockCheckZoneStatus> {
  const res = await http.get("/stock-check/zone-status")
  return res as StockCheckZoneStatus
}

export async function getStockCheckSchedules(): Promise<StockCheckSchedule[]> {
  const res = await http.get("/stock-check/schedules")
  return res as StockCheckSchedule[]
}

export async function countUnitsInScope(
  scopeType: string, scopeId: number, shelfCodes?: string[],
): Promise<number> {
  const params: Record<string, string | number> = { scopeType, scopeId }
  if (shelfCodes && shelfCodes.length > 0) params.shelfCodes = shelfCodes.join(",")
  const res = await http.get("/stock-check/scope-unit-count", { params })
  return res as number
}

export async function createStockCheck(data: {
  scopeType: StockCheckScopeType; scopeId: number; shelfCodes?: string[]; note?: string
}): Promise<StockCheck> {
  const res = await http.post("/stock-check", data)
  return mapStockCheck(res)
}

export async function startStockCheck(id: number): Promise<StockCheck> {
  const res = await http.put(`/stock-check/${id}/start`)
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
      photo?: string
      suspectSeal?: boolean
      damagedPackaging?: boolean
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

export async function addExtraStockCheckItem(
  id: number,
  data: { sku: string; serialNumber?: string; countedQuantity?: number; note?: string; photo?: string },
): Promise<StockCheck> {
  const res = await http.post(`/stock-check/${id}/extra-items`, data)
  return mapStockCheck(res)
}

export async function reopenStockCheck(id: number): Promise<StockCheck> {
  const res = await http.put(`/stock-check/${id}/reopen`)
  return mapStockCheck(res)
}

export async function cancelStockCheck(id: number): Promise<StockCheck> {
  const res = await http.put(`/stock-check/${id}/cancel`)
  return mapStockCheck(res)
}