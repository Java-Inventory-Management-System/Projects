import { describe, it, expect, beforeAll, afterEach } from "vitest"
import { api, loginAsManager, ensureImport, cancelOpenStockChecks } from "./api-client"
async function unitIdsOfSerials(serials: string[]) {
  const check = await api.post("/stock-check", { scopeType: "ZONE", scopeId: 1 })
  await api.put(`/stock-check/${check.data.data.id}/start`)
  const detail = await api.get(`/stock-check/${check.data.data.id}`)
  const ids = detail.data.data.items
    .filter((i: any) => serials.includes(i.serialNumber))
    .map((i: any) => i.productUnitId)
  await api.put(`/stock-check/${check.data.data.id}/cancel`)
  return ids
}

async function unsealStaleTestBoxes() {
  const res = await api.get("/box", { params: { status: "SEALED", size: 100 } })
  for (const b of res.data.data.content ?? []) {
    if (b.note === "Test box") {
      try {
        await api.post(`/box/${b.id}/unseal`)
      } catch {
        // ignore — box may belong to someone else
      }
    }
  }
}

describe("Box Flow", () => {
  beforeAll(async () => {
    await cancelOpenStockChecks()
    await unsealStaleTestBoxes()
  })

  afterEach(async () => {
    await unsealStaleTestBoxes()
  })

  it("should seal, block export until unsealed, then allow export", async () => {
    await loginAsManager()
    const { serialNumbers } = await ensureImport(1, 2)
    const unitIds = await unitIdsOfSerials(serialNumbers)
    expect(unitIds.length).toBe(2)

    const sealRes = await api.post("/box/seal", { unitIds, locationId: 35, note: "Test box" })
    expect(sealRes.status).toBe(200)
    const boxId = sealRes.data.data.id
    expect(sealRes.data.data.status).toBe("SEALED")
    expect(sealRes.data.data.unitCount).toBe(2)

    const createRes = await api.post("/export-receipt", {
      type: "SALE", reason: "SALE", customerId: 1, note: "Boxed serial export",
      items: [{ productId: 1, quantity: 1, unitPrice: 15000000 }],
    })
    const fulfill = (serial: string) =>
      api.put(`/export-receipt/${createRes.data.data.id}/fulfill`, {
        note: "Boxed fulfill",
        evidenceImages: ["https://cloudinary.example.com/boxed-evidence.jpg"],
        items: [{ itemId: createRes.data.data.items[0].id, serialNumbers: [serial] }],
      })

    try {
      await fulfill(serialNumbers[0])
      expect.unreachable("should have thrown")
    } catch (err: any) {
      expect(err.response.status).toBe(400)
      expect(JSON.stringify(err.response.data)).toContain("sealed box")
    }

    const unsealRes = await api.post(`/box/${boxId}/unseal`)
    expect(unsealRes.data.data.status).toBe("UNSEALED")
    expect(unsealRes.data.data.unsealedAt).toBeTruthy()

    await fulfill(serialNumbers[0])
  })

  it("should move a sealed box and reject duplicate unit sealing", async () => {
    await loginAsManager()
    const { serialNumbers } = await ensureImport(1, 1)
    const [unitId] = await unitIdsOfSerials(serialNumbers)

    const sealRes = await api.post("/box/seal", { unitIds: [unitId], locationId: 35, note: "Test box" })
    const boxId = sealRes.data.data.id

    try {
      await api.post("/box/seal", { unitIds: [unitId], locationId: 35, note: "Test box" })
      expect.unreachable("should have thrown")
    } catch (err: any) {
      expect(err.response.status).toBe(400)
    }

    const moveRes = await api.post(`/box/${boxId}/move`, { locationId: 36 })
    expect(moveRes.data.data.status).toBe("SEALED")
    expect(moveRes.data.data.locationId).toBe(36)

    const zoneCheck = await api.post("/stock-check", { scopeType: "ZONE", scopeId: 1 })
    await api.put(`/stock-check/${zoneCheck.data.data.id}/start`)
    const zoneDetail = await api.get(`/stock-check/${zoneCheck.data.data.id}`)
    expect(zoneDetail.data.data.items.some((i: any) => i.serialNumber === serialNumbers[0])).toBe(true)
    await api.put(`/stock-check/${zoneCheck.data.data.id}/cancel`)

    const list = await api.get("/box", { params: { status: "SEALED", size: 100 } })
    expect(list.data.data.content.some((b: any) => b.id === boxId)).toBe(true)

    const print = await api.get(`/box/${boxId}/print`)
    expect(print.status).toBe(200)
    expect(print.headers["content-type"] ?? print.headers["Content-Type"]).toContain("pdf")

    const unsealRes = await api.post(`/box/${boxId}/unseal`)
    expect(unsealRes.data.data.status).toBe("UNSEALED")

    const zoneCheck2 = await api.post("/stock-check", { scopeType: "ZONE", scopeId: 1 })
    await api.put(`/stock-check/${zoneCheck2.data.data.id}/start`)
    const zoneDetail2 = await api.get(`/stock-check/${zoneCheck2.data.data.id}`)
    expect(zoneDetail2.data.data.items.some((i: any) => i.serialNumber === serialNumbers[0])).toBe(true)
    await api.put(`/stock-check/${zoneCheck2.data.data.id}/cancel`)
  })

  it("should allow sealing a unit while it is inside an active stock check (B.9)", async () => {
    await loginAsManager()
    const { serialNumbers } = await ensureImport(1, 2)
    const unitIds = await unitIdsOfSerials(serialNumbers)
    expect(unitIds.length).toBe(2)

    const check = await api.post("/stock-check", { scopeType: "ZONE", scopeId: 1 })

    const sealRes = await api.post("/box/seal", { unitIds: [unitIds[0]], locationId: 35, note: "Test box" })
    expect(sealRes.status).toBe(200)
    expect(sealRes.data.data.status).toBe("SEALED")

    await api.put(`/stock-check/${check.data.data.id}/cancel`)

    const unsealRes = await api.post(`/box/${sealRes.data.data.id}/unseal`)
    expect(unsealRes.data.data.status).toBe("UNSEALED")
  })
})
