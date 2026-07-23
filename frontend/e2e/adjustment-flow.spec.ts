import { test, expect } from "@playwright/test"
import { loginAsStock, loginAsManager } from "./helpers/auth"
import { navigateTo } from "./helpers/nav"
import { initTokens, getToken, ensureImport } from "./helpers/api"
import { approveDialog } from "./helpers/approve"

test.describe("Stock Adjustment Flow (Điều chỉnh tồn) — SOP §5", () => {
  const API = "http://localhost:8888/api/v1"

  test("STOCK creates adjustment via API → MANAGER approves via UI", async ({ browser }) => {
    const stockCtx = await browser.newContext()
    const mgrCtx = await browser.newContext()
    const stock = await stockCtx.newPage()
    const mgr = await mgrCtx.newPage()

    await loginAsStock(stock)
    await loginAsManager(mgr)
    await initTokens(stock)

    const stockToken = await getToken("stock", stock)
    const managerToken = await getToken("manager", mgr)

    const { productUnitIds } = await ensureImport(stock)
    test.skip(productUnitIds.length === 0, "No product units")

    // STOCK creates adjustment via API
    const createRes = await stock.request.post(`${API}/stock-adjustment`, {
      data: { type: "DAMAGED", productUnitId: productUnitIds[0], reason: "E2E test: damaged" },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(createRes.ok()).toBeTruthy()
    const adjId: number = (await createRes.json()).data.id

    // MANAGER approves via UI detail page
    await navigateTo(mgr, `/stock/adjustments/${adjId}`)
    await approveDialog(mgr, adjId)

    // Verify APPROVED
    const detail = await mgr.request.get(`${API}/stock-adjustment/${adjId}`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(((await detail.json()) as { data: { status: string } }).data.status).toBe("APPROVED")

    await stockCtx.close()
    await mgrCtx.close()
  })
})
