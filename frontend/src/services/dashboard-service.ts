import http from "@/utils/http-client"
import type { DashboardStats } from "@/utils/types"
import { mapDashboardStats } from "@/utils/mappers"

export async function getDashboardStats(): Promise<DashboardStats> {
  const res = await http.get("/dashboard/stats")
  return mapDashboardStats(res)
}
