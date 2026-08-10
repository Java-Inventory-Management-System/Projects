import { describe, it, expect } from "vitest"
import { api, loginAsManager, ensureImport } from "./api-client"

async function unitIdsOfSerials(serials: string[]) {
  const check = await api.post("/stock-check", { scopeType: "ZONE", scopeId: 1 })
  const detail = await api.get(`/stock-check/${check.data.data.id}`)
  const ids = detail.data.data.items
    .filter((i: any) => serials.includes(i.serialNumber))
    .map((i: any) => i.productUnitId)
  await api.put(`/stock-check/${check.data.data.id}/cancel`)
  return ids
}

describe("Box Flow", () => {
  it("should seal, block export + unconfirmed stock check, then unseal", async () => {
    await loginAsManager()
    const { serialNumbers } = await ensureImport(1, 2)
    const unitIds = await unitIdsOfSerials(serialNumbers)
    expect(unitIds.length).toBe(2)

    const sealRes = await api.post("/box/seal", { unitIds, locationId: 34, note: "Test box" })
    expect(sealRes.status).toBe(200)
    const boxId = sealRes.data.data.id
    expect(sealRes.data.data.status).toBe("SEALED")
    expect(sealRes.data.data.unitCount).toBe(2)

    const createRes = await api.post("/export-receipt", {
      reason: "SALE", customerId: 1, note: "Boxed serial export",
      items: [{ productId: 1, quantity: 1, unitPrice: 15000000 }],
    })
    try {
      await api.put(`/export-receipt/${createRes.data.data.id}/fulfill`, {
        items: [{ itemId: createRes.data.data.items[0].id, serialNumbers: [serialNumbers[0]] }],
      })
      expect.unreachable("should have thrown")
    } catch (err: any) {
      expect(err.response.status).toBe(400)
      expect(JSON.stringify(err.response.data)).toContain("sealed box")
    }

    const check = await api.post("/stock-check", { scopeType: "BOX", scopeId: boxId })
    const checkDetail = await api.get(`/stock-check/${check.data.data.id}`)
    expect(checkDetail.data.data.items.length).toBe(2)
    expect(checkDetail.data.data.items[0].boxCode).toBe(sealRes.data.data.boxCode)

    try {
      await api.put(`/stock-check/${check.data.data.id}/complete`)
      expect.unreachable("should have thrown")
    } catch (err: any) {
      expect(err.response.status).toBe(400)
      expect(JSON.stringify(err.response.data)).toContain("sealed box")
    }

    const unsealRes = await api.post(`/box/${boxId}/unseal`)
    expect(unsealRes.data.data.status).toBe("UNSEALED")
    expect(unsealRes.data.data.unsealedAt).toBeTruthy()

    const done = await api.put(`/stock-check/${check.data.data.id}/complete`)
    expect(done.data.data.status).toBe("COMPLETED")
  })

  it("should move a sealed box and reject duplicate unit sealing", async () => {
    await loginAsManager()
    const { serialNumbers } = await ensureImport(1, 1)
    const [unitId] = await unitIdsOfSerials(serialNumbers)

    const sealRes = await api.post("/box/seal", { unitIds: [unitId], locationId: 34 })
    const boxId = sealRes.data.data.id

    try {
      await api.post("/box/seal", { unitIds: [unitId], locationId: 34 })
      expect.unreachable("should have thrown")
    } catch (err: any) {
      expect(err.response.status).toBe(400)
    }

    const moveRes = await api.post(`/box/${boxId}/move`, { locationId: 1 })
    expect(moveRes.data.data.status).toBe("SEALED")
    expect(moveRes.data.data.locationId).toBe(1)

    const zoneCheck = await api.post("/stock-check", { scopeType: "ZONE", scopeId: 1 })
    const zoneDetail = await api.get(`/stock-check/${zoneCheck.data.data.id}`)
    expect(zoneDetail.data.data.items.some((i: any) => i.serialNumber === serialNumbers[0])).toBe(true)
    await api.put(`/stock-check/${zoneCheck.data.data.id}/cancel`)

    const list = await api.get("/box", { params: { status: "SEALED", size: 100 } })
    expect(list.data.data.content.some((b: any) => b.id === boxId)).toBe(true)

    const print = await api.get(`/box/${boxId}/print`)
    expect(print.status).toBe(200)
    expect(print.data).toContain(serialNumbers[0])

    const unsealRes = await api.post(`/box/${boxId}/unseal`)
    expect(unsealRes.data.data.status).toBe("UNSEALED")

    const zoneCheck2 = await api.post("/stock-check", { scopeType: "ZONE", scopeId: 1 })
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

    const sealRes = await api.post("/box/seal", { unitIds: [unitIds[0]], locationId: 34 })
    expect(sealRes.status).toBe(200)
    expect(sealRes.data.data.status).toBe("SEALED")

    await api.put(`/stock-check/${check.data.data.id}/cancel`)

    const unsealRes = await api.post(`/box/${sealRes.data.data.id}/unseal`)
    expect(unsealRes.data.data.status).toBe("UNSEALED")
  })
})
