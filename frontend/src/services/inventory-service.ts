import http from "@/utils/http-client"
import type { InventoryItem, ResponsePage } from "@/utils/types"
import { mapResponsePage } from "@/utils/mappers"

export async function getInventory(
  page = 0,
  size = 20,
  search?: string,
): Promise<ResponsePage<InventoryItem>> {
  const params: Record<string, string | number> = { page, size }
  if (search) params.search = search
  const res = await http.get("/inventory", { params })
  return mapResponsePage(res, (item) => item as unknown as InventoryItem)
}
