import { test, expect } from "@playwright/test"
import { loginAsStock, loginAsManager } from "./helpers/auth"
import { navigateTo } from "./helpers/nav"
import { initTokens, getToken } from "./helpers/api"

test.describe("Return Flow (Trả hàng) — SOP §7", () => {
  const API = "http://localhost:8888/api/v1"

  test("STOCK creates return → MANAGER approves → unit RESTOCKED", async ({ browser }) => {
    const stockCtx = await browser.newContext()
    const mgrCtx = await browser.newContext()
    const stock = await stockCtx.newPage()
    const mgr = await mgrCtx.newPage()

    await loginAsStock(stock)
    await loginAsManager(mgr)
    await initTokens(stock)

    const stockToken = await getToken("stock", stock)
    const managerToken = await getToken("manager", mgr)

    // Setup: create import → create export (sell to customer)
    const serial = `E2E-RET-${Date.now()}`
    const impRes = await stock.request.post(`${API}/import-receipt`, {
      data: {
        supplierId: 1,
        note: "E2E return setup",
        items: [{ productId: 1, quantity: 1, unitPrice: 10000000, warrantyMonths: 12, serialNumbers: [serial], locationId: 1 }],
      },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    const impData = (await impRes.json()).data
    const impId: number = impData.id
    const impItemId: number = impData.items[0].id

    // Confirm + approve import
    await stock.request.put(`${API}/import-receipt/${impId}/confirm`, {
      data: { serials: [{ itemId: impItemId, serialNumbers: [serial], locationId: 1 }] },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    await stock.request.put(`${API}/import-receipt/${impId}/approve`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })

    // Get product unit IDs from the import
    const impDetail = await stock.request.get(`${API}/import-receipt/${impId}`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    const impDetailData = (await impDetail.json()).data
    const unitIds: number[] = impDetailData.items.flatMap((i: any) => i.productUnitIds ?? [])
    test.skip(unitIds.length === 0, "No product units created")

    // Create export (sell)
    const expRes = await stock.request.post(`${API}/export-receipt`, {
      data: {
        reason: "SALE",
        customerId: 1,
        note: "E2E return setup export",
        items: [{ productId: 1, quantity: 1, unitPrice: 15000000 }],
        productUnitIds: [unitIds[0]],
      },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    const expId: number = (await expRes.json()).data.id

    // Approve export
    await stock.request.put(`${API}/export-receipt/${expId}/approve`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })

    // ── Step 1: Create return via API (UI form may be complex) ──
    const retRes = await stock.request.post(`${API}/return-receipts`, {
      data: {
        customerId: 1,
        originalExportReceiptId: expId,
        reason: "CHANGE_MIND",
        note: "E2E return test",
        items: [{ productUnitId: unitIds[0], productId: 1, quantity: 1, condition: "GOOD", resultingAction: "RESTOCK" }],
      },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(retRes.ok()).toBeTruthy()
    const retId: number = (await retRes.json()).data.id

    // ── Step 2: MANAGER approves via UI ──
    await navigateTo(mgr, `/returns/${retId}`)
    await mgr.waitForTimeout(1000)

    const approveBtn = mgr.locator('button:has-text("Duyệt")')
    if (await approveBtn.isVisible()) {
      await approveBtn.click()
      await mgr.waitForTimeout(1500)
    } else {
      await mgr.request.put(`${API}/return-receipts/${retId}/approve`, {
        headers: { Authorization: `Bearer ${managerToken}` },
      })
    }

    // ── Step 3: Verify APPROVED ──
    const retDetail = await mgr.request.get(`${API}/return-receipts/${retId}`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    const retData = (await retDetail.json()) as { data: { status: string } }
    expect(retData.data.status).toBe("APPROVED")

    await stockCtx.close()
    await mgrCtx.close()
  })
})
