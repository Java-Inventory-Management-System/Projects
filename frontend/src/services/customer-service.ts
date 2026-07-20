import http from "@/utils/http-client"
import type { CustomerResponse, ResponsePage } from "@/utils/types"
import { mapResponsePage, mapCustomer } from "@/utils/mappers"

export async function getCustomers(page = 0, size = 20, search?: string): Promise<ResponsePage<CustomerResponse>> {
  const params: Record<string, string | number> = { page, size }
  if (search) params.keyword = search
  const res = await http.get("/customer", { params })
  return mapResponsePage(res, mapCustomer)
}

export async function getCustomerById(id: number): Promise<CustomerResponse> {
  const res = await http.get(`/customer/${id}`)
  return mapCustomer(res)
}

export async function createCustomer(data: {
  name: string
  phone?: string | null
  email?: string | null
  address?: string | null
  note?: string | null
}): Promise<CustomerResponse> {
  const res = await http.post("/customer", data)
  return mapCustomer(res)
}

export async function updateCustomer(id: number, data: {
  name: string
  phone?: string | null
  email?: string | null
  address?: string | null
  note?: string | null
}): Promise<CustomerResponse> {
  const res = await http.put(`/customer/${id}`, data)
  return mapCustomer(res)
}

export async function toggleCustomerActive(id: number): Promise<void> {
  await http.put(`/customer/${id}/toggle-active`)
}
