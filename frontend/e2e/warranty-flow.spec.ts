import { test, expect } from "@playwright/test"
import { loginAsStock, loginAsManager } from "./helpers/auth"
import { initTokens, getToken } from "./helpers/api"

test.describe("Warranty Flow (Bảo hành) — SOP §6", () => {
  const API = "http://localhost:8888/api/v1"

  test("STOCK creates warranty request → resolves as REPLACE → verifies completion", async ({ browser }) => {
    const stockCtx = await browser.newContext()
    const mgrCtx = await browser.newContext()
    const stock = await stockCtx.newPage()
    const mgr = await mgrCtx.newPage()

    await loginAsStock(stock)
    await loginAsManager(mgr)
    await initTokens(stock)

    const stockToken = await getToken("stock", stock)
    const managerToken = await getToken("manager", mgr)

    // Setup: create import → export → unit is SOLD with warranty active
    const serial = `E2E-WRN-${Date.now()}`
    const impRes = await stock.request.post(`${API}/import-receipt`, {
      data: {
        supplierId: 1,
        note: "E2E warranty setup",
        items: [{ productId: 1, quantity: 1, unitPrice: 10000000, warrantyMonths: 24, serialNumbers: [serial], locationId: 1 }],
      },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    const impData = (await impRes.json()).data
    const impId = impData.id
    const impItemId = impData.items[0].id

    await stock.request.put(`${API}/import-receipt/${impId}/confirm`, {
      data: { serials: [{ itemId: impItemId, serialNumbers: [serial], locationId: 1 }] },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    await stock.request.put(`${API}/import-receipt/${impId}/approve`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })

    const impDetail = await stock.request.get(`${API}/import-receipt/${impId}`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    const unitIds: number[] = (await impDetail.json()).data.items.flatMap((i: any) => i.productUnitIds ?? [])
    test.skip(unitIds.length === 0, "No units created")

    // Create and approve export
    const expRes = await stock.request.post(`${API}/export-receipt`, {
      data: { reason: "SALE", customerId: 1, note: "E2E warranty setup", items: [{ productId: 1, quantity: 1, unitPrice: 15000000 }], productUnitIds: [unitIds[0]] },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    const expId: number = (await expRes.json()).data.id
    await stock.request.put(`${API}/export-receipt/${expId}/approve`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })

    // ── Step 1: Create warranty request via API ──
    const wrRes = await stock.request.post(`${API}/warranty-request`, {
      data: { serialNumber: serial, customerId: 1, issueDescription: "E2E test: no power", note: "Customer walk-in" },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(wrRes.ok()).toBeTruthy()
    const wrId: number = (await wrRes.json()).data.id

    // ── Step 2: Resolve as REPLACE ──
    const resolveRes = await stock.request.put(`${API}/warranty-request/${wrId}/resolve`, {
      data: { resolutionType: "REPLACE", rmaNumber: `RMA-E2E-${Date.now()}` },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(resolveRes.ok()).toBeTruthy()

    // ── Step 3: Complete ──
    const completeRes = await stock.request.put(`${API}/warranty-request/${wrId}/complete`, {
      data: { result: "REPLACED", note: "E2E test: replaced unit" },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(completeRes.ok()).toBeTruthy()

    // ── Step 4: Verify RESOLVED ──
    const wrDetail = await stock.request.get(`${API}/warranty-request/${wrId}`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    const wrData = (await wrDetail.json()) as { data: { status: string; result: string } }
    expect(wrData.data.status).toBe("RESOLVED")
    expect(wrData.data.result).toBe("REPLACED")

    await stockCtx.close()
    await mgrCtx.close()
  })
})
