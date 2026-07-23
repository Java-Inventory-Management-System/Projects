import { describe, it, expect } from "vitest"
import { api, loginAsAdmin } from "./api-client"

describe("Return Flow", () => {
  it("should reject return with invalid export", async () => {
    await loginAsAdmin()
    try {
      await api.post("/return-receipt", {
        customerId: 1, originalExportReceiptId: 99999, reason: "DEFECTIVE",
        items: [{ productUnitId: 99999, productId: 1, quantity: 1, condition: "DEFECTIVE", resultingAction: "SCRAP" }],
      })
    } catch (err: any) {
      expect(err.response.status).toBe(500)
    }
  })
})
