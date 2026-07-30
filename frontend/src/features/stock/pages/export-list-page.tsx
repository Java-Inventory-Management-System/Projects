import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useExportReceipts } from "@/hooks/use-export-receipts"
import { cancelExportReceipt, approveExportReceipt } from "@/services/export-service"
import { ViewExportModal } from "../components/view-export-modal"
import { ReceiptListPage } from "../components/receipt-list-page"
import { Badge } from "@/components/ui/badge"
import type { Column } from "@/components/ui/data-table"
import { EXPORT_RECEIPT_STATUS, type ExportReceipt } from "@/utils/types"

export function ExportListPage() {
  const { t } = useTranslation()
  const statusLabel: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    PENDING: { label: t("exportStatus.pending"), variant: "outline" },
    APPROVED: { label: t("exportStatus.approved"), variant: "secondary" },
    COMPLETED: { label: t("exportStatus.completed"), variant: "default" },
    CANCELLED: { label: t("exportStatus.cancelled"), variant: "destructive" },
  }
  const reasonLabel: Record<string, string> = {
    SALE: t("exportReason.sale"),
    INTERNAL: t("exportReason.internal"),
    RETURN_SUPPLIER: t("exportReason.returnSupplier"),
    DISPOSE: t("exportReason.dispose"),
  }
  const columns: Column<ExportReceipt>[] = useMemo(() => [
    {
      header: t("exportList.receiptCode"),
      sortKey: "receiptCode",
      render: (r) => <span className="font-mono text-xs">{r.receiptCode}</span>,
    },
    { header: t("table.reason"), render: (r) => <span>{reasonLabel[r.reason] ?? r.reason}</span> },
    { header: t("table.customer"), render: (r) => <span className="text-muted-foreground">{r.customerName ?? "—"}</span> },
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
        return <Badge variant={s.variant}>{s.label}</Badge>
      },
    },
    { header: t("table.creator"), render: (r) => <span className="text-muted-foreground">{r.createdByName}</span> },
    {
      header: t("table.createdDate"),
      sortKey: "createdAt",
      render: (r) => (
        <span className="text-muted-foreground text-xs">{new Date(r.createdAt).toLocaleDateString("vi-VN")}</span>
      ),
    },
    { header: t("table.approver"), render: (r) => <span className="text-muted-foreground">{r.approvedByName ?? "—"}</span> },
  ], [t, statusLabel, reasonLabel])

  return (
    <ReceiptListPage<ExportReceipt>
      title={t("exportList.title")}
      newRoute="/stock/exports/new"
      emptyMessage={t("exportList.empty")}
      queryKey="export-receipts"
      useHook={useExportReceipts}
      cancelService={cancelExportReceipt}
      approveService={approveExportReceipt}
      ViewModal={ViewExportModal}
      columns={columns}
      approvableStatus={EXPORT_RECEIPT_STATUS.PENDING}
      cancelledStatus={EXPORT_RECEIPT_STATUS.CANCELLED}
      scanStatuses={[]}
    />
  )
}