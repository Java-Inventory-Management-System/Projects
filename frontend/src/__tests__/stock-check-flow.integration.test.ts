import { describe, it, expect } from "vitest"
import { api, loginAsManager, loginAsAdmin, ensureImport } from "./api-client"

describe("Stock Check Flow", () => {
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

    const detail = await api.get(`/stock-check/${checkId}`)
    const item = detail.data.data.items.find((i: any) => i.serialNumber === serialNumbers[0])
    expect(item).toBeDefined()

    const items: any[] = [{ productUnitId: item.productUnitId, actualStatus: "LOST", countedQuantity: 0 }]
    const bulkItem = detail.data.data.items.find((i: any) => i.trackingType === "BULK")
    if (bulkItem) items.push({ productUnitId: bulkItem.productUnitId, actualStatus: "IN_STOCK", countedQuantity: 1 })

    await api.put(`/stock-check/${checkId}/items`, { items })
    const sealedBoxIds = [...new Set(detail.data.data.items.map((i: any) => i.boxId).filter(Boolean))]
    if (sealedBoxIds.length) {
      await api.put(`/stock-check/${checkId}/confirm-boxes`, { boxIds: sealedBoxIds })
    }
    const done = await api.put(`/stock-check/${checkId}/complete`)
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

    await loginAsAdmin()
    try {
      await api.put(`/stock-check/${id}/cancel`)
      expect.unreachable("should have thrown")
    } catch (err: any) {
      expect(err.response.status).toBe(400)
    }
  })
})
