import { test, expect } from "@playwright/test"
import { loginAsStock, loginAsManager } from "./helpers/auth"
import { navigateTo } from "./helpers/nav"
import { initTokens, getToken, API_URL, createPurchaseOrder } from "./helpers/api"
import { cleanupProduct1 } from "./helpers/cleanup"

test.describe("Multi-Role Cross-Flow (Liên kết nghiệp vụ)", () => {

  test.beforeAll(() => cleanupProduct1())

  test("STOCK import → STOCK export → MANAGER approves both → verify inventory", async ({ browser }) => {
    const stockCtx = await browser.newContext()
    const mgrCtx = await browser.newContext()
    const stock = await stockCtx.newPage()
    const mgr = await mgrCtx.newPage()

    await loginAsStock(stock)
    await loginAsManager(mgr)
    await initTokens(stock)

    const stockToken = await getToken("stock", stock)
    const managerToken = await getToken("manager", mgr)

    const serial = `E2E-MRF-${Date.now()}`
    const purchaseOrderId = await createPurchaseOrder(stock)

    // ── Flow 1: Import ──
    // STOCK creates
    const impRes = await stock.request.post(`${API_URL}/import-receipt`, {
      data: {
        supplierId: 1,
        purchaseOrderId,
        note: "Multi-role import",
        items: [{ productId: 1, quantity: 2, unitPrice: 10000000, warrantyMonths: 12, serialNumbers: [`${serial}-1`, `${serial}-2`], locationId: 1 }],
      },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    const impData = (await impRes.json()).data
    const impId = impData.id
    const impItemId = impData.items[0].id

    // STOCK confirms
    const confirmRes = await stock.request.put(`${API_URL}/import-receipt/${impId}/confirm`, {
      data: { serials: [{ itemId: impItemId, serialNumbers: [`${serial}-1`, `${serial}-2`], locationId: 1 }] },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(confirmRes.ok()).toBeTruthy()

    // Verify import RECEIVED (no approval step)
    const impVerify = await mgr.request.get(`${API_URL}/import-receipt/${impId}`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(((await impVerify.json()) as { data: { status: string } }).data.status).toBe("RECEIVED")

    // Get product unit IDs via dedicated endpoint
    const unitsRes = await mgr.request.get(`${API_URL}/import-receipt/${impId}/units`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    const units = (await unitsRes.json()) as { data: Array<{ id: number }> }
    const unitIds = units.data.map((u) => u.id)
    expect(unitIds.length).toBe(2)

    // ── Flow 2: Export ──
    // STOCK creates export
    const expRes = await stock.request.post(`${API_URL}/export-receipt`, {
      data: {
        reason: "SALE",
        customerId: 1,
        note: "Multi-role export",
        items: [{ productId: 1, quantity: 1, unitPrice: 15000000, productUnitIds: [unitIds[0]] }],
      },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(expRes.ok()).toBeTruthy()
    const expData = (await expRes.json()).data
    const expId: number = expData.id

    // MANAGER fulfills export via API
    const expFulfillRes = await stock.request.put(`${API_URL}/export-receipt/${expId}/fulfill`, {
      data: { items: [{ itemId: expData.items[0].id, serialNumbers: [`${serial}-1`], actualQuantity: 1 }] },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(expFulfillRes.ok()).toBeTruthy()

    // Verify export COMPLETED
    const expVerify = await mgr.request.get(`${API_URL}/export-receipt/${expId}`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(((await expVerify.json()) as { data: { status: string } }).data.status).toBe("COMPLETED")

    // ── Flow 3: Verify inventory ──
    // First unit fulfilled → EXPORTED, second unit remains IN_STOCK
    const s0 = ((await (await stock.request.get(`${API_URL}/product-unit/${unitIds[0]}`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })).json()) as { data: { status: string } }).data.status
    const s1 = ((await (await stock.request.get(`${API_URL}/product-unit/${unitIds[1]}`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })).json()) as { data: { status: string } }).data.status
    expect(s0).toBe("EXPORTED")
    expect(s1).toBe("IN_STOCK")

    await stockCtx.close()
    await mgrCtx.close()
  })
})
