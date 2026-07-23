import { describe, it, expect } from "vitest"
import { api, loginAsAdmin } from "./api-client"

describe("Warranty Flow", () => {
  it("should lookup nonexistent serial", async () => {
    await loginAsAdmin()
    try {
      await api.get("/warranty-request/lookup", { params: { serialNumber: "NONEXISTENT" } })
    } catch (err: any) {
      expect(err.response.status).toBe(404)
    }
  })
})
