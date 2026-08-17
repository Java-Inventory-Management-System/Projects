import { test, expect } from "@playwright/test"
import { loginAsManager, loginAsStock, loginAsSales } from "./helpers/auth"
import { navigateTo } from "./helpers/nav"
import { initTokens, getToken, API_URL, getE2ELocationId } from "./helpers/api"

// ═══════════════════════════════════════════════════════════════════════════
// DEMO — chạy bằng:  npm run demo
// 3 cửa sổ trình duyệt mở cùng lúc (MANAGER / STOCK / SALES), mỗi role một
// cửa sổ riêng, cùng phối hợp 1 luồng nghiệp vụ từ đầu đến cuối.
// slowMo làm chậm thao tác (5 giây/động tác) để xem được bằng mắt.
// ═══════════════════════════════════════════════════════════════════════════

test.use({ launchOptions: { slowMo: 5000 } })

test.describe("DEMO — 1 ngày làm việc của kho (3 role, 3 cửa sổ)", () => {

  test("Nhập kho → Xuất kho → Trả hàng + QC", async ({ browser }) => {
    const mgrCtx = await browser.newContext()
    const stockCtx = await browser.newContext()
    const salesCtx = await browser.newContext()
    const mgr = await mgrCtx.newPage()
    const stock = await stockCtx.newPage()
    const sales = await salesCtx.newPage()

    console.log("\n════════ CHƯƠNG 0: MỞ 3 CỬA SỔ, MỖI ROLE LOGIN 1 CỬA SỔ ════════")
    await loginAsManager(mgr)
    await loginAsSales(sales)
    await loginAsStock(stock)
    await initTokens(stock)

    const stockToken = await getToken("stock", stock)
    const managerToken = await getToken("manager", mgr)
    const salesToken = await getToken("sales", sales)
    const locationId = await getE2ELocationId(stock)

    // ─────────────────────────── CHƯƠNG 1: NHẬP KHO ───────────────────────────
    console.log("\n════════ CHƯƠNG 1: MANAGER tạo đơn mua → mở đơn → STOCK nhận hàng ════════")

    // MANAGER: tạo PO (DRAFT) qua API, rồi mở giao diện sửa đơn + thêm serial
    const serial = `E2E-DEMO-${Date.now()}`
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
    console.log(`  [MANAGER]  Đã tạo PO #${purchaseOrderId} (DRAFT)`)

    // MANAGER: giao diện — Sửa đơn → Thêm serial → Lưu → Link ASN & Mở đơn
    await navigateTo(mgr, `/stock/imports/purchase-orders/${purchaseOrderId}`)
    await mgr.getByRole("button", { name: "Sửa đơn" }).click()
    await mgr.getByRole("button", { name: "Thêm serial" }).click()
    await mgr.getByPlaceholder(/Enter để thêm/).fill(serial)
    await mgr.getByPlaceholder(/Enter để thêm/).press("Enter")
    await mgr.getByRole("button", { name: "Xác nhận 1 serial" }).click()
    await mgr.getByRole("button", { name: "Lưu thay đổi" }).click()
    await mgr.getByRole("button", { name: "Link ASN & Mở đơn" }).waitFor({ timeout: 15_000 })
    console.log("  [MANAGER]  Đã thêm serial vào đơn qua giao diện (Sửa đơn)")

    await mgr.getByRole("button", { name: "Link ASN & Mở đơn" }).click()
    await mgr.getByLabel("Mã ASN").fill(`ASN-${Date.now()}`)
    await mgr.getByRole("button", { name: "Mở đơn", exact: true }).click()
    await expect(mgr.locator("body")).toContainText("Đang mở", { timeout: 15_000 })
    console.log("  [MANAGER]  Đã mở đơn → kho được phép nhận hàng")

    // STOCK: tạo phiếu nhập từ PO đã mở + xác nhận → RECEIVED
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
    console.log("  [STOCK]    Phiếu nhập #" + receiptId + " đã xác nhận → RECEIVED")

    // STOCK: xác nhận trên giao diện chi tiết phiếu nhập
    await navigateTo(stock, `/stock/imports/${receiptId}`)
    await stock.getByText("Đã nhận hàng").waitFor({ timeout: 10_000 })
    console.log("  [STOCK]    Giao diện hiển thị 'Đã nhận hàng' ✓")

    // ─────────────────────────── CHƯƠNG 2: XUẤT KHO ───────────────────────────
    console.log("\n════════ CHƯƠNG 2: SALES tạo phiếu xuất → MANAGER duyệt xuất trên giao diện ════════")

    // Lấy serial của unit vừa nhập để xuất
    const unitsRes = await stock.request.get(`${API_URL}/import-receipt/${receiptId}/units`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    const unitId: number = (await unitsRes.json()).data[0].id

    // SALES: tạo phiếu xuất bán
    const expRes = await sales.request.post(`${API_URL}/export-receipt`, {
      data: {
        type: "SALE", customerId: 1, note: "DEMO export",
        items: [{ productId: 1, quantity: 1, unitPrice: 15000000 }],
      },
      headers: { Authorization: `Bearer ${salesToken}` },
    })
    expect(expRes.ok()).toBeTruthy()
    const expData = (await expRes.json()).data
    const exportId: number = expData.id
    console.log(`  [SALES]    Đã tạo phiếu xuất #${exportId} (PENDING)`)

    // MANAGER: duyệt xuất hoàn toàn qua giao diện (chọn serial → ảnh → xác nhận)
    await navigateTo(mgr, `/stock/exports/${exportId}`)
    await navigateTo(mgr, `/stock/exports/${exportId}/fulfill`)
    const selectSerialBtn = mgr.locator('button:has-text("Chọn serial")').first()
    await expect(selectSerialBtn).toBeVisible({ timeout: 10_000 })
    await selectSerialBtn.click()
    const dialog = mgr.locator('[role="dialog"]')
    await expect(dialog).toBeVisible({ timeout: 10_000 })
    const serialInput = dialog.locator('input').first()
    await serialInput.fill(serial)
    await serialInput.press("Enter")
    await expect(serialInput).toHaveValue("")
    await dialog.locator('button:has-text("Xác nhận")').first().click()
    await expect(dialog).not.toBeVisible({ timeout: 5000 })
    console.log("  [MANAGER]  Đã chọn serial trong hộp thoại Chọn serial")

    await mgr.locator("#fulfill-note").fill("DEMO fulfill note")
    await mgr.locator('input[type="file"]').setInputFiles({
      name: "evidence.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        "base64",
      ),
    })
    await expect(mgr.locator('button:has-text("Xác nhận xuất kho")')).toBeEnabled({ timeout: 15_000 })
    await mgr.locator('button:has-text("Xác nhận xuất kho")').first().click()
    await mgr.locator('[role="alertdialog"] button:has-text("Xác nhận xuất")').click()
    await mgr.waitForURL(`**/stock/exports/${exportId}`, { timeout: 15_000 })
    await expect(mgr.locator("body")).toContainText("Hoàn tất", { timeout: 15_000 })
    console.log("  [MANAGER]  Đã xác nhận xuất kho qua giao diện → phiếu xuất HOÀN TẤT ✓")

    // ─────────────────────── CHƯƠNG 3: TRẢ HÀNG + QC ───────────────────────
    console.log("\n════════ CHƯƠNG 3: SALES nhận trả hàng → MANAGER duyệt → STOCK kiểm định QC ════════")

    // SALES: tạo phiếu trả (hàng còn mới — GOOD/RESTOCK)
    const retRes = await sales.request.post(`${API_URL}/return-receipts`, {
      data: {
        customerId: 1,
        originalExportReceiptId: exportId,
        reason: "CHANGE_MIND",
        note: "DEMO return",
        items: [{ productUnitId: unitId, productId: 1, quantity: 1, condition: "GOOD", resultingAction: "RESTOCK" }],
      },
      headers: { Authorization: `Bearer ${salesToken}` },
    })
    expect(retRes.ok()).toBeTruthy()
    const retId: number = (await retRes.json()).data.id
    console.log(`  [SALES]    Đã tạo phiếu trả hàng #${retId}`)

    // MANAGER: duyệt phiếu trả
    const approveRes = await mgr.request.put(`${API_URL}/return-receipts/${retId}/approve`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(approveRes.ok()).toBeTruthy()
    console.log("  [MANAGER]  Đã duyệt phiếu trả → hàng vào khu QC (RETURN_QC_HOLD)")

    // STOCK: kiểm định trên giao diện QC — chọn đơn vị → QC Pass → xác nhận
    await navigateTo(stock, `/returns-qc/qc`)
    await stock.locator("table input[type=checkbox]").first().waitFor({ timeout: 10_000 })
    await stock.locator("table input[type=checkbox]").first().check()
    await stock.getByRole("button", { name: /QC Pass/ }).click()
    await stock.locator('[role="dialog"]').getByRole("button", { name: "Xác nhận" }).click()
    console.log("  [STOCK]    Đã QC Pass đơn vị trả về trên giao diện")

    // Xác minh cuối: unit quay về IN_STOCK, sẵn sàng bán lại
    await expect
      .poll(async () => {
        const res = await stock.request.get(`${API_URL}/product-unit/${unitId}`, {
          headers: { Authorization: `Bearer ${stockToken}` },
        })
        return ((await res.json()) as { data: { status: string } }).data.status
      }, { timeout: 10_000 })
      .toBe("IN_STOCK")
    console.log(`  [STOCK]    Unit #${unitId} đã về IN_STOCK, sẵn sàng bán lại ✓`)

    console.log("\n════════ DEMO HOÀN TẤT — cả 3 role đã phối hợp xong 1 luồng nghiệp vụ ════════\n")
    console.log("  Giữ 3 cửa sổ mở 10 giây để bạn xem kết quả...")

    await mgr.waitForTimeout(10_000)

    await mgrCtx.close()
    await stockCtx.close()
    await salesCtx.close()
  })
})