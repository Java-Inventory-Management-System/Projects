import { useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { useImportReceipts } from "@/hooks/use-import-receipts"
import { cancelImportReceipt, approveImportReceipt } from "@/services/import-service"
import { ViewImportModal } from "../components/view-import-modal"
import { ReceiptListPage } from "../components/receipt-list-page"
import { Badge } from "@/components/ui/badge"
import type { Column } from "@/components/ui/data-table"
import type { ImportReceipt } from "@/utils/types"

const statusLabel: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  DRAFT: { label: "Bản nháp", variant: "secondary" },
  PENDING_APPROVAL: { label: "Chờ duyệt", variant: "outline" },
  COMPLETED: { label: "Hoàn tất", variant: "default" },
  CANCELLED: { label: "Đã hủy", variant: "destructive" },
}

export function ImportListPage() {
  const navigate = useNavigate()
  const columns = useMemo<Column<ImportReceipt>[]>(() => [
    {
      header: "Mã phiếu",
      sortKey: "receiptCode",
      render: (r) => (
        <button type="button" className="font-mono text-xs underline-offset-2 hover:underline cursor-pointer text-left" onClick={() => navigate(`/stock/imports/${r.id}`)}>
          {r.receiptCode}
        </button>
      ),
    },
    { header: "Nhà cung cấp", render: (r) => <span className="font-medium">{r.supplierName || "—"}</span> },
    {
      header: "Tổng tiền",
      sortKey: "totalAmount",
      className: "text-right",
      render: (r) => <span className="tabular-nums">{(r.totalAmount ?? 0).toLocaleString("vi-VN")}₫</span>,
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
      sortKey: "createdAt",
      render: (r) => (
        <span className="text-muted-foreground text-xs">{new Date(r.createdAt).toLocaleDateString("vi-VN")}</span>
      ),
    },
    { header: "Người duyệt", render: (r) => <span className="text-muted-foreground">{r.approvedByName ?? "—"}</span> },
  ], [navigate])
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
