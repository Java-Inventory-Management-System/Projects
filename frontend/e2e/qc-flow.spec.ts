import { test, expect } from "@playwright/test"
import { loginAsStock, loginAsManager, loginAsSales } from "./helpers/auth"
import { initTokens, getToken, ensureImport, API_URL } from "./helpers/api"

test.describe("QC Processing Flow (Kiểm định hàng trả) — SOP §5", () => {

  test("GOOD return → RETURN_QC_HOLD → STOCK qc-pass → IN_STOCK; DEFECTIVE return → PENDING_DISPOSAL → dispose", async ({ browser }) => {
    const stockCtx = await browser.newContext()
    const mgrCtx = await browser.newContext()
    const salesCtx = await browser.newContext()
    const stock = await stockCtx.newPage()
    const mgr = await mgrCtx.newPage()
    const sales = await salesCtx.newPage()

    await loginAsStock(stock)
    await loginAsManager(mgr)
    await loginAsSales(sales)
    await initTokens(stock)

    const stockToken = await getToken("stock", stock)
    const managerToken = await getToken("manager", mgr)
    const salesToken = await getToken("sales", sales)

    const { productUnitIds } = await ensureImport(stock)
    test.skip(productUnitIds.length < 2, "Need 2 units")

    const sellAndReturn = async (unitId: number, item: Record<string, unknown>) => {
      const unitRes = await stock.request.get(`${API_URL}/product-unit/${unitId}`, {
        headers: { Authorization: `Bearer ${stockToken}` },
      })
      const serial: string = ((await unitRes.json()) as { data: { serialNumber: string } }).data.serialNumber

      const expRes = await sales.request.post(`${API_URL}/export-receipt`, {
        data: { type: "SALE", customerId: 1, note: "E2E QC setup", items: [{ productId: 1, quantity: 1, unitPrice: 15000000 }] },
        headers: { Authorization: `Bearer ${salesToken}` },
      })
      expect(expRes.ok()).toBeTruthy()
      const expData = (await expRes.json()).data
      const fulfillRes = await sales.request.put(`${API_URL}/export-receipt/${expData.id}/fulfill`, {
        data: { note: "E2E fulfill", evidenceImages: ["https://example.com/evidence.png"], items: [{ itemId: expData.items[0].id, serialNumbers: [serial] }] },
        headers: { Authorization: `Bearer ${managerToken}` },
      })
      expect(fulfillRes.ok()).toBeTruthy()

      const retRes = await sales.request.post(`${API_URL}/return-receipts`, {
        data: {
          customerId: 1,
          originalExportReceiptId: expData.id,
          reason: "CHANGE_MIND",
          note: "E2E QC return",
          items: [{ productUnitId: unitId, productId: 1, quantity: 1, ...item }],
        },
        headers: { Authorization: `Bearer ${salesToken}` },
      })
      expect(retRes.ok()).toBeTruthy()
      const retId: number = (await retRes.json()).data.id
      const approveRes = await mgr.request.put(`${API_URL}/return-receipts/${retId}/approve`, {
        headers: { Authorization: `Bearer ${managerToken}` },
      })
      expect(approveRes.ok()).toBeTruthy()
    }

    const unitStatus = async (unitId: number): Promise<string> => {
      const res = await stock.request.get(`${API_URL}/product-unit/${unitId}`, {
        headers: { Authorization: `Bearer ${stockToken}` },
      })
      return ((await res.json()) as { data: { status: string } }).data.status
    }

    // Unit 1: GOOD return → RESTOCK → RETURN_QC_HOLD (QC shelf 1) → qc-pass → IN_STOCK
    await sellAndReturn(productUnitIds[0], { condition: "GOOD", resultingAction: "RESTOCK" })
    expect(await unitStatus(productUnitIds[0])).toBe("RETURN_QC_HOLD")

    const qcList = await stock.request.get(`${API_URL}/qc-processing?statuses=RETURN_QC_HOLD`, {
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    const qcUnits = (await qcList.json()).data as Array<{ id: number }>
    expect(qcUnits.some((u) => u.id === productUnitIds[0])).toBeTruthy()

    const passRes = await stock.request.post(`${API_URL}/qc-processing/qc-pass`, {
      data: { unitIds: [productUnitIds[0]] },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(passRes.ok()).toBeTruthy()
    expect(await unitStatus(productUnitIds[0])).toBe("IN_STOCK")

    // Unit 2: DEFECTIVE return → REJECT → PENDING_DISPOSAL (QC shelf 4) → dispose → DISPOSED
    await sellAndReturn(productUnitIds[1], {
      condition: "DEFECTIVE",
      resultingAction: "REJECT",
      description: "E2E defective for disposal",
      evidenceImage: "https://example.com/evidence.png",
      defectCategoryId: 2,
    })
    expect(await unitStatus(productUnitIds[1])).toBe("PENDING_DISPOSAL")

    const disposeRes = await stock.request.post(`${API_URL}/qc-processing/dispose-confirm`, {
      data: { unitIds: [productUnitIds[1]], action: "DISPOSED", note: "E2E dispose" },
      headers: { Authorization: `Bearer ${stockToken}` },
    })
    expect(disposeRes.ok()).toBeTruthy()
    expect(await unitStatus(productUnitIds[1])).toBe("DISPOSED")

    await stockCtx.close()
    await mgrCtx.close()
    await salesCtx.close()
  })
})