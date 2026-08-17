import axios from "axios"
import type { AxiosInstance } from "axios"

const API_BASE = process.env.VITE_BACKEND_URL ?? "http://backend:8888/api/v1"

const auth = axios.create({ baseURL: API_BASE })

async function rawLogin(username: string, password: string) {
  const res = await auth.post("/auth/login", { username, password })
  return res.data.data.accessToken as string
}

let adminToken: string
let managerToken: string
let salesToken: string
let stockToken: string

export async function loginAsAdmin() {
  if (!adminToken) adminToken = await rawLogin("admin", "123456")
  api.defaults.headers.common["Authorization"] = `Bearer ${adminToken}`
}

export async function loginAsManager() {
  if (!managerToken) managerToken = await rawLogin("manager", "123456")
  api.defaults.headers.common["Authorization"] = `Bearer ${managerToken}`
}

export async function loginAsSales() {
  if (!salesToken) salesToken = await rawLogin("sales", "123456")
  api.defaults.headers.common["Authorization"] = `Bearer ${salesToken}`
}

export async function loginAsStock() {
  if (!stockToken) stockToken = await rawLogin("stock", "123456")
  api.defaults.headers.common["Authorization"] = `Bearer ${stockToken}`
}

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

export function serializeBody(body: Record<string, unknown>) {
  return JSON.parse(JSON.stringify(body))
}

export async function cancelOpenStockChecks() {
  await loginAsManager()
  const res = await api.get("/stock-check/my", { params: { page: 0, size: 100 } })
  for (const c of res.data.data.content ?? []) {
    if (!["COMPLETED", "CANCELLED", "APPROVED"].includes(c.status)) {
      try {
        await api.put(`/stock-check/${c.id}/cancel`)
      } catch {
        // ignore — may already be cancelled
      }
    }
  }
}

export function randomSerial(prefix = "SN") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
}

export interface StockInfo {
  importReceiptId: number
  serialNumbers: string[]
}

export async function createPurchaseOrder(quantity = 2) {
  await loginAsManager()
  const res = await api.post("/purchase-order", {
    supplierId: 1,
    expectedDate: "2026-12-31",
    note: "Test PO",
    items: [{ productId: 1, quantity, unitPrice: 10000000 }],
  })
  const id = res.data.data.id as number
  const serials = Array.from({ length: quantity }, () => randomSerial("PO"))
  await api.put(`/purchase-order/${id}`, {
    items: [{ productId: 1, quantity, unitPrice: 10000000, serials }],
  })
  return id
}

export async function ensureImport(productId = 1, quantity = 2, extra?: Record<string, unknown>): Promise<StockInfo> {
  const serials = Array.from({ length: quantity }, () => randomSerial("SN"))

  await loginAsManager()
  const purchaseOrderId = await createPurchaseOrder()
  await api.put(`/purchase-order/${purchaseOrderId}/open`)
  const createRes = await api.post("/import-receipt", {
    supplierId: 1,
    purchaseOrderId,
    note: "Test import",
    items: [{ productId, quantity, unitPrice: 10000000, warrantyMonths: 12, serialNumbers: serials, locationId: 35, ...extra }],
  })
  const id: number = createRes.data.data.id
  const createdItems = createRes.data.data.items as Array<{ id: number }>

  await api.put(`/import-receipt/${id}/confirm`, {
    serials: createdItems.map((item) => ({
      itemId: item.id,
      serialNumbers: serials,
      locationId: 35,
    })),
  })

  return { importReceiptId: id, serialNumbers: serials }
}
