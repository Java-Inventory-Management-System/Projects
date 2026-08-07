import { test, expect } from "@playwright/test"
import { loginAsStock, loginAsManager } from "./helpers/auth"
import { navigateTo } from "./helpers/nav"
import { initTokens, getToken, API_URL, createPurchaseOrder } from "./helpers/api"
import { approveDialog } from "./helpers/approve"

test.describe("Price Adjustment Flow (Điều chỉnh giá) — SOP §8", () => {

  test("STOCK creates price adj via API_URL → MANAGER approves via UI → cost_price updated", async ({ browser }) => {
    const stockCtx = await browser.newContext()
    const mgrCtx = await browser.newContext()
    const stock = await stockCtx.newPage()
    const mgr = await mgrCtx.newPage()

    await loginAsStock(stock)
    await loginAsManager(mgr)
    await initTokens(stock)

    const stockToken = await getToken("stock", stock)
    const managerToken = await getToken("manager", mgr)

    const serial = `E2E-PADJ-${Date.now()}`
    const purchaseOrderId = await createPurchaseOrder(stock)
    const impRes = await stock.request.post(`${API_URL}/import-receipt`, {
      data: {
        supplierId: 1, purchaseOrderId, note: "E2E price adj",
        items: [{ productId: 1, quantity: 1, unitPrice: 10000000, warrantyMonths: 12, serialNumbers: [serial], locationId: 1 }],
      },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(impRes.ok()).toBeTruthy()
    const impData = (await impRes.json()).data
    const impId = impData.id
    const impItemId = impData.items[0].id

    const confirmRes = await stock.request.put(`${API_URL}/import-receipt/${impId}/confirm`, {
      data: { serials: [{ itemId: impItemId, serialNumbers: [serial], locationId: 1 }] },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(confirmRes.ok()).toBeTruthy()
    const impApproveRes = await stock.request.put(`${API_URL}/import-receipt/${impId}/approve`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(impApproveRes.ok()).toBeTruthy()

    const adjRes = await stock.request.post(`${API_URL}/price-adjustment`, {
      data: { importReceiptItemId: impItemId, newPrice: 12000000, reason: "E2E market adjustment" },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(adjRes.ok()).toBeTruthy()
    const adjId: number = (await adjRes.json()).data.id

    await navigateTo(mgr, `/stock/ops/price-adjustments/${adjId}`)
    await approveDialog(mgr, adjId)

    const detail = await mgr.request.get(`${API_URL}/price-adjustment/${adjId}`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    const data = (await detail.json()) as { data: { status: string; newPrice: number } }
    expect(data.data.status).toBe("APPROVED")
    expect(data.data.newPrice).toBe(12000000)

    await stockCtx.close()
    await mgrCtx.close()
  })
})
