import { test, expect } from "@playwright/test"
import { loginAsStock, loginAsManager } from "./helpers/auth"
import { navigateTo } from "./helpers/nav"
import { initTokens, getToken, API_URL } from "./helpers/api"

test.describe("Stock Check Flow (Kiểm kê) — SOP §4", () => {

  test("STOCK creates+records+completes stock check → MANAGER sees COMPLETED", async ({ browser }) => {
    const mgrCtx = await browser.newContext()
    const stockCtx = await browser.newContext()
    const mgr = await mgrCtx.newPage()
    const stock = await stockCtx.newPage()

    await loginAsManager(mgr)
    await loginAsStock(stock)
    await initTokens(stock)

    const managerToken = await getToken("manager", mgr)
    const stockToken = await getToken("stock", stock)

    // STOCK creates stock check scoped to ZONE (location 1)
    const createRes = await stock.request.post(`${API_URL}/stock-check`, {
      data: { scopeType: "ZONE", scopeId: 1, note: "E2E stock check" },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(createRes.ok()).toBeTruthy()
    const checkId: number = (await createRes.json()).data.id

    // STOCK starts (snapshots units in scope)
    const startRes = await stock.request.put(`${API_URL}/stock-check/${checkId}/start`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(startRes.ok()).toBeTruthy()

    // Fetch snapshotted items
    const detail = await stock.request.get(`${API_URL}/stock-check/${checkId}`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    const items = ((await detail.json()) as { data: { items: Array<{ productUnitId: number; expectedStatus: string }> } }).data.items
    expect(items.length).toBeGreaterThan(0)

    // STOCK records all items as matching (IN_STOCK, qty 1)
    const recordRes = await stock.request.put(`${API_URL}/stock-check/${checkId}/items`, {
      data: {
        items: items.map((it) => ({
          productUnitId: it.productUnitId,
          actualStatus: it.expectedStatus || "IN_STOCK",
          countedQuantity: 1,
          note: "E2E ok",
        })),
      },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(recordRes.ok()).toBeTruthy()

    // STOCK completes
    const completeRes = await stock.request.put(`${API_URL}/stock-check/${checkId}/complete`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(completeRes.ok()).toBeTruthy()

    // MANAGER views detail via UI
    await navigateTo(mgr, `/stock/ops/checks/${checkId}`)
    await expect(mgr.locator("body")).toContainText("Hoàn tất", { timeout: 10000 })

    // Verify COMPLETED via API
    const verify = await mgr.request.get(`${API_URL}/stock-check/${checkId}`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(((await verify.json()) as { data: { status: string } }).data.status).toBe("COMPLETED")

    await mgrCtx.close()
    await stockCtx.close()
  })
})