import { Page } from "@playwright/test"

export const API_URL = process.env.API_URL ?? "http://localhost:8888/api/v1"
const API = API_URL

let stockToken = ""
let managerToken = ""
let adminToken = ""
let salesToken = ""

export async function initTokens(page: Page) {
  const stockRes = await page.request.post(`${API}/auth/login`, {
    data: { username: "stock", password: "123456" },
  })
  stockToken = (await stockRes.json()).data.accessToken

  const mgrRes = await page.request.post(`${API}/auth/login`, {
    data: { username: "manager", password: "123456" },
  })
  managerToken = (await mgrRes.json()).data.accessToken
}

function randomSerial(prefix = "SN") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
}

export async function updatePurchaseOrder(
  page: Page,
  id: number,
  items: Array<{ productId: number; quantity: number; unitPrice: number; serials?: string[] }>,
): Promise<void> {
  if (!stockToken || !managerToken) await initTokens(page)
  const res = await page.request.put(`${API}/purchase-order/${id}`, {
    data: { items },
    headers: { Authorization: `Bearer ${managerToken}` },
  })
  if (!res.ok()) throw new Error(`PO update failed: ${await res.text()}`)
}

export async function createPurchaseOrder(page: Page): Promise<number> {
  if (!stockToken || !managerToken) await initTokens(page)
  const res = await page.request.post(`${API}/purchase-order`, {
    data: {
      supplierId: 1,
      expectedDate: "2026-12-31",
      note: "E2E setup PO",
      items: [{ productId: 1, quantity: 10, unitPrice: 10000000 }],
    },
    headers: { Authorization: `Bearer ${managerToken}` },
  })
  if (!res.ok()) throw new Error(`PO create failed: ${await res.text()}`)
  const id = (await res.json()).data.id as number
  await updatePurchaseOrder(page, id, [
    {
      productId: 1,
      quantity: 10,
      unitPrice: 10000000,
      serials: Array.from({ length: 10 }, () => randomSerial("PO")),
    },
  ])
  const openRes = await page.request.put(`${API}/purchase-order/${id}/open`, {
    headers: { Authorization: `Bearer ${managerToken}` },
  })
  if (!openRes.ok()) throw new Error(`PO open failed: ${await openRes.text()}`)
  return id
}

export async function ensureImport(page: Page): Promise<{ importReceiptId: number; productUnitIds: number[] }> {
  if (!stockToken || !managerToken) await initTokens(page)

  const serials = Array.from({ length: 2 }, () => randomSerial("SN"))
  const purchaseOrderId = await createPurchaseOrder(page)

  const createRes = await page.request.post(`${API}/import-receipt`, {
    data: {
      supplierId: 1,
      purchaseOrderId,
      note: "E2E setup import",
      items: [
        {
          productId: 1,
          quantity: 2,
          unitPrice: 10000000,
          warrantyMonths: 12,
          serialNumbers: serials,
          locationId: 1,
        },
      ],
    },
    headers: { Authorization: `Bearer ${stockToken}` },
  })
  const createData = (await createRes.json()).data
  const id: number = createData.id
  const createdItems = createData.items as Array<{ id: number }>

  await page.request.put(`${API}/import-receipt/${id}/confirm`, {
    data: {
      serials: createdItems.map((item) => ({
        itemId: item.id,
        serialNumbers: serials,
        locationId: 1,
      })),
    },
    headers: { Authorization: `Bearer ${stockToken}` },
  })

  const unitsRes = await page.request.get(`${API}/import-receipt/${id}/units`, {
    headers: { Authorization: `Bearer ${stockToken}` },
  })
  const productUnitIds: number[] = (await unitsRes.json()).data.map((u: any) => u.id)

  return { importReceiptId: id, productUnitIds }
}

export async function ensureExport(page: Page): Promise<number> {
  if (!stockToken || !managerToken) await initTokens(page)
  const { productUnitIds } = await ensureImport(page)

  const createRes = await page.request.post(`${API}/export-receipt`, {
    data: {
      reason: "SALE",
      customerId: 1,
      note: "E2E setup export",
      items: [
        {
          productId: 1,
          quantity: 1,
          unitPrice: 15000000,
        },
      ],
      productUnitIds: [productUnitIds[0]],
    },
    headers: { Authorization: `Bearer ${stockToken}` },
  })
  const id: number = (await createRes.json()).data.id

  await page.request.put(`${API}/export-receipt/${id}/approve`, {
    headers: { Authorization: `Bearer ${managerToken}` },
  })
  return id
}

export async function getToken(role: "stock" | "manager" | "admin" | "sales", page: Page): Promise<string> {
  const map = { stock: stockToken, manager: managerToken, admin: adminToken, sales: salesToken }
  if (!map[role]) {
    const res = await page.request.post(`${API}/auth/login`, {
      data: { username: role === "sales" ? "sales" : role, password: "123456" },
    })
    const token = (await res.json()).data.accessToken
    if (role === "stock") stockToken = token
    else if (role === "manager") managerToken = token
    else if (role === "admin") adminToken = token
    else salesToken = token
    return token
  }
  return map[role]
}
