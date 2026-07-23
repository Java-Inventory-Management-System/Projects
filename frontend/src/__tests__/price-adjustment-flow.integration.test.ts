import { describe, it, expect } from "vitest"
import { api, loginAsAdmin, loginAsManager, ensureImport } from "./api-client"

describe("Price Adjustment Flow", () => {
  it("should create price adjustment and approve", async () => {
    await loginAsAdmin()
    const { importReceiptId } = await ensureImport()
    const receiptRes = await api.get(`/import-receipt/${importReceiptId}`)
    const itemId: number = receiptRes.data.data.items[0].id

    loginAsManager()
    const adjRes = await api.post("/price-adjustment", {
      importReceiptItemId: itemId, newPrice: 12000000, reason: "E2E adjustment",
    })
    expect(adjRes.status).toBe(201)

    loginAsAdmin()
    const approveRes = await api.put(`/price-adjustment/${adjRes.data.data.id}/approve`)
    expect(approveRes.status).toBe(200)

    const detailRes = await api.get(`/import-receipt/${importReceiptId}`)
    expect(detailRes.data.data.items[0].unitPrice).toBe(12000000)
  })
})
