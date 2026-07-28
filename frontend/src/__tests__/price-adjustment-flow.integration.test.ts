import { describe, it, expect } from "vitest"
import { api, loginAsAdmin, loginAsManager, ensureImport } from "./api-client"

describe("Price Adjustment Flow", () => {
  it("should create price adjustment and approve", async () => {
    await loginAsManager()
    const { importReceiptId } = await ensureImport()
    const receiptRes = await api.get(`/import-receipt/${importReceiptId}`)
    const itemId: number = receiptRes.data.data.items[0].id

    const adjRes = await api.post("/price-adjustment", {
      importReceiptItemId: itemId, newPrice: 12000000, reason: "E2E adjustment",
    })
    expect(adjRes.status).toBe(201)

    await loginAsAdmin()
    const approveRes = await api.put(`/price-adjustment/${adjRes.data.data.id}/approve`)
    expect(approveRes.status).toBe(200)
    expect(approveRes.data.data.status).toBe("APPROVED")
    expect(approveRes.data.data.newPrice).toBe(12000000)
  })
})
