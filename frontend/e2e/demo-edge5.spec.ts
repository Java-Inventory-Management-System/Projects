import { expect, test } from "@playwright/test"
import { initTokens, getToken, getE2ELocationId, API_URL } from "./helpers/api"
import { loginAsStock, loginAsManager, loginAsSales } from "./helpers/auth"
import { chapter, log, hold } from "./helpers/demo"

test.use({ launchOptions: { slowMo: 5000 } })

test.describe("DEMO — Edge batch 5 (export, return, QC/adj/warranty, kiểm kê, price/master)", () => {
  test("Xuất kho: thiếu customer/reason/supplier/items, fulfill sai serials, bulk thiếu lẻ, unit trong kiểm kê", async ({ browser }) => {
    chapter("EDGE 5.1: export validation")
    const stock = await browser.newPage()
    const mgr = await browser.newPage()
    const sales = await browser.newPage()
    await loginAsStock(stock)
    await loginAsManager(mgr)
    await loginAsSales(sales)
    await initTokens(stock)

    const stockToken = await getToken("stock", stock)
    const managerToken = await getToken("manager", mgr)
    const salesToken = await getToken("sales", sales)
    const locationId = await getE2ELocationId(stock)
    const zoneABin = await createBin(stock, stockToken, "A", "E2E", 50)
    const stamp = Date.now()

    // Bulk: nhập 3 unit, seal 1 → còn 2 lẻ
    const bulk = await createBulkProduct(mgr, managerToken, stamp)
    const poB = await createPO(mgr, managerToken, bulk, 3, `INV-C5-${stamp}-B`)
    const impB = await importConfirm(stock, stockToken, poB, bulk, 3, locationId, "DEMO C5 bulk", null)
    const bulkUnits = await getBulkUnits(stock, stockToken, impB)
    const sealBulk = await stock.request.post(`${API_URL}/box/seal`, {
      data: { unitIds: [bulkUnits[0]], items: [{ unitId: bulkUnits[0], quantity: 1 }], locationId, note: "DEMO", boxType: "SMALL" },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(sealBulk.ok()).toBeTruthy()
    log("STOCK", "Nhập 3kg bulk, đóng thùng 1kg → còn 2kg lẻ")

    // Serial: nhập A, B, C vào zone A (C dùng cho test kiểm kê)
    const sA = `E2E-C5-${stamp}-A`
    const sB = `E2E-C5-${stamp}-B`
    const sC = `E2E-C5-${stamp}-C`
    const poS = await createPO(mgr, managerToken, 1, 3, `INV-C5-${stamp}-S`)
    await importConfirm(stock, stockToken, poS, 1, 3, zoneABin, "DEMO C5 serial", [sA, sB, sC])

    const expPayload = (over: Record<string, unknown>) => ({ type: "SALE", customerId: 1, note: "DEMO C5", items: [{ productId: 1, quantity: 1, unitPrice: 15000000 }], ...over })

    const noCustomer = await sales.request.post(`${API_URL}/export-receipt`, {
      data: expPayload({ customerId: undefined }),
      headers: { Authorization: `Bearer ${salesToken}` },
    })
    expect(noCustomer.status()).toBe(400)
    log("SALES", "EDGE: xuất SALE không có khách hàng → 400 ✓")

    const otherNoReason = await sales.request.post(`${API_URL}/export-receipt`, {
      data: expPayload({ type: "OTHER" }),
      headers: { Authorization: `Bearer ${salesToken}` },
    })
    expect(otherNoReason.status()).toBe(400)
    log("SALES", "EDGE: xuất OTHER không ghi lý do → 400 ✓")

    const noSupplier = await sales.request.post(`${API_URL}/export-receipt`, {
      data: expPayload({ type: "RETURN_SUPPLIER" }),
      headers: { Authorization: `Bearer ${salesToken}` },
    })
    expect(noSupplier.status()).toBe(400)
    log("SALES", "EDGE: trả NCC không chọn nhà cung cấp → 400 ✓")

    const noItems = await sales.request.post(`${API_URL}/export-receipt`, {
      data: expPayload({ items: [] }),
      headers: { Authorization: `Bearer ${salesToken}` },
    })
    expect(noItems.status()).toBe(400)
    log("SALES", "EDGE: phiếu xuất không có sản phẩm → 400 ✓")

    // Fulfill thiếu serials
    const exp1 = await sales.request.post(`${API_URL}/export-receipt`, {
      data: expPayload({}),
      headers: { Authorization: `Bearer ${salesToken}` },
    })
    expect(exp1.ok()).toBeTruthy()
    const exp1Id: number = (await exp1.json()).data.id
    const item1Id: number = (await (await sales.request.get(`${API_URL}/export-receipt/${exp1Id}`, {
      headers: { Authorization: `Bearer ${salesToken}` },
    })).json()).data.items[0].id
    const noSerials = await mgr.request.put(`${API_URL}/export-receipt/${exp1Id}/fulfill`, {
      data: { note: "DEMO", evidenceImages: ["https://example.com/e.png"], items: [{ itemId: item1Id, actualQuantity: 1 }] },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(noSerials.status()).toBe(400)
    log("MANAGER", "EDGE: duyệt xuất không kê serial → 400 ✓")

    const wrongItem = await mgr.request.put(`${API_URL}/export-receipt/${exp1Id}/fulfill`, {
      data: { note: "DEMO", evidenceImages: ["https://example.com/e.png"], items: [{ itemId: 99999999, serialNumbers: [sA], actualQuantity: 1 }] },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(wrongItem.status()).toBe(400)
    log("MANAGER", "EDGE: duyệt với item không thuộc phiếu → 400 ✓")

    // Bulk: fulfill thiếu actualQuantity + không đủ lẻ
    const expB = await sales.request.post(`${API_URL}/export-receipt`, {
      data: { type: "SALE", customerId: 1, note: "DEMO C5 bulk exp", items: [{ productId: bulk, quantity: 2, unitPrice: 45000 }] },
      headers: { Authorization: `Bearer ${salesToken}` },
    })
    expect(expB.ok()).toBeTruthy()
    const expBId: number = (await expB.json()).data.id
    const itemBId: number = (await (await sales.request.get(`${API_URL}/export-receipt/${expBId}`, {
      headers: { Authorization: `Bearer ${salesToken}` },
    })).json()).data.items[0].id
    const noQty = await mgr.request.put(`${API_URL}/export-receipt/${expBId}/fulfill`, {
      data: { note: "DEMO", evidenceImages: ["https://example.com/e.png"], items: [{ itemId: itemBId }] },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(noQty.status()).toBe(400)
    log("MANAGER", "EDGE: duyệt bulk không khai actualQuantity → 400 ✓")

    const sealBulk2 = await stock.request.post(`${API_URL}/box/seal`, {
      data: { unitIds: [bulkUnits[0]], items: [{ unitId: bulkUnits[0], quantity: 1 }], locationId, note: "DEMO", boxType: "SMALL" },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(sealBulk2.ok()).toBeTruthy()
    log("STOCK", "Đóng thêm 1kg → chỉ còn 1kg lẻ")

    const notEnoughLoose = await mgr.request.put(`${API_URL}/export-receipt/${expBId}/fulfill`, {
      data: { note: "DEMO", evidenceImages: ["https://example.com/e.png"], items: [{ itemId: itemBId, actualQuantity: 2 }] },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(notEnoughLoose.status()).toBe(400)
    log("MANAGER", "EDGE: bulk cần 2kg nhưng lẻ chỉ có 1kg (1kg trong thùng seal) → 400 ✓")

    // Unit trong kiểm kê
    const checkRes = await stock.request.post(`${API_URL}/stock-check`, {
      data: { scopeType: "ZONE", scopeId: 1, note: "DEMO C5 check" },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    const checkId: number = (await checkRes.json()).data.id
    await stock.request.put(`${API_URL}/stock-check/${checkId}/start`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    const exp2 = await sales.request.post(`${API_URL}/export-receipt`, {
      data: expPayload({}),
      headers: { Authorization: `Bearer ${salesToken}` },
    })
    const exp2Id: number = (await exp2.json()).data.id
    const item2Id: number = (await (await sales.request.get(`${API_URL}/export-receipt/${exp2Id}`, {
      headers: { Authorization: `Bearer ${salesToken}` },
    })).json()).data.items[0].id
    const inCheck = await mgr.request.put(`${API_URL}/export-receipt/${exp2Id}/fulfill`, {
      data: { note: "DEMO", evidenceImages: ["https://example.com/e.png"], items: [{ itemId: item2Id, serialNumbers: [sC], actualQuantity: 1 }] },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(inCheck.status()).toBe(400)
    log("MANAGER", "EDGE: xuất serial đang trong phiếu kiểm kê → 400 ✓")
    await stock.request.put(`${API_URL}/stock-check/${checkId}/cancel`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })

    await hold(stock, 5000)
  })

  test("Trả hàng: chưa bán, không trong phiếu xuất, sai khách, vượt số lượng, lệch loại, thiếu bằng chứng, loại hỏng", async ({ browser }) => {
    chapter("EDGE 5.2: return validation")
    const stock = await browser.newPage()
    const mgr = await browser.newPage()
    const sales = await browser.newPage()
    await loginAsStock(stock)
    await loginAsManager(mgr)
    await loginAsSales(sales)
    await initTokens(stock)

    const stockToken = await getToken("stock", stock)
    const managerToken = await getToken("manager", mgr)
    const salesToken = await getToken("sales", sales)
    const locationId = await getE2ELocationId(stock)
    const stamp = Date.now()

    // Nhập A,B,C,D,E + bulk 1kg
    const sA = `E2E-C5-${stamp}-RA`
    const sB = `E2E-C5-${stamp}-RB`
    const sC = `E2E-C5-${stamp}-RC`
    const sD = `E2E-C5-${stamp}-RD`
    const sE = `E2E-C5-${stamp}-RE`
    const poS = await createPO(mgr, managerToken, 1, 5, `INV-C5-${stamp}-R`)
    const impS = await importConfirm(stock, stockToken, poS, 1, 5, locationId, "DEMO C5 ret", [sA, sB, sC, sD, sE])
    const uS = await getUnits(stock, stockToken, impS)

    const bulk = await createBulkProduct(mgr, managerToken, stamp)
    const poB = await createPO(mgr, managerToken, bulk, 1, `INV-C5-${stamp}-RB`)
    await importConfirm(stock, stockToken, poB, bulk, 1, locationId, "DEMO C5 ret bulk", null)

    // Bán: export1 (KH1) = [A,B,D]; export2 (KH2) = [C]; bulk bán 1kg
    const sell = async (customerId: number, serials: string[]) => {
      const res = await sales.request.post(`${API_URL}/export-receipt`, {
        data: { type: "SALE", customerId, note: "DEMO C5 sell", items: [{ productId: 1, quantity: serials.length, unitPrice: 15000000 }] },
        headers: { Authorization: `Bearer ${salesToken}` },
      })
      const id: number = (await res.json()).data.id
      const itemId: number = (await (await sales.request.get(`${API_URL}/export-receipt/${id}`, {
        headers: { Authorization: `Bearer ${salesToken}` },
      })).json()).data.items[0].id
      const f = await mgr.request.put(`${API_URL}/export-receipt/${id}/fulfill`, {
        data: { note: "DEMO", evidenceImages: ["https://example.com/e.png"], items: [{ itemId, serialNumbers: serials, actualQuantity: serials.length }] },
        headers: { Authorization: `Bearer ${managerToken}` },
      })
      expect(f.ok()).toBeTruthy()
      return id
    }
    const exp1 = await sell(1, [sA, sB, sD])
    const exp2 = await sell(2, [sC])
    const sellBulk = await sales.request.post(`${API_URL}/export-receipt`, {
      data: { type: "SALE", customerId: 1, note: "DEMO C5 sell bulk", items: [{ productId: bulk, quantity: 1, unitPrice: 45000 }] },
      headers: { Authorization: `Bearer ${salesToken}` },
    })
    const expBId: number = (await sellBulk.json()).data.id
    const itemBId: number = (await (await sales.request.get(`${API_URL}/export-receipt/${expBId}`, {
      headers: { Authorization: `Bearer ${salesToken}` },
    })).json()).data.items[0].id
    const fB = await mgr.request.put(`${API_URL}/export-receipt/${expBId}/fulfill`, {
      data: { note: "DEMO", evidenceImages: ["https://example.com/e.png"], items: [{ itemId: itemBId, actualQuantity: 1 }] },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(fB.ok()).toBeTruthy()
    log("SALES", `Bán ${sA}, ${sB}, ${sD} cho KH1; ${sC} cho KH2; 1kg bulk`)

    const retPayload = (unitSerial: string | null, over: Record<string, unknown>) => ({
      customerId: 1,
      originalExportReceiptId: exp1,
      reason: "WARRANTY_CLAIM",
      note: "DEMO C5 ret",
      items: [{
        productUnitId: unitSerial ? uS[unitSerial] : undefined,
        productId: 1, quantity: 1,
        condition: "DEFECTIVE", resultingAction: "WARRANTY_TRANSFER",
        description: "DEMO lỗi", evidenceImage: "https://example.com/e.png",
        defectCategoryId: 2,
      }],
      ...over,
    })

    const notSold = await sales.request.post(`${API_URL}/return-receipts`, {
      data: retPayload(sE, {}),
      headers: { Authorization: `Bearer ${salesToken}` },
    })
    expect(notSold.status()).toBe(400)
    log("SALES", "EDGE: trả máy chưa bán → 400 ✓")

    const notInExport = await sales.request.post(`${API_URL}/return-receipts`, {
      data: retPayload(sA, { originalExportReceiptId: exp2 }),
      headers: { Authorization: `Bearer ${salesToken}` },
    })
    expect(notInExport.status()).toBe(400)
    log("SALES", "EDGE: máy không thuộc phiếu xuất khai báo → 400 ✓")

    const wrongCustomer = await sales.request.post(`${API_URL}/return-receipts`, {
      data: retPayload(sC, { customerId: 1, originalExportReceiptId: exp2 }),
      headers: { Authorization: `Bearer ${salesToken}` },
    })
    expect(wrongCustomer.status()).toBe(400)
    log("SALES", "EDGE: phiếu xuất không thuộc khách hàng này → 400 ✓")

    const exceeds = await sales.request.post(`${API_URL}/return-receipts`, {
      data: { customerId: 1, originalExportReceiptId: expBId, reason: "WARRANTY_CLAIM", note: "DEMO C5 ret", items: [{ productId: bulk, quantity: 2, condition: "DEFECTIVE", resultingAction: "REFUND", description: "DEMO lỗi", evidenceImage: "https://example.com/e.png", defectCategoryId: 2 }] },
      headers: { Authorization: `Bearer ${salesToken}` },
    })
    expect(exceeds.status()).toBe(400)
    log("SALES", "EDGE: trả 2kg nhưng chỉ mua 1kg bulk → 400 ✓")

    const mismatch = await sales.request.post(`${API_URL}/return-receipts`, {
      data: { ...retPayload(sB, {}), items: [{ productUnitId: uS[sB], productId: 1, quantity: 1, condition: "GOOD", resultingAction: "REJECT" }] },
      headers: { Authorization: `Bearer ${salesToken}` },
    })
    expect(mismatch.status()).toBe(400)
    log("SALES", "EDGE: máy GOOD nhưng chọn xử lý REJECT → 400 ✓")

    const noEvidence = await sales.request.post(`${API_URL}/return-receipts`, {
      data: { ...retPayload(sD, {}), items: [{ productUnitId: uS[sD], productId: 1, quantity: 1, condition: "DEFECTIVE", resultingAction: "WARRANTY_TRANSFER", defectCategoryId: 2 }] },
      headers: { Authorization: `Bearer ${salesToken}` },
    })
    expect(noEvidence.status()).toBe(400)
    log("SALES", "EDGE: trả lỗi không kèm mô tả/bằng chứng → 400 ✓")

    const mixed = await sales.request.post(`${API_URL}/return-receipts`, {
      data: {
        customerId: 1, originalExportReceiptId: exp1, reason: "WARRANTY_CLAIM", note: "DEMO C5 mixed",
        items: [
          { productUnitId: uS[sA], productId: 1, quantity: 1, condition: "DEFECTIVE", resultingAction: "WARRANTY_TRANSFER", description: "DEMO", evidenceImage: "https://example.com/e.png", defectCategoryId: 2 },
          { productId: bulk, quantity: 1, condition: "DEFECTIVE", resultingAction: "WARRANTY_TRANSFER", description: "DEMO", evidenceImage: "https://example.com/e.png", defectCategoryId: 2 },
        ],
      },
      headers: { Authorization: `Bearer ${salesToken}` },
    })
    expect(mixed.status()).toBe(400)
    log("SALES", "EDGE: trả chung serial + bulk trong 1 phiếu → 400 ✓")

    const badReason = await sales.request.post(`${API_URL}/return-receipts`, {
      data: retPayload(sA, { reason: "BOGUS" }),
      headers: { Authorization: `Bearer ${salesToken}` },
    })
    expect(badReason.status()).toBe(400)
    log("SALES", "EDGE: lý do trả không hợp lệ → 400 ✓")

    const badAction = await sales.request.post(`${API_URL}/return-receipts`, {
      data: { ...retPayload(sA, {}), items: [{ productUnitId: uS[sA], productId: 1, quantity: 1, condition: "DEFECTIVE", resultingAction: "BOGUS", description: "DEMO", evidenceImage: "https://example.com/e.png", defectCategoryId: 2 }] },
      headers: { Authorization: `Bearer ${salesToken}` },
    })
    expect(badAction.status()).toBe(400)
    log("SALES", "EDGE: hướng xử lý không hợp lệ → 400 ✓")

    await hold(stock, 5000)
  })

  test("QC & điều chỉnh: dispose unit chưa pending, danh sách rỗng, điều chỉnh unit trong kiểm kê; bảo hành: sai kết quả, sai serial, nhận 2 lần", async ({ browser }) => {
    chapter("EDGE 5.3: QC / adjustment / warranty validation")
    const stock = await browser.newPage()
    const mgr = await browser.newPage()
    const sales = await browser.newPage()
    await loginAsStock(stock)
    await loginAsManager(mgr)
    await loginAsSales(sales)
    await initTokens(stock)

    const stockToken = await getToken("stock", stock)
    const managerToken = await getToken("manager", mgr)
    const salesToken = await getToken("sales", sales)
    const locationId = await getE2ELocationId(stock)
    const zoneABin = await createBin(stock, stockToken, "A", "E2E", 50)
    const stamp = Date.now()

    const sA = `E2E-C5-${stamp}-QA`
    const sC = `E2E-C5-${stamp}-QC`
    const poS = await createPO(mgr, managerToken, 1, 4, `INV-C5-${stamp}-Q`)
    const impS = await importConfirm(stock, stockToken, poS, 1, 4, locationId, "DEMO C5 qc", [sA, sC, `E2E-C5-${stamp}-QX`, `E2E-C5-${stamp}-QY`])
    const uS = await getUnits(stock, stockToken, impS)

    // Dispose unit IN_STOCK (chưa pending) + danh sách rỗng
    const disposeStock = await stock.request.post(`${API_URL}/qc-processing/dispose-confirm`, {
      data: { unitIds: [uS[sA]], action: "DISPOSED", note: "DEMO" },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(disposeStock.status()).toBe(400)
    log("STOCK", "EDGE: hủy unit chưa qua QC (đang IN_STOCK) → 400 ✓")

    const passEmpty = await stock.request.post(`${API_URL}/qc-processing/qc-pass`, {
      data: { unitIds: [] },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(passEmpty.status()).toBe(400)
    log("STOCK", "EDGE: QC pass không có unit nào → 400 ✓")

    const disposeEmpty = await stock.request.post(`${API_URL}/qc-processing/dispose-confirm`, {
      data: { unitIds: [], action: "DISPOSED", note: "DEMO" },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(disposeEmpty.status()).toBe(400)
    log("STOCK", "EDGE: dispose không có unit nào → 400 ✓")

    // Điều chỉnh unit trong kiểm kê
    const poChk = await createPO(mgr, managerToken, 1, 1, `INV-C5-${stamp}-CK`)
    const impChk = await importConfirm(stock, stockToken, poChk, 1, 1, zoneABin, "DEMO C5 check adj", [`E2E-C5-${stamp}-CK1`])
    const uChk = Object.values(await getUnits(stock, stockToken, impChk))[0]
    const checkRes = await stock.request.post(`${API_URL}/stock-check`, {
      data: { scopeType: "ZONE", scopeId: 1, note: "DEMO C5 check2" },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    const checkId: number = (await checkRes.json()).data.id
    await stock.request.put(`${API_URL}/stock-check/${checkId}/start`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    const adjChecked = await stock.request.post(`${API_URL}/stock-adjustment`, {
      data: { type: "DAMAGED", productUnitId: uChk, productId: 1, quantity: 1, reason: "DEMO bể vỡ", sourceType: "MANUAL", sourceId: null, serialNumber: `E2E-C5-${stamp}-CK1`, locationId: zoneABin, imageUrl: "https://example.com/adj.png" },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(adjChecked.status()).toBe(400)
    log("STOCK", "EDGE: điều chỉnh unit đang trong kiểm kê → 400 ✓")
    await stock.request.put(`${API_URL}/stock-check/${checkId}/cancel`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })

    // Bảo hành: bán C → trả bảo hành → gửi NCC → nhận về sai kết quả / sai serial / 2 lần
    const sellRes = await sales.request.post(`${API_URL}/export-receipt`, {
      data: { type: "SALE", customerId: 1, note: "DEMO C5 warr sell", items: [{ productId: 1, quantity: 1, unitPrice: 15000000 }] },
      headers: { Authorization: `Bearer ${salesToken}` },
    })
    const expId: number = (await sellRes.json()).data.id
    const expItemId: number = (await (await sales.request.get(`${API_URL}/export-receipt/${expId}`, {
      headers: { Authorization: `Bearer ${salesToken}` },
    })).json()).data.items[0].id
    await mgr.request.put(`${API_URL}/export-receipt/${expId}/fulfill`, {
      data: { note: "DEMO", evidenceImages: ["https://example.com/e.png"], items: [{ itemId: expItemId, serialNumbers: [sC], actualQuantity: 1 }] },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    const retRes = await sales.request.post(`${API_URL}/return-receipts`, {
      data: {
        customerId: 1, originalExportReceiptId: expId, reason: "WARRANTY_CLAIM", note: "DEMO C5 warr",
        items: [{ productUnitId: uS[sC], productId: 1, quantity: 1, condition: "DEFECTIVE", resultingAction: "WARRANTY_TRANSFER", description: "DEMO lỗi", evidenceImage: "https://example.com/e.png", defectCategoryId: 2 }],
      },
      headers: { Authorization: `Bearer ${salesToken}` },
    })
    const retId: number = (await retRes.json()).data.id
    await mgr.request.put(`${API_URL}/return-receipts/${retId}/approve`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    const shipRes = await stock.request.post(`${API_URL}/qc-processing/dispose-confirm`, {
      data: { unitIds: [uS[sC]], action: "SENT_TO_MANUFACTURER", supplierId: 1, note: "DEMO C5 RMA ship" },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(shipRes.ok()).toBeTruthy()
    const shipData = (await shipRes.json()).data as { exportReceiptId: number }
    log("STOCK", `Gửi ${sC} cho NCC (auto phiếu xuất #${shipData.exportReceiptId})`)

    const warrImport = (warrantyResultType: string, serialNumbers: string[]) =>
      stock.request.post(`${API_URL}/import-receipt`, {
        data: {
          supplierId: 1, originalWarrantyExportId: shipData.exportReceiptId, note: "DEMO C5 RMA return",
          items: [{ productId: 1, quantity: 1, unitPrice: 10000000, warrantyMonths: 12, warrantyResultType, serialNumbers, locationId }],
        },
        headers: { Authorization: `Bearer ${stockToken}` },
      })

    const badResult = await warrImport("BOGUS", [sC])
    expect(badResult.status()).toBe(400)
    log("STOCK", "EDGE: nhận bảo hành với kết quả không hợp lệ → 400 ✓")

    const badSerial = await warrImport("REPAIRED", [`E2E-C5-${stamp}-XXXX`])
    expect(badSerial.status()).toBe(400)
    log("STOCK", "EDGE: serial trả về không thuộc phiếu gửi đi → 400 ✓")

    const goodImport = await warrImport("REPAIRED", [sC])
    expect(goodImport.ok()).toBeTruthy()
    log("STOCK", `NCC trả ${sC} sau sửa (REPAIRED, auto-confirm) ✓`)

    const twice = await warrImport("REPAIRED", [sC])
    expect(twice.status()).toBe(400)
    log("STOCK", "EDGE: nhận bảo hành lần 2 cho cùng serial → 400 ✓")

    await hold(stock, 5000)
  })

  test("Kiểm kê: start 2 lần, hoàn tất khi chưa điểm, thừa ngoài phạm vi, thừa trùng, hủy phiếu người khác", async ({ browser }) => {
    chapter("EDGE 5.4: kiểm kê (stock check) validation")
    const stock = await browser.newPage()
    const mgr = await browser.newPage()
    await loginAsStock(stock)
    await loginAsManager(mgr)
    await initTokens(stock)

    const stockToken = await getToken("stock", stock)
    const managerToken = await getToken("manager", mgr)
    const zoneABin = await createBin(stock, stockToken, "A", "E2E", 50)
    const locationId = await getE2ELocationId(stock)
    const stamp = Date.now()

    const sA = `E2E-C5-${stamp}-SCA`
    const sB = `E2E-C5-${stamp}-SCB`
    const sA1 = `E2E-C5-${stamp}-SCA1`
    const poS = await createPO(mgr, managerToken, 1, 2, `INV-C5-${stamp}-SC`)
    const impS = await importConfirm(stock, stockToken, poS, 1, 2, locationId, "DEMO C5 sc", [sA, sB])
    await getUnits(stock, stockToken, impS)

    const checkRes = await stock.request.post(`${API_URL}/stock-check`, {
      data: { scopeType: "ZONE", scopeId: 1, note: "DEMO C5 sc" },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    const checkId: number = (await checkRes.json()).data.id
    await stock.request.put(`${API_URL}/stock-check/${checkId}/start`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })

    const startAgain = await stock.request.put(`${API_URL}/stock-check/${checkId}/start`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(startAgain.status()).toBe(400)
    log("STOCK", "EDGE: start phiếu kiểm kê 2 lần → 400 ✓")

    const completeUntouched = await stock.request.put(`${API_URL}/stock-check/${checkId}/complete`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(completeUntouched.status()).toBe(400)
    log("STOCK", "EDGE: hoàn tất kiểm kê khi chưa điểm mục nào → 400 ✓")

    const extraOut = await stock.request.post(`${API_URL}/stock-check/${checkId}/extra-items`, {
      data: { sku: "CPU-INT-001", serialNumber: sB, countedQuantity: 1, note: "DEMO out of scope" },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(extraOut.status()).toBe(400)
    log("STOCK", "EDGE: khai thừa serial ngoài phạm vi zone A → 400 ✓")

    // Nhập thêm SCA1 vào zone A sau khi phiếu đã start → chưa có trong danh sách kiểm
    const poA = await createPO(mgr, managerToken, 1, 1, `INV-C5-${stamp}-SCA`)
    await importConfirm(stock, stockToken, poA, 1, 1, zoneABin, "DEMO C5 scA", [sA1])

    const extraOk = await stock.request.post(`${API_URL}/stock-check/${checkId}/extra-items`, {
      data: { sku: "CPU-INT-001", serialNumber: sA1, countedQuantity: 1, note: "DEMO extra" },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(extraOk.ok()).toBeTruthy()
    const extraDup = await stock.request.post(`${API_URL}/stock-check/${checkId}/extra-items`, {
      data: { sku: "CPU-INT-001", serialNumber: sA1, countedQuantity: 1, note: "DEMO extra dup" },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(extraDup.status()).toBe(400)
    log("STOCK", "EDGE: khai thừa trùng 2 lần → 400 ✓")

    const cancelOthers = await mgr.request.put(`${API_URL}/stock-check/${checkId}/cancel`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(cancelOthers.status()).toBe(400)
    log("MANAGER", "EDGE: hủy phiếu kiểm kê của người khác → 400 ✓")

    await stock.request.put(`${API_URL}/stock-check/${checkId}/cancel`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    log("STOCK", "Người tạo hủy phiếu kiểm kê để dọn dẹp ✓")

    await hold(stock, 5000)
  })

  test("Giá & dữ liệu gốc: giá âm, giá lẻ, thiếu lý do, trùng phiếu chờ duyệt, SKU trùng, đổi trackingType, giá bán âm, NCC sai", async ({ browser }) => {
    chapter("EDGE 5.5: price adjustment & master data validation")
    const stock = await browser.newPage()
    const mgr = await browser.newPage()
    await loginAsStock(stock)
    await loginAsManager(mgr)
    await initTokens(stock)

    const stockToken = await getToken("stock", stock)
    const managerToken = await getToken("manager", mgr)
    const locationId = await getE2ELocationId(stock)
    const stamp = Date.now()

    const poS = await createPO(mgr, managerToken, 1, 1, `INV-C5-${stamp}-P`)
    const impS = await importConfirm(stock, stockToken, poS, 1, 1, locationId, "DEMO C5 price", [`E2E-C5-${stamp}-P1`])
    const impData = (await (await stock.request.get(`${API_URL}/import-receipt/${impS}`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })).json()).data
    const itemId: number = impData.items[0].id

    const adjPayload = (over: Record<string, unknown>) => ({ importReceiptItemId: itemId, newPrice: "12000000", reason: "DEMO tăng giá", ...over })

    const negPrice = await mgr.request.post(`${API_URL}/price-adjustment`, {
      data: adjPayload({ newPrice: "-1000000" }),
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(negPrice.status()).toBe(400)
    log("MANAGER", "EDGE: giá mới âm → 400 ✓")

    const decimalPrice = await mgr.request.post(`${API_URL}/price-adjustment`, {
      data: adjPayload({ newPrice: "10000000.5" }),
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(decimalPrice.status()).toBe(400)
    log("MANAGER", "EDGE: giá mới không phải số nguyên → 400 ✓")

    const noReason = await mgr.request.post(`${API_URL}/price-adjustment`, {
      data: adjPayload({ reason: undefined }),
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(noReason.status()).toBe(400)
    log("MANAGER", "EDGE: điều chỉnh giá thiếu lý do → 400 ✓")

    const validAdj = await mgr.request.post(`${API_URL}/price-adjustment`, {
      data: adjPayload({}),
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(validAdj.ok()).toBeTruthy()
    const dupAdj = await mgr.request.post(`${API_URL}/price-adjustment`, {
      data: adjPayload({}),
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(dupAdj.status()).toBe(400)
    log("MANAGER", "EDGE: 2 phiếu điều chỉnh giá chờ duyệt cho cùng lô nhập → 400 ✓")

    const skuDup = await mgr.request.post(`${API_URL}/product`, {
      data: { name: `DEMO dup ${stamp}`, sku: "CPU-INT-001", brandId: 1, categoryId: 1, unit: "CÁI", trackingType: "SERIALIZED", sellPrice: 15000000, minStock: 0, supplierIds: [1] },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(skuDup.status()).toBe(409)
    log("MANAGER", "EDGE: tạo sản phẩm trùng SKU → 409 ✓")

    const negSell = await mgr.request.post(`${API_URL}/product`, {
      data: { name: `DEMO neg ${stamp}`, sku: `E2E-C5-NEG-${stamp}`, brandId: 1, categoryId: 1, unit: "CÁI", trackingType: "SERIALIZED", sellPrice: -1000, minStock: 0, supplierIds: [1] },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(negSell.status()).toBe(400)
    log("MANAGER", "EDGE: giá bán âm → 400 ✓")

    const changeTracking = await mgr.request.put(`${API_URL}/product/1`, {
      data: { name: "Intel Core i7-14700K", sku: "CPU-INT-001", brandId: 1, categoryId: 1, unit: "CÁI", trackingType: "BULK", sellPrice: 15000000, minStock: 0, supplierIds: [1] },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(changeTracking.status()).toBe(400)
    log("MANAGER", "EDGE: đổi trackingType khi đã có tồn kho → 400 ✓")

    const wrongSupplier = await mgr.request.post(`${API_URL}/purchase-order`, {
      data: { supplierId: 2, expectedDate: "2026-12-31", note: "DEMO C5 wrong supplier", invoiceCode: `INV-C5-${stamp}-WS`, items: [{ productId: 1, quantity: 1, unitPrice: 10000000 }] },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(wrongSupplier.status()).toBe(400)
    log("MANAGER", "EDGE: PO mua sản phẩm từ NCC không cung cấp → 400 ✓")

    await hold(stock, 5000)
  })
})

async function createPO(mgr: import("@playwright/test").Page, managerToken: string, productId: number, qty: number, invoiceCode: string): Promise<number> {
  const res = await mgr.request.post(`${API_URL}/purchase-order`, {
    data: {
      supplierId: 1, expectedDate: "2026-12-31", note: "DEMO edge5",
      invoiceCode,
      items: [{ productId, quantity: qty, unitPrice: productId === 1 ? 10000000 : 30000 }],
    },
    headers: { Authorization: `Bearer ${managerToken}` },
  })
  expect(res.ok()).toBeTruthy()
  const poId: number = (await res.json()).data.id
  if (productId === 1) {
    const serials = Array.from({ length: qty }, (_, i) => `E2E-C5-PO-${Date.now()}-${i}`)
    await mgr.request.put(`${API_URL}/purchase-order/${poId}`, {
      data: { items: [{ productId, quantity: qty, unitPrice: 10000000, serials }] },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
  }
  await mgr.request.put(`${API_URL}/purchase-order/${poId}/open`, {
    headers: { Authorization: `Bearer ${managerToken}` },
  })
  return poId
}

async function createBin(stock: import("@playwright/test").Page, stockToken: string, zoneCode: string, shelfCode: string, capacity: number): Promise<number> {
  const res = await stock.request.post(`${API_URL}/location`, {
    data: { zoneCode, shelfCode, binCode: `C${Date.now().toString().slice(-6)}`, description: "DEMO edge5 bin", maxCapacity: capacity },
    headers: { Authorization: `Bearer ${stockToken}` },
  })
  expect(res.ok()).toBeTruthy()
  return (await res.json()).data.id
}

async function createBulkProduct(mgr: import("@playwright/test").Page, managerToken: string, stamp: number): Promise<number> {
  const res = await mgr.request.post(`${API_URL}/product`, {
    data: {
      name: `DEMO Bulk ${stamp}`, sku: `E2E-C5-BULK-${stamp}`, brandId: 1, categoryId: 1,
      unit: "KG", trackingType: "BULK", sellPrice: 50000, minStock: 0, supplierIds: [1],
    },
    headers: { Authorization: `Bearer ${managerToken}` },
  })
  expect(res.ok()).toBeTruthy()
  return (await res.json()).data.id
}

async function importConfirm(stock: import("@playwright/test").Page, stockToken: string, poId: number, productId: number, qty: number, locationId: number, note: string, serials: string[] | null): Promise<number> {
  const isBulk = productId !== 1
  const impRes = await stock.request.post(`${API_URL}/import-receipt`, {
    data: {
      supplierId: 1, purchaseOrderId: poId, note,
      items: [{ productId, quantity: qty, unitPrice: productId === 1 ? 10000000 : 30000, warrantyMonths: isBulk ? undefined : 12, serialNumbers: serials ?? undefined, locationId }],
    },
    headers: { Authorization: `Bearer ${stockToken}` },
  })
  expect(impRes.ok()).toBeTruthy()
  const impId: number = (await impRes.json()).data.id
  const itemId: number = (await (await stock.request.get(`${API_URL}/import-receipt/${impId}`, {
    headers: { Authorization: `Bearer ${stockToken}` },
  })).json()).data.items[0].id
  const confirmRes = await stock.request.put(`${API_URL}/import-receipt/${impId}/confirm`, {
    data: { serials: [{ itemId, serialNumbers: serials ?? undefined, locationId }] },
    headers: { Authorization: `Bearer ${stockToken}` },
  })
  expect(confirmRes.ok()).toBeTruthy()
  return impId
}

async function getUnits(stock: import("@playwright/test").Page, stockToken: string, impId: number): Promise<Record<string, number>> {
  const units: Array<{ id: number; serialNumber: string }> = (await (await stock.request.get(`${API_URL}/import-receipt/${impId}/units`, {
    headers: { Authorization: `Bearer ${stockToken}` },
  })).json()).data
  const map: Record<string, number> = {}
  for (const u of units) map[u.serialNumber] = u.id
  return map
}

async function getBulkUnits(stock: import("@playwright/test").Page, stockToken: string, impId: number): Promise<number[]> {
  const units: Array<{ id: number }> = (await (await stock.request.get(`${API_URL}/import-receipt/${impId}/units`, {
    headers: { Authorization: `Bearer ${stockToken}` },
  })).json()).data
  return units.map((u) => u.id)
}