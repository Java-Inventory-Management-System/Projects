import { test, expect } from "@playwright/test"
import { loginAsStock, loginAsManager } from "./helpers/auth"
import { initTokens, getToken, ensureImport, API_URL, getE2ELocationId } from "./helpers/api"

test.describe("Box Move Flow (Chuyển thùng giữa bins) — SOP §9b", () => {

  test("STOCK seals box at bin A → moves box to bin B → MANAGER unseals there", async ({ browser }) => {
    const stockCtx = await browser.newContext()
    const mgrCtx = await browser.newContext()
    const stock = await stockCtx.newPage()
    const mgr = await mgrCtx.newPage()

    await loginAsStock(stock)
    await loginAsManager(mgr)
    await initTokens(stock)

    const stockToken = await getToken("stock", stock)
    const managerToken = await getToken("manager", mgr)
    const locationA = await getE2ELocationId(stock)

    // Second dedicated bin for the move target
    const targetRes = await stock.request.post(`${API_URL}/location`, {
      data: {
        zoneCode: "E2E",
        shelfCode: "T",
        binCode: `M${Date.now().toString().slice(-6)}`,
        description: "E2E move target",
        maxCapacity: 500,
      },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(targetRes.ok()).toBeTruthy()
    const locationB: number = (await targetRes.json()).data.id

    const { productUnitIds } = await ensureImport(stock)
    test.skip(productUnitIds.length === 0, "No product units")

    // STOCK seals 2 units into a SMALL box at bin A
    const sealRes = await stock.request.post(`${API_URL}/box/seal`, {
      data: { unitIds: productUnitIds.slice(0, 2), locationId: locationA, note: "E2E box move", boxType: "SMALL" },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(sealRes.ok()).toBeTruthy()
    const boxId: number = (await sealRes.json()).data.id

    // Move the sealed box to bin B (CAN_OPERATE_STOCK)
    const moveRes = await stock.request.post(`${API_URL}/box/${boxId}/move`, {
      data: { locationId: locationB },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(moveRes.ok()).toBeTruthy()

    const boxAfter = await mgr.request.get(`${API_URL}/box/${boxId}`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    const boxData = (await boxAfter.json()) as { data: { status: string; locationId: number } }
    expect(boxData.data.status).toBe("SEALED")
    expect(boxData.data.locationId).toBe(locationB)

    // MANAGER unseals at the new bin → units freed
    const unsealRes = await mgr.request.post(`${API_URL}/box/${boxId}/unseal`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(unsealRes.ok()).toBeTruthy()

    const unitAfter = (await stock.request.get(`${API_URL}/product-unit/${productUnitIds[0]}`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })).json() as unknown as Promise<{ data: { boxId: number | null; locationId: number } }>
    expect((await unitAfter).data.boxId).toBeNull()
    expect((await unitAfter).data.locationId).toBe(locationB)

    await stockCtx.close()
    await mgrCtx.close()
  })
})