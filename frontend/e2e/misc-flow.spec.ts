import { test, expect } from "@playwright/test"
import { loginAsStock, loginAsManager, loginAsSales } from "./helpers/auth"
import { initTokens, getToken, ensureImport, API_URL } from "./helpers/api"

test.describe("Misc Flows (PO hủy + xuất OTHER) — SOP §12", () => {

  test("MANAGER cancels a DRAFT PO; SALES exports with type OTHER + reason and MANAGER fulfills", async ({ browser }) => {
    const stockCtx = await browser.newContext()
    const mgrCtx = await browser.newContext()
    const salesCtx = await browser.newContext()
    const stock = await stockCtx.newPage()
    const mgr = await mgrCtx.newPage()
    const sales = await salesCtx.newPage()

    await loginAsStock(stock)
    await loginAsManager(mgr)
    await loginAsSales(sales)
    await initTokens(stock)

    const stockToken = await getToken("stock", stock)
    const managerToken = await getToken("manager", mgr)
    const salesToken = await getToken("sales", sales)

    // 1. PO cancel: MANAGER creates a DRAFT PO then cancels it
    const poRes = await mgr.request.post(`${API_URL}/purchase-order`, {
      data: {
        supplierId: 1,
        expectedDate: "2026-12-31",
        note: "E2E cancel PO",
        invoiceCode: `INV-${Date.now()}`,
        items: [{ productId: 1, quantity: 1, unitPrice: 10000000 }],
      },
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(poRes.ok()).toBeTruthy()
    const poId: number = (await poRes.json()).data.id

    const cancelRes = await mgr.request.put(`${API_URL}/purchase-order/${poId}/cancel`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(cancelRes.ok()).toBeTruthy()
    const poAfter = await mgr.request.get(`${API_URL}/purchase-order/${poId}`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(((await poAfter.json()) as { data: { status: string } }).data.status).toBe("CANCELLED")

    // 2. Export OTHER: SALES creates with reason (no customer), STOCK fulfills with serials
    const { productUnitIds } = await ensureImport(stock)
    test.skip(productUnitIds.length === 0, "No product units")
    const unitRes = await stock.request.get(`${API_URL}/product-unit/${productUnitIds[0]}`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    const serial: string = ((await unitRes.json()) as { data: { serialNumber: string } }).data.serialNumber

    const otherRes = await sales.request.post(`${API_URL}/export-receipt`, {
      data: {
        type: "OTHER",
        reason: "E2E donation",
        note: "E2E other export",
        externalReference: "REF-OTHER-1",
        items: [{ productId: 1, quantity: 1, unitPrice: 0 }],
      },
      headers: { Authorization: `Bearer ${salesToken}` },
    })
    expect(otherRes.ok()).toBeTruthy()
    const otherData = (await otherRes.json()).data
    const otherId: number = otherData.id
    const otherItemId: number = otherData.items[0].id

    const fulfillRes = await stock.request.put(`${API_URL}/export-receipt/${otherId}/fulfill`, {
      data: {
        note: "E2E other fulfill",
        evidenceImages: ["https://example.com/evidence.png"],
        items: [{ itemId: otherItemId, serialNumbers: [serial] }],
      },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(fulfillRes.ok()).toBeTruthy()

    const detail = await mgr.request.get(`${API_URL}/export-receipt/${otherId}`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    const data = (await detail.json()) as { data: { status: string; reason: string; externalReference: string } }
    expect(data.data.status).toBe("COMPLETED")
    expect(data.data.reason).toBe("E2E donation")
    expect(data.data.externalReference).toBe("REF-OTHER-1")

    await stockCtx.close()
    await mgrCtx.close()
    await salesCtx.close()
  })
})