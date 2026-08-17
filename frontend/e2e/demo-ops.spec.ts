import { test, expect } from "@playwright/test"
import { loginAsStock, loginAsManager, loginAsAdmin } from "./helpers/auth"
import { navigateTo } from "./helpers/nav"
import { initTokens, getToken, API_URL, createPurchaseOrder, getE2ELocationId, ensureImport } from "./helpers/api"
import { approveDialog } from "./helpers/approve"
import { chapter, log, hold } from "./helpers/demo"

test.use({ launchOptions: { slowMo: 5000 } })

test.describe("DEMO — Kiểm kê + điều chỉnh tồn + giá", () => {

  test("Kiểm kê: STOCK tạo → ghi nhận → hoàn tất → MANAGER thấy", async ({ browser }) => {
    const mgrCtx = await browser.newContext()
    const stockCtx = await browser.newContext()
    const mgr = await mgrCtx.newPage()
    const stock = await stockCtx.newPage()

    chapter("KIỂM KÊ: STOCK kiểm kê khu A → ghi nhận khớp → hoàn tất")
    await loginAsManager(mgr)
    await loginAsStock(stock)
    await initTokens(stock)

    const stockToken = await getToken("stock", stock)

    const createRes = await stock.request.post(`${API_URL}/stock-check`, {
      data: { scopeType: "ZONE", scopeId: 1, note: "DEMO stock check" },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(createRes.ok()).toBeTruthy()
    const checkId: number = (await createRes.json()).data.id
    log("STOCK", `Tạo phiếu kiểm kê #${checkId} (khu A)`)

    const startRes = await stock.request.put(`${API_URL}/stock-check/${checkId}/start`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(startRes.ok()).toBeTruthy()
    log("STOCK", "Bắt đầu kiểm kê (chụp tồn kho hiện tại)")

    const detail = await stock.request.get(`${API_URL}/stock-check/${checkId}`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    const items = ((await detail.json()) as { data: { items: Array<{ productUnitId: number; expectedStatus: string }> } }).data.items
    expect(items.length).toBeGreaterThan(0)
    log("STOCK", `Đếm được ${items.length} đơn vị trong phạm vi kiểm kê`)

    const recordRes = await stock.request.put(`${API_URL}/stock-check/${checkId}/items`, {
      data: {
        items: items.map((it) => ({
          productUnitId: it.productUnitId,
          actualStatus: it.expectedStatus || "IN_STOCK",
          countedQuantity: 1,
          note: "DEMO ok",
        })),
      },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(recordRes.ok()).toBeTruthy()
    log("STOCK", "Ghi nhận toàn bộ khớp với sổ sách")

    const completeRes = await stock.request.put(`${API_URL}/stock-check/${checkId}/complete`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(completeRes.ok()).toBeTruthy()
    log("STOCK", "Hoàn tất kiểm kê")

    await navigateTo(mgr, `/stock/ops/checks/${checkId}`)
    await expect(mgr.locator("body")).toContainText("Hoàn tất", { timeout: 10_000 })
    log("MANAGER", "Xem phiếu kiểm kê trên giao diện → trạng thái Hoàn tất ✓")

    await hold(mgr, 5000)
    await mgrCtx.close()
    await stockCtx.close()
  })

  test("Điều chỉnh tồn: STOCK báo lỗi DAMAGED → MANAGER duyệt", async ({ browser }) => {
    const stockCtx = await browser.newContext()
    const mgrCtx = await browser.newContext()
    const stock = await stockCtx.newPage()
    const mgr = await mgrCtx.newPage()

    chapter("ĐIỀU CHỈNH TỒN: hàng hư hỏng → STOCK tạo phiếu → MANAGER duyệt qua UI")
    await loginAsStock(stock)
    await loginAsManager(mgr)
    await initTokens(stock)

    const stockToken = await getToken("stock", stock)
    const managerToken = await getToken("manager", mgr)

    const { productUnitIds } = await ensureImport(stock)
    test.skip(productUnitIds.length === 0, "No product units")

    const createRes = await stock.request.post(`${API_URL}/stock-adjustment`, {
      data: { type: "DAMAGED", productUnitId: productUnitIds[0], reason: "DEMO: damaged", imageUrl: "https://via.placeholder.com/150" },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(createRes.ok()).toBeTruthy()
    const adjId: number = (await createRes.json()).data.id
    log("STOCK", `Báo hư hỏng unit #${productUnitIds[0]} → phiếu điều chỉnh #${adjId}`)

    await navigateTo(mgr, `/stock/ops/adjustments/${adjId}`)
    await approveDialog(mgr, adjId)
    log("MANAGER", "Đã duyệt phiếu điều chỉnh qua giao diện")

    const detail = await mgr.request.get(`${API_URL}/stock-adjustment/${adjId}`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(((await detail.json()) as { data: { status: string } }).data.status).toBe("APPROVED")
    log("MANAGER", "Phiếu điều chỉnh → APPROVED ✓")

    await hold(mgr, 5000)
    await stockCtx.close()
    await mgrCtx.close()
  })

  test("Giá: MANAGER tạo điều chỉnh → ADMIN duyệt (creator không tự duyệt được)", async ({ browser }) => {
    const mgrCtx = await browser.newContext()
    const adminCtx = await browser.newContext()
    const mgr = await mgrCtx.newPage()
    const admin = await adminCtx.newPage()

    chapter("GIÁ: điều chỉnh giá bán → ADMIN duyệt")
    await loginAsManager(mgr)
    await loginAsAdmin(admin)
    await initTokens(mgr)

    const managerToken = await getToken("manager", mgr)
    const adminToken = await getToken("admin", admin)
    const locationId = await getE2ELocationId(mgr)

    const serial = `E2E-DP-${Date.now()}`
    const purchaseOrderId = await createPurchaseOrder(mgr)
    const impRes = await mgr.request.post(`${API_URL}/import-receipt`, {
      data: {
        supplierId: 1, purchaseOrderId, note: "DEMO price adj",
        items: [{ productId: 1, quantity: 1, unitPrice: 10000000, warrantyMonths: 12, serialNumbers: [serial], locationId }],
      },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(impRes.ok()).toBeTruthy()
    const impData = (await impRes.json()).data
    const impItemId: number = impData.items[0].id
    await mgr.request.put(`${API_URL}/import-receipt/${impData.id}/confirm`, {
      data: { serials: [{ itemId: impItemId, serialNumbers: [serial], locationId }] },
      headers: { Authorization: `Bearer ${managerToken}` },
    })

    const adjRes = await mgr.request.post(`${API_URL}/price-adjustment`, {
      data: { importReceiptItemId: impItemId, newPrice: 12000000, reason: "DEMO market adjustment" },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(adjRes.ok()).toBeTruthy()
    const adjId: number = (await adjRes.json()).data.id
    log("MANAGER", `Tạo điều chỉnh giá #${adjId}: 10tr → 12tr`)

    const selfApprove = await mgr.request.put(`${API_URL}/price-adjustment/${adjId}/approve`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(selfApprove.status()).toBe(403)
    log("MANAGER", "EDGE: MANAGER tự duyệt phiếu mình tạo → 403 (đúng, tránh tự duyệt)")

    await navigateTo(admin, `/stock/ops/price-adjustments/${adjId}`)
    const approveResp = admin.waitForResponse(
      (r) => r.url().includes(`/${adjId}/approve`) && r.status() === 200,
    )
    await admin.getByRole("button", { name: "Duyệt", exact: true }).click()
    await admin.locator('button:has-text("Xác nhận duyệt")').first().waitFor({ state: "visible", timeout: 5000 })
    await admin.locator('button:has-text("Xác nhận duyệt")').first().click()
    await approveResp
    log("ADMIN", "ADMIN duyệt qua giao diện → phiếu APPROVED")

    const detail = await admin.request.get(`${API_URL}/price-adjustment/${adjId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    const data = (await detail.json()) as { data: { status: string; newPrice: number } }
    expect(data.data.status).toBe("APPROVED")
    expect(data.data.newPrice).toBe(12000000)
    log("ADMIN", `Giá mới ${data.data.newPrice} đã áp dụng ✓`)

    await hold(admin, 5000)
    await mgrCtx.close()
    await adminCtx.close()
  })
})