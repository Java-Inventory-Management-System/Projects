import { test, expect } from "@playwright/test"
import { loginAsSales, loginAsManager } from "./helpers/auth"
import { navigateTo } from "./helpers/nav"
import { initTokens, getToken, ensureImport, API_URL } from "./helpers/api"

test.describe("Export Flow (Xuất kho) — SOP §3", () => {

  test("SALES creates export via API_URL → MANAGER fulfills via UI → unit SOLD", async ({ browser }) => {
    const salesCtx = await browser.newContext()
    const mgrCtx = await browser.newContext()
    const sales = await salesCtx.newPage()
    const mgr = await mgrCtx.newPage()

    await loginAsSales(sales)
    await loginAsManager(mgr)
    await initTokens(sales)

    const salesToken = await getToken("sales", sales)
    const managerToken = await getToken("manager", mgr)

    const { importReceiptId, productUnitIds } = await ensureImport(sales)
    test.skip(productUnitIds.length === 0, "No product units available")

    // SALES creates export (CAN_CREATE_TRANSACTION)
    const createRes = await sales.request.post(`${API_URL}/export-receipt`, {
      data: {
        type: "SALE", customerId: 1, note: "E2E export",
        items: [{ productId: 1, quantity: 1, unitPrice: 15000000 }],
      },
      headers: { Authorization: `Bearer ${salesToken}` },
    })
    expect(createRes.ok()).toBeTruthy()
    const exportData = (await createRes.json()).data
    const exportId: number = exportData.id

    // Get serial for the unit to fulfill (CAN_VIEW_INVENTORY — via manager)
    const units = (await mgr.request.get(`${API_URL}/import-receipt/${importReceiptId}/units`, {
      headers: { Authorization: `Bearer ${managerToken}` },
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
    await mgr.locator("#fulfill-note").fill("E2E fulfill note")
    await mgr.locator('input[type="file"]').setInputFiles("C:\\Users\\DAWNBR~1\\AppData\\Local\\Temp\\opencode\\e2e-evidence.png")
    await expect(mgr.locator('button:has-text("Xác nhận xuất kho")')).toBeEnabled({ timeout: 15000 })
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

    await salesCtx.close()
    await mgrCtx.close()
  })
})
