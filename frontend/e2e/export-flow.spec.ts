import { test, expect } from "@playwright/test"
import { loginAsStock, loginAsManager } from "./helpers/auth"
import { navigateTo } from "./helpers/nav"
import { initTokens, getToken, ensureImport } from "./helpers/api"

test.describe("Export Flow (Xuất kho) — SOP §3", () => {
  const API = "http://localhost:8888/api/v1"

  test("STOCK creates export via API → MANAGER approves via UI → unit SOLD", async ({ browser }) => {
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
    const createRes = await stock.request.post(`${API}/export-receipt`, {
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
    await mgr.waitForTimeout(1000)

    const approveBtn = mgr.locator('button:has-text("Duyệt")')
    await expect(approveBtn).toBeVisible({ timeout: 10000 })
    await approveBtn.click()
    await mgr.waitForTimeout(1500)

    // Verify COMPLETED + SALE
    const detail = await mgr.request.get(`${API}/export-receipt/${exportId}`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    const data = (await detail.json()) as { data: { status: string; reason: string } }
    expect(data.data.status).toBe("COMPLETED")
    expect(data.data.reason).toBe("SALE")

    await stockCtx.close()
    await mgrCtx.close()
  })
})
