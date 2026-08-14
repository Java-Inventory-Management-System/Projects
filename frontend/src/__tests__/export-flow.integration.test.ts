import { describe, it, expect } from "vitest"
import { api, loginAsManager, ensureImport } from "./api-client"

describe("Export Flow", () => {
  it("should create and fulfill export receipt", async () => {
    await loginAsManager()
    const { serialNumbers } = await ensureImport(1, 1)

    const createRes = await api.post("/export-receipt", {
      type: "SALE", reason: "SALE", customerId: 1, note: "E2E export",
      items: [{ productId: 1, quantity: 1, unitPrice: 15000000 }],
    })
    expect(createRes.status).toBe(201)
    expect(createRes.data.data.status).toBe("PENDING")
    const exportId = createRes.data.data.id

    const fulfillRes = await api.put(`/export-receipt/${exportId}/fulfill`, {
      note: "E2E fulfill",
      evidenceImages: ["https://cloudinary.example.com/e2e-evidence.jpg"],
      items: [{ itemId: createRes.data.data.items[0].id, serialNumbers }],
    })
    expect(fulfillRes.status).toBe(200)
    expect(fulfillRes.data.data.status).toBe("COMPLETED")
  })

  it("should cancel export receipt", async () => {
    await loginAsManager()
    await ensureImport()
    const createRes = await api.post("/export-receipt", {
      type: "INTERNAL", reason: "INTERNAL", note: "Cancel test",
      items: [{ productId: 1, quantity: 1, unitPrice: 50000 }],
    })
    const exportId = createRes.data.data.id

    const cancelRes = await api.put(`/export-receipt/${exportId}/cancel`)
    expect(cancelRes.status).toBe(200)
    expect(cancelRes.data.data.status).toBe("CANCELLED")
  })

  it("should return pagination with pageNumber/pageSize", async () => {
    await loginAsManager()
    const res = await api.get("/export-receipt", { params: { page: 0, size: 10 } })
    expect(res.status).toBe(200)
    expect(res.data.data.pagination.pageNumber).toBe(0)
    expect(res.data.data.pagination.pageSize).toBe(10)
  })
})