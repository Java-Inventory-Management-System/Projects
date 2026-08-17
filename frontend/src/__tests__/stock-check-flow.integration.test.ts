import { describe, it, expect, beforeAll } from "vitest"
import { api, loginAsManager, loginAsStock, ensureImport, cancelOpenStockChecks } from "./api-client"

describe("Stock Check Flow", () => {
  beforeAll(async () => {
    await cancelOpenStockChecks()
  })

  it("should reject stock check without scope", async () => {
    await loginAsManager()
    try {
      await api.post("/stock-check", { note: "E2E test" })
    } catch (err: any) {
      expect(err.response.status).toBe(400)
    }
  })

  it("should complete a stock check and create adjustments", async () => {
    await loginAsManager()
    const { serialNumbers } = await ensureImport(1, 1)
    const created = await api.post("/stock-check", { scopeType: "ZONE", scopeId: 1, note: "Phase2 test" })
    const checkId = created.data.data.id
    await api.put(`/stock-check/${checkId}/start`)

    const detail = await api.get(`/stock-check/${checkId}`)
    const item = detail.data.data.items.find((i: any) => i.serialNumber === serialNumbers[0])
    expect(item).toBeDefined()

    const items: any[] = [{ productUnitId: item.productUnitId, actualStatus: "LOST", countedQuantity: 0 }]
    const bulkItem = detail.data.data.items.find((i: any) => i.trackingType === "BULK")
    if (bulkItem) items.push({ productUnitId: bulkItem.productUnitId, actualStatus: "IN_STOCK", countedQuantity: 1 })

    await api.put(`/stock-check/${checkId}/items`, { items })
    const done = await api.put(`/stock-check/${checkId}/complete`, null, { params: { confirmUntouched: true } })
    expect(done.data.data.status).toBe("COMPLETED")

    const report = await api.get("/report/stock-check-overview", {
      params: { from: "2020-01-01T00:00:00Z", to: "2030-01-01T00:00:00Z" },
    })
    const disc = report.data.data.recentDiscrepancies.find((d: any) => d.id === checkId)
    expect(disc?.missingCount).toBeGreaterThan(0)
    const lostTotal = report.data.data.adjustmentsPerMonth.reduce((s: number, m: any) => s + m.lost, 0)
    expect(lostTotal).toBeGreaterThan(0)
  })

  it("should cancel a stock check by creator only", async () => {
    await loginAsManager()
    const created = await api.post("/stock-check", { scopeType: "ZONE", scopeId: 1 })
    const id = created.data.data.id

    const cancelled = await api.put(`/stock-check/${id}/cancel`)
    expect(cancelled.data.data.status).toBe("CANCELLED")

    const created2 = await api.post("/stock-check", { scopeType: "ZONE", scopeId: 1 })
    const id2 = created2.data.data.id
    await loginAsStock()
    try {
      await api.put(`/stock-check/${id2}/cancel`)
      expect.unreachable("should have thrown")
    } catch (err: any) {
      expect(err.response.status).toBe(400)
    }
    await loginAsManager()
    await api.put(`/stock-check/${id2}/cancel`)
  })
})
