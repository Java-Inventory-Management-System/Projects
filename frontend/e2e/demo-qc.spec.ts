import { test, expect } from "@playwright/test"
import { loginAsStock, loginAsManager, loginAsSales } from "./helpers/auth"
import { initTokens, getToken, ensureImport, API_URL, getE2ELocationId } from "./helpers/api"
import { chapter, log, hold } from "./helpers/demo"

test.use({ launchOptions: { slowMo: 5000 } })

test.describe("DEMO — QC (kiểm định + xử lý hàng trả)", () => {

  const sellAndReturn = async (
    stock: any, sales: any, mgr: any,
    stockToken: string, managerToken: string, salesToken: string,
    unitId: number, item: Record<string, unknown>,
  ): Promise<number> => {
    const unitRes = await stock.request.get(`${API_URL}/product-unit/${unitId}`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    const serial: string = ((await unitRes.json()) as { data: { serialNumber: string } }).data.serialNumber

    const expRes = await sales.request.post(`${API_URL}/export-receipt`, {
      data: { type: "SALE", customerId: 1, note: "DEMO QC setup", items: [{ productId: 1, quantity: 1, unitPrice: 15000000 }] },
      headers: { Authorization: `Bearer ${salesToken}` },
    })
    expect(expRes.ok()).toBeTruthy()
    const expData = (await expRes.json()).data
    const fulfillRes = await sales.request.put(`${API_URL}/export-receipt/${expData.id}/fulfill`, {
      data: { note: "DEMO fulfill", evidenceImages: ["https://example.com/evidence.png"], items: [{ itemId: expData.items[0].id, serialNumbers: [serial] }] },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(fulfillRes.ok()).toBeTruthy()

    const retRes = await sales.request.post(`${API_URL}/return-receipts`, {
      data: {
        customerId: 1,
        originalExportReceiptId: expData.id,
        reason: "CHANGE_MIND",
        note: "DEMO QC return",
        items: [{ productUnitId: unitId, productId: 1, quantity: 1, ...item }],
      },
      headers: { Authorization: `Bearer ${salesToken}` },
    })
    expect(retRes.ok()).toBeTruthy()
    const retId: number = (await retRes.json()).data.id
    const approveRes = await mgr.request.put(`${API_URL}/return-receipts/${retId}/approve`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(approveRes.ok()).toBeTruthy()
    return retId
  }

  const unitStatus = async (stock: any, stockToken: string, unitId: number): Promise<string> => {
    const res = await stock.request.get(`${API_URL}/product-unit/${unitId}`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    return ((await res.json()) as { data: { status: string } }).data.status
  }

  test("GOOD trả về → QC pass → IN_STOCK; DEFECTIVE → dispose DISPOSED", async ({ browser }) => {
    const stockCtx = await browser.newContext()
    const mgrCtx = await browser.newContext()
    const salesCtx = await browser.newContext()
    const stock = await stockCtx.newPage()
    const mgr = await mgrCtx.newPage()
    const sales = await salesCtx.newPage()

    chapter("QC: hàng trả còn mới → kiểm định đạt → về kho; hàng lỗi → hủy")
    await loginAsStock(stock)
    await loginAsManager(mgr)
    await loginAsSales(sales)
    await initTokens(stock)

    const stockToken = await getToken("stock", stock)
    const managerToken = await getToken("manager", mgr)
    const salesToken = await getToken("sales", sales)

    const { productUnitIds } = await ensureImport(stock)
    test.skip(productUnitIds.length < 2, "Need 2 units")

    // Unit 1: GOOD → RESTOCK → RETURN_QC_HOLD → qc-pass → IN_STOCK
    await sellAndReturn(stock, sales, mgr, stockToken, managerToken, salesToken, productUnitIds[0], { condition: "GOOD", resultingAction: "RESTOCK" })
    expect(await unitStatus(stock, stockToken, productUnitIds[0])).toBe("RETURN_QC_HOLD")
    log("STOCK", `Unit #${productUnitIds[0]} về RETURN_QC_HOLD (chờ kiểm định)`)

    const passRes = await stock.request.post(`${API_URL}/qc-processing/qc-pass`, {
      data: { unitIds: [productUnitIds[0]] },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(passRes.ok()).toBeTruthy()
    expect(await unitStatus(stock, stockToken, productUnitIds[0])).toBe("IN_STOCK")
    log("STOCK", `QC pass → unit #${productUnitIds[0]} về IN_STOCK, bán lại được ✓`)

    // Unit 2: DEFECTIVE → REJECT → PENDING_DISPOSAL → dispose DISPOSED
    await sellAndReturn(stock, sales, mgr, stockToken, managerToken, salesToken, productUnitIds[1], {
      condition: "DEFECTIVE",
      resultingAction: "REJECT",
      description: "DEMO defective for disposal",
      evidenceImage: "https://example.com/evidence.png",
      defectCategoryId: 2,
    })
    expect(await unitStatus(stock, stockToken, productUnitIds[1])).toBe("PENDING_DISPOSAL")
    log("STOCK", `Unit #${productUnitIds[1]} lỗi → PENDING_DISPOSAL (chờ xử lý hủy)`)

    const disposeRes = await stock.request.post(`${API_URL}/qc-processing/dispose-confirm`, {
      data: { unitIds: [productUnitIds[1]], action: "DISPOSED", note: "DEMO dispose" },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(disposeRes.ok()).toBeTruthy()
    expect(await unitStatus(stock, stockToken, productUnitIds[1])).toBe("DISPOSED")
    log("STOCK", `Đã hủy unit #${productUnitIds[1]} → DISPOSED ✓`)

    await hold(mgr, 5000)
    await stockCtx.close()
    await mgrCtx.close()
    await salesCtx.close()
  })

  test("EDGE: RMA không sửa được → trả lại nhà cung cấp (RETURNED_TO_SUPPLIER)", async ({ browser }) => {
    const stockCtx = await browser.newContext()
    const mgrCtx = await browser.newContext()
    const salesCtx = await browser.newContext()
    const stock = await stockCtx.newPage()
    const mgr = await mgrCtx.newPage()
    const sales = await salesCtx.newPage()

    chapter("QC EDGE: hàng RMA không sửa được → trả lại NCC kèm phiếu xuất RETURN_SUPPLIER")
    await loginAsStock(stock)
    await loginAsManager(mgr)
    await loginAsSales(sales)
    await initTokens(stock)

    const stockToken = await getToken("stock", stock)
    const managerToken = await getToken("manager", mgr)
    const salesToken = await getToken("sales", sales)
    const locationId = await getE2ELocationId(stock)

    const { productUnitIds } = await ensureImport(stock)
    test.skip(productUnitIds.length === 0, "No product units")
    const unitId = productUnitIds[0]

    const unitRes = await stock.request.get(`${API_URL}/product-unit/${unitId}`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    const actualSerial: string = ((await unitRes.json()) as { data: { serialNumber: string } }).data.serialNumber

    // Bán → khách bảo hành (WARRANTY_TRANSFER) → gửi NCC (SENT_TO_MANUFACTURER)
    const expRes = await sales.request.post(`${API_URL}/export-receipt`, {
      data: { type: "SALE", customerId: 1, note: "DEMO RMA setup", items: [{ productId: 1, quantity: 1, unitPrice: 15000000 }] },
      headers: { Authorization: `Bearer ${salesToken}` },
    })
    expect(expRes.ok()).toBeTruthy()
    const expData = (await expRes.json()).data
    const fulfillRes = await sales.request.put(`${API_URL}/export-receipt/${expData.id}/fulfill`, {
      data: { note: "DEMO fulfill", evidenceImages: ["https://example.com/evidence.png"], items: [{ itemId: expData.items[0].id, serialNumbers: [actualSerial] }] },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(fulfillRes.ok()).toBeTruthy()

    const retRes = await sales.request.post(`${API_URL}/return-receipts`, {
      data: {
        customerId: 1,
        originalExportReceiptId: expData.id,
        reason: "WARRANTY_CLAIM",
        note: "DEMO RMA claim",
        items: [{
          productUnitId: unitId, productId: 1, quantity: 1,
          condition: "DEFECTIVE", resultingAction: "WARRANTY_TRANSFER",
          description: "DEMO RMA defective", evidenceImage: "https://example.com/evidence.png",
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

    const shipRes = await stock.request.post(`${API_URL}/qc-processing/dispose-confirm`, {
      data: { unitIds: [unitId], action: "SENT_TO_MANUFACTURER", supplierId: 1, note: "DEMO RMA ship" },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(shipRes.ok()).toBeTruthy()
    const shipData = (await shipRes.json()).data as { exportReceiptId: number }
    log("STOCK", `Đã gửi NCC (SENT_TO_MANUFACTURER), auto tạo phiếu xuất #${shipData.exportReceiptId}`)

    // NCC báo không sửa được (REJECTED) → RMA_UNREPAIRABLE
    const warrImport = await stock.request.post(`${API_URL}/import-receipt`, {
      data: {
        originalWarrantyExportId: shipData.exportReceiptId,
        note: "DEMO RMA unrepairable",
        items: [{
          productId: 1, quantity: 1, unitPrice: 0, warrantyMonths: 0,
          warrantyResultType: "REJECTED",
          serialNumbers: [actualSerial],
          locationId,
        }],
      },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(warrImport.ok()).toBeTruthy()
    expect(await unitStatus(stock, stockToken, unitId)).toBe("RMA_UNREPAIRABLE")
    log("STOCK", `NCC trả lời KHÔNG sửa được → unit #${unitId} RMA_UNREPAIRABLE`)

    // STOCK trả lại NCC → RETURNED_TO_SUPPLIER + auto phiếu xuất RETURN_SUPPLIER
    const retSupplier = await stock.request.post(`${API_URL}/qc-processing/dispose-confirm`, {
      data: { unitIds: [unitId], action: "RETURNED_TO_SUPPLIER", supplierId: 1, note: "DEMO return supplier" },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(retSupplier.ok()).toBeTruthy()
    const retData = (await retSupplier.json()).data as { exportReceiptId: number }
    expect(retData.exportReceiptId).toBeTruthy()
    expect(await unitStatus(stock, stockToken, unitId)).toBe("RETURNED_TO_SUPPLIER")
    log("STOCK", `Đã trả lại NCC → unit RETURNED_TO_SUPPLIER + phiếu xuất #${retData.exportReceiptId} auto COMPLETED ✓`)

    await hold(mgr, 5000)
    await stockCtx.close()
    await mgrCtx.close()
    await salesCtx.close()
  })
})