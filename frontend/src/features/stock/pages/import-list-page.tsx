import { useImportReceipts } from "@/hooks/use-import-receipts"
import { cancelImportReceipt, approveImportReceipt } from "@/services/import-service"
import { ViewImportModal } from "../components/view-import-modal"
import { ReceiptListPage } from "../components/receipt-list-page"
import { Badge } from "@/components/ui/badge"
import type { Column } from "@/components/ui/data-table"
import type { ImportReceipt } from "@/utils/types"

const statusLabel: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  PENDING: { label: "Chờ xử lý", variant: "secondary" },
  PENDING_APPROVAL: { label: "Chờ duyệt", variant: "outline" },
  COMPLETED: { label: "Hoàn tất", variant: "default" },
  CANCELLED: { label: "Đã hủy", variant: "destructive" },
}

const columns: Column<ImportReceipt>[] = [
  { header: "Mã phiếu", render: (r) => <span className="font-mono text-xs">{r.receiptCode}</span> },
  { header: "Nhà cung cấp", render: (r) => <span className="font-medium">{r.supplierName || "—"}</span> },
  {
    header: "Tổng tiền",
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
  { header: "Người tạo", render: (r) => <span className="text-muted-foreground">{r.createdByName || "—"}</span> },
  {
    header: "Ngày tạo",
    render: (r) => (
      <span className="text-muted-foreground text-xs">{new Date(r.createdAt).toLocaleDateString("vi-VN")}</span>
    ),
  },
  { header: "Người duyệt", render: (r) => <span className="text-muted-foreground">{r.approvedByName ?? "—"}</span> },
]

export function ImportListPage() {
  return (
    <ReceiptListPage<ImportReceipt>
      title="Nhập kho"
      newRoute="/stock/imports/new"
      emptyMessage="Chưa có phiếu nhập nào"
      queryKey="import-receipts"
      useHook={useImportReceipts}
      cancelService={cancelImportReceipt}
      approveService={approveImportReceipt}
      ViewModal={ViewImportModal}
      columns={columns}
    />
  )
}
