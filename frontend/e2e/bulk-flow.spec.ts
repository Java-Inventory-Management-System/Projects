import { test, expect } from "@playwright/test"
import { loginAsStock, loginAsManager, loginAsSales } from "./helpers/auth"
import { initTokens, getToken, getE2ELocationId, API_URL } from "./helpers/api"

test.describe("Bulk Flow (nguyên liệu kg/l) — import → export theo khối lượng", () => {

  test("MANAGER creates bulk product → STOCK imports 5kg → SALES exports 2kg → MANAGER fulfills → remaining 3", async ({ browser }) => {
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
    const locationId = await getE2ELocationId(stock)

    const sku = `E2E-BULK-${Date.now()}`

    // MANAGER creates a bulk-tracked product (unit KG → BULK units)
    const productRes = await mgr.request.post(`${API_URL}/product`, {
      data: {
        name: `E2E Bulk ${sku}`,
        sku,
        brandId: 13,
        categoryId: 1,
        unit: "KG",
        trackingType: "BULK",
        sellPrice: 50000,
        minStock: 0,
        supplierIds: [1],
      },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(productRes.ok()).toBeTruthy()
    const productId: number = (await productRes.json()).data.id

    // STOCK imports 5kg — no serials for bulk (needs a PO first)
    const poRes = await mgr.request.post(`${API_URL}/purchase-order`, {
      data: {
        supplierId: 1,
        expectedDate: "2026-12-31",
        note: "E2E bulk PO",
        invoiceCode: `INV-${Date.now()}`,
        items: [{ productId, quantity: 5, unitPrice: 30000 }],
      },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(poRes.ok()).toBeTruthy()
    const purchaseOrderId: number = (await poRes.json()).data.id
    const openRes = await mgr.request.put(`${API_URL}/purchase-order/${purchaseOrderId}/open`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(openRes.ok()).toBeTruthy()

    const importRes = await stock.request.post(`${API_URL}/import-receipt`, {
      data: {
        supplierId: 1,
        purchaseOrderId,
        note: "E2E bulk import",
        items: [{ productId, quantity: 5, unitPrice: 30000, locationId }],
      },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(importRes.ok()).toBeTruthy()
    const importData = (await importRes.json()).data
    const importReceiptId: number = importData.id
    const itemId: number = importData.items[0].id

    const confirmRes = await stock.request.put(`${API_URL}/import-receipt/${importReceiptId}/confirm`, {
      data: { serials: [{ itemId, locationId }] },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(confirmRes.ok()).toBeTruthy()

    // Bulk unit created with remainingQuantity 5
    const unitsRes = await mgr.request.get(`${API_URL}/import-receipt/${importReceiptId}/units`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    const units = (await unitsRes.json()).data as Array<{ id: number; remainingQuantity: number | null; trackingType: string }>
    expect(units.length).toBe(1)
    expect(units[0].trackingType).toBe("BULK")
    expect(Number(units[0].remainingQuantity)).toBe(5)
    const bulkUnitId: number = units[0].id

    // SALES creates export for 2kg
    const exportRes = await sales.request.post(`${API_URL}/export-receipt`, {
      data: {
        type: "SALE",
        customerId: 1,
        note: "E2E bulk export",
        items: [{ productId, quantity: 2, unitPrice: 45000 }],
      },
      headers: { Authorization: `Bearer ${salesToken}` },
    })
    expect(exportRes.ok()).toBeTruthy()
    const exportData = (await exportRes.json()).data
    const exportId: number = exportData.id
    const exportItemId: number = exportData.items[0].id

    // MANAGER fulfills with actualQuantity 2kg
    const fulfillRes = await mgr.request.put(`${API_URL}/export-receipt/${exportId}/fulfill`, {
      data: {
        note: "E2E bulk fulfill",
        evidenceImages: ["http://localhost/e2e-evidence.png"],
        items: [{ itemId: exportItemId, actualQuantity: 2 }],
      },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(fulfillRes.ok()).toBeTruthy()

    // Remaining 5 − 2 = 3
    const unitAfter = (await stock.request.get(`${API_URL}/product-unit/${bulkUnitId}`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })).json() as unknown as Promise<{ data: { remainingQuantity: number | null } }>
    expect(Number((await unitAfter).data.remainingQuantity)).toBe(3)

    // Export COMPLETED
    const exportDetail = await mgr.request.get(`${API_URL}/export-receipt/${exportId}`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(((await exportDetail.json()) as { data: { status: string } }).data.status).toBe("COMPLETED")

    await stockCtx.close()
    await mgrCtx.close()
    await salesCtx.close()
  })
})