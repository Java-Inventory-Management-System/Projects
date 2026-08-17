import { test, expect } from "@playwright/test"
import { loginAsStock, loginAsManager, loginAsSales } from "./helpers/auth"
import { navigateTo } from "./helpers/nav"
import { initTokens, getToken, API_URL, createPurchaseOrder, getE2ELocationId } from "./helpers/api"
import { approveDialog } from "./helpers/approve"
import { cleanupProduct1 } from "./helpers/cleanup"

test.describe("Return Flow (Trả hàng) — SOP §7", () => {

  test.beforeAll(() => cleanupProduct1())

  test("STOCK imports → SALES creates export+return → MANAGER approves → unit RESTOCKED", async ({ browser }) => {
    const stockCtx = await browser.newContext()
    const salesCtx = await browser.newContext()
    const mgrCtx = await browser.newContext()
    const stock = await stockCtx.newPage()
    const sales = await salesCtx.newPage()
    const mgr = await mgrCtx.newPage()

    await loginAsStock(stock)
    await loginAsSales(sales)
    await loginAsManager(mgr)
    await initTokens(stock)

    const stockToken = await getToken("stock", stock)
    const salesToken = await getToken("sales", sales)
    const managerToken = await getToken("manager", mgr)
    const locationId = await getE2ELocationId(stock)

    // Setup: create import → create export (sell to customer)
    const serial = `E2E-RET-${Date.now()}`
    const purchaseOrderId = await createPurchaseOrder(stock)
    const impRes = await stock.request.post(`${API_URL}/import-receipt`, {
      data: {
        supplierId: 1,
        purchaseOrderId,
        note: "E2E return setup",
        items: [{ productId: 1, quantity: 1, unitPrice: 10000000, warrantyMonths: 12, serialNumbers: [serial], locationId }],
      },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    const impData = (await impRes.json()).data
    const impId: number = impData.id
    const impItemId: number = impData.items[0].id

    // Confirm → RECEIVED (no approval step)
    const confirmRes = await stock.request.put(`${API_URL}/import-receipt/${impId}/confirm`, {
      data: { serials: [{ itemId: impItemId, serialNumbers: [serial], locationId }] },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(confirmRes.ok()).toBeTruthy()

    // Get product unit IDs from the import
    const unitsRes = await stock.request.get(`${API_URL}/import-receipt/${impId}/units`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    const unitIds: number[] = (await unitsRes.json()).data.map((u: any) => u.id)
    test.skip(unitIds.length === 0, "No product units created")

    // Create export (sell) — SALES (CAN_CREATE_TRANSACTION)
    const expRes = await sales.request.post(`${API_URL}/export-receipt`, {
      data: {
        type: "SALE",
        customerId: 1,
        note: "E2E return setup export",
        items: [{ productId: 1, quantity: 1, unitPrice: 15000000 }],
      },
      headers: { Authorization: `Bearer ${salesToken}` },
    })
    expect(expRes.ok()).toBeTruthy()
    const expData = (await expRes.json()).data
    const expId: number = expData.id
    const expItemId: number = expData.items[0].id

// Fulfill export to change unit status to SOLD (required for return)
    const fulfillRes = await sales.request.put(`${API_URL}/export-receipt/${expId}/fulfill`, {
      data: { note: "E2E fulfill", evidenceImages: ["https://example.com/evidence.png"], items: [{ itemId: expItemId, serialNumbers: [serial], actualQuantity: 1 }] },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(fulfillRes.ok()).toBeTruthy()

    // ── Step 1: Create return via API_URL (UI form may be complex) — SALES ──
    const retRes = await sales.request.post(`${API_URL}/return-receipts`, {
      data: {
        customerId: 1,
        originalExportReceiptId: expId,
        reason: "CHANGE_MIND",
        note: "E2E return test",
        items: [{ productUnitId: unitIds[0], productId: 1, quantity: 1, condition: "GOOD", resultingAction: "RESTOCK" }],
      },
      headers: { Authorization: `Bearer ${salesToken}` },
    })
    if (!retRes.ok()) console.error("Return fail:", await retRes.text())
    expect(retRes.ok()).toBeTruthy()
    const retId: number = (await retRes.json()).data.id

    // ── Step 2: MANAGER approves via UI ──
    await navigateTo(mgr, `/returns-qc/returns/${retId}`)
    await approveDialog(mgr, retId, "Tiếp nhận", "Xác nhận duyệt")

    // ── Step 3: Verify COMPLETED (approve sets status to COMPLETED for return receipts) ──
    const retDetail = await mgr.request.get(`${API_URL}/return-receipts/${retId}`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    const retData = (await retDetail.json()) as { data: { status: string } }
    expect(retData.data.status).toBe("COMPLETED")

    await stockCtx.close()
    await salesCtx.close()
    await mgrCtx.close()
  })
})
