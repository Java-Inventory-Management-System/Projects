import { Page } from "@playwright/test"

const API = "http://localhost:8888/api/v1"

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

export async function ensureImport(page: Page): Promise<{ importReceiptId: number; productUnitIds: number[] }> {
  if (!stockToken || !managerToken) await initTokens(page)

  const serials = Array.from({ length: 2 }, () => randomSerial("SN"))

  const createRes = await page.request.post(`${API}/import-receipt`, {
    data: {
      supplierId: 1,
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

  await page.request.put(`${API}/import-receipt/${id}/approve`, {
    headers: { Authorization: `Bearer ${managerToken}` },
  })

  const detailRes = await page.request.get(`${API}/import-receipt/${id}`, {
    headers: { Authorization: `Bearer ${stockToken}` },
  })
  const detailData = (await detailRes.json()).data
  const productUnitIds: number[] = detailData.items.flatMap((i: any) => i.productUnitIds ?? [])

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
