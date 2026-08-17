import { test, expect } from "@playwright/test"
import { loginAsStock, loginAsManager, loginAsSales } from "./helpers/auth"
import { initTokens, getToken, getE2ELocationId, API_URL } from "./helpers/api"
import { chapter, log, hold } from "./helpers/demo"

test.use({ launchOptions: { slowMo: 5000 } })

test.describe("DEMO — Bulk (nguyên liệu kg/l)", () => {

  test("MANAGER tạo product bulk → STOCK nhập 5kg → SALES xuất 2kg → còn 3kg", async ({ browser }) => {
    const stockCtx = await browser.newContext()
    const mgrCtx = await browser.newContext()
    const salesCtx = await browser.newContext()
    const stock = await stockCtx.newPage()
    const mgr = await mgrCtx.newPage()
    const sales = await salesCtx.newPage()

    chapter("BULK: nhập nguyên liệu 5kg, xuất 2kg, tồn còn 3kg")
    await loginAsStock(stock)
    await loginAsManager(mgr)
    await loginAsSales(sales)
    await initTokens(stock)

    const stockToken = await getToken("stock", stock)
    const managerToken = await getToken("manager", mgr)
    const salesToken = await getToken("sales", sales)
    const locationId = await getE2ELocationId(stock)

    const sku = `E2E-DB-${Date.now()}`

    const productRes = await mgr.request.post(`${API_URL}/product`, {
      data: {
        name: `DEMO Bulk ${sku}`, sku, brandId: 13, categoryId: 1,
        unit: "KG", trackingType: "BULK", sellPrice: 50000, minStock: 0, supplierIds: [1],
      },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(productRes.ok()).toBeTruthy()
    const productId: number = (await productRes.json()).data.id
    log("MANAGER", `Đã tạo sản phẩm bulk (KG, tracking BULK) #${productId}`)

    const poRes = await mgr.request.post(`${API_URL}/purchase-order`, {
      data: {
        supplierId: 1, expectedDate: "2026-12-31", note: "DEMO bulk PO", invoiceCode: `INV-${Date.now()}`,
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
    log("MANAGER", "Tạo PO 5kg + mở đơn")

    const importRes = await stock.request.post(`${API_URL}/import-receipt`, {
      data: {
        supplierId: 1, purchaseOrderId, note: "DEMO bulk import",
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
    log("STOCK", `Nhập 5kg (không cần serial — bulk) → RECEIVED`)

    const unitsRes = await mgr.request.get(`${API_URL}/import-receipt/${importReceiptId}/units`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    const units = (await unitsRes.json()).data as Array<{ id: number; remainingQuantity: number | null; trackingType: string }>
    expect(units.length).toBe(1)
    expect(units[0].trackingType).toBe("BULK")
    expect(Number(units[0].remainingQuantity)).toBe(5)
    const bulkUnitId: number = units[0].id
    log("STOCK", `Bulk unit #${bulkUnitId} tạo xong, tồn 5kg`)

    const exportRes = await sales.request.post(`${API_URL}/export-receipt`, {
      data: { type: "SALE", customerId: 1, note: "DEMO bulk export", items: [{ productId, quantity: 2, unitPrice: 45000 }] },
      headers: { Authorization: `Bearer ${salesToken}` },
    })
    expect(exportRes.ok()).toBeTruthy()
    const exportData = (await exportRes.json()).data
    const exportId: number = exportData.id
    const exportItemId: number = exportData.items[0].id
    log("SALES", `Tạo phiếu xuất 2kg #${exportId}`)

    const fulfillRes = await mgr.request.put(`${API_URL}/export-receipt/${exportId}/fulfill`, {
      data: {
        note: "DEMO bulk fulfill",
        evidenceImages: ["http://localhost/e2e-evidence.png"],
        items: [{ itemId: exportItemId, actualQuantity: 2 }],
      },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(fulfillRes.ok()).toBeTruthy()
    log("MANAGER", "Duyệt xuất 2kg bằng actualQuantity")

    const unitAfter = (await stock.request.get(`${API_URL}/product-unit/${bulkUnitId}`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })).json() as unknown as Promise<{ data: { remainingQuantity: number | null } }>
    expect(Number((await unitAfter).data.remainingQuantity)).toBe(3)
    log("STOCK", `Tồn còn 3kg (5 - 2) ✓ — hoạt động theo khối lượng đúng`)

    await hold(mgr, 5000)
    await stockCtx.close()
    await mgrCtx.close()
    await salesCtx.close()
  })
})