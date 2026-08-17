import { test, expect } from "@playwright/test"
import { loginAsStock, loginAsManager } from "./helpers/auth"
import { navigateTo } from "./helpers/nav"
import { initTokens, getToken, API_URL, createPurchaseOrder, getE2ELocationId } from "./helpers/api"

test.describe("Import Flow (Nhập kho) — SOP §2", () => {

  test("MANAGER adds serials via PO edit → opens PO via UI → STOCK creates import → STOCK confirms → RECEIVED", async ({ browser }) => {
    const stockCtx = await browser.newContext()
    const mgrCtx = await browser.newContext()
    const stock = await stockCtx.newPage()
    const mgr = await mgrCtx.newPage()

    await loginAsStock(stock)
    await loginAsManager(mgr)
    await initTokens(stock)

    const stockToken = await getToken("stock", stock)
    const managerToken = await getToken("manager", mgr)
    const serial = `E2E-IMP-${Date.now()}`
    const locationId = await getE2ELocationId(stock)

    // MANAGER creates a DRAFT PO via API, then opens it via UI (Link ASN & Mở đơn)
    const poRes = await mgr.request.post(`${API_URL}/purchase-order`, {
      data: {
        supplierId: 1,
        expectedDate: "2026-12-31",
        note: "E2E import",
        invoiceCode: `INV-${Date.now()}`,
        items: [{ productId: 1, quantity: 1, unitPrice: 10000000 }],
      },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(poRes.ok()).toBeTruthy()
    const purchaseOrderId: number = (await poRes.json()).data.id

    // PO is DRAFT → stock cannot create a receipt yet (backend blocks)
    const blockedRes = await stock.request.post(`${API_URL}/import-receipt`, {
      data: {
        supplierId: 1, purchaseOrderId, note: "blocked",
        items: [{ productId: 1, quantity: 1, unitPrice: 10000000 }],
      },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(blockedRes.ok()).toBeFalsy()

    // MANAGER adds the serial via the Edit page (required for SERIALIZED products)
    await navigateTo(mgr, `/stock/imports/purchase-orders/${purchaseOrderId}`)
    await mgr.getByRole("button", { name: "Sửa đơn" }).click()
    await mgr.getByRole("button", { name: "Thêm serial" }).click()
    await mgr.getByPlaceholder(/Enter để thêm/).fill(serial)
    await mgr.getByPlaceholder(/Enter để thêm/).press("Enter")
    await mgr.getByRole("button", { name: "Xác nhận 1 serial" }).click()
    await mgr.getByRole("button", { name: "Lưu thay đổi" }).click()
    await mgr.getByText("Đã cập nhật đơn hàng").waitFor({ timeout: 10_000 })

    // MANAGER opens the order via the detail page dialog
    await mgr.getByRole("button", { name: "Link ASN & Mở đơn" }).click()
    await mgr.getByLabel("Mã ASN").fill(`ASN-${Date.now()}`)
    await mgr.getByRole("button", { name: "Mở đơn", exact: true }).click()
    await mgr.getByText("Đã mở đơn, kho có thể nhận hàng").waitFor({ timeout: 10_000 })

    // STOCK creates import via API from the now-OPEN PO
    const createRes = await stock.request.post(`${API_URL}/import-receipt`, {
      data: {
        supplierId: 1, purchaseOrderId, note: "E2E import",
        items: [{ productId: 1, quantity: 1, unitPrice: 10000000, warrantyMonths: 12, serialNumbers: [serial], locationId }],
      },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(createRes.ok()).toBeTruthy()
    const createData = (await createRes.json()).data
    const receiptId: number = createData.id
    const itemId: number = createData.items[0].id

    // STOCK confirms → RECEIVED (no approval step)
    const confirmRes = await stock.request.put(`${API_URL}/import-receipt/${receiptId}/confirm`, {
      data: { serials: [{ itemId, serialNumbers: [serial], locationId }] },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(confirmRes.ok()).toBeTruthy()

    // Verify RECEIVED on the UI detail page
    await navigateTo(stock, `/stock/imports/${receiptId}`)
    await stock.getByText("Đã nhận hàng").waitFor({ timeout: 10_000 })

    await stockCtx.close()
    await mgrCtx.close()
  })

  test("STOCK rejects a DRAFT receipt with reason + evidence, MANAGER sees it filtered", async ({ browser }) => {
    const stockCtx = await browser.newContext()
    const mgrCtx = await browser.newContext()
    const stock = await stockCtx.newPage()
    const mgr = await mgrCtx.newPage()

    await loginAsStock(stock)
    await loginAsManager(mgr)
    await initTokens(stock)

    const stockToken = await getToken("stock", stock)
    const serial = `E2E-REJ-${Date.now()}`
    const locationId = await getE2ELocationId(stock)
    const purchaseOrderId = await createPurchaseOrder(stock)

    const createRes = await stock.request.post(`${API_URL}/import-receipt`, {
      data: {
        supplierId: 1, purchaseOrderId, note: "E2E reject",
        items: [{ productId: 1, quantity: 1, unitPrice: 10000000, serialNumbers: [serial], locationId }],
      },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(createRes.ok()).toBeTruthy()
    const createData = (await createRes.json()).data
    const receiptId: number = createData.id
    const receiptCode: string = createData.receiptCode

    // STOCK rejects via UI detail page dialog
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

    // MANAGER filters by Bị từ chối on the list page
    await navigateTo(mgr, `/stock/imports`)
    await mgr.getByRole("button", { name: "Bị từ chối" }).click()
    await mgr.getByText(receiptCode).waitFor({ timeout: 10_000 })

    // MANAGER sees the rejection on the PO: list badge + detail banner + reason
    await navigateTo(mgr, `/stock/imports/purchase-orders`)
    await mgr.getByText("Bị trả 1").first().waitFor({ timeout: 10_000 })
    await navigateTo(mgr, `/stock/imports/purchase-orders/${purchaseOrderId}`)
    await mgr.getByText(/Có 1 phiếu nhập bị từ chối/).waitFor({ timeout: 10_000 })
    await mgr.getByText("Hàng sai mã, trả lại NCC").waitFor({ timeout: 10_000 })
    await mgr.getByText(receiptCode).waitFor({ timeout: 10_000 })

    await stockCtx.close()
    await mgrCtx.close()
  })
})