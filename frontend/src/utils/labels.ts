import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import {
  EXPORT_RECEIPT_STATUS,
  EXPORT_REASON,
  IMPORT_RECEIPT_STATUS,
  type ExportReceiptStatus,
  type ExportReason,
  type ImportReceiptStatus,
} from "@/utils/types"

export type LabelVariant = "default" | "secondary" | "outline" | "destructive"

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

const EXPORT_STATUS_VARIANT: Record<ExportReceiptStatus, LabelVariant> = {
  [EXPORT_RECEIPT_STATUS.PENDING]: "outline",
  [EXPORT_RECEIPT_STATUS.APPROVED]: "secondary",
  [EXPORT_RECEIPT_STATUS.COMPLETED]: "default",
  [EXPORT_RECEIPT_STATUS.CANCELLED]: "destructive",
}

const IMPORT_STATUS_VARIANT: Record<ImportReceiptStatus, LabelVariant> = {
  [IMPORT_RECEIPT_STATUS.DRAFT]: "secondary",
  [IMPORT_RECEIPT_STATUS.RECEIVED]: "default",
  [IMPORT_RECEIPT_STATUS.REJECTED]: "destructive",
  [IMPORT_RECEIPT_STATUS.CANCELLED]: "destructive",
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