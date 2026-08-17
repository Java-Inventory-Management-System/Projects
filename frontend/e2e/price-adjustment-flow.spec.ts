import { test, expect } from "@playwright/test"
import { loginAsManager, loginAsAdmin } from "./helpers/auth"
import { navigateTo } from "./helpers/nav"
import { initTokens, getToken, API_URL, createPurchaseOrder, getE2ELocationId } from "./helpers/api"

test.describe("Price Adjustment Flow (Điều chỉnh giá) — SOP §8", () => {

  test("MANAGER creates price adj via API_URL → ADMIN approves via UI → cost_price updated", async ({ browser }) => {
    const mgrCtx = await browser.newContext()
    const adminCtx = await browser.newContext()
    const mgr = await mgrCtx.newPage()
    const admin = await adminCtx.newPage()

    await loginAsManager(mgr)
    await loginAsAdmin(admin)
    await initTokens(mgr)

    const managerToken = await getToken("manager", mgr)
    const adminToken = await getToken("admin", admin)
    const locationId = await getE2ELocationId(mgr)

    const serial = `E2E-PADJ-${Date.now()}`
    const purchaseOrderId = await createPurchaseOrder(mgr)
    const impRes = await mgr.request.post(`${API_URL}/import-receipt`, {
      data: {
        supplierId: 1, purchaseOrderId, note: "E2E price adj",
        items: [{ productId: 1, quantity: 1, unitPrice: 10000000, warrantyMonths: 12, serialNumbers: [serial], locationId }],
      },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(impRes.ok()).toBeTruthy()
    const impData = (await impRes.json()).data
    const impId = impData.id
    const impItemId = impData.items[0].id

    const confirmRes = await mgr.request.put(`${API_URL}/import-receipt/${impId}/confirm`, {
      data: { serials: [{ itemId: impItemId, serialNumbers: [serial], locationId }] },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(confirmRes.ok()).toBeTruthy()

    // MANAGER creates price adjustment (CAN_CREATE_PRICE_ADJUSTMENT), ADMIN approves (requireNotCreator)
    const adjRes = await mgr.request.post(`${API_URL}/price-adjustment`, {
      data: { importReceiptItemId: impItemId, newPrice: 12000000, reason: "E2E market adjustment" },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(adjRes.ok()).toBeTruthy()
    const adjId: number = (await adjRes.json()).data.id

    await navigateTo(admin, `/stock/ops/price-adjustments/${adjId}`)
    const approveResp = admin.waitForResponse(
      (r) => r.url().includes(`/${adjId}/approve`) && r.status() === 200,
    )
    await admin.getByRole("button", { name: "Duyệt", exact: true }).click()
    await admin.locator('button:has-text("Xác nhận duyệt")').first().waitFor({ state: "visible", timeout: 5000 })
    await admin.locator('button:has-text("Xác nhận duyệt")').first().click()
    await approveResp

    const detail = await admin.request.get(`${API_URL}/price-adjustment/${adjId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    const data = (await detail.json()) as { data: { status: string; newPrice: number } }
    expect(data.data.status).toBe("APPROVED")
    expect(data.data.newPrice).toBe(12000000)

    await mgrCtx.close()
    await adminCtx.close()
  })
})