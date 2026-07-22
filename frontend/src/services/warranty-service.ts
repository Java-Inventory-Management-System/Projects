import http from "@/utils/http-client"
import type { ResponsePage, WarrantyRequest, WarrantyLookup } from "@/utils/types"
import { mapResponsePage, mapWarrantyRequest, mapWarrantyLookup } from "@/utils/mappers"

export async function lookupWarranty(serialNumber: string): Promise<WarrantyLookup> {
  const res = await http.get("/warranty-request/lookup", { params: { serialNumber } })
  return mapWarrantyLookup(res)
}

export async function getWarrantyRequests(
  page = 0,
  size = 20,
  status?: string,
  resolutionType?: string,
): Promise<ResponsePage<WarrantyRequest>> {
  const params: Record<string, string | number> = { page, size, sort: "createdAt,desc" }
  if (status) params.status = status
  if (resolutionType) params.resolutionType = resolutionType
  const res = await http.get("/warranty-request", { params })
  return mapResponsePage(res, mapWarrantyRequest)
}

export async function getWarrantyRequestById(id: number): Promise<WarrantyRequest> {
  const res = await http.get(`/warranty-request/${id}`)
  return mapWarrantyRequest(res)
}

export async function getMyHandledWarrantyRequests(page = 0, size = 20): Promise<ResponsePage<WarrantyRequest>> {
  const res = await http.get("/warranty-request/my-handled", { params: { page, size, sort: "createdAt,desc" } })
  return mapResponsePage(res, mapWarrantyRequest)
}

export async function createWarrantyRequest(data: {
  serialNumber: string
  customerId: number
  issueDescription: string
  note?: string
  allowExpired?: boolean
}): Promise<WarrantyRequest> {
  const res = await http.post("/warranty-request", data)
  return mapWarrantyRequest(res)
}

export async function resolveWarrantyRequest(
  id: number,
  data: {
    resolutionType: string
    replacementUnitId?: number
    rmaNumber?: string
    expectedReturnAt?: string
    partnerNote?: string
    note?: string
  },
): Promise<WarrantyRequest> {
  const res = await http.put(`/warranty-request/${id}/resolve`, data)
  return mapWarrantyRequest(res)
}

export async function completeWarrantyRequest(
  id: number,
  data: { result: string; note?: string },
): Promise<WarrantyRequest> {
  const res = await http.put(`/warranty-request/${id}/complete`, data)
  return mapWarrantyRequest(res)
}

export async function cancelWarrantyRequest(id: number, data: { note: string }): Promise<WarrantyRequest> {
  const res = await http.put(`/warranty-request/${id}/cancel`, data)
  return mapWarrantyRequest(res)
}
