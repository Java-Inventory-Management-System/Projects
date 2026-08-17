import { test, expect } from "@playwright/test"
import { loginAsSales, loginAsManager, loginAsStock } from "./helpers/auth"
import { navigateTo } from "./helpers/nav"
import { initTokens, getToken, ensureImport, API_URL } from "./helpers/api"
import { chapter, log, hold } from "./helpers/demo"

test.use({ launchOptions: { slowMo: 5000 } })

test.describe("DEMO — Xuất kho (happy + OTHER)", () => {

  test("Happy: SALES tạo phiếu xuất → MANAGER duyệt qua UI → HOÀN TẤT", async ({ browser }) => {
    const salesCtx = await browser.newContext()
    const mgrCtx = await browser.newContext()
    const sales = await salesCtx.newPage()
    const mgr = await mgrCtx.newPage()

    chapter("XUẤT KHO HAPPY: SALES tạo phiếu, MANAGER duyệt bằng giao diện")
    await loginAsSales(sales)
    await loginAsManager(mgr)
    await initTokens(sales)

    const salesToken = await getToken("sales", sales)
    const managerToken = await getToken("manager", mgr)

    const { importReceiptId, productUnitIds } = await ensureImport(sales)
    test.skip(productUnitIds.length === 0, "No product units available")

    const createRes = await sales.request.post(`${API_URL}/export-receipt`, {
      data: {
        type: "SALE", customerId: 1, note: "DEMO export",
        items: [{ productId: 1, quantity: 1, unitPrice: 15000000 }],
      },
      headers: { Authorization: `Bearer ${salesToken}` },
    })
    expect(createRes.ok()).toBeTruthy()
    const exportData = (await createRes.json()).data
    const exportId: number = exportData.id
    log("SALES", `Đã tạo phiếu xuất #${exportId} (PENDING)`)

    const units = (await mgr.request.get(`${API_URL}/import-receipt/${importReceiptId}/units`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    }).then((r) => r.json())).data as Array<{ id: number; serialNumber: string }>
    const serial = units.find((u) => u.id === productUnitIds[0])?.serialNumber
    expect(serial).toBeTruthy()

    await navigateTo(mgr, `/stock/exports/${exportId}`)
    await navigateTo(mgr, `/stock/exports/${exportId}/fulfill`)
    const selectSerialBtn = mgr.locator('button:has-text("Chọn serial")').first()
    await expect(selectSerialBtn).toBeVisible({ timeout: 10_000 })
    await selectSerialBtn.click()
    const dialog = mgr.locator('[role="dialog"]')
    await expect(dialog).toBeVisible({ timeout: 10_000 })
    const serialInput = dialog.locator('input').first()
    await serialInput.fill(serial as string)
    await serialInput.press("Enter")
    await expect(serialInput).toHaveValue("")
    await dialog.locator('button:has-text("Xác nhận")').first().click()
    await expect(dialog).not.toBeVisible({ timeout: 5000 })
    log("MANAGER", "Đã chọn serial trong hộp thoại")

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
    log("MANAGER", "Đã xác nhận xuất kho → phiếu HOÀN TẤT ✓")

    await hold(mgr, 5000)
    await salesCtx.close()
    await mgrCtx.close()
  })

  test("Edge: xuất OTHER (tặng/khác) kèm reason, không cần khách hàng", async ({ browser }) => {
    const stockCtx = await browser.newContext()
    const salesCtx = await browser.newContext()
    const mgrCtx = await browser.newContext()
    const stock = await stockCtx.newPage()
    const sales = await salesCtx.newPage()
    const mgr = await mgrCtx.newPage()

    chapter("XUẤT KHO EDGE: loại OTHER (tặng, hỏng, kiểm...) kèm lý do")
    await loginAsStock(stock)
    await loginAsSales(sales)
    await loginAsManager(mgr)
    await initTokens(stock)

    const stockToken = await getToken("stock", stock)
    const salesToken = await getToken("sales", sales)

    const { productUnitIds } = await ensureImport(stock)
    test.skip(productUnitIds.length === 0, "No product units")
    const unitRes = await stock.request.get(`${API_URL}/product-unit/${productUnitIds[0]}`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    const serial: string = ((await unitRes.json()) as { data: { serialNumber: string } }).data.serialNumber

    const otherRes = await sales.request.post(`${API_URL}/export-receipt`, {
      data: {
        type: "OTHER",
        reason: "DEMO donation",
        note: "DEMO other export",
        externalReference: "REF-DEMO-1",
        items: [{ productId: 1, quantity: 1, unitPrice: 0 }],
      },
      headers: { Authorization: `Bearer ${salesToken}` },
    })
    expect(otherRes.ok()).toBeTruthy()
    const otherData = (await otherRes.json()).data
    const otherId: number = otherData.id
    const otherItemId: number = otherData.items[0].id
    log("SALES", `Tạo phiếu xuất OTHER #${otherId} (lý do: DEMO donation)`)

    const fulfillRes = await stock.request.put(`${API_URL}/export-receipt/${otherId}/fulfill`, {
      data: {
        note: "DEMO other fulfill",
        evidenceImages: ["https://example.com/evidence.png"],
        items: [{ itemId: otherItemId, serialNumbers: [serial] }],
      },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(fulfillRes.ok()).toBeTruthy()
    log("STOCK", "Đã duyệt xuất OTHER với serial")

    const detail = await mgr.request.get(`${API_URL}/export-receipt/${otherId}`, {
      headers: { Authorization: `Bearer ${await getToken("manager", mgr)}` },
    })
    const data = (await detail.json()) as { data: { status: string; reason: string; externalReference: string } }
    expect(data.data.status).toBe("COMPLETED")
    expect(data.data.reason).toBe("DEMO donation")
    expect(data.data.externalReference).toBe("REF-DEMO-1")
    log("MANAGER", `Phiếu #${otherId} HOÀN TẤT, reason + externalReference đúng ✓`)

    await hold(mgr, 5000)
    await stockCtx.close()
    await salesCtx.close()
    await mgrCtx.close()
  })
})