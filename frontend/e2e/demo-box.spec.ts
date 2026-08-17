import { test, expect } from "@playwright/test"
import { loginAsStock, loginAsManager } from "./helpers/auth"
import { initTokens, getToken, ensureImport, API_URL, getE2ELocationId } from "./helpers/api"
import { chapter, log, hold } from "./helpers/demo"

test.use({ launchOptions: { slowMo: 5000 } })

test.describe("DEMO — Box (đóng/mở/chuyển thùng)", () => {

  test("STOCK đóng thùng → MANAGER mở → hàng được thả", async ({ browser }) => {
    const stockCtx = await browser.newContext()
    const mgrCtx = await browser.newContext()
    const stock = await stockCtx.newPage()
    const mgr = await mgrCtx.newPage()

    chapter("BOX: đóng thùng (SEAL_BOX = STOCK) → mở thùng (MANAGER)")
    await loginAsStock(stock)
    await loginAsManager(mgr)
    await initTokens(stock)

    const stockToken = await getToken("stock", stock)
    const managerToken = await getToken("manager", mgr)
    const locationId = await getE2ELocationId(stock)

    const { productUnitIds } = await ensureImport(stock)
    test.skip(productUnitIds.length === 0, "No product units available")
    const unitIds = productUnitIds.slice(0, 2)

    const sealRes = await stock.request.post(`${API_URL}/box/seal`, {
      data: { unitIds, locationId, note: "DEMO box seal", boxType: "SMALL" },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(sealRes.ok()).toBeTruthy()
    const boxId: number = (await sealRes.json()).data.id
    log("STOCK", `Đã đóng thùng #${boxId} (SEALED, 2 đơn vị)`)

    const unitStatus = ((await stock.request.get(`${API_URL}/product-unit/${unitIds[0]}`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })).json() as unknown as Promise<{ data: { boxId: number | null } }>)
    expect((await unitStatus).data.boxId).toBe(boxId)
    log("STOCK", "Đơn vị đã gắn vào thùng (boxId set)")

    const unsealRes = await mgr.request.post(`${API_URL}/box/${boxId}/unseal`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(unsealRes.ok()).toBeTruthy()
    log("MANAGER", "Đã mở thùng → thả đơn vị về kho")

    const unitAfter = ((await stock.request.get(`${API_URL}/product-unit/${unitIds[0]}`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })).json() as unknown as Promise<{ data: { boxId: number | null } }>)
    expect((await unitAfter).data.boxId).toBeNull()

    const boxAfter = await mgr.request.get(`${API_URL}/box/${boxId}`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(((await boxAfter.json()) as { data: { status: string } }).data.status).toBe("UNSEALED")
    log("STOCK", "Đơn vị thả tự do + thùng về UNSEALED ✓")

    await hold(mgr, 5000)
    await stockCtx.close()
    await mgrCtx.close()
  })

  test("STOCK đóng thùng ở bin A → chuyển sang bin B → mở tại B", async ({ browser }) => {
    const stockCtx = await browser.newContext()
    const mgrCtx = await browser.newContext()
    const stock = await stockCtx.newPage()
    const mgr = await mgrCtx.newPage()

    chapter("BOX MOVE: đóng thùng tại bin A, chuyển sang bin B, mở tại B")
    await loginAsStock(stock)
    await loginAsManager(mgr)
    await initTokens(stock)

    const stockToken = await getToken("stock", stock)
    const managerToken = await getToken("manager", mgr)
    const locationA = await getE2ELocationId(stock)

    const targetRes = await stock.request.post(`${API_URL}/location`, {
      data: {
        zoneCode: "E2E", shelfCode: "T",
        binCode: `M${Date.now().toString().slice(-6)}`,
        description: "DEMO move target", maxCapacity: 500,
      },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(targetRes.ok()).toBeTruthy()
    const locationB: number = (await targetRes.json()).data.id
    log("STOCK", `Tạo bin đích #${locationB}`)

    const { productUnitIds } = await ensureImport(stock)
    test.skip(productUnitIds.length === 0, "No product units")

    const sealRes = await stock.request.post(`${API_URL}/box/seal`, {
      data: { unitIds: productUnitIds.slice(0, 2), locationId: locationA, note: "DEMO box move", boxType: "SMALL" },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(sealRes.ok()).toBeTruthy()
    const boxId: number = (await sealRes.json()).data.id
    log("STOCK", `Đóng thùng #${boxId} tại bin A`)

    const moveRes = await stock.request.post(`${API_URL}/box/${boxId}/move`, {
      data: { locationId: locationB },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(moveRes.ok()).toBeTruthy()
    log("STOCK", `Chuyển thùng #${boxId} → bin B`)

    const boxAfter = await mgr.request.get(`${API_URL}/box/${boxId}`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    const boxData = (await boxAfter.json()) as { data: { status: string; locationId: number } }
    expect(boxData.data.status).toBe("SEALED")
    expect(boxData.data.locationId).toBe(locationB)

    const unsealRes = await mgr.request.post(`${API_URL}/box/${boxId}/unseal`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    })
    expect(unsealRes.ok()).toBeTruthy()
    log("MANAGER", "Mở thùng tại bin B")

    const unitAfter = (await stock.request.get(`${API_URL}/product-unit/${productUnitIds[0]}`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })).json() as unknown as Promise<{ data: { boxId: number | null; locationId: number } }>
    expect((await unitAfter).data.boxId).toBeNull()
    expect((await unitAfter).data.locationId).toBe(locationB)
    log("STOCK", `Đơn vị thả tại bin B (#${locationB}) ✓`)

    await hold(mgr, 5000)
    await stockCtx.close()
    await mgrCtx.close()
  })
})