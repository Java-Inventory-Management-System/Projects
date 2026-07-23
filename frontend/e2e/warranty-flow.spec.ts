import { test, expect } from "@playwright/test"
import { loginAsStock, loginAsManager } from "./helpers/auth"
import { initTokens, getToken } from "./helpers/api"
import { cleanupProduct1 } from "./helpers/cleanup"

test.describe("Warranty Flow (Bảo hành) — SOP §6", () => {
  const API = "http://localhost:8888/api/v1"

  test.beforeAll(() => cleanupProduct1())

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

    // Setup: import 2 units → export 1 (SOLD for warranty) → keep 1 IN_STOCK (for replacement)
    const serial = `E2E-WRN-${Date.now()}`
    const impRes = await stock.request.post(`${API}/import-receipt`, {
      data: {
        supplierId: 1,
        note: "E2E warranty setup",
        items: [{ productId: 1, quantity: 2, unitPrice: 10000000, warrantyMonths: 24, serialNumbers: [`${serial}-A`, `${serial}-B`], locationId: 1 }],
      },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    const impData = (await impRes.json()).data
    const impId = impData.id
    const impItemId = impData.items[0].id

    const confirmRes = await stock.request.put(`${API}/import-receipt/${impId}/confirm`, {
      data: { serials: [{ itemId: impItemId, serialNumbers: [`${serial}-A`, `${serial}-B`], locationId: 1 }] },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(confirmRes.ok()).toBeTruthy()
    const impApproveRes = await stock.request.put(`${API}/import-receipt/${impId}/approve`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(impApproveRes.ok()).toBeTruthy()

    const unitsRes = await stock.request.get(`${API}/import-receipt/${impId}/units`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    const unitIds: number[] = (await unitsRes.json()).data.map((u: any) => u.id)
    test.skip(unitIds.length < 2, "Need at least 2 units")

    // Export only 1 unit → unitIds[0] becomes SOLD, unitIds[1] stays IN_STOCK for replacement
    const expRes = await stock.request.post(`${API}/export-receipt`, {
      data: { reason: "SALE", customerId: 1, note: "E2E warranty setup", items: [{ productId: 1, quantity: 1, unitPrice: 15000000 }] },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(expRes.ok()).toBeTruthy()
    const expId: number = (await expRes.json()).data.id
    const expApproveRes = await stock.request.put(`${API}/export-receipt/${expId}/approve`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(expApproveRes.ok()).toBeTruthy()

    // ── Step 1: Create warranty request via API ──
    const wrRes = await stock.request.post(`${API}/warranty-request`, {
      data: { serialNumber: `${serial}-A`, customerId: 1, issueDescription: "E2E test: no power", note: "Customer walk-in" },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(wrRes.ok()).toBeTruthy()
    const wrId: number = (await wrRes.json()).data.id

    // ── Step 2: Resolve as REPLACE (replace with the IN_STOCK unit) ──
    // REPLACE resolve also completes the warranty; no separate complete step.
    const resolveRes = await stock.request.put(`${API}/warranty-request/${wrId}/resolve`, {
      data: { resolutionType: "REPLACE", replacementUnitId: unitIds[1], rmaNumber: `RMA-E2E-${Date.now()}` },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(resolveRes.ok()).toBeTruthy()

    // ── Step 3: Verify COMPLETED with REPLACE resolution ──
    const wrDetail = await stock.request.get(`${API}/warranty-request/${wrId}`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    const wrData = (await wrDetail.json()) as { data: { status: string; resolutionType: string } }
    expect(wrData.data.status).toBe("COMPLETED")
    expect(wrData.data.resolutionType).toBe("REPLACE")

    await stockCtx.close()
    await mgrCtx.close()
  })
})
