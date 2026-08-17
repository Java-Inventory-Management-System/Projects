import { expect, test } from "@playwright/test"
import { initTokens, getToken, getE2ELocationId, API_URL } from "./helpers/api"
import { loginAsStock, loginAsManager, loginAsSales } from "./helpers/auth"
import { chapter, log, hold } from "./helpers/demo"

test.use({ launchOptions: { slowMo: 5000 } })

test.describe("DEMO — Edge batch 3 (validation & negative)", () => {
  test("Import: hủy phiếu đã xuất hàng + nhập vượt số lượng PO → bị chặn", async ({ browser }) => {
    chapter("EDGE 3.1: cancel import đã xuất hàng + nhập vượt PO")
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
    const s1 = `E2E-C3-${stamp}-1`
    const s2 = `E2E-C3-${stamp}-2`

    const poRes = await mgr.request.post(`${API_URL}/purchase-order`, {
      data: {
        supplierId: 1, expectedDate: "2026-12-31", note: "DEMO edge3 import",
        invoiceCode: `INV-C3-${stamp}`,
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
    await mgr.request.put(`${API_URL}/purchase-order/${poId}/open`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })

    const impRes = await stock.request.post(`${API_URL}/import-receipt`, {
      data: {
        supplierId: 1, purchaseOrderId: poId, note: "DEMO edge3 import",
        items: [{ productId: 1, quantity: 2, unitPrice: 10000000, warrantyMonths: 12, serialNumbers: [s1, s2], locationId }],
      },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(impRes.ok()).toBeTruthy()
    const impId: number = (await impRes.json()).data.id
    const itemId: number = (await (await stock.request.get(`${API_URL}/import-receipt/${impId}`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })).json()).data.items[0].id
    const confirmRes = await stock.request.put(`${API_URL}/import-receipt/${impId}/confirm`, {
      data: { serials: [{ itemId, serialNumbers: [s1, s2], locationId }] },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(confirmRes.ok()).toBeTruthy()
    log("STOCK", `Nhập ${s1}, ${s2} từ PO #${poId}`)

        const sellRes = await salesExport(sales, salesToken, stamp, 1, 15000000)
    const fulfillRes = await mgr.request.put(`${API_URL}/export-receipt/${sellRes.id}/fulfill`, {
      data: { note: "DEMO", evidenceImages: ["https://example.com/evidence.png"], items: [{ itemId: sellRes.items[0].id, serialNumbers: [s1], actualQuantity: 1 }] },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(fulfillRes.ok()).toBeTruthy()
    log("MANAGER", `Bán unit ${s1} → giờ phiếu nhập #${impId} có unit đã xuất`)

    const cancelRes = await stock.request.put(`${API_URL}/import-receipt/${impId}/cancel`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(cancelRes.status()).toBe(400)
    log("STOCK", "EDGE: hủy phiếu nhập có unit đã xuất → 400 ✓")

    // Nhập vượt số lượng PO
    const po2 = await createPO(mgr, managerToken, 2, `INV-C3-${stamp}-B`)
    const overRes = await stock.request.post(`${API_URL}/import-receipt`, {
      data: {
        supplierId: 1, purchaseOrderId: po2, note: "DEMO over-receive",
        items: [{ productId: 1, quantity: 3, unitPrice: 10000000, warrantyMonths: 12, serialNumbers: [`E2E-C3-${stamp}-A`, `E2E-C3-${stamp}-B`, `E2E-C3-${stamp}-C`], locationId }],
      },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(overRes.ok()).toBeTruthy()
    const overId: number = (await overRes.json()).data.id
    const overItemId: number = (await (await stock.request.get(`${API_URL}/import-receipt/${overId}`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })).json()).data.items[0].id
    const overConfirm = await stock.request.put(`${API_URL}/import-receipt/${overId}/confirm`, {
      data: { serials: [{ itemId: overItemId, serialNumbers: [`E2E-C3-${stamp}-A`, `E2E-C3-${stamp}-B`, `E2E-C3-${stamp}-C`], locationId }] },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(overConfirm.status()).toBe(400)
    log("STOCK", "EDGE: nhập 3 đơn vị cho PO chỉ mua 2 → 400 ✓")

    await hold(stock, 5000)
  })

  test("Xuất kho: bulk quá tồn + serial nằm trong thùng đã seal → bị chặn", async ({ browser }) => {
    chapter("EDGE 3.2: bulk quá tồn + serial trong thùng seal")
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
    const sku = `E2E-BULK-${stamp}`
    const prodRes = await mgr.request.post(`${API_URL}/product`, {
      data: {
        name: `DEMO Bulk ${sku}`, sku,
        brandId: 13, categoryId: 1, unit: "KG", trackingType: "BULK",
        sellPrice: 50000, minStock: 0, supplierIds: [1],
      },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(prodRes.ok()).toBeTruthy()
    const bulkId: number = (await prodRes.json()).data.id
    log("MANAGER", `Tạo sản phẩm bulk #${bulkId} (chưa có tồn)`)

    const overSell = await sales.request.post(`${API_URL}/export-receipt`, {
      data: {
        type: "SALE", customerId: 1, note: "DEMO edge3 bulk",
        items: [{ productId: bulkId, quantity: 5, unitPrice: 50000 }],
      },
      headers: { Authorization: `Bearer ${salesToken}` },
    })
    expect(overSell.status()).toBe(400)
    log("SALES", "EDGE: xuất 5kg khi tồn 0 → 400 ✓")

    // Serial nằm trong thùng seal
    const s1 = `E2E-C3-${stamp}-BOX`
    const poId = await createPO(mgr, managerToken, 1, `INV-C3-${stamp}-BOX`)
    const impRes = await stock.request.post(`${API_URL}/import-receipt`, {
      data: {
        supplierId: 1, purchaseOrderId: poId, note: "DEMO edge3 box",
        items: [{ productId: 1, quantity: 1, unitPrice: 10000000, warrantyMonths: 12, serialNumbers: [s1], locationId }],
      },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(impRes.ok()).toBeTruthy()
    const impId: number = (await impRes.json()).data.id
    const itemId: number = (await (await stock.request.get(`${API_URL}/import-receipt/${impId}`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })).json()).data.items[0].id
    const confirmRes = await stock.request.put(`${API_URL}/import-receipt/${impId}/confirm`, {
      data: { serials: [{ itemId, serialNumbers: [s1], locationId }] },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(confirmRes.ok()).toBeTruthy()
    const unitsRes = await stock.request.get(`${API_URL}/import-receipt/${impId}/units`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    const unitId: number = (await unitsRes.json()).data[0].id

    const sealRes = await stock.request.post(`${API_URL}/box/seal`, {
      data: { unitIds: [unitId], locationId, note: "DEMO seal", boxType: "SMALL" },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(sealRes.ok()).toBeTruthy()
    log("STOCK", `Đóng ${s1} vào thùng #${(await sealRes.json()).data.id} ✓`)

        const sellRes = await salesExport(sales, salesToken, stamp, 1, 15000000)
    const boxedFulfill = await mgr.request.put(`${API_URL}/export-receipt/${sellRes.id}/fulfill`, {
      data: { note: "DEMO", evidenceImages: ["https://example.com/evidence.png"], items: [{ itemId: sellRes.items[0].id, serialNumbers: [s1], actualQuantity: 1 }] },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(boxedFulfill.status()).toBe(400)
    log("MANAGER", "EDGE: xuất serial đang trong thùng seal → 400 ✓")

    await hold(stock, 5000)
  })

  test("Trả hàng: cùng unit trả 2 lần → bị chặn", async ({ browser }) => {
    chapter("EDGE 3.3: trả hàng 2 lần cùng unit")
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
    const s1 = `E2E-C3-${stamp}-RET`
    const poId = await createPO(mgr, managerToken, 1, `INV-C3-${stamp}-RET`)
    const impRes = await stock.request.post(`${API_URL}/import-receipt`, {
      data: {
        supplierId: 1, purchaseOrderId: poId, note: "DEMO edge3 return",
        items: [{ productId: 1, quantity: 1, unitPrice: 10000000, warrantyMonths: 12, serialNumbers: [s1], locationId }],
      },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(impRes.ok()).toBeTruthy()
    const impId: number = (await impRes.json()).data.id
    const itemId: number = (await (await stock.request.get(`${API_URL}/import-receipt/${impId}`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })).json()).data.items[0].id
    const confirmRes = await stock.request.put(`${API_URL}/import-receipt/${impId}/confirm`, {
      data: { serials: [{ itemId, serialNumbers: [s1], locationId }] },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(confirmRes.ok()).toBeTruthy()
    const unitId: number = (await (await stock.request.get(`${API_URL}/import-receipt/${impId}/units`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })).json()).data[0].id

        const sellRes = await salesExport(sales, salesToken, stamp, 1, 15000000)
    const fulfillRes = await mgr.request.put(`${API_URL}/export-receipt/${sellRes.id}/fulfill`, {
      data: { note: "DEMO", evidenceImages: ["https://example.com/evidence.png"], items: [{ itemId: sellRes.items[0].id, serialNumbers: [s1], actualQuantity: 1 }] },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(fulfillRes.ok()).toBeTruthy()
    log("SALES", `Bán unit ${s1} → khách muốn trả`)

    const retPayload = {
      customerId: 1,
      originalExportReceiptId: sellRes.id,
      reason: "CHANGE_MIND",
      note: "DEMO edge3 return",
      items: [{
        productUnitId: unitId, productId: 1, quantity: 1,
        condition: "GOOD", resultingAction: "RESTOCK",
        description: "DEMO return", evidenceImage: "https://example.com/e.png",
      }],
    }
    const ret1 = await sales.request.post(`${API_URL}/return-receipts`, {
      data: retPayload,
      headers: { Authorization: `Bearer ${salesToken}` },
    })
    expect(ret1.ok()).toBeTruthy()
    log("SALES", "Phiếu trả #1 đang chờ duyệt")

    const ret2 = await sales.request.post(`${API_URL}/return-receipts`, {
      data: retPayload,
      headers: { Authorization: `Bearer ${salesToken}` },
    })
    expect(ret2.status()).toBe(400)
    log("SALES", "EDGE: trả cùng unit lần 2 → 400 ✓")

    await hold(stock, 5000)
  })

  test("Điều chỉnh: trùng phiếu chờ duyệt + FOUND trên unit đã IN_STOCK → bị chặn", async ({ browser }) => {
    chapter("EDGE 3.4: adjustment trùng + FOUND không hiệu lực")
    const stock = await browser.newPage()
    const mgr = await browser.newPage()
    await loginAsStock(stock)
    await loginAsManager(mgr)
    await initTokens(stock)

    const stockToken = await getToken("stock", stock)
    const managerToken = await getToken("manager", mgr)
    const locationId = await getE2ELocationId(stock)

    const stamp = Date.now()
    const s1 = `E2E-C3-${stamp}-ADJ-A`
    const s2 = `E2E-C3-${stamp}-ADJ-B`
    const poId = await createPO(mgr, managerToken, 2, `INV-C3-${stamp}-ADJ`)
    const impRes = await stock.request.post(`${API_URL}/import-receipt`, {
      data: {
        supplierId: 1, purchaseOrderId: poId, note: "DEMO edge3 adj",
        items: [{ productId: 1, quantity: 2, unitPrice: 10000000, warrantyMonths: 12, serialNumbers: [s1, s2], locationId }],
      },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(impRes.ok()).toBeTruthy()
    const impId: number = (await impRes.json()).data.id
    const itemId: number = (await (await stock.request.get(`${API_URL}/import-receipt/${impId}`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })).json()).data.items[0].id
    const confirmRes = await stock.request.put(`${API_URL}/import-receipt/${impId}/confirm`, {
      data: { serials: [{ itemId, serialNumbers: [s1, s2], locationId }] },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(confirmRes.ok()).toBeTruthy()
    const units: Array<{ id: number; serialNumber: string }> = (await (await stock.request.get(`${API_URL}/import-receipt/${impId}/units`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })).json()).data
    const unitA = units.find((u) => u.serialNumber === s1)!.id
    const unitB = units.find((u) => u.serialNumber === s2)!.id

    const adj1 = await stock.request.post(`${API_URL}/stock-adjustment`, {
      data: { type: "DAMAGED", productUnitId: unitA, reason: "DEMO: damaged", imageUrl: "https://example.com/e.png" },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(adj1.ok()).toBeTruthy()
    const adjId: number = (await adj1.json()).data.id
    log("STOCK", `Báo hư unit ${s1} → phiếu #${adjId} (chờ duyệt)`)

    const adj2 = await stock.request.post(`${API_URL}/stock-adjustment`, {
      data: { type: "DAMAGED", productUnitId: unitA, reason: "DEMO: damaged again", imageUrl: "https://example.com/e.png" },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(adj2.status()).toBe(400)
    log("STOCK", "EDGE: báo hư lần 2 khi đã có phiếu chờ duyệt → 400 ✓")

    const approve1 = await mgr.request.put(`${API_URL}/stock-adjustment/${adjId}/approve`, {
      data: { approvalNote: "DEMO" },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(approve1.ok()).toBeTruthy()
    log("MANAGER", `Duyệt phiếu #${adjId} → unit ${s1} DAMAGED`)

    const found = await stock.request.post(`${API_URL}/stock-adjustment`, {
      data: { type: "FOUND", productUnitId: unitB, productId: 1, serialNumber: s2, locationId, reason: "DEMO: found", quantity: 1 },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(found.status()).toBe(400)
    log("STOCK", "EDGE: phiếu FOUND cho unit vẫn đang IN_STOCK → 400 ✓")

    await hold(stock, 5000)
  })

  test("Kiểm kê: unit trong 2 phiếu chạy cùng lúc + bin hết chỗ → bị chặn", async ({ browser }) => {
    chapter("EDGE 3.5: kiểm kê chồng nhau + bin hết chỗ")
    const stock = await browser.newPage()
    const mgr = await browser.newPage()
    await loginAsStock(stock)
    await loginAsManager(mgr)
    await initTokens(stock)

    const stockToken = await getToken("stock", stock)
    const managerToken = await getToken("manager", mgr)

    const stamp = Date.now()

    const check1 = await stock.request.post(`${API_URL}/stock-check`, {
      data: { scopeType: "ZONE", scopeId: 1, note: "DEMO edge3 check 1" },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(check1.ok()).toBeTruthy()
    const check1Id: number = (await check1.json()).data.id
    const start1 = await stock.request.put(`${API_URL}/stock-check/${check1Id}/start`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(start1.ok()).toBeTruthy()
    log("STOCK", `Kiểm kê #${check1Id} đang chạy (zone A)`)

    const check2 = await stock.request.post(`${API_URL}/stock-check`, {
      data: { scopeType: "ZONE", scopeId: 1, note: "DEMO edge3 check 2" },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(check2.status()).toBe(400)
    log("STOCK", "EDGE: tạo kiểm kê thứ 2 chồng zone → 400 ✓")

    await stock.request.put(`${API_URL}/stock-check/${check1Id}/cancel`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    log("STOCK", `Đã hủy kiểm kê #${check1Id} để dọn dẹp`)

    // Bin hết chỗ
    const binRes = await stock.request.post(`${API_URL}/location`, {
      data: { zoneCode: "E2E", shelfCode: "T", binCode: `C${stamp.toString().slice(-6)}`, description: "cap 1", maxCapacity: 1 },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(binRes.ok()).toBeTruthy()
    const tinyBinId: number = (await binRes.json()).data.id
    log("STOCK", `Tạo bin sức chứa 1 (#${tinyBinId})`)

    const poId = await createPO(mgr, managerToken, 2, `INV-C3-${stamp}-CAP`)
    const capRes = await stock.request.post(`${API_URL}/import-receipt`, {
      data: {
        supplierId: 1, purchaseOrderId: poId, note: "DEMO edge3 capacity",
        items: [{ productId: 1, quantity: 2, unitPrice: 10000000, warrantyMonths: 12, serialNumbers: [`E2E-C3-${stamp}-X`, `E2E-C3-${stamp}-Y`], locationId: tinyBinId }],
      },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(capRes.ok()).toBeTruthy()
    const capId: number = (await capRes.json()).data.id
    const capItemId: number = (await (await stock.request.get(`${API_URL}/import-receipt/${capId}`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })).json()).data.items[0].id
    const capConfirm = await stock.request.put(`${API_URL}/import-receipt/${capId}/confirm`, {
      data: { serials: [{ itemId: capItemId, serialNumbers: [`E2E-C3-${stamp}-X`, `E2E-C3-${stamp}-Y`], locationId: tinyBinId }] },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(capConfirm.status()).toBe(400)
    log("STOCK", "EDGE: nhập 2 unit vào bin sức chứa 1 → 400 ✓")

    await hold(stock, 5000)
  })

  test("QC nhập kho: reject serial không khai + resolve sai giá trị / phiếu không REJECTED → bị chặn", async ({ browser }) => {
    chapter("EDGE 3.6: QC reject/resolve nhập kho")
    const stock = await browser.newPage()
    const mgr = await browser.newPage()
    await loginAsStock(stock)
    await loginAsManager(mgr)
    await initTokens(stock)

    const stockToken = await getToken("stock", stock)
    const managerToken = await getToken("manager", mgr)
    const locationId = await getE2ELocationId(stock)

    const stamp = Date.now()
    const a = `E2E-C3-${stamp}-A`
    const b = `E2E-C3-${stamp}-B`

    const poId = await createPO(mgr, managerToken, 2, `INV-C3-${stamp}-QC`)
    const impRes = await stock.request.post(`${API_URL}/import-receipt`, {
      data: {
        supplierId: 1, purchaseOrderId: poId, note: "DEMO edge3 qc",
        items: [{ productId: 1, quantity: 2, unitPrice: 10000000, warrantyMonths: 12, serialNumbers: [a, b], locationId }],
      },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(impRes.ok()).toBeTruthy()
    const impId: number = (await impRes.json()).data.id
    const itemId: number = (await (await stock.request.get(`${API_URL}/import-receipt/${impId}`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })).json()).data.items[0].id

    const badReject = await stock.request.put(`${API_URL}/import-receipt/${impId}/confirm`, {
      data: { serials: [{ itemId, serialNumbers: [a, b], locationId }], rejectedSerials: [{ serial: "E2E-NOT-ENTERED", reason: "lỗi" }] },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(badReject.status()).toBe(400)
    log("STOCK", "EDGE: reject serial không nằm trong lô → 400 ✓")

    const rejectNoEvidence = await stock.request.put(`${API_URL}/import-receipt/${impId}/reject`, {
      data: { reason: "lỗi vận chuyển" },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(rejectNoEvidence.status()).toBe(400)
    log("STOCK", "EDGE: reject không có ảnh bằng chứng → 400 ✓")

    const rejectValid = await stock.request.put(`${API_URL}/import-receipt/${impId}/reject`, {
      data: { reason: "lỗi vận chuyển", evidenceImageUrl: "https://example.com/evidence.png" },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(rejectValid.ok()).toBeTruthy()
    log("STOCK", `QC từ chối lô → phiếu #${impId} REJECTED`)

    const badResolve = await mgr.request.put(`${API_URL}/import-receipt/${impId}/resolve`, {
      data: { resolution: "BOGUS", note: "x" },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(badResolve.status()).toBe(400)
    log("MANAGER", "EDGE: resolve giá trị không hợp lệ → 400 ✓")

    const resolveOk = await mgr.request.put(`${API_URL}/import-receipt/${impId}/resolve`, {
      data: { resolution: "SUPPLIER_RESENDING", note: "NCC gửi lại lô mới" },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(resolveOk.ok()).toBeTruthy()
    log("MANAGER", `Resolve phiếu #${impId} = SUPPLIER_RESENDING ✓`)

    // Resolve phiếu không REJECTED
    const po2 = await createPO(mgr, managerToken, 1, `INV-C3-${stamp}-QC2`)
    const imp2 = await stock.request.post(`${API_URL}/import-receipt`, {
      data: {
        supplierId: 1, purchaseOrderId: po2, note: "DEMO edge3 qc2",
        items: [{ productId: 1, quantity: 1, unitPrice: 10000000, warrantyMonths: 12, serialNumbers: [`E2E-C3-${stamp}-C`], locationId }],
      },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(imp2.ok()).toBeTruthy()
    const imp2Id: number = (await imp2.json()).data.id
    const imp2ItemId: number = (await (await stock.request.get(`${API_URL}/import-receipt/${imp2Id}`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })).json()).data.items[0].id
    await stock.request.put(`${API_URL}/import-receipt/${imp2Id}/confirm`, {
      data: { serials: [{ itemId: imp2ItemId, serialNumbers: [`E2E-C3-${stamp}-C`], locationId }] },
      headers: { Authorization: `Bearer ${stockToken}` },
    })

    const resolveWrong = await mgr.request.put(`${API_URL}/import-receipt/${imp2Id}/resolve`, {
      data: { resolution: "SUPPLIER_RESENDING", note: "x" },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(resolveWrong.status()).toBe(400)
    log("MANAGER", "EDGE: resolve phiếu đã RECEIVED (không phải REJECTED) → 400 ✓")

    await hold(stock, 5000)
  })
})

async function createPO(mgr: import("@playwright/test").Page, managerToken: string, qty: number, invoiceCode: string): Promise<number> {
  const res = await mgr.request.post(`${API_URL}/purchase-order`, {
    data: {
      supplierId: 1, expectedDate: "2026-12-31", note: "DEMO edge3",
      invoiceCode,
      items: [{ productId: 1, quantity: qty, unitPrice: 10000000 }],
    },
    headers: { Authorization: `Bearer ${managerToken}` },
  })
  expect(res.ok()).toBeTruthy()
  const poId: number = (await res.json()).data.id
  const serials = Array.from({ length: qty }, (_, i) => `E2E-C3-PO-${Date.now()}-${i}`)
  await mgr.request.put(`${API_URL}/purchase-order/${poId}`, {
    data: { items: [{ productId: 1, quantity: qty, unitPrice: 10000000, serials }] },
    headers: { Authorization: `Bearer ${managerToken}` },
  })
  await mgr.request.put(`${API_URL}/purchase-order/${poId}/open`, {
    headers: { Authorization: `Bearer ${managerToken}` },
  })
  return poId
}

async function salesExport(sales: import("@playwright/test").Page, salesToken: string, stamp: number, qty: number, price: number): Promise<{ id: number; items: Array<{ id: number }> }> {
  const res = await sales.request.post(`${API_URL}/export-receipt`, {
    data: { type: "SALE", customerId: 1, note: "DEMO edge3 sell", items: [{ productId: 1, quantity: qty, unitPrice: price }] },
    headers: { Authorization: `Bearer ${salesToken}` },
  })
  expect(res.ok()).toBeTruthy()
  return (await res.json()).data as { id: number; items: Array<{ id: number }> }
}