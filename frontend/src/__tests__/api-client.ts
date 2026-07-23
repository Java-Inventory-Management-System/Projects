import axios from "axios"
import type { AxiosInstance } from "axios"

const API_BASE = "http://localhost:8888/api/v1"

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const detail = err.response?.data ? JSON.stringify(err.response.data).slice(0, 500) : err.message
    console.error(`[API ERROR] ${err.response?.status || "?"} ${err.config?.url}`, detail)
    return Promise.reject(err)
  },
)

export function loginAsAdmin() {
  api.defaults.headers.common["Authorization"] = `Bearer ${process.env.TEST_TOKEN}`
  return Promise.resolve()
}

export function loginAsManager() {
  api.defaults.headers.common["Authorization"] = `Bearer ${process.env.TEST_MANAGER_TOKEN}`
  return Promise.resolve()
}

export function serializeBody(body: Record<string, unknown>) {
  return JSON.parse(JSON.stringify(body))
}

export function randomSerial(prefix = "SN") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
}

export interface StockInfo {
  importReceiptId: number
  stockProductUnitIds: number[]
}

export async function ensureImport(productId = 1, quantity = 2, extra?: Record<string, unknown>): Promise<StockInfo> {
  const prevToken = api.defaults.headers.common["Authorization"]
  const serials = Array.from({ length: quantity }, () => randomSerial("SN"))

  const createRes = await api.post("/import-receipt", {
    supplierId: 1,
    note: "Test import",
    items: [{ productId, quantity, unitPrice: 10000000, warrantyMonths: 12, serialNumbers: serials, locationId: 1, ...extra }],
  })
  const id: number = createRes.data.data.id
  const createdItems = createRes.data.data.items as Array<{ id: number }>

  await api.put(`/import-receipt/${id}/confirm`, {
    serials: createdItems.map((item) => ({
      itemId: item.id,
      serialNumbers: serials,
      locationId: 1,
    })),
  })

  loginAsManager()
  await api.put(`/import-receipt/${id}/approve`)
  api.defaults.headers.common["Authorization"] = prevToken

  return { importReceiptId: id, stockProductUnitIds: [] }
}
