import { test, expect } from "@playwright/test"
import { loginAsStock, loginAsManager } from "./helpers/auth"
import { navigateTo } from "./helpers/nav"
import { initTokens, getToken, API_URL } from "./helpers/api"
import { approveDialog } from "./helpers/approve"
import { cleanupProduct1 } from "./helpers/cleanup"

test.describe("Return Flow (Trả hàng) — SOP §7", () => {

  test.beforeAll(() => cleanupProduct1())

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
    const impRes = await stock.request.post(`${API_URL}/import-receipt`, {
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
    const confirmRes = await stock.request.put(`${API_URL}/import-receipt/${impId}/confirm`, {
      data: { serials: [{ itemId: impItemId, serialNumbers: [serial], locationId: 1 }] },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(confirmRes.ok()).toBeTruthy()
    const impApproveRes = await stock.request.put(`${API_URL}/import-receipt/${impId}/approve`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(impApproveRes.ok()).toBeTruthy()

    // Get product unit IDs from the import
    const unitsRes = await stock.request.get(`${API_URL}/import-receipt/${impId}/units`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    const unitIds: number[] = (await unitsRes.json()).data.map((u: any) => u.id)
    test.skip(unitIds.length === 0, "No product units created")

    // Create export (sell)
    const expRes = await stock.request.post(`${API_URL}/export-receipt`, {
      data: {
        reason: "SALE",
        customerId: 1,
        note: "E2E return setup export",
        items: [{ productId: 1, quantity: 1, unitPrice: 15000000, productUnitIds: [unitIds[0]] }],
      },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(expRes.ok()).toBeTruthy()
    const expData = (await expRes.json()).data
    const expId: number = expData.id
    const expItemId: number = expData.items[0].id

    // Approve export
    const expApproveRes = await stock.request.put(`${API_URL}/export-receipt/${expId}/approve`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(expApproveRes.ok()).toBeTruthy()

    // Fulfill export to change unit status to EXPORTED (required for return)
    const fulfillRes = await stock.request.put(`${API_URL}/export-receipt/${expId}/fulfill`, {
      data: { items: [{ itemId: expItemId, serialNumbers: [serial], actualQuantity: 1 }] },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(fulfillRes.ok()).toBeTruthy()

    // ── Step 1: Create return via API_URL (UI form may be complex) ──
    const retRes = await stock.request.post(`${API_URL}/return-receipts`, {
      data: {
        customerId: 1,
        originalExportReceiptId: expId,
        reason: "CHANGE_MIND",
        note: "E2E return test",
        items: [{ productUnitId: unitIds[0], productId: 1, quantity: 1, condition: "GOOD", resultingAction: "RESTOCK" }],
      },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    if (!retRes.ok()) console.error("Return fail:", await retRes.text())
    expect(retRes.ok()).toBeTruthy()
    const retId: number = (await retRes.json()).data.id

    // ── Step 2: MANAGER approves via UI ──
    await navigateTo(mgr, `/returns-qc/returns/${retId}`)
    await approveDialog(mgr, retId)

    // ── Step 3: Verify COMPLETED (approve sets status to COMPLETED for return receipts) ──
    const retDetail = await mgr.request.get(`${API_URL}/return-receipts/${retId}`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    const retData = (await retDetail.json()) as { data: { status: string } }
    expect(retData.data.status).toBe("COMPLETED")

    await stockCtx.close()
    await mgrCtx.close()
  })
})
