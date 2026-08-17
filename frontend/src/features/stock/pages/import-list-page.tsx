import { useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useImportReceipts } from "@/hooks/use-import-receipts"
import { cancelImportReceipt } from "@/services/import-service"
import { ViewImportModal } from "../components/view-import-modal"
import { ReceiptListPage } from "../components/receipt-list-page"
import { Badge } from "@/components/ui/badge"
import type { Column } from "@/components/ui/data-table"
import { IMPORT_RECEIPT_STATUS, type ImportReceipt } from "@/utils/types"
import { useImportStatusLabel } from "@/utils/labels"
import { usePermission } from "@/hooks/use-permission"

export function ImportListPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const perm = usePermission()
  const statusLabel = useImportStatusLabel()
  const columns = useMemo<Column<ImportReceipt>[]>(() => [
    {
      header: t("table.checkCode"),
      sortKey: "receiptCode",
      render: (r) => (
        <button type="button" className="font-mono text-xs underline-offset-2 hover:underline cursor-pointer text-left" onClick={() => navigate(`/stock/imports/${r.id}`)}>
          {r.receiptCode}
        </button>
      ),
    },
    { header: t("table.supplier"), render: (r) => <span className="font-medium">{r.supplierName || "—"}</span> },
    {
      header: t("table.totalAmount"),
      sortKey: "totalAmount",
      className: "text-right",
      render: (r) => <span className="tabular-nums">{(r.totalAmount ?? 0).toLocaleString("vi-VN")}₫</span>,
    },
    {
      header: t("table.status"),
      render: (r) => {
        const s = statusLabel[r.status] ?? { label: r.status, variant: "secondary" as const }
        return (
          <div className="flex flex-col items-start gap-1">
            <Badge variant={s.variant}>{s.label}</Badge>
            {r.status === IMPORT_RECEIPT_STATUS.REJECTED && r.resolution && (
              <Badge variant="outline">
                {r.resolution === "RETURNED_TO_SUPPLIER"
                  ? t("importDetail.resolveReturned")
                  : t("importDetail.resolveResending")}
              </Badge>
            )}
          </div>
        )
      },
    },
    { header: t("table.creator"), render: (r) => <span className="text-muted-foreground">{r.createdByName || "—"}</span> },
    {
      header: t("table.createdDate"),
      sortKey: "createdAt",
      render: (r) => (
        <span className="text-muted-foreground text-xs">{new Date(r.createdAt).toLocaleDateString("vi-VN")}</span>
      ),
    },
  ], [navigate, t, statusLabel])
  return (
    <ReceiptListPage<ImportReceipt>
      title={t("importList.title")}
      newRoute="/stock/imports/new"
      emptyMessage={t("importList.empty")}
      queryKey="import-receipts"
      useHook={useImportReceipts}
      cancelService={cancelImportReceipt}
      ViewModal={ViewImportModal}
      columns={columns}
      scanStatuses={[IMPORT_RECEIPT_STATUS.DRAFT]}
      scanPerm={() => perm.hasRole("STOCK")}
      cancellableStatuses={[IMPORT_RECEIPT_STATUS.DRAFT]}
      cancelPerm={() => perm.hasRole("STOCK")}
      createPerm={() => perm.hasRole("STOCK")}
      statusTabs={[
        { label: t("importList.tabAll") },
        { value: IMPORT_RECEIPT_STATUS.DRAFT, label: t("importStatus.draft") },
        { value: IMPORT_RECEIPT_STATUS.RECEIVED, label: t("importStatus.received") },
        { value: IMPORT_RECEIPT_STATUS.REJECTED, label: t("importStatus.rejected") },
        { value: IMPORT_RECEIPT_STATUS.CANCELLED, label: t("importStatus.cancelled") },
      ]}
    />
  )
}