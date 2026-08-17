import { test, expect } from "@playwright/test"
import { loginAsManager, loginAsStock } from "./helpers/auth"
import { initTokens, getToken, API_URL } from "./helpers/api"

test.describe("UI Ops (Dashboard báo cáo + Location map + Catalog search) — SOP §13", () => {

  test("MANAGER sees low-stock report; STOCK adds a zone via location map UI; MANAGER searches products", async ({ browser }) => {
    const mgrCtx = await browser.newContext()
    const stockCtx = await browser.newContext()
    const mgr = await mgrCtx.newPage()
    const stock = await stockCtx.newPage()

    await loginAsManager(mgr)
    await loginAsStock(stock)
    await initTokens(mgr)

    // 1. Dashboard low-stock report (MANAGER, CAN_VIEW_INVENTORY)
    await mgr.goto("/", { waitUntil: "networkidle" })
    await mgr.getByRole("button", { name: "Sắp hết hàng" }).click()
    await expect(mgr.locator("table").first().getByText("SKU", { exact: true })).toBeVisible({ timeout: 10000 })
    await expect(mgr.locator("table").first().getByText("Thiếu", { exact: true })).toBeVisible()

    // 2. Location map: STOCK enters manage mode and adds a zone via the UI (MANAGE_LOCATION)
    await stock.goto("/stock/units?tab=map", { waitUntil: "networkidle" })
    await stock.getByRole("button", { name: "Toàn cảnh" }).click()
    await stock.getByRole("button", { name: "Quản lý vị trí" }).click()
    const addZoneResp = stock.waitForResponse(
      (r) => r.url().includes("/api/v1/location") && r.request().method() === "POST" && r.status() === 201,
    )
    await stock.getByRole("button", { name: "Thêm khu" }).click()
    expect((await addZoneResp).status()).toBe(201)

    // 3. Products search (MANAGER)
    const managerToken = await getToken("manager", mgr)
    const search = await mgr.request.get(`${API_URL}/product?keyword=Intel&size=5`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(search.ok()).toBeTruthy()
    const found = (await search.json()).data.content as Array<{ name: string }>
    expect(found.length).toBeGreaterThan(0)

    await mgr.goto("/products", { waitUntil: "networkidle" })
    await mgr.getByPlaceholder("Tìm tên hoặc SKU...").fill("Intel")
    await expect(mgr.getByText("Intel Core i7-14700K")).toBeVisible({ timeout: 10000 })
    await expect(mgr.getByText("ASUS ROG Strix Z790-E Gaming")).toHaveCount(0)

    await mgrCtx.close()
    await stockCtx.close()
  })
})