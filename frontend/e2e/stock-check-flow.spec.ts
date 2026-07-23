import { test, expect } from "@playwright/test"
import { loginAsStock, loginAsManager } from "./helpers/auth"
import { navigateTo } from "./helpers/nav"
import { initTokens, getToken, ensureImport } from "./helpers/api"
import { approveDialog } from "./helpers/approve"

test.describe("Stock Check Flow (Kiểm kê) — SOP §4", () => {
  const API = "http://localhost:8888/api/v1"

  test("MANAGER creates stock check → STOCK records → MANAGER approves", async ({ browser }) => {
    const mgrCtx = await browser.newContext()
    const stockCtx = await browser.newContext()
    const mgr = await mgrCtx.newPage()
    const stock = await stockCtx.newPage()

    await loginAsManager(mgr)
    await loginAsStock(stock)
    await initTokens(stock)

    const managerToken = await getToken("manager", mgr)
    const stockToken = await getToken("stock", stock)

    const { productUnitIds } = await ensureImport(stock)
    test.skip(productUnitIds.length === 0, "No product units")

    // STOCK creates stock check via API (creator ≠ approver)
    const createRes = await stock.request.post(`${API}/stock-check`, {
      data: { note: "E2E stock check", productUnitIds },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(createRes.ok()).toBeTruthy()
    const checkId: number = (await createRes.json()).data.id

    // STOCK records count via API (UI form complex)
    const recordRes = await stock.request.put(`${API}/stock-check/${checkId}/items`, {
      data: {
        items: productUnitIds.map((id) => ({
          productUnitId: id, actualStatus: "IN_STOCK", countedQuantity: 1, note: "E2E ok",
        })),
      },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(recordRes.ok()).toBeTruthy()

    // STOCK completes via API
    await stock.request.put(`${API}/stock-check/${checkId}/complete`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })

    // MANAGER approves via UI detail page
    await navigateTo(mgr, `/stock/checks/${checkId}`)
    await approveDialog(mgr, checkId, "Approve", "Confirm Approve")

    // Verify APPROVED
    const detail = await mgr.request.get(`${API}/stock-check/${checkId}`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(((await detail.json()) as { data: { status: string } }).data.status).toBe("APPROVED")

    await mgrCtx.close()
    await stockCtx.close()
  })
})
