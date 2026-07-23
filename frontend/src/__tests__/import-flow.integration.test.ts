import { describe, it, expect } from "vitest"
import { api, loginAsAdmin, ensureImport, randomSerial } from "./api-client"

describe("Import Flow", () => {
  it("should create import receipt in DRAFT status", async () => {
    await loginAsAdmin()
    const serial = randomSerial()
    const res = await api.post("/import-receipt", {
      supplierId: 1, note: "E2E DRAFT",
      items: [{ productId: 1, quantity: 1, unitPrice: 10000000, warrantyMonths: 12, serialNumbers: [serial], locationId: 1 }],
    })
    expect(res.status).toBe(201)
    expect(res.data.data.status).toBe("DRAFT")
  })

  it("should confirm to PENDING_APPROVAL then approve to COMPLETED", async () => {
    await loginAsAdmin()
    const { importReceiptId } = await ensureImport()
    const res = await api.get(`/import-receipt/${importReceiptId}`)
    expect(res.status).toBe(200)
    expect(res.data.data.status).toBe("COMPLETED")
  })

  it("should return pagination with pageNumber/pageSize", async () => {
    await loginAsAdmin()
    const res = await api.get("/import-receipt", { params: { page: 0, size: 10 } })
    expect(res.status).toBe(200)
    expect(res.data.data.pagination.pageNumber).toBe(0)
    expect(res.data.data.pagination.pageSize).toBe(10)
  })
})
