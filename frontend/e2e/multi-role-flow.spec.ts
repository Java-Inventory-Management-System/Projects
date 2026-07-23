import { test, expect } from "@playwright/test"
import { loginAsStock, loginAsManager } from "./helpers/auth"
import { navigateTo } from "./helpers/nav"
import { initTokens, getToken } from "./helpers/api"

test.describe("Multi-Role Cross-Flow (Liên kết nghiệp vụ)", () => {
  const API = "http://localhost:8888/api/v1"

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

    // ── Flow 1: Import ──
    // STOCK creates
    const impRes = await stock.request.post(`${API}/import-receipt`, {
      data: {
        supplierId: 1,
        note: "Multi-role import",
        items: [{ productId: 1, quantity: 2, unitPrice: 10000000, warrantyMonths: 12, serialNumbers: [`${serial}-1`, `${serial}-2`], locationId: 1 }],
      },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    const impData = (await impRes.json()).data
    const impId = impData.id
    const impItemId = impData.items[0].id

    // STOCK confirms
    await stock.request.put(`${API}/import-receipt/${impId}/confirm`, {
      data: { serials: [{ itemId: impItemId, serialNumbers: [`${serial}-1`, `${serial}-2`], locationId: 1 }] },
      headers: { Authorization: `Bearer ${stockToken}` },
    })

    // MANAGER approves import via detail page
    await navigateTo(mgr, `/stock/imports/${impId}`)
    await mgr.waitForTimeout(1000)

    const impApproveBtn = mgr.locator('button:has-text("Duyệt")')
    await expect(impApproveBtn).toBeVisible({ timeout: 10000 })
    await impApproveBtn.click()
    await mgr.waitForTimeout(1500)

    // Verify import COMPLETED
    const impVerify = await mgr.request.get(`${API}/import-receipt/${impId}`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(((await impVerify.json()) as { data: { status: string } }).data.status).toBe("COMPLETED")

    // Get product unit IDs
    const impDetail = (await impVerify.json()) as { data: { items: Array<{ productUnitIds?: number[] }> } }
    const unitIds = impDetail.data.items.flatMap((i) => i.productUnitIds ?? [])
    expect(unitIds.length).toBe(2)

    // ── Flow 2: Export ──
    // STOCK creates export
    const expRes = await stock.request.post(`${API}/export-receipt`, {
      data: {
        reason: "SALE",
        customerId: 1,
        note: "Multi-role export",
        items: [{ productId: 1, quantity: 1, unitPrice: 15000000 }],
        productUnitIds: [unitIds[0]],
      },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    const expId: number = (await expRes.json()).data.id

    // MANAGER approves export via detail page
    await navigateTo(mgr, `/stock/exports/${expId}`)
    await mgr.waitForTimeout(1000)

    const expApproveBtn = mgr.locator('button:has-text("Duyệt")')
    await expect(expApproveBtn).toBeVisible({ timeout: 10000 })
    await expApproveBtn.click()
    await mgr.waitForTimeout(1500)

    // Verify export COMPLETED
    const expVerify = await mgr.request.get(`${API}/export-receipt/${expId}`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(((await expVerify.json()) as { data: { status: string } }).data.status).toBe("COMPLETED")

    // ── Flow 3: Verify inventory ──
    // The exported unit is now SOLD, remaining unit is IN_STOCK
    const unitRes = await stock.request.get(`${API}/product-unit/${unitIds[0]}`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    const unit1 = (await unitRes.json()) as { data: { status: string } }
    expect(unit1.data.status).toBe("SOLD")

    const unitRes2 = await stock.request.get(`${API}/product-unit/${unitIds[1]}`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    const unit2 = (await unitRes2.json()) as { data: { status: string } }
    expect(unit2.data.status).toBe("IN_STOCK")

    await stockCtx.close()
    await mgrCtx.close()
  })
})
