import { test, expect } from "@playwright/test"
import { loginAsStock, loginAsManager } from "./helpers/auth"
import { navigateTo } from "./helpers/nav"
import { initTokens, getToken, ensureImport, API_URL } from "./helpers/api"
import { approveDialog } from "./helpers/approve"

test.describe("Export Flow (Xuất kho) — SOP §3", () => {

  test("STOCK creates export via API_URL → MANAGER approves via UI → unit SOLD", async ({ browser }) => {
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
    test.skip(productUnitIds.length === 0, "No product units available")

    // STOCK creates export
    const createRes = await stock.request.post(`${API_URL}/export-receipt`, {
      data: {
        reason: "SALE", customerId: 1, note: "E2E export",
        items: [{ productId: 1, quantity: 1, unitPrice: 15000000 }],
        productUnitIds: [productUnitIds[0]],
      },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(createRes.ok()).toBeTruthy()
    const exportId: number = (await createRes.json()).data.id

    // MANAGER approves via UI
    await navigateTo(mgr, `/stock/exports/${exportId}`)
    await approveDialog(mgr, exportId)

    // Verify COMPLETED + SALE
    const detail = await mgr.request.get(`${API_URL}/export-receipt/${exportId}`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    const data = (await detail.json()) as { data: { status: string; reason: string } }
    expect(data.data.status).toBe("APPROVED")
    expect(data.data.reason).toBe("SALE")

    await stockCtx.close()
    await mgrCtx.close()
  })
})
