import { test, expect } from "@playwright/test"
import { loginAsStock, loginAsManager, loginAsSales, loginAsAdmin } from "./helpers/auth"
import { initTokens, getToken, ensureImport, createPurchaseOrder, getE2ELocationId, API_URL } from "./helpers/api"
import { chapter, log, hold } from "./helpers/demo"

test.use({ launchOptions: { slowMo: 5000 } })

test.describe("DEMO — Edge: role matrix 403 + hủy đơn mua", () => {

  test("Ma trận quyền: thao tác trái role → 403; creator không tự duyệt", async ({ browser }) => {
    const stockCtx = await browser.newContext()
    const mgrCtx = await browser.newContext()
    const salesCtx = await browser.newContext()
    const adminCtx = await browser.newContext()
    const stock = await stockCtx.newPage()
    const mgr = await mgrCtx.newPage()
    const sales = await salesCtx.newPage()
    const admin = await adminCtx.newPage()

    chapter("ROLE MATRIX: 7 case thao tác trái quyền → 403")
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

    const purchaseOrderId = await createPurchaseOrder(stock)

    // 1. SALES tạo phiếu nhập → 403
    const badImport = await sales.request.post(`${API_URL}/import-receipt`, {
      data: { supplierId: 1, purchaseOrderId, items: [{ productId: 1, quantity: 1, unitPrice: 10000 }] },
      headers: { Authorization: `Bearer ${salesToken}` },
    })
    expect(badImport.status()).toBe(403)
    log("SALES", "1. SALES tạo phiếu nhập → 403 ✓")

    // 2. STOCK tạo phiếu xuất → 403
    const badExport = await stock.request.post(`${API_URL}/export-receipt`, {
      data: { type: "SALE", customerId: 1, items: [{ productId: 1, quantity: 1, unitPrice: 10000 }] },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(badExport.status()).toBe(403)
    log("STOCK", "2. STOCK tạo phiếu xuất → 403 ✓")

    // 3. SALES duyệt xuất → 403
    const exportRes = await sales.request.post(`${API_URL}/export-receipt`, {
      data: { type: "SALE", customerId: 1, items: [{ productId: 1, quantity: 1, unitPrice: 10000 }] },
      headers: { Authorization: `Bearer ${salesToken}` },
    })
    expect(exportRes.ok()).toBeTruthy()
    const exportData = (await exportRes.json()).data
    const exportItemId: number = exportData.items[0].id
    const badFulfill = await sales.request.put(`${API_URL}/export-receipt/${exportData.id}/fulfill`, {
      data: { note: "x", evidenceImages: ["http://localhost/e2e-evidence.png"], items: [{ itemId: exportItemId, serialNumbers: ["X"] }] },
      headers: { Authorization: `Bearer ${salesToken}` },
    })
    expect(badFulfill.status()).toBe(403)
    log("SALES", "3. SALES duyệt xuất → 403 ✓")

    // 4. STOCK tạo phiếu trả → 403
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
    log("STOCK", "4. STOCK tạo phiếu trả → 403 ✓")

    // 5. MANAGER đóng thùng → 403 (SEAL_BOX = STOCK only)
    const badSeal = await mgr.request.post(`${API_URL}/box/seal`, {
      data: { unitIds: productUnitIds.slice(0, 2), locationId, note: "blocked", boxType: "SMALL" },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(badSeal.status()).toBe(403)
    log("MANAGER", "5. MANAGER đóng thùng → 403 ✓")

    // 6. SALES xem tồn kho → 403
    const { importReceiptId } = await ensureImport(stock)
    const badUnits = await sales.request.get(`${API_URL}/import-receipt/${importReceiptId}/units`, {
      headers: { Authorization: `Bearer ${salesToken}` },
    })
    expect(badUnits.status()).toBe(403)
    log("SALES", "6. SALES xem tồn kho → 403 ✓")

    // 7. Điều chỉnh giá: SALES tạo 403; MANAGER tạo ok; tự duyệt 403; ADMIN duyệt 200
    const badAdj = await sales.request.post(`${API_URL}/price-adjustment`, {
      data: { importReceiptItemId: 1, newPrice: 12345678, reason: "blocked" },
      headers: { Authorization: `Bearer ${salesToken}` },
    })
    expect(badAdj.status()).toBe(403)
    log("SALES", "7a. SALES tạo điều chỉnh giá → 403 ✓")

    const adjItemSerial = `E2E-DN-${Date.now()}`
    const adjImport = await stock.request.post(`${API_URL}/import-receipt`, {
      data: {
        supplierId: 1, purchaseOrderId, note: "DEMO neg adj",
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
      data: { importReceiptItemId: adjItemId, newPrice: 12345678, reason: "DEMO negative" },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(adjRes.ok()).toBeTruthy()
    const adjId: number = (await adjRes.json()).data.id
    const selfApprove = await mgr.request.put(`${API_URL}/price-adjustment/${adjId}/approve`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(selfApprove.status()).toBe(403)
    log("MANAGER", "7b. MANAGER tự duyệt giá → 403 ✓")
    const adminApprove = await admin.request.put(`${API_URL}/price-adjustment/${adjId}/approve`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    expect(adminApprove.ok()).toBeTruthy()
    log("ADMIN", "7c. ADMIN duyệt giá → 200 ✓")

    await hold(mgr, 5000)
    await stockCtx.close()
    await mgrCtx.close()
    await salesCtx.close()
    await adminCtx.close()
  })

  test("MANAGER hủy đơn mua DRAFT → CANCELLED", async ({ browser }) => {
    const mgrCtx = await browser.newContext()
    const mgr = await mgrCtx.newPage()

    chapter("PO CANCEL: hủy đơn mua chưa mở")
    await loginAsManager(mgr)
    await initTokens(mgr)

    const managerToken = await getToken("manager", mgr)

    const poRes = await mgr.request.post(`${API_URL}/purchase-order`, {
      data: {
        supplierId: 1,
        expectedDate: "2026-12-31",
        note: "DEMO cancel PO",
        invoiceCode: `INV-${Date.now()}`,
        items: [{ productId: 1, quantity: 1, unitPrice: 10000000 }],
      },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(poRes.ok()).toBeTruthy()
    const poId: number = (await poRes.json()).data.id
    log("MANAGER", `Tạo đơn mua #${poId} (DRAFT)`)

    const cancelRes = await mgr.request.put(`${API_URL}/purchase-order/${poId}/cancel`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(cancelRes.ok()).toBeTruthy()

    const poAfter = await mgr.request.get(`${API_URL}/purchase-order/${poId}`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(((await poAfter.json()) as { data: { status: string } }).data.status).toBe("CANCELLED")
    log("MANAGER", `Đơn mua #${poId} → CANCELLED ✓`)

    await hold(mgr, 5000)
    await mgrCtx.close()
  })
})