import http from "@/utils/http-client"
import type { SupplierResponse } from "@/utils/types"
import { mapResponsePage, mapSupplier } from "@/utils/mappers"

export async function getSuppliers(): Promise<SupplierResponse[]> {
  const res = await http.get("/supplier", { params: { size: 200 } })
  return mapResponsePage(res, mapSupplier).content
}

export async function createSupplier(data: {
  name: string
  contactPerson?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  taxCode?: string | null
  note?: string | null
}): Promise<SupplierResponse> {
  const res = await http.post("/supplier", data)
  return mapSupplier(res)
}

export async function updateSupplier(
  id: number,
  data: {
    name: string
    contactPerson?: string | null
    phone?: string | null
    email?: string | null
    address?: string | null
    taxCode?: string | null
    note?: string | null
  },
): Promise<SupplierResponse> {
  const res = await http.put(`/supplier/${id}`, data)
  return mapSupplier(res)
}

export async function toggleSupplierActive(id: number): Promise<void> {
  await http.put(`/supplier/${id}/toggle-active`)
}
