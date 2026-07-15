import http from "@/utils/http-client"
import type { LocationResponse } from "@/utils/types"
import { mapResponsePage, mapLocation } from "@/utils/mappers"

export async function getLocations(): Promise<LocationResponse[]> {
  const res = await http.get("/location", { params: { size: 200 } })
  return mapResponsePage(res, mapLocation).content
}

export async function searchLocations(keyword: string): Promise<LocationResponse[]> {
  const res = await http.get("/location/search", { params: { keyword, size: 200 } })
  return mapResponsePage(res, mapLocation).content
}
