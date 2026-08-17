import http from "@/utils/http-client"
import { mapQcUnit } from "@/utils/mappers"
import type { ProductUnitStatus, QcUnit } from "@/utils/types"

export async function getQcUnits(statuses: ProductUnitStatus[]): Promise<QcUnit[]> {
  const res = await http.get("/qc-processing", {
    params: statuses.length ? { statuses: statuses.join(",") } : {},
  })
  return (res as unknown as unknown[]).map(mapQcUnit)
}

export async function qcPassUnits(unitIds: number[]): Promise<void> {
  await http.post("/qc-processing/qc-pass", { unitIds })
}

export async function disposeConfirmUnits(
  unitIds: number[],
  action: string,
  supplierId?: number | null,
  note?: string,
): Promise<{ receiptCode: string | null; exportReceiptId: number | null }> {
  return (await http.post("/qc-processing/dispose-confirm", { unitIds, action, supplierId, note })) as unknown as {
    receiptCode: string | null
    exportReceiptId: number | null
  }
}
