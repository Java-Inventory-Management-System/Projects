import { describe, it, expect } from "vitest"
import { api, loginAsAdmin, loginAsManager, ensureImport } from "./api-client"

describe("Export Flow", () => {
  it("should create and approve export receipt", async () => {
    await loginAsAdmin()
    await ensureImport()

    loginAsManager()
    const createRes = await api.post("/export-receipt", {
      reason: "SALE", customerId: 1, note: "E2E export",
      items: [{ productId: 1, quantity: 1, unitPrice: 15000000 }],
    })
    expect(createRes.status).toBe(201)
    expect(createRes.data.data.status).toBe("PENDING_APPROVAL")
    const exportId = createRes.data.data.id

    loginAsAdmin()
    const approveRes = await api.put(`/export-receipt/${exportId}/approve`)
    expect(approveRes.status).toBe(200)
    expect(approveRes.data.data.status).toBe("COMPLETED")
  })

  it("should return pagination with pageNumber/pageSize", async () => {
    await loginAsAdmin()
    const res = await api.get("/export-receipt", { params: { page: 0, size: 10 } })
    expect(res.status).toBe(200)
    expect(res.data.data.pagination.pageNumber).toBe(0)
    expect(res.data.data.pagination.pageSize).toBe(10)
  })
})
