import { test, expect } from "@playwright/test"
import { loginAsStock, loginAsManager } from "./helpers/auth"
import { navigateTo } from "./helpers/nav"
import { initTokens, getToken, API_URL, createPurchaseOrder, getE2ELocationId } from "./helpers/api"
import { chapter, log, hold } from "./helpers/demo"

test.use({ launchOptions: { slowMo: 5000 } })

test.describe("DEMO — Nhập kho (happy + edge)", () => {

  test("Happy: MANAGER mở đơn → STOCK nhận hàng → RECEIVED", async ({ browser }) => {
    const stockCtx = await browser.newContext()
    const mgrCtx = await browser.newContext()
    const stock = await stockCtx.newPage()
    const mgr = await mgrCtx.newPage()

    chapter("NHẬP KHO HAPPY: MANAGER tạo + mở đơn, STOCK nhập + xác nhận")
    await loginAsStock(stock)
    await loginAsManager(mgr)
    await initTokens(stock)

    const stockToken = await getToken("stock", stock)
    const managerToken = await getToken("manager", mgr)
    const serial = `E2E-DI-${Date.now()}`
    const locationId = await getE2ELocationId(stock)

    // MANAGER tạo PO (DRAFT)
    const poRes = await mgr.request.post(`${API_URL}/purchase-order`, {
      data: {
        supplierId: 1,
        expectedDate: "2026-12-31",
        note: "DEMO import",
        invoiceCode: `INV-${Date.now()}`,
        items: [{ productId: 1, quantity: 1, unitPrice: 10000000 }],
      },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(poRes.ok()).toBeTruthy()
    const purchaseOrderId: number = (await poRes.json()).data.id
    log("MANAGER", `Đã tạo PO #${purchaseOrderId} (DRAFT)`)

    // Edge: PO DRAFT → STOCK không tạo phiếu nhập được
    const blockedRes = await stock.request.post(`${API_URL}/import-receipt`, {
      data: {
        supplierId: 1, purchaseOrderId, note: "blocked",
        items: [{ productId: 1, quantity: 1, unitPrice: 10000000 }],
      },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(blockedRes.ok()).toBeFalsy()
    log("STOCK", "EDGE: thử nhập khi PO còn DRAFT → bị chặn (đúng)")

    // MANAGER thêm serial qua UI + mở đơn
    await navigateTo(mgr, `/stock/imports/purchase-orders/${purchaseOrderId}`)
    await mgr.getByRole("button", { name: "Sửa đơn" }).click()
    await mgr.getByRole("button", { name: "Thêm serial" }).click()
    await mgr.getByPlaceholder(/Enter để thêm/).fill(serial)
    await mgr.getByPlaceholder(/Enter để thêm/).press("Enter")
    await mgr.getByRole("button", { name: "Xác nhận 1 serial" }).click()
    await mgr.getByRole("button", { name: "Lưu thay đổi" }).click()
    await mgr.getByRole("button", { name: "Link ASN & Mở đơn" }).waitFor({ timeout: 15_000 })
    log("MANAGER", "Thêm serial qua giao diện (Sửa đơn)")

    await mgr.getByRole("button", { name: "Link ASN & Mở đơn" }).click()
    await mgr.getByLabel("Mã ASN").fill(`ASN-${Date.now()}`)
    await mgr.getByRole("button", { name: "Mở đơn", exact: true }).click()
    await expect(mgr.locator("body")).toContainText("Đang mở", { timeout: 15_000 })
    log("MANAGER", "Đã mở đơn → kho được phép nhận hàng")

    // STOCK tạo phiếu nhập + xác nhận
    const createRes = await stock.request.post(`${API_URL}/import-receipt`, {
      data: {
        supplierId: 1, purchaseOrderId, note: "DEMO import",
        items: [{ productId: 1, quantity: 1, unitPrice: 10000000, warrantyMonths: 12, serialNumbers: [serial], locationId }],
      },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(createRes.ok()).toBeTruthy()
    const createData = (await createRes.json()).data
    const receiptId: number = createData.id
    const itemId: number = createData.items[0].id

    const confirmRes = await stock.request.put(`${API_URL}/import-receipt/${receiptId}/confirm`, {
      data: { serials: [{ itemId, serialNumbers: [serial], locationId }] },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(confirmRes.ok()).toBeTruthy()
    log("STOCK", `Phiếu nhập #${receiptId} đã xác nhận → RECEIVED`)

    await navigateTo(stock, `/stock/imports/${receiptId}`)
    await stock.getByText("Đã nhận hàng").waitFor({ timeout: 10_000 })
    log("STOCK", "Giao diện hiển thị 'Đã nhận hàng' ✓")

    await hold(mgr, 5000)
    await stockCtx.close()
    await mgrCtx.close()
  })

  test("Edge: STOCK từ chối nhập (reason + evidence) → MANAGER thấy trên PO", async ({ browser }) => {
    const stockCtx = await browser.newContext()
    const mgrCtx = await browser.newContext()
    const stock = await stockCtx.newPage()
    const mgr = await mgrCtx.newPage()

    chapter("NHẬP KHO EDGE: từ chối phiếu nhập vì hàng sai mã")
    await loginAsStock(stock)
    await loginAsManager(mgr)
    await initTokens(stock)

    const stockToken = await getToken("stock", stock)
    const serial = `E2E-DR-${Date.now()}`
    const locationId = await getE2ELocationId(stock)
    const purchaseOrderId = await createPurchaseOrder(stock)

    const createRes = await stock.request.post(`${API_URL}/import-receipt`, {
      data: {
        supplierId: 1, purchaseOrderId, note: "DEMO reject",
        items: [{ productId: 1, quantity: 1, unitPrice: 10000000, serialNumbers: [serial], locationId }],
      },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(createRes.ok()).toBeTruthy()
    const createData = (await createRes.json()).data
    const receiptId: number = createData.id
    const receiptCode: string = createData.receiptCode

    // STOCK từ chối qua UI
    await navigateTo(stock, `/stock/imports/${receiptId}`)
    await stock.getByRole("button", { name: "Từ chối nhập" }).click()
    await stock.getByLabel("Lý do từ chối").fill("Hàng sai mã, trả lại NCC")
    await stock.locator('input[type="file"]').setInputFiles({
      name: "evidence.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        "base64",
      ),
    })
    await stock.locator('img[alt^="upload"]').waitFor({ timeout: 10_000 })
    await stock.getByRole("button", { name: "Xác nhận từ chối" }).click()
    await stock.getByText("Bị từ chối").waitFor({ timeout: 10_000 })
    await stock.getByText("Hàng sai mã, trả lại NCC").waitFor({ timeout: 10_000 })
    log("STOCK", `Đã từ chối phiếu #${receiptCode} kèm lý do + ảnh`)

    // MANAGER thấy trên list + PO
    await navigateTo(mgr, `/stock/imports`)
    await mgr.getByRole("button", { name: "Bị từ chối" }).click()
    await mgr.getByText(receiptCode).waitFor({ timeout: 10_000 })
    log("MANAGER", "Thấy phiếu bị từ chối trong list (lọc 'Bị từ chối')")

    await navigateTo(mgr, `/stock/imports/purchase-orders`)
    await mgr.getByText("Bị trả 1").first().waitFor({ timeout: 10_000 })
    await navigateTo(mgr, `/stock/imports/purchase-orders/${purchaseOrderId}`)
    await mgr.getByText(/Có 1 phiếu nhập bị từ chối/).waitFor({ timeout: 10_000 })
    await mgr.getByText("Hàng sai mã, trả lại NCC").waitFor({ timeout: 10_000 })
    log("MANAGER", "Thấy cảnh báo + lý do trên chi tiết đơn mua ✓")

    await hold(mgr, 5000)
    await stockCtx.close()
    await mgrCtx.close()
  })
})