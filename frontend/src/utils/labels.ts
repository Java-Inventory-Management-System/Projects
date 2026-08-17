import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import {
  BOX_STATUS,
  EXPORT_RECEIPT_STATUS,
  EXPORT_REASON,
  IMPORT_RECEIPT_STATUS,
  type BoxStatus,
  type ExportReceiptStatus,
  type ExportReason,
  type ImportReceiptStatus,
  type ProductUnitStatus,
  type PurchaseOrderStatus,
  type ReturnReceiptStatus,
  type StockCheckStatus,
} from "@/utils/types"

export type LabelVariant = "default" | "secondary" | "outline" | "destructive" | "success" | "warning" | "info"

export interface StatusLabel {
  label: string
  variant: LabelVariant
}

export const UNIT_LABELS: Record<string, string> = {
  PIECE: "unit.piece",
  METER: "unit.meter",
  BOX: "unit.box",
  SET: "unit.set",
  KG: "unit.kg",
  TUBE: "unit.tube",
}

/** UPPER_SNAKE → camelCase (dùng cho i18n key theo status) */
export function toKey(status: string): string {
  return status.toLowerCase().replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
}

// ============ Quy ước màu status ============
// secondary (xám) = không hành động | warning (vàng) = chờ/xử lý | info (xanh dương) = chấp thuận/sẵn sàng
// success (xanh lá) = hoàn thành | destructive (đỏ) = lỗi/hủy | outline = ngoại lệ

export const EXPORT_STATUS_VARIANT: Record<ExportReceiptStatus, LabelVariant> = {
  [EXPORT_RECEIPT_STATUS.PENDING]: "warning",
  [EXPORT_RECEIPT_STATUS.APPROVED]: "info",
  [EXPORT_RECEIPT_STATUS.COMPLETED]: "success",
  [EXPORT_RECEIPT_STATUS.CANCELLED]: "destructive",
}

export const IMPORT_STATUS_VARIANT: Record<ImportReceiptStatus, LabelVariant> = {
  [IMPORT_RECEIPT_STATUS.DRAFT]: "secondary",
  [IMPORT_RECEIPT_STATUS.RECEIVED]: "info",
  [IMPORT_RECEIPT_STATUS.REJECTED]: "destructive",
  [IMPORT_RECEIPT_STATUS.CANCELLED]: "destructive",
}

export const UNIT_STATUS_VARIANT: Record<ProductUnitStatus, LabelVariant> = {
  PENDING_QC: "warning",
  IN_STOCK: "info",
  SOLD: "secondary",
  RESERVED: "secondary",
  EXPORTED: "secondary",
  RETURNED: "success",
  DISPOSED: "destructive",
  DEFECTIVE: "destructive",
  DAMAGED_IN_STORAGE: "destructive",
  LOST: "destructive",
  UNDER_REPAIR: "warning",
  SENT_TO_MANUFACTURER: "warning",
  RETURNED_TO_SUPPLIER: "success",
  REMOVED: "secondary",
  RETURN_QC_HOLD: "warning",
  WAITING_RMA_EXPORT: "warning",
  RMA_REPAIRED_RETURNED: "success",
  RMA_UNREPAIRABLE: "destructive",
  REJECTED_RETURN: "success",
  PENDING_DISPOSAL: "destructive",
}

export const RETURN_STATUS_VARIANT: Record<ReturnReceiptStatus, LabelVariant> = {
  PENDING_APPROVAL: "warning",
  COMPLETED: "success",
  CANCELLED: "destructive",
}

export const PO_STATUS_VARIANT: Record<PurchaseOrderStatus, LabelVariant> = {
  DRAFT: "secondary",
  OPEN: "warning",
  PARTIAL: "warning",
  COMPLETED: "success",
  CANCELLED: "destructive",
}

export const STOCK_CHECK_STATUS_VARIANT: Record<StockCheckStatus, LabelVariant> = {
  PENDING: "warning",
  IN_PROGRESS: "warning",
  COMPLETED: "success",
  APPROVED: "info",
  CANCELLED: "destructive",
  EXPIRED: "warning",
}

export const ADJUSTMENT_STATUS_VARIANT: Record<string, LabelVariant> = {
  PENDING: "warning",
  APPROVED: "info",
  REJECTED: "destructive",
  CANCELLED: "destructive",
}

export const BOX_STATUS_VARIANT: Record<BoxStatus, LabelVariant> = {
  [BOX_STATUS.SEALED]: "success",
  [BOX_STATUS.UNSEALED]: "secondary",
}

export const USER_STATUS_VARIANT: Record<string, LabelVariant> = {
  NEW: "outline",
  ACTIVE: "info",
  INACTIVE: "secondary",
}

export const AUDIT_STATUS_VARIANT: Record<string, LabelVariant> = {
  SUCCESS: "success",
  FAILED: "destructive",
}

export function unitStatusInfo(status: ProductUnitStatus): { labelKey: string; variant: LabelVariant } {
  return { labelKey: `unitStatus.${toKey(status)}`, variant: UNIT_STATUS_VARIANT[status] }
}

function exportStatusKey(status: ExportReceiptStatus): string {
  return `exportStatus.${status.toLowerCase()}`
}

function importStatusKey(status: ImportReceiptStatus): string {
  return `importStatus.${status.toLowerCase()}`
}

function exportReasonKey(reason: ExportReason): string {
  return `exportReason.${reason === "RETURN_SUPPLIER" ? "returnSupplier" : reason.toLowerCase()}`
}

export function useExportStatusLabel(): Record<ExportReceiptStatus, StatusLabel> {
  const { t } = useTranslation()
  return useMemo(
    () =>
      Object.fromEntries(
        Object.values(EXPORT_RECEIPT_STATUS).map((status) => [
          status,
          {
            label: t(exportStatusKey(status), status),
            variant: EXPORT_STATUS_VARIANT[status],
          },
        ]),
      ) as Record<ExportReceiptStatus, StatusLabel>,
    [t],
  )
}

export function useImportStatusLabel(): Record<ImportReceiptStatus, StatusLabel> {
  const { t } = useTranslation()
  return useMemo(
    () =>
      Object.fromEntries(
        Object.values(IMPORT_RECEIPT_STATUS).map((status) => [
          status,
          {
            label: t(importStatusKey(status), status),
            variant: IMPORT_STATUS_VARIANT[status],
          },
        ]),
      ) as Record<ImportReceiptStatus, StatusLabel>,
    [t],
  )
}

export function useExportReasonLabel(): Record<ExportReason, string> {
  const { t } = useTranslation()
  return useMemo(
    () =>
      Object.fromEntries(
        Object.values(EXPORT_REASON).map((reason) => [reason, t(exportReasonKey(reason), reason)]),
      ) as Record<ExportReason, string>,
    [t],
  )
}