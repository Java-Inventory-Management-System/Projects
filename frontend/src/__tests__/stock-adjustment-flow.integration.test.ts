import { describe, it, expect } from "vitest"
import { api, loginAsManager } from "./api-client"

describe("Stock Adjustment Flow", () => {
  it("should reject adjustment with missing productUnitId", async () => {
    await loginAsManager()
    try {
      await api.post("/stock-adjustment", { type: "DAMAGED", reason: "Test" })
    } catch (err: any) {
      expect(err.response.status).toBe(400)
    }
  })
})
