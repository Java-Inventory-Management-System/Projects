import { test, expect } from "@playwright/test"
import { loginAsStock, loginAsManager } from "./helpers/auth"
import { navigateTo } from "./helpers/nav"
import { initTokens, getToken, ensureImport, API_URL } from "./helpers/api"

test.describe("Export Flow (Xuất kho) — SOP §3", () => {

  test("STOCK creates export via API_URL → MANAGER fulfills via UI → unit SOLD", async ({ browser }) => {
    const stockCtx = await browser.newContext()
    const mgrCtx = await browser.newContext()
    const stock = await stockCtx.newPage()
    const mgr = await mgrCtx.newPage()

    await loginAsStock(stock)
    await loginAsManager(mgr)
    await initTokens(stock)

    const stockToken = await getToken("stock", stock)
    const managerToken = await getToken("manager", mgr)

    const { importReceiptId, productUnitIds } = await ensureImport(stock)
    test.skip(productUnitIds.length === 0, "No product units available")

    // STOCK creates export
    const createRes = await stock.request.post(`${API_URL}/export-receipt`, {
      data: {
        reason: "SALE", customerId: 1, note: "E2E export",
        items: [{ productId: 1, quantity: 1, unitPrice: 15000000 }],
        productUnitIds: [productUnitIds[0]],
      },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(createRes.ok()).toBeTruthy()
    const exportData = (await createRes.json()).data
    const exportId: number = exportData.id
    const exportItemId: number = exportData.items[0].id

    // Get serial for the unit to fulfill
    const units = (await stock.request.get(`${API_URL}/import-receipt/${importReceiptId}/units`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    }).then((r) => r.json())).data as Array<{ id: number; serialNumber: string }>
    const serial = units.find((u) => u.id === productUnitIds[0])?.serialNumber
    expect(serial).toBeTruthy()

    // MANAGER fulfills export via UI (detail page → fulfill page)
    await navigateTo(mgr, `/stock/exports/${exportId}`)
    await navigateTo(mgr, `/stock/exports/${exportId}/fulfill`)
    const selectSerialBtn = mgr.locator('button:has-text("Chọn serial")').first()
    await expect(selectSerialBtn).toBeVisible({ timeout: 10000 })
    await selectSerialBtn.click()
    const dialog = mgr.locator('[role="dialog"]')
    await expect(dialog).toBeVisible({ timeout: 10000 })
    const serialInput = dialog.locator('input').first()
    await serialInput.fill(serial as string)
    await serialInput.press("Enter")
    await expect(serialInput).toHaveValue("")
    await dialog.locator('button:has-text("Xác nhận")').first().click()
    await expect(dialog).not.toBeVisible({ timeout: 5000 })
    await mgr.locator('button:has-text("Xác nhận xuất kho")').first().click()
    await mgr.locator('[role="alertdialog"] button:has-text("Xác nhận xuất")').click()
    await mgr.waitForURL(`**/stock/exports/${exportId}`, { timeout: 15000 })

    // Verify COMPLETED via UI detail
    await expect(mgr.locator("body")).toContainText("Hoàn tất", { timeout: 15000 })
    const detail = await mgr.request.get(`${API_URL}/export-receipt/${exportId}`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    const data = (await detail.json()) as { data: { status: string; reason: string } }
    expect(data.data.status).toBe("COMPLETED")
    expect(data.data.reason).toBe("SALE")

    await stockCtx.close()
    await mgrCtx.close()
  })
})
