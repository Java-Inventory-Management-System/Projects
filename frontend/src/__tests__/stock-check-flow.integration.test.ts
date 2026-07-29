import { describe, it, expect } from "vitest"
import { api, loginAsManager } from "./api-client"

describe("Stock Check Flow", () => {
  it("should reject stock check without scope", async () => {
    await loginAsManager()
    try {
      await api.post("/stock-check", { note: "E2E test" })
    } catch (err: any) {
      expect(err.response.status).toBe(400)
    }
  })
})
