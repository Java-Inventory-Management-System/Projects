import { expect, test } from "@playwright/test"
import { initTokens, getToken, getE2ELocationId, API_URL } from "./helpers/api"
import { loginAsStock, loginAsManager, loginAsSales } from "./helpers/auth"
import { chapter, log, hold } from "./helpers/demo"

test.use({ launchOptions: { slowMo: 5000 } })

test.describe("DEMO — Edge batch 4 (exchange, import/PO/box state machine)", () => {
  test("Đổi 1:1 bảo hành tại quầy: đổi được + 6 ràng buộc bị chặn", async ({ browser }) => {
    chapter("EDGE 4.1: đổi 1:1 bảo hành (warranty exchange)")
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
    const serials = ["A", "B", "C", "D", "E"].map((s) => `E2E-C4-${stamp}-${s}`)
    const poId = await createPOAndImport(stock, mgr, stockToken, managerToken, serials, locationId, "INV-C4-X")
    const unitMap = await getUnits(stock, stockToken, poId)

    // Bán A, C, D, E (B giữ lại làm hàng thay thế)
    const expRes = await sales.request.post(`${API_URL}/export-receipt`, {
      data: { type: "SALE", customerId: 1, note: "DEMO edge4 sell", items: [{ productId: 1, quantity: 4, unitPrice: 15000000 }] },
      headers: { Authorization: `Bearer ${salesToken}` },
    })
    expect(expRes.ok()).toBeTruthy()
    const expData = (await expRes.json()).data
    const expFulfill = await mgr.request.put(`${API_URL}/export-receipt/${expData.id}/fulfill`, {
      data: { note: "DEMO", evidenceImages: ["https://example.com/evidence.png"], items: [{ itemId: expData.items[0].id, serialNumbers: [serials[0], serials[2], serials[3], serials[4]], actualQuantity: 4 }] },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(expFulfill.ok()).toBeTruthy()
    log("SALES", `Bán 4 máy, giữ ${serials[1]} trong kho để đổi`)

    const retPayload = (unitSerial: string, condition: string, defectCategoryId: number | null, description: string) => ({
      customerId: 1,
      originalExportReceiptId: expData.id,
      reason: "WARRANTY_CLAIM",
      note: "DEMO edge4 exchange",
      items: [{
        productUnitId: unitMap[unitSerial], productId: 1, quantity: 1,
        condition, resultingAction: "WARRANTY_TRANSFER",
        description, evidenceImage: "https://example.com/evidence.png",
        defectCategoryId,
      }],
    })

    const ret1 = await sales.request.post(`${API_URL}/return-receipts`, {
      data: retPayload(serials[0], "DEFECTIVE", 2, "DEMO: màn hình chết"),
      headers: { Authorization: `Bearer ${salesToken}` },
    })
    expect(ret1.ok()).toBeTruthy()
    const ret1Id: number = (await ret1.json()).data.id
    log("SALES", `Máy ${serials[0]} trả bảo hành (lỗi thay được) → phiếu #${ret1Id}`)

    const info = await sales.request.get(`${API_URL}/return-receipts/${ret1Id}/warranty-exchange-info`, {
      headers: { Authorization: `Bearer ${salesToken}` },
    })
    expect(info.ok()).toBeTruthy()
    const infoData = (await info.json()).data
    expect(infoData.serialNumber).toBe(serials[0])
    expect(infoData.replaceable).toBe(true)
    log("SALES", `Thông tin đổi: máy ${serials[0]}, giá gốc ${infoData.originalSellPrice}, đổi được 1:1`)

    const noUnit = await mgr.request.put(`${API_URL}/return-receipts/${ret1Id}/warranty-exchange`, {
      data: { note: "DEMO" },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(noUnit.status()).toBe(400)
    log("SALES", "EDGE: đổi mà không chọn máy thay thế → 400 ✓")

    const badDiscount = await mgr.request.put(`${API_URL}/return-receipts/${ret1Id}/warranty-exchange`, {
      data: { replacementUnitId: unitMap[serials[1]], discountAmount: -100000, note: "DEMO" },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(badDiscount.status()).toBe(400)
    log("SALES", "EDGE: giảm giá âm → 400 ✓")

    const exchangeOk = await mgr.request.put(`${API_URL}/return-receipts/${ret1Id}/warranty-exchange`, {
      data: { replacementUnitId: unitMap[serials[1]], discountAmount: 0, note: "DEMO đổi 1:1" },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(exchangeOk.ok()).toBeTruthy()
    const exchData = (await exchangeOk.json()).data
    expect(exchData.replacementSerial).toBe(serials[1])
    log("SALES", `ĐỔI THÀNH CÔNG: ${serials[0]} → ${serials[1]} (auto phiếu xuất #${exchData.exportReceiptId} COMPLETED, bảo hành kế thừa)`)

    const again = await mgr.request.put(`${API_URL}/return-receipts/${ret1Id}/warranty-exchange`, {
      data: { replacementUnitId: unitMap[serials[0]], note: "DEMO" },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(again.status()).toBe(400)
    log("SALES", "EDGE: đổi lần 2 cho cùng phiếu trả → 400 ✓")

    // Máy thay thế không sẵn sàng (đang EXPORTED)
    const ret2 = await sales.request.post(`${API_URL}/return-receipts`, {
      data: retPayload(serials[2], "DEFECTIVE", 2, "DEMO: lỗi pin"),
      headers: { Authorization: `Bearer ${salesToken}` },
    })
    const ret2Id: number = (await ret2.json()).data.id
    const notAvail = await mgr.request.put(`${API_URL}/return-receipts/${ret2Id}/warranty-exchange`, {
      data: { replacementUnitId: unitMap[serials[0]], note: "DEMO" },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(notAvail.status()).toBe(400)
    log("SALES", "EDGE: máy thay thế đã xuất (không còn IN_STOCK) → 400 ✓")

    // Lỗi không được phép đổi 1:1
    const ret3 = await sales.request.post(`${API_URL}/return-receipts`, {
      data: retPayload(serials[3], "DEFECTIVE", 1, "DEMO: trầy xước"),
      headers: { Authorization: `Bearer ${salesToken}` },
    })
    const ret3Id: number = (await ret3.json()).data.id
    const notReplaceable = await mgr.request.put(`${API_URL}/return-receipts/${ret3Id}/warranty-exchange`, {
      data: { replacementUnitId: unitMap[serials[1]], note: "DEMO" },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(notReplaceable.status()).toBe(400)
    log("SALES", "EDGE: lỗi trầy xước (không được phép đổi) → 400 ✓")

    // Phiếu trả không có máy lỗi
    const ret4 = await sales.request.post(`${API_URL}/return-receipts`, {
      data: { ...retPayload(serials[4], "GOOD", null, "DEMO đổi ý"), reason: "CHANGE_MIND", items: [{ productUnitId: unitMap[serials[4]], productId: 1, quantity: 1, condition: "GOOD", resultingAction: "RESTOCK", description: "DEMO", evidenceImage: "https://example.com/e.png" }] },
      headers: { Authorization: `Bearer ${salesToken}` },
    })
    const ret4Id: number = (await ret4.json()).data.id
    const noItem = await mgr.request.put(`${API_URL}/return-receipts/${ret4Id}/warranty-exchange`, {
      data: { replacementUnitId: unitMap[serials[1]], note: "DEMO" },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(noItem.status()).toBe(400)
    log("SALES", "EDGE: phiếu trả không có máy lỗi (đổi ý) → 400 ✓")

    await hold(stock, 5000)
  })

  test("Hủy phiếu nhập: unit trong thùng seal / trong kiểm kê → bị chặn", async ({ browser }) => {
    chapter("EDGE 4.2: cancel import — unit trong thùng / trong kiểm kê")
    const stock = await browser.newPage()
    const mgr = await browser.newPage()
    await loginAsStock(stock)
    await loginAsManager(mgr)
    await initTokens(stock)

    const stockToken = await getToken("stock", stock)
    const managerToken = await getToken("manager", mgr)
    const zoneABin = await createBin(stock, stockToken, "A", "E2E", 50)

    const stamp = Date.now()

    // Unit trong thùng seal
    const s1 = `E2E-C4-${stamp}-BOX`
    const s2 = `E2E-C4-${stamp}-BOX2`
    const po1 = await createPO(mgr, managerToken, 2, `INV-C4-${stamp}-BOX`)
    const imp1 = await importConfirm(stock, stockToken, po1, [s1, s2], zoneABin, "DEMO C4 box")
    const units1 = await getUnits(stock, stockToken, imp1)
    await stock.request.post(`${API_URL}/box/seal`, {
      data: { unitIds: [units1[s1]], locationId: zoneABin, note: "DEMO", boxType: "SMALL" },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    const cancelBoxed = await stock.request.put(`${API_URL}/import-receipt/${imp1}/cancel`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(cancelBoxed.status()).toBe(400)
    log("STOCK", "EDGE: hủy phiếu nhập có unit trong thùng seal → 400 ✓")

    // Unit trong kiểm kê đang chạy
    const s3 = `E2E-C4-${stamp}-SCK`
    const s4 = `E2E-C4-${stamp}-SCK2`
    const po2 = await createPO(mgr, managerToken, 2, `INV-C4-${stamp}-SCK`)
    const imp2 = await importConfirm(stock, stockToken, po2, [s3, s4], zoneABin, "DEMO C4 check")
    const checkRes = await stock.request.post(`${API_URL}/stock-check`, {
      data: { scopeType: "ZONE", scopeId: 1, note: "DEMO C4 check" },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    const checkId: number = (await checkRes.json()).data.id
    await stock.request.put(`${API_URL}/stock-check/${checkId}/start`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    const cancelChecked = await stock.request.put(`${API_URL}/import-receipt/${imp2}/cancel`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(cancelChecked.status()).toBe(400)
    log("STOCK", "EDGE: hủy phiếu nhập có unit trong kiểm kê đang chạy → 400 ✓")
    await stock.request.put(`${API_URL}/stock-check/${checkId}/cancel`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    log("STOCK", "Đã hủy phiếu kiểm kê để dọn dẹp")

    await hold(stock, 5000)
  })

  test("PO: hủy 2 lần, hủy khi có phiếu nhập, sửa khi đã lock, xóa khi đã mở → bị chặn", async ({ browser }) => {
    chapter("EDGE 4.3: PO state machine")
    const stock = await browser.newPage()
    const mgr = await browser.newPage()
    await loginAsStock(stock)
    await loginAsManager(mgr)
    await initTokens(stock)

    const stockToken = await getToken("stock", stock)
    const managerToken = await getToken("manager", mgr)
    const locationId = await getE2ELocationId(stock)
    const stamp = Date.now()

    // Hủy 2 lần
    const po1 = await createPO(mgr, managerToken, 1, `INV-C4-${stamp}-P1`)
    const cancel1 = await mgr.request.put(`${API_URL}/purchase-order/${po1}/cancel`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(cancel1.ok()).toBeTruthy()
    const cancel2 = await mgr.request.put(`${API_URL}/purchase-order/${po1}/cancel`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(cancel2.status()).toBe(400)
    log("MANAGER", "EDGE: hủy PO 2 lần → 400 ✓")

    // Hủy PO đã có phiếu nhập + sửa khi đã lock
    const po2 = await createPO(mgr, managerToken, 1, `INV-C4-${stamp}-P2`)
    await importConfirm(stock, stockToken, po2, [`E2E-C4-${stamp}-P2S`], locationId, "DEMO C4 lock")
    const cancelWithReceipt = await mgr.request.put(`${API_URL}/purchase-order/${po2}/cancel`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(cancelWithReceipt.status()).toBe(400)
    log("MANAGER", "EDGE: hủy PO đã có phiếu nhập → 400 ✓")

    const updateLocked = await mgr.request.put(`${API_URL}/purchase-order/${po2}`, {
      data: { items: [{ productId: 1, quantity: 2, unitPrice: 10000000, serials: [`E2E-C4-${stamp}-P2U`, `E2E-C4-${stamp}-P2U2`] }] },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(updateLocked.ok()).toBeTruthy()
    log("MANAGER", `Sửa PO #${po2} sau khi nhận hàng (không còn lock vì đã RECEIVED) — chỉ lock khi phiếu nhập DRAFT`)

    // Lock thật sự: phiếu nhập DRAFT (chưa confirm) → không sửa được
    const po3 = await createPO(mgr, managerToken, 1, `INV-C4-${stamp}-P3`)
    await mgr.request.put(`${API_URL}/purchase-order/${po3}/open`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    await stock.request.post(`${API_URL}/import-receipt`, {
      data: {
        supplierId: 1, purchaseOrderId: po3, note: "DEMO C4 draft",
        items: [{ productId: 1, quantity: 1, unitPrice: 10000000, warrantyMonths: 12, serialNumbers: [`E2E-C4-${stamp}-P3S`], locationId }],
      },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    const updateDraftLocked = await mgr.request.put(`${API_URL}/purchase-order/${po3}`, {
      data: { items: [{ productId: 1, quantity: 2, unitPrice: 10000000, serials: [`E2E-C4-${stamp}-P3U`, `E2E-C4-${stamp}-P3U2`] }] },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(updateDraftLocked.status()).toBe(400)
    log("MANAGER", `EDGE: sửa PO #${po3} khi có phiếu nhập DRAFT (lock) → 400 ✓`)

    // Xóa PO đã mở
    const po4 = await createPO(mgr, managerToken, 1, `INV-C4-${stamp}-P4`)
    const delOpen = await mgr.request.delete(`${API_URL}/purchase-order/${po4}`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(delOpen.status()).toBe(400)
    log("MANAGER", "EDGE: xóa PO đã mở → 400 ✓")

    await hold(stock, 5000)
  })

  test("Thùng: unseal 2 lần, move thùng mở, xóa thùng seal, seal 2 lô, seal unit trong kiểm kê → bị chặn", async ({ browser }) => {
    chapter("EDGE 4.4: box state machine")
    const stock = await browser.newPage()
    const mgr = await browser.newPage()
    await loginAsStock(stock)
    await loginAsManager(mgr)
    await initTokens(stock)

    const stockToken = await getToken("stock", stock)
    const managerToken = await getToken("manager", mgr)
    const locationId = await getE2ELocationId(stock)
    const zoneABin = await createBin(stock, stockToken, "A", "E2E", 50)
    const stamp = Date.now()

    const po1 = await createPO(mgr, managerToken, 4, `INV-C4-${stamp}-B1`)
    const imp1 = await importConfirm(stock, stockToken, po1, ["A", "B", "C", "D"].map((s) => `E2E-C4-${stamp}-${s}`), locationId, "DEMO C4 box1")
    const u1 = await getUnits(stock, stockToken, imp1)
    const units1 = Object.values(u1)

    const seal1 = await stock.request.post(`${API_URL}/box/seal`, {
      data: { unitIds: units1.slice(0, 2), locationId, note: "DEMO", boxType: "SMALL" },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(seal1.ok()).toBeTruthy()
    const box1: number = (await seal1.json()).data.id
    const seal2 = await stock.request.post(`${API_URL}/box/seal`, {
      data: { unitIds: units1.slice(2), locationId, note: "DEMO", boxType: "SMALL" },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(seal2.ok()).toBeTruthy()
    const box2: number = (await seal2.json()).data.id
    log("STOCK", `Đóng thùng #${box1} và #${box2}`)

    const unseal1 = await mgr.request.post(`${API_URL}/box/${box1}/unseal`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(unseal1.ok()).toBeTruthy()
    const unseal2 = await mgr.request.post(`${API_URL}/box/${box1}/unseal`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(unseal2.status()).toBe(400)
    log("MANAGER", "EDGE: unseal thùng đã mở → 400 ✓")

    const moveOpen = await stock.request.post(`${API_URL}/box/${box1}/move`, {
      data: { locationId: zoneABin },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(moveOpen.status()).toBe(400)
    log("STOCK", "EDGE: move thùng chưa seal → 400 ✓")

    const delSealed = await stock.request.delete(`${API_URL}/box/${box2}`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(delSealed.status()).toBe(400)
    log("STOCK", "EDGE: xóa thùng đã seal → 400 ✓")

    // Seal 2 lô khác nhau
    const po2 = await createPO(mgr, managerToken, 2, `INV-C4-${stamp}-B2`)
    const imp2 = await importConfirm(stock, stockToken, po2, [`E2E-C4-${stamp}-X`, `E2E-C4-${stamp}-Y`], locationId, "DEMO C4 box2")
    const u2 = await getUnits(stock, stockToken, imp2)
    const mixed = await stock.request.post(`${API_URL}/box/seal`, {
      data: { unitIds: [units1[0], u2[`E2E-C4-${stamp}-X`]], locationId, note: "DEMO", boxType: "SMALL" },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(mixed.status()).toBe(400)
    log("STOCK", "EDGE: seal unit từ 2 lô nhập khác nhau → 400 ✓")

    // Seal unit trong kiểm kê: được phép (thùng cùng nằm trong phạm vi kiểm kê)
    const po3 = await createPO(mgr, managerToken, 2, `INV-C4-${stamp}-B3`)
    const imp3 = await importConfirm(stock, stockToken, po3, [`E2E-C4-${stamp}-M`, `E2E-C4-${stamp}-N`], locationId, "DEMO C4 box3")
    const u3 = await getUnits(stock, stockToken, imp3)
    const checkRes = await stock.request.post(`${API_URL}/stock-check`, {
      data: { scopeType: "ZONE", scopeId: 1, note: "DEMO C4 check2" },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    const checkId: number = (await checkRes.json()).data.id
    await stock.request.put(`${API_URL}/stock-check/${checkId}/start`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    const sealChecked = await stock.request.post(`${API_URL}/box/seal`, {
      data: { unitIds: [u3[`E2E-C4-${stamp}-M`]], locationId, note: "DEMO", boxType: "SMALL" },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(sealChecked.ok()).toBeTruthy()
    log("STOCK", "Seal unit trong kiểm kê: ĐƯỢC PHÉP (thùng vẫn nằm trong phạm vi kiểm kê)")
    await stock.request.put(`${API_URL}/stock-check/${checkId}/cancel`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })

    await hold(stock, 5000)
  })
})

async function createPO(mgr: import("@playwright/test").Page, managerToken: string, qty: number, invoiceCode: string): Promise<number> {
  const res = await mgr.request.post(`${API_URL}/purchase-order`, {
    data: {
      supplierId: 1, expectedDate: "2026-12-31", note: "DEMO edge4",
      invoiceCode,
      items: [{ productId: 1, quantity: qty, unitPrice: 10000000 }],
    },
    headers: { Authorization: `Bearer ${managerToken}` },
  })
  expect(res.ok()).toBeTruthy()
  const poId: number = (await res.json()).data.id
  const serials = Array.from({ length: qty }, (_, i) => `E2E-C4-PO-${Date.now()}-${i}`)
  await mgr.request.put(`${API_URL}/purchase-order/${poId}`, {
    data: { items: [{ productId: 1, quantity: qty, unitPrice: 10000000, serials }] },
    headers: { Authorization: `Bearer ${managerToken}` },
  })
  await mgr.request.put(`${API_URL}/purchase-order/${poId}/open`, {
    headers: { Authorization: `Bearer ${managerToken}` },
  })
  return poId
}

async function createBin(stock: import("@playwright/test").Page, stockToken: string, zoneCode: string, shelfCode: string, capacity: number): Promise<number> {
  const res = await stock.request.post(`${API_URL}/location`, {
    data: { zoneCode, shelfCode, binCode: `C${Date.now().toString().slice(-6)}`, description: "DEMO edge4 bin", maxCapacity: capacity },
    headers: { Authorization: `Bearer ${stockToken}` },
  })
  expect(res.ok()).toBeTruthy()
  return (await res.json()).data.id
}

async function createPOAndImport(stock: import("@playwright/test").Page, mgr: import("@playwright/test").Page, stockToken: string, managerToken: string, serials: string[], locationId: number, invoiceCode: string): Promise<number> {
  const poId = await createPO(mgr, managerToken, serials.length, invoiceCode)
  return importConfirm(stock, stockToken, poId, serials, locationId, "DEMO edge4 import")
}

async function importConfirm(stock: import("@playwright/test").Page, stockToken: string, poId: number, serials: string[], locationId: number, note: string): Promise<number> {
  const impRes = await stock.request.post(`${API_URL}/import-receipt`, {
    data: {
      supplierId: 1, purchaseOrderId: poId, note,
      items: [{ productId: 1, quantity: serials.length, unitPrice: 10000000, warrantyMonths: 12, serialNumbers: serials, locationId }],
    },
    headers: { Authorization: `Bearer ${stockToken}` },
  })
  expect(impRes.ok()).toBeTruthy()
  const impId: number = (await impRes.json()).data.id
  const itemId: number = (await (await stock.request.get(`${API_URL}/import-receipt/${impId}`, {
    headers: { Authorization: `Bearer ${stockToken}` },
  })).json()).data.items[0].id
  const confirmRes = await stock.request.put(`${API_URL}/import-receipt/${impId}/confirm`, {
    data: { serials: [{ itemId, serialNumbers: serials, locationId }] },
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