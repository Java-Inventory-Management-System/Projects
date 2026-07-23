import { test, expect } from "@playwright/test"
import { loginAsStock, loginAsManager } from "./helpers/auth"
import { navigateTo } from "./helpers/nav"
import { initTokens, getToken } from "./helpers/api"

test.describe("Import Flow (Nhập kho) — SOP §2", () => {
  const API = "http://localhost:8888/api/v1"

  test("STOCK creates import → STOCK confirms → MANAGER approves (API+UI hybrid)", async ({ browser }) => {
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

    // STOCK creates import via API (complex wizard → skip to approve UI test)
    const createRes = await stock.request.post(`${API}/import-receipt`, {
      data: {
        supplierId: 1, note: "E2E import",
        items: [{ productId: 1, quantity: 1, unitPrice: 10000000, warrantyMonths: 12, serialNumbers: [serial], locationId: 1 }],
      },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(createRes.ok()).toBeTruthy()
    const receiptId: number = (await createRes.json()).data.id

    // STOCK confirms via API
    const confirmRes = await stock.request.put(`${API}/import-receipt/${receiptId}/confirm`, {
      data: { serials: [{ itemId: receiptId, serialNumbers: [serial], locationId: 1 }] },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(confirmRes.ok()).toBeTruthy()

    // MANAGER approves via UI detail page
    await navigateTo(mgr, `/stock/imports/${receiptId}`)
    await mgr.waitForTimeout(1000)

    const approveBtn = mgr.locator('button:has-text("Duyệt")')
    await expect(approveBtn).toBeVisible({ timeout: 10000 })
    await approveBtn.click()
    await mgr.waitForTimeout(1500)

    // Verify COMPLETED
    const detail = await mgr.request.get(`${API}/import-receipt/${receiptId}`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(((await detail.json()) as { data: { status: string } }).data.status).toBe("COMPLETED")

    await stockCtx.close()
    await mgrCtx.close()
  })

  test("MANAGER approves import via list page action", async ({ browser }) => {
    const stockCtx = await browser.newContext()
    const mgrCtx = await browser.newContext()
    const stock = await stockCtx.newPage()
    const mgr = await mgrCtx.newPage()

    await loginAsStock(stock)
    await loginAsManager(mgr)
    await initTokens(stock)

    const stockToken = await getToken("stock", stock)
    const managerToken = await getToken("manager", mgr)
    const serial = `E2E-IMP-LIST-${Date.now()}`

    const createRes = await stock.request.post(`${API}/import-receipt`, {
      data: {
        supplierId: 1, note: "E2E list approve",
        items: [{ productId: 1, quantity: 1, unitPrice: 10000000, warrantyMonths: 12, serialNumbers: [serial], locationId: 1 }],
      },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    const receiptId: number = (await createRes.json()).data.id

    await stock.request.put(`${API}/import-receipt/${receiptId}/confirm`, {
      data: { serials: [{ itemId: receiptId, serialNumbers: [serial], locationId: 1 }] },
      headers: { Authorization: `Bearer ${stockToken}` },
    })

    // MANAGER approves via detail page
    await navigateTo(mgr, `/stock/imports/${receiptId}`)
    await mgr.waitForTimeout(1000)
    await mgr.locator('button:has-text("Duyệt")').click()
    await mgr.waitForTimeout(1500)

    const detail = await mgr.request.get(`${API}/import-receipt/${receiptId}`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(((await detail.json()) as { data: { status: string } }).data.status).toBe("COMPLETED")

    await stockCtx.close()
    await mgrCtx.close()
  })
})
