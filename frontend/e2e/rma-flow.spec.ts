import { test, expect } from "@playwright/test"
import { loginAsStock, loginAsManager, loginAsSales } from "./helpers/auth"
import { initTokens, getToken, ensureImport, API_URL } from "./helpers/api"

test.describe("RMA Flow (Bảo hành trả nhà cung cấp) — SOP §6b", () => {

  test("warranty return → SENT_TO_MANUFACTURER (RETURN_SUPPLIER export) → warranty import REPAIRED → qc-pass → IN_STOCK", async ({ browser }) => {
    const stockCtx = await browser.newContext()
    const mgrCtx = await browser.newContext()
    const salesCtx = await browser.newContext()
    const stock = await stockCtx.newPage()
    const mgr = await mgrCtx.newPage()
    const sales = await salesCtx.newPage()

    await loginAsStock(stock)
    await loginAsManager(mgr)
    await loginAsSales(sales)
    await initTokens(stock)

    const stockToken = await getToken("stock", stock)
    const managerToken = await getToken("manager", mgr)
    const salesToken = await getToken("sales", sales)

    const { productUnitIds } = await ensureImport(stock)
    test.skip(productUnitIds.length === 0, "No product units")
    const unitId = productUnitIds[0]

    const unitRes = await stock.request.get(`${API_URL}/product-unit/${unitId}`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    const actualSerial: string = ((await unitRes.json()) as { data: { serialNumber: string } }).data.serialNumber

    // 1. SALES sells the unit (export + fulfill)
    const expRes = await sales.request.post(`${API_URL}/export-receipt`, {
      data: { type: "SALE", customerId: 1, note: "E2E RMA setup", items: [{ productId: 1, quantity: 1, unitPrice: 15000000 }] },
      headers: { Authorization: `Bearer ${salesToken}` },
    })
    expect(expRes.ok()).toBeTruthy()
    const expData = (await expRes.json()).data
    const fulfillRes = await sales.request.put(`${API_URL}/export-receipt/${expData.id}/fulfill`, {
      data: { note: "E2E fulfill", evidenceImages: ["https://example.com/evidence.png"], items: [{ itemId: expData.items[0].id, serialNumbers: [actualSerial] }] },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(fulfillRes.ok()).toBeTruthy()

    // 2. Customer claims warranty → WARRANTY_TRANSFER return → WAITING_RMA_EXPORT (QC shelf 2)
    const retRes = await sales.request.post(`${API_URL}/return-receipts`, {
      data: {
        customerId: 1,
        originalExportReceiptId: expData.id,
        reason: "WARRANTY_CLAIM",
        note: "E2E RMA claim",
        items: [{
          productUnitId: unitId, productId: 1, quantity: 1,
          condition: "DEFECTIVE", resultingAction: "WARRANTY_TRANSFER",
          description: "E2E RMA defective", evidenceImage: "https://example.com/evidence.png",
          defectCategoryId: 2,
        }],
      },
      headers: { Authorization: `Bearer ${salesToken}` },
    })
    expect(retRes.ok()).toBeTruthy()
    const retId: number = (await retRes.json()).data.id
    const approveRes = await mgr.request.put(`${API_URL}/return-receipts/${retId}/approve`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(approveRes.ok()).toBeTruthy()

    // 3. STOCK ships the batch to the manufacturer → RETURN_SUPPLIER export created
    const shipRes = await stock.request.post(`${API_URL}/qc-processing/dispose-confirm`, {
      data: { unitIds: [unitId], action: "SENT_TO_MANUFACTURER", supplierId: 1, note: "E2E RMA ship" },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(shipRes.ok()).toBeTruthy()
    const shipData = (await shipRes.json()).data as { exportReceiptId: number }
    expect(shipData.exportReceiptId).toBeTruthy()

    const shipExport = await mgr.request.get(`${API_URL}/export-receipt/${shipData.exportReceiptId}`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(((await shipExport.json()) as { data: { status: string; reason: string } }).data.status).toBe("COMPLETED")

    // 4. Supplier returns the repaired unit → warranty import (auto-confirmed, RECEIVED)
    const warrImport = await stock.request.post(`${API_URL}/import-receipt`, {
      data: {
        originalWarrantyExportId: shipData.exportReceiptId,
        note: "E2E RMA repair return",
        items: [{
          productId: 1, quantity: 1, unitPrice: 10000000, warrantyMonths: 12,
          warrantyResultType: "REPAIRED",
          serialNumbers: [actualSerial],
          locationId,
        }],
      },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(warrImport.ok()).toBeTruthy()

    const unitAfterReturn = (await stock.request.get(`${API_URL}/product-unit/${unitId}`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })).json() as unknown as Promise<{ data: { status: string } }>
    expect((await unitAfterReturn).data.status).toBe("RMA_REPAIRED_RETURNED")

    // 5. STOCK qc-pass → back to sellable IN_STOCK
    const passRes = await stock.request.post(`${API_URL}/qc-processing/qc-pass`, {
      data: { unitIds: [unitId] },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(passRes.ok()).toBeTruthy()
    const unitFinal = (await stock.request.get(`${API_URL}/product-unit/${unitId}`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })).json() as unknown as Promise<{ data: { status: string } }>
    expect((await unitFinal).data.status).toBe("IN_STOCK")

    await stockCtx.close()
    await mgrCtx.close()
    await salesCtx.close()
  })
})