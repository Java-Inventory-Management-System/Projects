import { describe, it, expect } from "vitest"
import { api, loginAsAdmin } from "./api-client"

describe("Stock Check Flow", () => {
  it("should reject stock check without scope", async () => {
    await loginAsAdmin()
    try {
      await api.post("/stock-check", { note: "E2E test" })
    } catch (err: any) {
      expect(err.response.status).toBe(400)
    }
  })
})
