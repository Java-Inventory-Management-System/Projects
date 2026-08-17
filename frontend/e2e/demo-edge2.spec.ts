import { test, expect } from "@playwright/test"
import { loginAsStock, loginAsManager, loginAsSales } from "./helpers/auth"
import { initTokens, getToken, API_URL, getE2ELocationId } from "./helpers/api"
import { chapter, log, hold } from "./helpers/demo"

test.use({ launchOptions: { slowMo: 5000 } })

test.describe("DEMO — Edge batch 2 (validation & negative)", () => {

  test("PO nhiều phiếu nhập: PARTIAL → COMPLETED; serial trùng bị chặn", async ({ browser }) => {
    const mgrCtx = await browser.newContext()
    const stockCtx = await browser.newContext()
    const mgr = await mgrCtx.newPage()
    const stock = await stockCtx.newPage()

    chapter("PO PARTIAL/COMPLETED: 2 phiếu nhập cho 1 đơn; nhập lại serial cũ bị chặn")
    await loginAsManager(mgr)
    await loginAsStock(stock)
    await initTokens(stock)

    const managerToken = await getToken("manager", mgr)
    const stockToken = await getToken("stock", stock)
    const locationId = await getE2ELocationId(stock)

    const stamp = Date.now()
    const s1 = `E2E-2P-${stamp}-A`
    const s2 = `E2E-2P-${stamp}-B`

    const poRes = await mgr.request.post(`${API_URL}/purchase-order`, {
      data: {
        supplierId: 1, expectedDate: "2026-12-31", note: "DEMO edge2 PO",
        invoiceCode: `INV-${stamp}`,
        items: [{ productId: 1, quantity: 2, unitPrice: 10000000 }],
      },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(poRes.ok()).toBeTruthy()
    const poId: number = (await poRes.json()).data.id

    await mgr.request.put(`${API_URL}/purchase-order/${poId}`, {
      data: { items: [{ productId: 1, quantity: 2, unitPrice: 10000000, serials: [s1, s2] }] },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    const openRes = await mgr.request.put(`${API_URL}/purchase-order/${poId}/open`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(openRes.ok()).toBeTruthy()
    log("MANAGER", `Tạo + mở PO #${poId} (2 đơn vị, khai serial trước)`)

    // Phiếu nhập 1: 1/2 đơn vị
    const imp1 = await stock.request.post(`${API_URL}/import-receipt`, {
      data: {
        supplierId: 1, purchaseOrderId: poId, note: "DEMO edge2 receipt 1",
        items: [{ productId: 1, quantity: 1, unitPrice: 10000000, warrantyMonths: 12, serialNumbers: [s1], locationId }],
      },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(imp1.ok()).toBeTruthy()
    const imp1Data = (await imp1.json()).data
    const imp1ItemId: number = imp1Data.items[0].id
    const c1 = await stock.request.put(`${API_URL}/import-receipt/${imp1Data.id}/confirm`, {
      data: { serials: [{ itemId: imp1ItemId, serialNumbers: [s1], locationId }] },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(c1.ok()).toBeTruthy()

    const poAfter1 = (await (await mgr.request.get(`${API_URL}/purchase-order/${poId}`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })).json()) as { data: { status: string } }
    expect(poAfter1.data.status).toBe("PARTIAL")
    log("STOCK", `Nhập phiếu 1 (${s1}) → PO #${poId} PARTIAL ✓`)

    // Phiếu nhập 2 với serial ĐÃ TỒN TẠI → bị chặn
    const imp2dup = await stock.request.post(`${API_URL}/import-receipt`, {
      data: {
        supplierId: 1, purchaseOrderId: poId, note: "DEMO edge2 dup",
        items: [{ productId: 1, quantity: 1, unitPrice: 10000000, warrantyMonths: 12, serialNumbers: [s1], locationId }],
      },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(imp2dup.ok()).toBeTruthy()
    const imp2dupData = (await imp2dup.json()).data
    const cDup = await stock.request.put(`${API_URL}/import-receipt/${imp2dupData.id}/confirm`, {
      data: { serials: [{ itemId: imp2dupData.items[0].id, serialNumbers: [s1], locationId }] },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(cDup.ok()).toBeFalsy()
    log("STOCK", "EDGE: xác nhận nhập serial đã tồn tại → bị chặn ✓")
    await stock.request.put(`${API_URL}/import-receipt/${imp2dupData.id}/cancel`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })

    // Phiếu nhập 3 (đúng serial) → PO COMPLETED
    const imp3 = await stock.request.post(`${API_URL}/import-receipt`, {
      data: {
        supplierId: 1, purchaseOrderId: poId, note: "DEMO edge2 receipt 2",
        items: [{ productId: 1, quantity: 1, unitPrice: 10000000, warrantyMonths: 12, serialNumbers: [s2], locationId }],
      },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(imp3.ok()).toBeTruthy()
    const imp3Data = (await imp3.json()).data
    const c2 = await stock.request.put(`${API_URL}/import-receipt/${imp3Data.id}/confirm`, {
      data: { serials: [{ itemId: imp3Data.items[0].id, serialNumbers: [s2], locationId }] },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(c2.ok()).toBeTruthy()

    const poAfter2 = (await (await mgr.request.get(`${API_URL}/purchase-order/${poId}`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })).json()) as { data: { status: string } }
    expect(poAfter2.data.status).toBe("COMPLETED")
    log("STOCK", `Nhập phiếu 2 (${s2}) → PO #${poId} COMPLETED ✓`)

    // PO COMPLETED → không nhập thêm được
    const blocked = await stock.request.post(`${API_URL}/import-receipt`, {
      data: {
        supplierId: 1, purchaseOrderId: poId, note: "blocked",
        items: [{ productId: 1, quantity: 1, unitPrice: 10000000, serialNumbers: [`E2E-2P-${stamp}-C`], locationId }],
      },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(blocked.ok()).toBeFalsy()
    log("STOCK", "EDGE: nhập tiếp khi PO đã COMPLETED → bị chặn ✓")

    await hold(mgr, 5000)
    await mgrCtx.close()
    await stockCtx.close()
  })

  test("Xuất kho: sai số lượng, sai serial, serial sản phẩm khác → đều bị chặn", async ({ browser }) => {
    const stockCtx = await browser.newContext()
    const salesCtx = await browser.newContext()
    const mgrCtx = await browser.newContext()
    const stock = await stockCtx.newPage()
    const sales = await salesCtx.newPage()
    const mgr = await mgrCtx.newPage()

    chapter("FULFILL VALIDATION: thiếu serial, serial không tồn tại, serial sản phẩm khác")
    await loginAsStock(stock)
    await loginAsSales(sales)
    await loginAsManager(mgr)
    await initTokens(stock)

    const stockToken = await getToken("stock", stock)
    const salesToken = await getToken("sales", sales)
    const managerToken = await getToken("manager", mgr)
    const locationId = await getE2ELocationId(stock)

    const stamp = Date.now()
    const sx = `E2E-FV-${stamp}-X`
    const sy = `E2E-FV-${stamp}-Y`

    // Tìm sản phẩm thứ 2 (serialized, khác product 1) để test serial sai sản phẩm
    const products = await stock.request.get(`${API_URL}/product`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    const productList = ((await products.json()) as { data: { content: Array<{ id: number; trackingType: string }> } }).data.content
    const otherProduct = productList.find((p) => p.id !== 1 && p.trackingType === "SERIALIZED")
    test.skip(!otherProduct, "Need a second serialized product")
    log("STOCK", `Sản phẩm phụ: #${otherProduct!.id} (để test serial sai sản phẩm)`)

    const poRes = await mgr.request.post(`${API_URL}/purchase-order`, {
      data: {
        supplierId: 1, expectedDate: "2026-12-31", note: "DEMO edge2 fulfill PO",
        invoiceCode: `INV-F-${stamp}`,
        items: [
          { productId: 1, quantity: 2, unitPrice: 10000000 },
          { productId: otherProduct!.id, quantity: 1, unitPrice: 5000000 },
        ],
      },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(poRes.ok()).toBeTruthy()
    const poId: number = (await poRes.json()).data.id
    await mgr.request.put(`${API_URL}/purchase-order/${poId}`, {
      data: {
        items: [
          { productId: 1, quantity: 2, unitPrice: 10000000, serials: [sx, sy] },
          { productId: otherProduct!.id, quantity: 1, unitPrice: 5000000, serials: [`E2E-FV-${stamp}-W`] },
        ],
      },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    await mgr.request.put(`${API_URL}/purchase-order/${poId}/open`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })

    const impRes = await stock.request.post(`${API_URL}/import-receipt`, {
      data: {
        supplierId: 1, purchaseOrderId: poId, note: "DEMO edge2 import",
        items: [
          { productId: 1, quantity: 2, unitPrice: 10000000, warrantyMonths: 12, serialNumbers: [sx, sy], locationId },
          { productId: otherProduct!.id, quantity: 1, unitPrice: 5000000, warrantyMonths: 12, serialNumbers: [`E2E-FV-${stamp}-W`], locationId },
        ],
      },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(impRes.ok()).toBeTruthy()
    const impData = (await impRes.json()).data
    const confirmRes = await stock.request.put(`${API_URL}/import-receipt/${impData.id}/confirm`, {
      data: {
        serials: [
          { itemId: impData.items[0].id, serialNumbers: [sx, sy], locationId },
          { itemId: impData.items[1].id, serialNumbers: [`E2E-FV-${stamp}-W`], locationId },
        ],
      },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(confirmRes.ok()).toBeTruthy()
    log("STOCK", "Nhập 2 unit sản phẩm 1 + 1 unit sản phẩm phụ")

    const expRes = await sales.request.post(`${API_URL}/export-receipt`, {
      data: {
        type: "SALE", customerId: 1, note: "DEMO edge2 fulfill",
        items: [{ productId: 1, quantity: 2, unitPrice: 15000000 }],
      },
      headers: { Authorization: `Bearer ${salesToken}` },
    })
    expect(expRes.ok()).toBeTruthy()
    const expData = (await expRes.json()).data
    const expItemId: number = expData.items[0].id
    log("SALES", `Phiếu xuất #${expData.id} (2 đơn vị)`)

    const evidenceImages = ["https://example.com/evidence.png"]

    const mismatch = await mgr.request.put(`${API_URL}/export-receipt/${expData.id}/fulfill`, {
      data: { note: "x", evidenceImages, items: [{ itemId: expItemId, serialNumbers: [sx], actualQuantity: 1 }] },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(mismatch.status()).toBe(400)
    log("MANAGER", "EDGE: duyệt 1/2 đơn vị (thiếu serial) → 400 bị chặn ✓")

    const notFound = await mgr.request.put(`${API_URL}/export-receipt/${expData.id}/fulfill`, {
      data: { note: "x", evidenceImages, items: [{ itemId: expItemId, serialNumbers: [sx, "E2E-NO-SUCH"], actualQuantity: 2 }] },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(notFound.status()).toBe(400)
    log("MANAGER", "EDGE: serial không tồn tại → 400 ✓")

    const wrongProduct = await mgr.request.put(`${API_URL}/export-receipt/${expData.id}/fulfill`, {
      data: { note: "x", evidenceImages, items: [{ itemId: expItemId, serialNumbers: [sx, `E2E-FV-${stamp}-W`], actualQuantity: 2 }] },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(wrongProduct.status()).toBe(400)
    log("MANAGER", "EDGE: serial thuộc sản phẩm khác → 400 ✓")

    const ok = await mgr.request.put(`${API_URL}/export-receipt/${expData.id}/fulfill`, {
      data: { note: "x", evidenceImages, items: [{ itemId: expItemId, serialNumbers: [sx, sy], actualQuantity: 2 }] },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(ok.ok()).toBeTruthy()
    log("MANAGER", "Duyệt đúng serial → phiếu xuất HOÀN TẤT ✓")

    await hold(mgr, 5000)
    await stockCtx.close()
    await salesCtx.close()
    await mgrCtx.close()
  })

  test("Dispose trả NCC từ khu hủy + thùng: vượt sức chứa, seal unit đã trong thùng", async ({ browser }) => {
    const stockCtx = await browser.newContext()
    const salesCtx = await browser.newContext()
    const mgrCtx = await browser.newContext()
    const stock = await stockCtx.newPage()
    const sales = await salesCtx.newPage()
    const mgr = await mgrCtx.newPage()

    chapter("DISPOSE + BOX: REJECTED_RETURN, vượt max thùng, seal trùng unit")
    await loginAsStock(stock)
    await loginAsSales(sales)
    await loginAsManager(mgr)
    await initTokens(stock)

    const stockToken = await getToken("stock", stock)
    const salesToken = await getToken("sales", sales)
    const managerToken = await getToken("manager", mgr)
    const locationId = await getE2ELocationId(stock)

    const stamp = Date.now()
    // 21 unit để vượt SMALL (max 20) + 1 unit cho REJECTED_RETURN
    const serials = Array.from({ length: 22 }, (_, i) => `E2E-DB-${stamp}-${i}`)

    const poRes = await mgr.request.post(`${API_URL}/purchase-order`, {
      data: {
        supplierId: 1, expectedDate: "2026-12-31", note: "DEMO edge2 box",
        invoiceCode: `INV-B-${stamp}`,
        items: [{ productId: 1, quantity: 22, unitPrice: 10000000 }],
      },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(poRes.ok()).toBeTruthy()
    const poId: number = (await poRes.json()).data.id
    await mgr.request.put(`${API_URL}/purchase-order/${poId}`, {
      data: { items: [{ productId: 1, quantity: 22, unitPrice: 10000000, serials }] },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    await mgr.request.put(`${API_URL}/purchase-order/${poId}/open`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })

    const impRes = await stock.request.post(`${API_URL}/import-receipt`, {
      data: {
        supplierId: 1, purchaseOrderId: poId, note: "DEMO edge2 box import",
        items: [{ productId: 1, quantity: 22, unitPrice: 10000000, warrantyMonths: 12, serialNumbers: serials, locationId }],
      },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(impRes.ok()).toBeTruthy()
    const impData = (await impRes.json()).data
    const itemId: number = impData.items[0].id
    const confirmRes = await stock.request.put(`${API_URL}/import-receipt/${impData.id}/confirm`, {
      data: { serials: [{ itemId, serialNumbers: serials, locationId }] },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(confirmRes.ok()).toBeTruthy()
    log("STOCK", "Nhập 22 unit (đủ để test vượt sức chứa)")

    const unitsRes = await stock.request.get(`${API_URL}/import-receipt/${impData.id}/units`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    const units: Array<{ id: number; serialNumber: string }> = (await unitsRes.json()).data

    // EDGE: seal 21 unit vào thùng SMALL (max 20) → chặn
    const overBox = await stock.request.post(`${API_URL}/box/seal`, {
      data: { unitIds: units.slice(0, 21).map((u) => u.id), locationId, note: "over", boxType: "SMALL" },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(overBox.status()).toBe(400)
    log("STOCK", "EDGE: đóng 21 unit vào thùng SMALL (max 20) → 400 ✓")

    // Seal 20 unit OK
    const first20 = units.slice(0, 20).map((u) => u.id)
    const sealOk = await stock.request.post(`${API_URL}/box/seal`, {
      data: { unitIds: first20, locationId, note: "DEMO ok", boxType: "SMALL" },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(sealOk.ok()).toBeTruthy()
    const boxId: number = (await sealOk.json()).data.id
    log("STOCK", `Đóng thùng #${boxId} (20/20 unit) ✓`)

    // EDGE: seal lại unit đã nằm trong thùng → chặn
    const reseal = await stock.request.post(`${API_URL}/box/seal`, {
      data: { unitIds: [units[0].id], locationId, note: "dup", boxType: "SMALL" },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(reseal.status()).toBe(400)
    log("STOCK", "EDGE: seal unit đã trong thùng khác → 400 ✓")

    // REJECTED_RETURN: bán unit → khách trả hàng hư → khu hủy → trả lại NCC
    const badUnitId = units[21].id
    const badSerial = units[21].serialNumber
    const sellRes = await sales.request.post(`${API_URL}/export-receipt`, {
      data: {
        type: "SALE", customerId: 1, note: "DEMO edge2 sell",
        items: [{ productId: 1, quantity: 1, unitPrice: 15000000 }],
      },
      headers: { Authorization: `Bearer ${salesToken}` },
    })
    expect(sellRes.ok()).toBeTruthy()
    const sellData = (await sellRes.json()).data
    const sellFulfill = await sales.request.put(`${API_URL}/export-receipt/${sellData.id}/fulfill`, {
      data: { note: "DEMO", evidenceImages: ["https://example.com/evidence.png"], items: [{ itemId: sellData.items[0].id, serialNumbers: [badSerial], actualQuantity: 1 }] },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(sellFulfill.ok()).toBeTruthy()
    log("SALES", `Bán unit ${badSerial} cho khách`)

    const retRes = await sales.request.post(`${API_URL}/return-receipts`, {
      data: {
        customerId: 1,
        originalExportReceiptId: sellData.id,
        reason: "DEFECTIVE",
        note: "DEMO edge2 reject-return",
        items: [{
          productUnitId: badUnitId, productId: 1, quantity: 1,
          condition: "DEFECTIVE", resultingAction: "SCRAP",
          description: "DEMO reject-return", evidenceImage: "https://example.com/e.png",
          defectCategoryId: 2,
        }],
      },
      headers: { Authorization: `Bearer ${salesToken}` },
    })
    expect(retRes.ok()).toBeTruthy()
    const retId: number = (await retRes.json()).data.id
    await mgr.request.put(`${API_URL}/return-receipts/${retId}/approve`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    log("SALES", `Trả hàng hư #${retId} → duyệt → unit ${serials[21]} vào khu hủy (PENDING_DISPOSAL)`)

    const rejectRet = await stock.request.post(`${API_URL}/qc-processing/dispose-confirm`, {
      data: { unitIds: [badUnitId], action: "REJECTED_RETURN", supplierId: 1, note: "DEMO trả NCC" },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(rejectRet.ok()).toBeTruthy()
    const unitAfter = (await stock.request.get(`${API_URL}/product-unit/${badUnitId}`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })).json() as unknown as Promise<{ data: { status: string } }>
    expect((await unitAfter).data.status).toBe("REJECTED_RETURN")
    log("STOCK", "EDGE: dispose REJECTED_RETURN từ khu hủy → unit trả NCC ✓")

    await hold(mgr, 5000)
    await stockCtx.close()
    await salesCtx.close()
    await mgrCtx.close()
  })

  test("Giá trùng với giá hiện tại bị chặn + QC pass sai trạng thái bị chặn", async ({ browser }) => {
    const mgrCtx = await browser.newContext()
    const stockCtx = await browser.newContext()
    const mgr = await mgrCtx.newPage()
    const stock = await stockCtx.newPage()

    chapter("PRICE ADJ SAME PRICE + QC PASS SAI TRẠNG THÁI")
    await loginAsManager(mgr)
    await loginAsStock(stock)
    await initTokens(stock)

    const managerToken = await getToken("manager", mgr)
    const stockToken = await getToken("stock", stock)
    const locationId = await getE2ELocationId(stock)

    const stamp = Date.now()
    const serial = `E2E-PQ-${stamp}`

    const poRes = await mgr.request.post(`${API_URL}/purchase-order`, {
      data: {
        supplierId: 1, expectedDate: "2026-12-31", note: "DEMO edge2 pq",
        invoiceCode: `INV-P-${stamp}`,
        items: [{ productId: 1, quantity: 1, unitPrice: 10000000 }],
      },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(poRes.ok()).toBeTruthy()
    const poId: number = (await poRes.json()).data.id
    await mgr.request.put(`${API_URL}/purchase-order/${poId}`, {
      data: { items: [{ productId: 1, quantity: 1, unitPrice: 10000000, serials: [serial] }] },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    await mgr.request.put(`${API_URL}/purchase-order/${poId}/open`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })

    const impRes = await stock.request.post(`${API_URL}/import-receipt`, {
      data: {
        supplierId: 1, purchaseOrderId: poId, note: "DEMO edge2 pq import",
        items: [{ productId: 1, quantity: 1, unitPrice: 10000000, warrantyMonths: 12, serialNumbers: [serial], locationId }],
      },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(impRes.ok()).toBeTruthy()
    const impData = (await impRes.json()).data
    const impItemId: number = impData.items[0].id
    await stock.request.put(`${API_URL}/import-receipt/${impData.id}/confirm`, {
      data: { serials: [{ itemId: impItemId, serialNumbers: [serial], locationId }] },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    log("STOCK", `Nhập unit ${serial} giá 10.000.000`)

    const samePrice = await mgr.request.post(`${API_URL}/price-adjustment`, {
      data: { importReceiptItemId: impItemId, newPrice: 10000000, reason: "DEMO same price" },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(samePrice.status()).toBe(400)
    log("MANAGER", "EDGE: điều chỉnh giá bằng đúng giá hiện tại → 400 ✓")

    // QC pass unit đang IN_STOCK (không phải chờ QC) → chặn
    const unitsRes = await stock.request.get(`${API_URL}/import-receipt/${impData.id}/units`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    const unitId: number = ((await unitsRes.json()) as { data: Array<{ id: number }> }).data[0].id
    const badPass = await stock.request.post(`${API_URL}/qc-processing/qc-pass`, {
      data: { unitIds: [unitId] },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(badPass.status()).toBe(400)
    log("STOCK", "EDGE: QC pass unit đang IN_STOCK (chưa qua trả hàng) → 400 ✓")

    await hold(mgr, 5000)
    await mgrCtx.close()
    await stockCtx.close()
  })

  test("Kiểm kê có lệch → hoàn tất tự tạo phiếu điều chỉnh", async ({ browser }) => {
    const stockCtx = await browser.newContext()
    const mgrCtx = await browser.newContext()
    const stock = await stockCtx.newPage()
    const mgr = await mgrCtx.newPage()

    chapter("STOCK CHECK VARIANCE: ghi nhận lệch trạng thái → hoàn tất → tự sinh điều chỉnh")
    await loginAsStock(stock)
    await loginAsManager(mgr)
    await initTokens(stock)

    const stockToken = await getToken("stock", stock)
    const managerToken = await getToken("manager", mgr)
    const locationId = await getE2ELocationId(stock)

    const stamp = Date.now()
    const serial = `E2E-SCV-${stamp}`

    const poRes = await mgr.request.post(`${API_URL}/purchase-order`, {
      data: {
        supplierId: 1, expectedDate: "2026-12-31", note: "DEMO edge2 scv",
        invoiceCode: `INV-S-${stamp}`,
        items: [{ productId: 1, quantity: 1, unitPrice: 10000000 }],
      },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(poRes.ok()).toBeTruthy()
    const poId: number = (await poRes.json()).data.id
    await mgr.request.put(`${API_URL}/purchase-order/${poId}`, {
      data: { items: [{ productId: 1, quantity: 1, unitPrice: 10000000, serials: [serial] }] },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    await mgr.request.put(`${API_URL}/purchase-order/${poId}/open`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })

    const impRes = await stock.request.post(`${API_URL}/import-receipt`, {
      data: {
        supplierId: 1, purchaseOrderId: poId, note: "DEMO edge2 scv import",
        items: [{ productId: 1, quantity: 1, unitPrice: 10000000, warrantyMonths: 12, serialNumbers: [serial], locationId }],
      },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(impRes.ok()).toBeTruthy()
    const impData = (await impRes.json()).data
    const itemId: number = impData.items[0].id
    await stock.request.put(`${API_URL}/import-receipt/${impData.id}/confirm`, {
      data: { serials: [{ itemId, serialNumbers: [serial], locationId }] },
      headers: { Authorization: `Bearer ${stockToken}` },
    })

    const checkRes = await stock.request.post(`${API_URL}/stock-check`, {
      data: { scopeType: "ZONE", scopeId: 1, note: "DEMO edge2 scv" },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(checkRes.ok()).toBeTruthy()
    const checkId: number = (await checkRes.json()).data.id
    await stock.request.put(`${API_URL}/stock-check/${checkId}/start`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    log("STOCK", `Tạo + bắt đầu kiểm kê #${checkId}`)

    const detail = await stock.request.get(`${API_URL}/stock-check/${checkId}`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    const items = ((await detail.json()) as { data: { items: Array<{ productUnitId: number; expectedStatus: string }> } }).data.items
    expect(items.length).toBeGreaterThan(0)

    // Ghi nhận 1 unit LỆCH: sổ sách IN_STOCK nhưng thực tế DAMAGED_IN_STORAGE (kèm ảnh)
    const damagedItem = items.find((it) => it.expectedStatus === "IN_STOCK")
    expect(damagedItem).toBeTruthy()
    const recordRes = await stock.request.put(`${API_URL}/stock-check/${checkId}/items`, {
      data: {
        items: items.map((it) =>
          it.productUnitId === damagedItem!.productUnitId
            ? { productUnitId: it.productUnitId, actualStatus: "DAMAGED_IN_STORAGE", countedQuantity: 1, note: "DEMO lệch", photo: "https://example.com/photo.png" }
            : { productUnitId: it.productUnitId, actualStatus: it.expectedStatus || "IN_STOCK", countedQuantity: 1, note: "ok" },
        ),
      },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(recordRes.ok()).toBeTruthy()
    log("STOCK", `Ghi nhận 1 unit lệch: sổ IN_STOCK nhưng thực tế hư hỏng (DAMAGED_IN_STORAGE)`)

    const completeRes = await stock.request.put(`${API_URL}/stock-check/${checkId}/complete`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(completeRes.ok()).toBeTruthy()

    const adjRes = await mgr.request.get(`${API_URL}/stock-adjustment/by-unit/${damagedItem!.productUnitId}`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    const adjustments = ((await adjRes.json()) as { data: { content: Array<{ sourceType: string; sourceId: number; type: string }> } }).data.content
    const autoAdj = adjustments.find((a) => a.sourceType === "STOCK_CHECK" && a.sourceId === checkId)
    expect(autoAdj).toBeTruthy()
    expect(autoAdj!.type).toBe("DAMAGED")
    log("STOCK", `Hoàn tất → tự tạo phiếu điều chỉnh DAMAGED #${autoAdj!.sourceId} từ kiểm kê #${checkId} ✓`)

    await hold(mgr, 5000)
    await stockCtx.close()
    await mgrCtx.close()
  })
})