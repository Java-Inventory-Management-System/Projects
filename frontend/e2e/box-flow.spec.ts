import { test, expect } from "@playwright/test"
import { loginAsStock, loginAsManager } from "./helpers/auth"
import { initTokens, getToken, ensureImport, API_URL, getE2ELocationId } from "./helpers/api"

test.describe("Box Flow (Đóng/ mở thùng) — SOP §9", () => {

  test("STOCK seals box (SEAL_BOX) → MANAGER unseals → units freed", async ({ browser }) => {
    const stockCtx = await browser.newContext()
    const mgrCtx = await browser.newContext()
    const stock = await stockCtx.newPage()
    const mgr = await mgrCtx.newPage()

    await loginAsStock(stock)
    await loginAsManager(mgr)
    await initTokens(stock)

    const stockToken = await getToken("stock", stock)
    const managerToken = await getToken("manager", mgr)
    const locationId = await getE2ELocationId(stock)

    const { productUnitIds } = await ensureImport(stock)
    test.skip(productUnitIds.length === 0, "No product units available")
    const unitIds = productUnitIds.slice(0, 2)

    // STOCK seals 2 units into a SMALL box (SEAL_BOX = STOCK only)
    const sealRes = await stock.request.post(`${API_URL}/box/seal`, {
      data: { unitIds, locationId, note: "E2E box seal", boxType: "SMALL" },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(sealRes.ok()).toBeTruthy()
    const boxId: number = (await sealRes.json()).data.id

    // Verify box SEALED + units attached
    const boxDetail = await mgr.request.get(`${API_URL}/box/${boxId}`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    const boxData = (await boxDetail.json()) as { data: { status: string; boxCode: string; sealedQuantity: number } }
    expect(boxData.data.status).toBe("SEALED")
    expect(boxData.data.sealedQuantity).toBe(2)

    // Units now boxed
    const unitStatus = ((await stock.request.get(`${API_URL}/product-unit/${unitIds[0]}`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })).json() as unknown as Promise<{ data: { boxId: number | null } }>)
    expect((await unitStatus).data.boxId).toBe(boxId)

    // MANAGER unseals (CAN_OPERATE_STOCK)
    const unsealRes = await mgr.request.post(`${API_URL}/box/${boxId}/unseal`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(unsealRes.ok()).toBeTruthy()

    // Units freed
    const unitAfter = ((await stock.request.get(`${API_URL}/product-unit/${unitIds[0]}`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })).json() as unknown as Promise<{ data: { boxId: number | null } }>)
    expect((await unitAfter).data.boxId).toBeNull()

    // Box back to UNSEALED
    const boxAfter = await mgr.request.get(`${API_URL}/box/${boxId}`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(((await boxAfter.json()) as { data: { status: string } }).data.status).toBe("UNSEALED")

    await stockCtx.close()
    await mgrCtx.close()
  })
})