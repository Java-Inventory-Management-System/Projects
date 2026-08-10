import http from "@/utils/http-client"
import type { Box, BoxableImport, BoxType, ResponsePage } from "@/utils/types"
import { mapResponsePage } from "@/utils/mappers"

export async function getBoxes(
  params?: { locationId?: number; status?: string; page?: number; size?: number },
): Promise<ResponsePage<Box>> {
  const res = await http.get("/box", { params: { page: params?.page ?? 0, size: params?.size ?? 50, ...params } })
  return mapResponsePage(res, (b) => b as unknown as Box)
}

export async function getBoxById(id: number): Promise<Box> {
  return (await http.get(`/box/${id}`)) as unknown as Box
}

export async function getBoxableImports(): Promise<BoxableImport[]> {
  return (await http.get("/import-receipt/boxable")) as unknown as BoxableImport[]
}

export async function sealBox(data: {
  unitIds: number[]
  items?: Array<{ unitId: number; quantity: number }>
  locationId: number
  note?: string
  boxType?: BoxType
}): Promise<Box> {
  return (await http.post("/box/seal", data)) as unknown as Box
}

export async function unsealBox(id: number): Promise<Box> {
  return (await http.post(`/box/${id}/unseal`)) as unknown as Box
}

export async function deleteBox(id: number): Promise<void> {
  await http.delete(`/box/${id}`)
}

export async function moveBox(id: number, locationId: number): Promise<Box> {
  return (await http.post(`/box/${id}/move`, { locationId })) as unknown as Box
}

export async function getBoxPrintHtml(id: number, lang: string): Promise<string> {
  return (await http.get(`/box/${id}/print`, { params: { lang }, responseType: "text" })) as string
}
