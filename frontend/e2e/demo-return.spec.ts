import { test, expect } from "@playwright/test"
import { loginAsStock, loginAsManager, loginAsSales } from "./helpers/auth"
import { navigateTo } from "./helpers/nav"
import { initTokens, getToken, API_URL, createPurchaseOrder, getE2ELocationId } from "./helpers/api"
import { approveDialog } from "./helpers/approve"
import { chapter, log, hold } from "./helpers/demo"

test.use({ launchOptions: { slowMo: 5000 } })

test.describe("DEMO — Trả hàng (khách đổi ý)", () => {

  test("SALES nhận trả → MANAGER duyệt → hàng về QC", async ({ browser }) => {
    const stockCtx = await browser.newContext()
    const salesCtx = await browser.newContext()
    const mgrCtx = await browser.newContext()
    const stock = await stockCtx.newPage()
    const sales = await salesCtx.newPage()
    const mgr = await mgrCtx.newPage()

    chapter("TRẢ HÀNG: khách đổi ý → SALES lập phiếu trả → MANAGER duyệt → hàng về QC")
    await loginAsStock(stock)
    await loginAsSales(sales)
    await loginAsManager(mgr)
    await initTokens(stock)

    const stockToken = await getToken("stock", stock)
    const salesToken = await getToken("sales", sales)
    const managerToken = await getToken("manager", mgr)
    const locationId = await getE2ELocationId(stock)

    const serial = `E2E-DR-${Date.now()}`
    const purchaseOrderId = await createPurchaseOrder(stock)
    const impRes = await stock.request.post(`${API_URL}/import-receipt`, {
      data: {
        supplierId: 1,
        purchaseOrderId,
        note: "DEMO return setup",
        items: [{ productId: 1, quantity: 1, unitPrice: 10000000, warrantyMonths: 12, serialNumbers: [serial], locationId }],
      },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    const impData = (await impRes.json()).data
    const impId: number = impData.id
    const impItemId: number = impData.items[0].id

    const confirmRes = await stock.request.put(`${API_URL}/import-receipt/${impId}/confirm`, {
      data: { serials: [{ itemId: impItemId, serialNumbers: [serial], locationId }] },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(confirmRes.ok()).toBeTruthy()

    const unitsRes = await stock.request.get(`${API_URL}/import-receipt/${impId}/units`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    const unitIds: number[] = (await unitsRes.json()).data.map((u: any) => u.id)
    test.skip(unitIds.length === 0, "No product units created")
    log("STOCK", `Nhập unit #${unitIds[0]}`)

    const expRes = await sales.request.post(`${API_URL}/export-receipt`, {
      data: {
        type: "SALE",
        customerId: 1,
        note: "DEMO return setup export",
        items: [{ productId: 1, quantity: 1, unitPrice: 15000000 }],
      },
      headers: { Authorization: `Bearer ${salesToken}` },
    })
    expect(expRes.ok()).toBeTruthy()
    const expData = (await expRes.json()).data
    const expId: number = expData.id
    const expItemId: number = expData.items[0].id

    const fulfillRes = await sales.request.put(`${API_URL}/export-receipt/${expId}/fulfill`, {
      data: { note: "DEMO fulfill", evidenceImages: ["https://example.com/evidence.png"], items: [{ itemId: expItemId, serialNumbers: [serial], actualQuantity: 1 }] },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(fulfillRes.ok()).toBeTruthy()
    log("SALES", `Đã bán unit #${unitIds[0]} → khách đổi ý muốn trả`)

    const retRes = await sales.request.post(`${API_URL}/return-receipts`, {
      data: {
        customerId: 1,
        originalExportReceiptId: expId,
        reason: "CHANGE_MIND",
        note: "DEMO return test",
        items: [{ productUnitId: unitIds[0], productId: 1, quantity: 1, condition: "GOOD", resultingAction: "RESTOCK" }],
      },
      headers: { Authorization: `Bearer ${salesToken}` },
    })
    expect(retRes.ok()).toBeTruthy()
    const retId: number = (await retRes.json()).data.id
    log("SALES", `Lập phiếu trả #${retId} (lý do: đổi ý, hàng còn mới)`)

    await navigateTo(mgr, `/returns-qc/returns/${retId}`)
    await approveDialog(mgr, retId, "Tiếp nhận", "Xác nhận duyệt")
    log("MANAGER", "Đã duyệt phiếu trả qua giao diện (Tiếp nhận)")

    const retDetail = await mgr.request.get(`${API_URL}/return-receipts/${retId}`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    const retData = (await retDetail.json()) as { data: { status: string } }
    expect(retData.data.status).toBe("COMPLETED")
    log("STOCK", `Phiếu trả #${retId} COMPLETED → unit về khu QC chờ kiểm định ✓`)

    await hold(mgr, 5000)
    await stockCtx.close()
    await salesCtx.close()
    await mgrCtx.close()
  })
})