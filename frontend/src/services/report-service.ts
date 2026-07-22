import http from "@/utils/http-client"
import type { InventorySummary, CategoryStock, LowStockItem, StockValueItem, ActivityItem, DeadStockItem, ResponsePage } from "@/utils/types"
import { mapInventorySummary, mapCategoryStock, mapLowStockItem, mapStockValueItem, mapActivityItem, mapDeadStockItem, mapResponsePage } from "@/utils/mappers"

export async function getInventorySummary(): Promise<InventorySummary> {
  const res = await http.get("/report/inventory-summary")
  return mapInventorySummary(res)
}

export async function getInventoryByCategory(): Promise<CategoryStock[]> {
  const res = await http.get("/report/inventory-by-category") as unknown[]
  return res.map(mapCategoryStock)
}

export async function getLowStock(page = 0, size = 20): Promise<ResponsePage<LowStockItem>> {
  const res = await http.get("/report/low-stock", { params: { page, size } })
  return mapResponsePage(res, mapLowStockItem)
}

export async function getStockValue(): Promise<StockValueItem[]> {
  const res = await http.get("/report/stock-value") as unknown[]
  return res.map(mapStockValueItem)
}

export async function getActivity(from: string, to: string): Promise<ActivityItem[]> {
  const res = await http.get("/report/activity", { params: { from, to } }) as unknown[]
  return res.map(mapActivityItem)
}

export async function getDeadStock(daysThreshold = 90): Promise<DeadStockItem[]> {
  const res = await http.get("/report/dead-stock", { params: { daysThreshold } }) as unknown[]
  return res.map(mapDeadStockItem)
}
