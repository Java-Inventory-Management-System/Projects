import http from "@/utils/http-client"
import type { InventorySummary, CategoryStock, LowStockItem, StockValueItem, ActivityItem, DeadStockItem, ResponsePage } from "@/utils/types"
import { mapCategoryStock, mapStockValueItem, mapActivityItem, mapDeadStockItem, mapResponsePage } from "@/utils/mappers"

export async function getInventorySummary(): Promise<InventorySummary> {
  const res = await http.get("/report/inventory-summary")
  return res as unknown as InventorySummary
}

export async function getInventoryByCategory(): Promise<CategoryStock[]> {
  const res = await http.get("/report/inventory-by-category")
  return (res as []).map(mapCategoryStock)
}

export async function getLowStock(page = 0, size = 20): Promise<ResponsePage<LowStockItem>> {
  const res = await http.get("/report/low-stock", { params: { page, size } })
  return mapResponsePage(res, (item) => item as unknown as LowStockItem)
}

export async function getStockValue(): Promise<StockValueItem[]> {
  const res = await http.get("/report/stock-value")
  return (res as []).map(mapStockValueItem)
}

export async function getActivity(from: string, to: string): Promise<ActivityItem[]> {
  const res = await http.get("/report/activity", { params: { from, to } })
  return (res as []).map(mapActivityItem)
}

export async function getDeadStock(daysThreshold = 90): Promise<DeadStockItem[]> {
  const res = await http.get("/report/dead-stock", { params: { daysThreshold } })
  return (res as []).map(mapDeadStockItem)
}
