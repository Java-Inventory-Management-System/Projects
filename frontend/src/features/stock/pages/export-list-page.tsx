import { useExportReceipts } from "@/hooks/use-export-receipts"
import { cancelExportReceipt, approveExportReceipt } from "@/services/export-service"
import { ViewExportModal } from "../components/view-export-modal"
import { ReceiptListPage } from "../components/receipt-list-page"
import { Badge } from "@/components/ui/badge"
import type { Column } from "@/components/ui/data-table"
import type { ExportReceipt } from "@/utils/types"

const statusLabel: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  PENDING_APPROVAL: { label: "Chờ duyệt", variant: "outline" },
  COMPLETED: { label: "Hoàn tất", variant: "default" },
  CANCELLED: { label: "Đã hủy", variant: "destructive" },
}

const reasonLabel: Record<string, string> = {
  SALE: "Bán hàng",
  INTERNAL: "Nội bộ",
  RETURN_SUPPLIER: "Trả NCC",
  DISPOSE: "Hủy",
}

const columns: Column<ExportReceipt>[] = [
  { header: "Mã phiếu", sortKey: "receiptCode", render: (r) => <span className="font-mono text-xs">{r.receiptCode}</span> },
  { header: "Lý do", render: (r) => <span>{reasonLabel[r.reason] ?? r.reason}</span> },
  { header: "Khách hàng", render: (r) => <span className="text-muted-foreground">{r.customerName ?? "—"}</span> },
  {
    header: "Tổng tiền",
    sortKey: "totalAmount",
    className: "text-right",
    render: (r) => <span className="tabular-nums">{r.totalAmount.toLocaleString("vi-VN")}₫</span>,
  },
  {
    header: "Trạng thái",
    render: (r) => {
      const s = statusLabel[r.status] ?? { label: r.status, variant: "secondary" as const }
      return <Badge variant={s.variant}>{s.label}</Badge>
    },
  },
  { header: "Người tạo", render: (r) => <span className="text-muted-foreground">{r.createdByName}</span> },
  {
    header: "Ngày tạo",
    sortKey: "createdAt",
    render: (r) => (
      <span className="text-muted-foreground text-xs">{new Date(r.createdAt).toLocaleDateString("vi-VN")}</span>
    ),
  },
  { header: "Người duyệt", render: (r) => <span className="text-muted-foreground">{r.approvedByName ?? "—"}</span> },
]

export function ExportListPage() {
  return (
    <ReceiptListPage<ExportReceipt>
      title="Xuất kho"
      newRoute="/stock/exports/new"
      emptyMessage="Chưa có phiếu xuất nào"
      queryKey="export-receipts"
      useHook={useExportReceipts}
      cancelService={cancelExportReceipt}
      approveService={approveExportReceipt}
      ViewModal={ViewExportModal}
      columns={columns}
    />
  )
}
