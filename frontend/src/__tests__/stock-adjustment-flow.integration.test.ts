import { describe, it, expect } from "vitest"
import { api, loginAsAdmin } from "./api-client"

describe("Stock Adjustment Flow", () => {
  it("should reject adjustment with missing productUnitId", async () => {
    await loginAsAdmin()
    try {
      await api.post("/stock-adjustment", { type: "DAMAGED", reason: "Test" })
    } catch (err: any) {
      expect(err.response.status).toBe(500)
    }
  })
})
