import { describe, it, expect } from "vitest"
import { api, loginAsManager } from "./api-client"

describe("Warranty Flow", () => {
  it("should lookup nonexistent serial", async () => {
    await loginAsManager()
    try {
      await api.get("/warranty-request/lookup", { params: { serialNumber: "NONEXISTENT" } })
    } catch (err: any) {
      expect(err.response.status).toBe(404)
    }
  })
})
