import { test, expect } from "@playwright/test"
import { loginAsStock, loginAsSales, loginAsManager } from "./helpers/auth"
import { initTokens, getToken, API_URL, createPurchaseOrder, getE2ELocationId } from "./helpers/api"
import { cleanupProduct1 } from "./helpers/cleanup"

test.describe("Warranty Flow (Bảo hành) — SOP §6", () => {

  test.beforeAll(() => cleanupProduct1())

  test("STOCK imports → SALES sells 1 → MANAGER approves warranty return + exchanges unit", async ({ browser }) => {
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

    // Setup: import 2 units (24-month warranty) → sell 1 → keep 1 IN_STOCK for replacement
    const serial = `E2E-WRN-${Date.now()}`
    const purchaseOrderId = await createPurchaseOrder(stock)
    const impRes = await stock.request.post(`${API_URL}/import-receipt`, {
      data: {
        supplierId: 1,
        purchaseOrderId,
        note: "E2E warranty setup",
        items: [{ productId: 1, quantity: 2, unitPrice: 10000000, warrantyMonths: 24, serialNumbers: [`${serial}-A`, `${serial}-B`], locationId }],
      },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(impRes.ok()).toBeTruthy()
    const impData = (await impRes.json()).data
    const impId = impData.id
    const impItemId = impData.items[0].id

    const confirmRes = await stock.request.put(`${API_URL}/import-receipt/${impId}/confirm`, {
      data: { serials: [{ itemId: impItemId, serialNumbers: [`${serial}-A`, `${serial}-B`], locationId }] },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(confirmRes.ok()).toBeTruthy()

    const unitsRes = await stock.request.get(`${API_URL}/import-receipt/${impId}/units`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    const unitIds: number[] = (await unitsRes.json()).data.map((u: any) => u.id)
    test.skip(unitIds.length < 2, "Need at least 2 units")

    // SALES sells 1 unit (unitIds[0] → SOLD), unitIds[1] stays IN_STOCK as replacement
    const expRes = await sales.request.post(`${API_URL}/export-receipt`, {
      data: { type: "SALE", customerId: 1, note: "E2E warranty setup", items: [{ productId: 1, quantity: 1, unitPrice: 15000000 }] },
      headers: { Authorization: `Bearer ${salesToken}` },
    })
    expect(expRes.ok()).toBeTruthy()
    const expId: number = (await expRes.json()).data.id
    const expItemId: number = (await expRes.json()).data.items[0].id

    // MANAGER fulfills export with serial A
    const fulfillRes = await sales.request.put(`${API_URL}/export-receipt/${expId}/fulfill`, {
      data: { note: "E2E fulfill", evidenceImages: ["https://example.com/evidence.png"], items: [{ itemId: expItemId, serialNumbers: [`${serial}-A`], actualQuantity: 1 }] },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(fulfillRes.ok()).toBeTruthy()

    // SALES creates warranty return (DEFECTIVE, replaceable defect, WARRANTY_TRANSFER)
    const retRes = await sales.request.post(`${API_URL}/return-receipts`, {
      data: {
        customerId: 1,
        originalExportReceiptId: expId,
        reason: "WARRANTY_CLAIM",
        note: "E2E warranty return",
        items: [{ productUnitId: unitIds[0], productId: 1, quantity: 1, condition: "DEFECTIVE", defectCategoryId: 2, resultingAction: "WARRANTY_TRANSFER", description: "E2E: no power", evidenceImage: "https://example.com/evidence.png" }],
      },
      headers: { Authorization: `Bearer ${salesToken}` },
    })
    expect(retRes.ok()).toBeTruthy()
    const retId: number = (await retRes.json()).data.id

    // MANAGER approves return (creator ≠ approver)
    const approveRes = await mgr.request.put(`${API_URL}/return-receipts/${retId}/approve`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(approveRes.ok()).toBeTruthy()

    // MANAGER performs warranty exchange with the IN_STOCK unit
    const exchangeRes = await mgr.request.put(`${API_URL}/return-receipts/${retId}/warranty-exchange`, {
      data: { replacementUnitId: unitIds[1], note: "E2E exchange" },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(exchangeRes.ok()).toBeTruthy()

    // Verify replacement unit EXPORTED (handed to customer)
    const replUnit = ((await stock.request.get(`${API_URL}/product-unit/${unitIds[1]}`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })).json() as unknown as Promise<{ data: { status: string } }>)
    expect((await replUnit).data.status).toBe("EXPORTED")

    // Verify original unit no longer EXPORTED (moved to WAITING_RMA_EXPORT at approve)
    const origUnit = ((await stock.request.get(`${API_URL}/product-unit/${unitIds[0]}`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })).json() as unknown as Promise<{ data: { status: string } }>)
    expect(["WAITING_RMA_EXPORT", "PENDING_DISPOSAL"]).toContain((await origUnit).data.status)

    await stockCtx.close()
    await salesCtx.close()
    await mgrCtx.close()
  })
})