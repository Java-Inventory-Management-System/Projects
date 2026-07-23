import http from "@/utils/http-client"

export async function getCategoryZoneMap(): Promise<Record<number, string>> {
  const res = (await http.get("/category-zone/map")) as Record<number, string>
  return res
}
