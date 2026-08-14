import { describe, it, expect } from "vitest"
import { api, loginAsManager, ensureImport, randomSerial, createPurchaseOrder } from "./api-client"

describe("Import Flow", () => {
  it("should create import receipt in DRAFT status", async () => {
    await loginAsManager()
    const serial = randomSerial()
    const purchaseOrderId = await createPurchaseOrder()
    await api.put(`/purchase-order/${purchaseOrderId}/open`)
    const res = await api.post("/import-receipt", {
      supplierId: 1, purchaseOrderId, note: "E2E DRAFT",
      items: [{ productId: 1, quantity: 1, unitPrice: 10000000, warrantyMonths: 12, serialNumbers: [serial], locationId: 1 }],
    })
    expect(res.status).toBe(201)
    expect(res.data.data.status).toBe("DRAFT")
  })

  it("should confirm to RECEIVED", async () => {
    await loginAsManager()
    const { importReceiptId } = await ensureImport()
    const res = await api.get(`/import-receipt/${importReceiptId}`)
    expect(res.status).toBe(200)
    expect(res.data.data.status).toBe("RECEIVED")
  })

  it("should reject a DRAFT receipt with reason and evidence", async () => {
    await loginAsManager()
    const serial = randomSerial()
    const purchaseOrderId = await createPurchaseOrder()
    await api.put(`/purchase-order/${purchaseOrderId}/open`)
    const createRes = await api.post("/import-receipt", {
      supplierId: 1, purchaseOrderId, note: "E2E REJECT",
      items: [{ productId: 1, quantity: 1, unitPrice: 10000000, serialNumbers: [serial], locationId: 1 }],
    })
    const id: number = createRes.data.data.id
    const rejectRes = await api.put(`/import-receipt/${id}/reject`, {
      reason: "Hàng sai mã",
      evidenceImageUrl: "https://example.com/evidence.jpg",
    })
    expect(rejectRes.status).toBe(200)
    expect(rejectRes.data.data.status).toBe("REJECTED")
    expect(rejectRes.data.data.rejectReason).toBe("Hàng sai mã")
  })

  it("should return pagination with pageNumber/pageSize", async () => {
    await loginAsManager()
    const res = await api.get("/import-receipt", { params: { page: 0, size: 10 } })
    expect(res.status).toBe(200)
    expect(res.data.data.pagination.pageNumber).toBe(0)
    expect(res.data.data.pagination.pageSize).toBe(10)
  })
})
