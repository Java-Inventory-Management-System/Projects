import { test, expect } from "@playwright/test"
import { loginAsStock, loginAsSales, loginAsManager } from "./helpers/auth"
import { initTokens, getToken, API_URL, createPurchaseOrder, getE2ELocationId, ensureImport } from "./helpers/api"
import { chapter, log, hold } from "./helpers/demo"

test.use({ launchOptions: { slowMo: 5000 } })

test.describe("DEMO — Bảo hành (đổi mới + RMA)", () => {

  test("Khách bảo hành → đổi unit mới cho khách", async ({ browser }) => {
    const stockCtx = await browser.newContext()
    const salesCtx = await browser.newContext()
    const mgrCtx = await browser.newContext()
    const stock = await stockCtx.newPage()
    const sales = await salesCtx.newPage()
    const mgr = await mgrCtx.newPage()

    chapter("BẢO HÀNH: bán → khách khiếu nại → duyệt → đổi unit mới (warranty-exchange)")
    await loginAsStock(stock)
    await loginAsSales(sales)
    await loginAsManager(mgr)
    await initTokens(stock)

    const stockToken = await getToken("stock", stock)
    const salesToken = await getToken("sales", sales)
    const managerToken = await getToken("manager", mgr)
    const locationId = await getE2ELocationId(stock)

    const serial = `E2E-DW-${Date.now()}`
    const purchaseOrderId = await createPurchaseOrder(stock)
    const impRes = await stock.request.post(`${API_URL}/import-receipt`, {
      data: {
        supplierId: 1,
        purchaseOrderId,
        note: "DEMO warranty setup",
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
    log("STOCK", `Nhập 2 unit (24 tháng bảo hành): #${unitIds[0]}, #${unitIds[1]}`)

    const expRes = await sales.request.post(`${API_URL}/export-receipt`, {
      data: { type: "SALE", customerId: 1, note: "DEMO warranty setup", items: [{ productId: 1, quantity: 1, unitPrice: 15000000 }] },
      headers: { Authorization: `Bearer ${salesToken}` },
    })
    expect(expRes.ok()).toBeTruthy()
    const expData = (await expRes.json()).data
    const expId: number = expData.id
    const expItemId: number = expData.items[0].id

    const fulfillRes = await sales.request.put(`${API_URL}/export-receipt/${expId}/fulfill`, {
      data: { note: "DEMO fulfill", evidenceImages: ["https://example.com/evidence.png"], items: [{ itemId: expItemId, serialNumbers: [`${serial}-A`], actualQuantity: 1 }] },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(fulfillRes.ok()).toBeTruthy()
    log("SALES", `Đã bán unit #${unitIds[0]} cho khách`)

    const retRes = await sales.request.post(`${API_URL}/return-receipts`, {
      data: {
        customerId: 1,
        originalExportReceiptId: expId,
        reason: "WARRANTY_CLAIM",
        note: "DEMO warranty return",
        items: [{ productUnitId: unitIds[0], productId: 1, quantity: 1, condition: "DEFECTIVE", defectCategoryId: 2, resultingAction: "WARRANTY_TRANSFER", description: "DEMO: no power", evidenceImage: "https://example.com/evidence.png" }],
      },
      headers: { Authorization: `Bearer ${salesToken}` },
    })
    expect(retRes.ok()).toBeTruthy()
    const retId: number = (await retRes.json()).data.id
    log("SALES", "Khách khiếu nại bảo hành → tạo phiếu trả WARRANTY_TRANSFER")

    const approveRes = await mgr.request.put(`${API_URL}/return-receipts/${retId}/approve`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(approveRes.ok()).toBeTruthy()
    log("MANAGER", "Đã duyệt phiếu trả bảo hành")

    const exchangeRes = await mgr.request.put(`${API_URL}/return-receipts/${retId}/warranty-exchange`, {
      data: { replacementUnitId: unitIds[1], note: "DEMO exchange" },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(exchangeRes.ok()).toBeTruthy()
    log("MANAGER", `Đổi unit #${unitIds[1]} (IN_STOCK) cho khách → unit bị lỗi vào luồng RMA`)

    const replUnit = ((await stock.request.get(`${API_URL}/product-unit/${unitIds[1]}`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })).json() as unknown as Promise<{ data: { status: string } }>)
    expect((await replUnit).data.status).toBe("EXPORTED")
    log("STOCK", `Unit thay thế #${unitIds[1]} → EXPORTED (đã giao khách) ✓`)

    await hold(mgr, 5000)
    await stockCtx.close()
    await salesCtx.close()
    await mgrCtx.close()
  })

  test("RMA: gửi NCC sửa → nhận về REPAIRED → QC pass → bán lại", async ({ browser }) => {
    const stockCtx = await browser.newContext()
    const mgrCtx = await browser.newContext()
    const salesCtx = await browser.newContext()
    const stock = await stockCtx.newPage()
    const mgr = await mgrCtx.newPage()
    const sales = await salesCtx.newPage()

    chapter("RMA: gửi NCC → NCC sửa xong trả về → kiểm định → bán lại")
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
    log("SALES", `Bán unit #${unitId}`)

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
    log("MANAGER", "Duyệt phiếu bảo hành → unit chờ xuất RMA")

    const shipRes = await stock.request.post(`${API_URL}/qc-processing/dispose-confirm`, {
      data: { unitIds: [unitId], action: "SENT_TO_MANUFACTURER", supplierId: 1, note: "DEMO RMA ship" },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(shipRes.ok()).toBeTruthy()
    const shipData = (await shipRes.json()).data as { exportReceiptId: number }
    log("STOCK", `Gửi NCC → auto phiếu xuất #${shipData.exportReceiptId} (WARRANTY_REPLACEMENT) COMPLETED`)

    const locationId = await getE2ELocationId(stock)
    const warrImport = await stock.request.post(`${API_URL}/import-receipt`, {
      data: {
        originalWarrantyExportId: shipData.exportReceiptId,
        note: "DEMO RMA repair return",
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
    log("STOCK", "NCC trả về unit đã sửa (REPAIRED) → auto-confirm")

    const unitAfterReturn = (await stock.request.get(`${API_URL}/product-unit/${unitId}`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })).json() as unknown as Promise<{ data: { status: string } }>
    expect((await unitAfterReturn).data.status).toBe("RMA_REPAIRED_RETURNED")
    log("STOCK", `Unit #${unitId} → RMA_REPAIRED_RETURNED (chờ kiểm định)`)

    const passRes = await stock.request.post(`${API_URL}/qc-processing/qc-pass`, {
      data: { unitIds: [unitId] },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(passRes.ok()).toBeTruthy()
    const unitFinal = (await stock.request.get(`${API_URL}/product-unit/${unitId}`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })).json() as unknown as Promise<{ data: { status: string } }>
    expect((await unitFinal).data.status).toBe("IN_STOCK")
    log("STOCK", `QC pass → unit #${unitId} về IN_STOCK, bán lại được ✓`)

    await hold(mgr, 5000)
    await stockCtx.close()
    await mgrCtx.close()
    await salesCtx.close()
  })

  test("EDGE: RMA REPLACED — NCC đổi unit mới thay unit hỏng", async ({ browser }) => {
    const stockCtx = await browser.newContext()
    const mgrCtx = await browser.newContext()
    const salesCtx = await browser.newContext()
    const stock = await stockCtx.newPage()
    const mgr = await mgrCtx.newPage()
    const sales = await salesCtx.newPage()

    chapter("RMA EDGE: NCC trả unit MỚI thay unit hỏng (REPLACED) — unit cũ về RETURNED_TO_SUPPLIER")
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
    const oldSerial: string = ((await unitRes.json()) as { data: { serialNumber: string } }).data.serialNumber
    const newSerial = `E2E-DRPL-${Date.now()}`

    // Bán → bảo hành → gửi NCC
    const expRes = await sales.request.post(`${API_URL}/export-receipt`, {
      data: { type: "SALE", customerId: 1, note: "DEMO RMA setup", items: [{ productId: 1, quantity: 1, unitPrice: 15000000 }] },
      headers: { Authorization: `Bearer ${salesToken}` },
    })
    expect(expRes.ok()).toBeTruthy()
    const expData = (await expRes.json()).data
    const fulfillRes = await sales.request.put(`${API_URL}/export-receipt/${expData.id}/fulfill`, {
      data: { note: "DEMO fulfill", evidenceImages: ["https://example.com/evidence.png"], items: [{ itemId: expData.items[0].id, serialNumbers: [oldSerial] }] },
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
    log("STOCK", `Unit #${unitId} gửi NCC (SENT_TO_MANUFACTURER)`)

    // NCC trả unit MỚI: serial mới + replacementSourceSerials = serial cũ
    const locationId = await getE2ELocationId(stock)
    const warrImport = await stock.request.post(`${API_URL}/import-receipt`, {
      data: {
        originalWarrantyExportId: shipData.exportReceiptId,
        note: "DEMO RMA replaced",
        items: [{
          productId: 1, quantity: 1, unitPrice: 10000000, warrantyMonths: 24,
          warrantyResultType: "REPLACED",
          serialNumbers: [newSerial],
          replacementSourceSerials: [oldSerial],
          locationId,
        }],
      },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(warrImport.ok()).toBeTruthy()
    const warrImportId: number = (await warrImport.json()).data.id
    log("STOCK", `NCC trả unit MỚI (serial ${newSerial}) thay unit cũ`)

    // Unit cũ → RETURNED_TO_SUPPLIER; unit mới → RMA_REPAIRED_RETURNED
    const oldUnit = (await stock.request.get(`${API_URL}/product-unit/${unitId}`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })).json() as unknown as Promise<{ data: { status: string } }>
    expect((await oldUnit).data.status).toBe("RETURNED_TO_SUPPLIER")
    log("STOCK", `Unit cũ #${unitId} → RETURNED_TO_SUPPLIER (thuộc về NCC) ✓`)

    // Unit mới cần QC pass → IN_STOCK
    const newUnitsRes = await mgr.request.get(`${API_URL}/import-receipt/${warrImportId}/units`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    const newUnits = (await newUnitsRes.json()).data as Array<{ id: number; serialNumber: string }>
    const newUnit = newUnits.find((u) => u.serialNumber === newSerial)
    expect(newUnit).toBeTruthy()

    const passRes = await stock.request.post(`${API_URL}/qc-processing/qc-pass`, {
      data: { unitIds: [newUnit!.id] },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(passRes.ok()).toBeTruthy()
    const newUnitStatus = (await stock.request.get(`${API_URL}/product-unit/${newUnit!.id}`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })).json() as unknown as Promise<{ data: { status: string } }>
    expect((await newUnitStatus).data.status).toBe("IN_STOCK")
    log("STOCK", `Unit mới #${newUnit!.id} QC pass → IN_STOCK ✓`)

    await hold(mgr, 5000)
    await stockCtx.close()
    await mgrCtx.close()
    await salesCtx.close()
  })
})