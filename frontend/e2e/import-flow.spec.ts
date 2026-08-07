import { test, expect } from "@playwright/test"
import { loginAsStock, loginAsManager } from "./helpers/auth"
import { navigateTo } from "./helpers/nav"
import { initTokens, getToken, API_URL, createPurchaseOrder } from "./helpers/api"
import { approveDialog } from "./helpers/approve"

test.describe("Import Flow (Nhập kho) — SOP §2", () => {

  test("STOCK creates import → STOCK confirms → MANAGER approves (API_URL +UI hybrid)", async ({ browser }) => {
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
    const purchaseOrderId = await createPurchaseOrder(stock)

    // STOCK creates import via API 
    const createRes = await stock.request.post(`${API_URL}/import-receipt`, {
      data: {
        supplierId: 1, purchaseOrderId, note: "E2E import",
        items: [{ productId: 1, quantity: 1, unitPrice: 10000000, warrantyMonths: 12, serialNumbers: [serial], locationId: 1 }],
      },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(createRes.ok()).toBeTruthy()
    const createData = (await createRes.json()).data
    const receiptId: number = createData.id
    const itemId: number = createData.items[0].id

    // STOCK confirms (creates product units, sets PENDING_APPROVAL)
    const confirmRes = await stock.request.put(`${API_URL}/import-receipt/${receiptId}/confirm`, {
      data: { serials: [{ itemId, serialNumbers: [serial], locationId: 1 }] },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(confirmRes.ok()).toBeTruthy()

    // MANAGER approves via UI detail page
    await navigateTo(mgr, `/stock/imports/${receiptId}`)
    await approveDialog(mgr, receiptId)

    // Verify COMPLETED
    const detail = await mgr.request.get(`${API_URL}/import-receipt/${receiptId}`, {
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
    const purchaseOrderId = await createPurchaseOrder(stock)

    const createRes = await stock.request.post(`${API_URL}/import-receipt`, {
      data: {
        supplierId: 1, purchaseOrderId, note: "E2E list approve",
        items: [{ productId: 1, quantity: 1, unitPrice: 10000000, warrantyMonths: 12, serialNumbers: [serial], locationId: 1 }],
      },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(createRes.ok()).toBeTruthy()
    const createData = (await createRes.json()).data
    const receiptId: number = createData.id
    const itemId: number = createData.items[0].id

    // STOCK confirms
    const confirm2Res = await stock.request.put(`${API_URL}/import-receipt/${receiptId}/confirm`, {
      data: { serials: [{ itemId, serialNumbers: [serial], locationId: 1 }] },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(confirm2Res.ok()).toBeTruthy()

    // MANAGER approves via detail page
    await navigateTo(mgr, `/stock/imports/${receiptId}`)
    await approveDialog(mgr, receiptId)

    const detail = await mgr.request.get(`${API_URL}/import-receipt/${receiptId}`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(((await detail.json()) as { data: { status: string } }).data.status).toBe("COMPLETED")

    await stockCtx.close()
    await mgrCtx.close()
  })
})
