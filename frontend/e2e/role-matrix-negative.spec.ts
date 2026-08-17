import { test, expect } from "@playwright/test"
import { loginAsStock, loginAsManager, loginAsSales, loginAsAdmin } from "./helpers/auth"
import { initTokens, getToken, ensureImport, createPurchaseOrder, getE2ELocationId, API_URL } from "./helpers/api"

test.describe("Role Matrix Negative (403 trên quyền trái role) — SOP §11", () => {

  test("wrong-role calls are rejected with 403 across the matrix", async ({ browser }) => {
    const stockCtx = await browser.newContext()
    const mgrCtx = await browser.newContext()
    const salesCtx = await browser.newContext()
    const adminCtx = await browser.newContext()
    const stock = await stockCtx.newPage()
    const mgr = await mgrCtx.newPage()
    const sales = await salesCtx.newPage()
    const admin = await adminCtx.newPage()

    await loginAsStock(stock)
    await loginAsManager(mgr)
    await loginAsSales(sales)
    await loginAsAdmin(admin)
    await initTokens(stock)

    const stockToken = await getToken("stock", stock)
    const managerToken = await getToken("manager", mgr)
    const salesToken = await getToken("sales", sales)
    const adminToken = await getToken("admin", admin)
    const locationId = await getE2ELocationId(stock)

    // 1. Import create is CAN_OPERATE_STOCK → SALES is 403
    const purchaseOrderId = await createPurchaseOrder(stock)
    const badImport = await sales.request.post(`${API_URL}/import-receipt`, {
      data: { supplierId: 1, purchaseOrderId, items: [{ productId: 1, quantity: 1, unitPrice: 10000 }] },
      headers: { Authorization: `Bearer ${salesToken}` },
    })
    expect(badImport.status()).toBe(403)

    // 2. Export create is SALES only → STOCK is 403
    const badExport = await stock.request.post(`${API_URL}/export-receipt`, {
      data: { type: "SALE", customerId: 1, items: [{ productId: 1, quantity: 1, unitPrice: 10000 }] },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(badExport.status()).toBe(403)

    // 3. Export fulfill is CAN_OPERATE_STOCK (MANAGER/STOCK/ADMIN) → SALES is 403
    const exportRes = await sales.request.post(`${API_URL}/export-receipt`, {
      data: { type: "SALE", customerId: 1, items: [{ productId: 1, quantity: 1, unitPrice: 10000 }] },
      headers: { Authorization: `Bearer ${salesToken}` },
    })
    expect(exportRes.ok()).toBeTruthy()
    const exportData = (await exportRes.json()).data
    const exportId: number = exportData.id
    const exportItemId: number = exportData.items[0].id
    const badFulfill = await sales.request.put(`${API_URL}/export-receipt/${exportId}/fulfill`, {
      data: { note: "x", evidenceImages: ["http://localhost/e2e-evidence.png"], items: [{ itemId: exportItemId, serialNumbers: ["X"] }] },
      headers: { Authorization: `Bearer ${salesToken}` },
    })
    expect(badFulfill.status()).toBe(403)

    // 4. Return create is SALES only → STOCK is 403
    const { productUnitIds } = await ensureImport(stock)
    const badReturn = await stock.request.post(`${API_URL}/return-receipts`, {
      data: {
        customerId: 1,
        note: "blocked",
        items: [{ productUnitId: productUnitIds[0], productId: 1, quantity: 1, condition: "NORMAL", resultingAction: "RESTOCK" }],
      },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(badReturn.status()).toBe(403)

    // 5. Box seal is STOCK only → MANAGER is 403
    const badSeal = await mgr.request.post(`${API_URL}/box/seal`, {
      data: { unitIds: productUnitIds.slice(0, 2), locationId, note: "blocked", boxType: "SMALL" },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(badSeal.status()).toBe(403)

    // 6. Import units fetch is CAN_VIEW_INVENTORY → SALES is 403
    const { importReceiptId } = await ensureImport(stock)
    const badUnits = await sales.request.get(`${API_URL}/import-receipt/${importReceiptId}/units`, {
      headers: { Authorization: `Bearer ${salesToken}` },
    })
    expect(badUnits.status()).toBe(403)

    // 7. Price adjustment: SALES create 403; MANAGER create ok; MANAGER (creator) approve 403; ADMIN approve 200
    const badAdj = await sales.request.post(`${API_URL}/price-adjustment`, {
      data: { importReceiptItemId: 1, newPrice: 12345678, reason: "blocked" },
      headers: { Authorization: `Bearer ${salesToken}` },
    })
    expect(badAdj.status()).toBe(403)

    const adjItemSerial = `E2E-NEG-${Date.now()}`
    const adjImport = await stock.request.post(`${API_URL}/import-receipt`, {
      data: {
        supplierId: 1, purchaseOrderId, note: "E2E neg adj",
        items: [{ productId: 1, quantity: 1, unitPrice: 10000000, warrantyMonths: 12, serialNumbers: [adjItemSerial], locationId }],
      },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(adjImport.ok()).toBeTruthy()
    const adjImportData = (await adjImport.json()).data
    const adjItemId: number = adjImportData.items[0].id
    await stock.request.put(`${API_URL}/import-receipt/${adjImportData.id}/confirm`, {
      data: { serials: [{ itemId: adjItemId, serialNumbers: [adjItemSerial], locationId }] },
      headers: { Authorization: `Bearer ${stockToken}` },
    })

    const adjRes = await mgr.request.post(`${API_URL}/price-adjustment`, {
      data: { importReceiptItemId: adjItemId, newPrice: 12345678, reason: "E2E negative" },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(adjRes.ok()).toBeTruthy()
    const adjId: number = (await adjRes.json()).data.id
    const selfApprove = await mgr.request.put(`${API_URL}/price-adjustment/${adjId}/approve`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(selfApprove.status()).toBe(403)
    const adminApprove = await admin.request.put(`${API_URL}/price-adjustment/${adjId}/approve`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    expect(adminApprove.ok()).toBeTruthy()

    await stockCtx.close()
    await mgrCtx.close()
    await salesCtx.close()
    await adminCtx.close()
  })
})