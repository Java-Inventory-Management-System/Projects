import http from "@/utils/http-client"
import type { LocationMapData, LocationResponse } from "@/utils/types"
import { mapResponsePage, mapLocation } from "@/utils/mappers"

export async function getLocations(): Promise<LocationResponse[]> {
  const res = await http.get("/location", { params: { size: 200 } })
  return mapResponsePage(res, mapLocation).content
}

export async function getLocation(id: number): Promise<LocationResponse> {
  const res = await http.get(`/location/${id}`)
  return mapLocation(res)
}

export async function searchLocations(keyword: string): Promise<LocationResponse[]> {
  const res = await http.get("/location/search", { params: { keyword, size: 200 } })
  return mapResponsePage(res, mapLocation).content
}

export async function createLocation(data: { zoneCode: string; shelfCode: string; binCode: string; description?: string; maxCapacity?: number | null }): Promise<LocationResponse> {
  const res = await http.post("/location", data)
  return mapLocation(res)
}

export async function updateLocation(id: number, data: { zoneCode: string; shelfCode: string; binCode: string; description?: string; maxCapacity?: number | null }): Promise<LocationResponse> {
  const res = await http.put(`/location/${id}`, data)
  return mapLocation(res)
}

export async function getLocationMap(): Promise<LocationMapData> {
  const res = await http.get("/location/map")
  return res as unknown as LocationMapData
}

export async function toggleLocation(id: number): Promise<LocationResponse> {
  const res = await http.put(`/location/${id}/toggle-active`)
  return mapLocation(res)
}

export async function deleteLocation(id: number): Promise<void> {
  await http.delete(`/location/${id}`)
}
