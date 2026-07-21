import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuthStore } from "@/store/auth-store"
import { useStockChecks, useMyStockChecks } from "@/hooks/use-stock-checks"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Eye } from "lucide-react"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { DataTable, type Column } from "@/components/ui/data-table"
import { PaginationBar } from "@/components/ui/pagination-bar"
import type { StockCheck } from "@/utils/types"

const statusLabel: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  PENDING: { label: "Chờ xử lý", variant: "secondary" },
  IN_PROGRESS: { label: "Đang kiểm", variant: "outline" },
  COMPLETED: { label: "Chờ duyệt", variant: "default" },
  APPROVED: { label: "Đã duyệt", variant: "default" },
  REJECTED: { label: "Từ chối", variant: "destructive" },
}

export const StockCheckListPage = () => {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [page, setPage] = useState(0)
  const isStock = user?.role === "STOCK"
  const { data, isLoading } = isStock ? useMyStockChecks(page, 10) : useStockChecks(page, 10)

  const columns: Column<StockCheck>[] = [
    { header: "Mã phiếu", render: (r) => <span className="font-mono text-xs">{r.checkCode}</span> },
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
      render: (r) => (
        <span className="text-muted-foreground text-xs">{new Date(r.createdAt).toLocaleDateString("vi-VN")}</span>
      ),
    },
    { header: "Số items", className: "text-right", render: (r) => <span className="tabular-nums">{r.totalItems}</span> },
    {
      header: "Số lỗi",
      className: "text-right",
      render: (r) => (
        <span className="tabular-nums text-destructive">{r.missingCount + r.unexpectedCount || "—"}</span>
      ),
    },
    {
      header: "Thao tác",
      className: "w-[80px]",
      render: (r) => (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => navigate(`/stock/checks/${r.id}`)}>
              <Eye className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Xem chi tiết</TooltipContent>
        </Tooltip>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Kiểm kho</h1>
        <Button onClick={() => navigate("/stock/checks/new")}>
          <Plus className="size-4 mr-1" /> Tạo phiếu kiểm
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data?.content ?? []}
        isLoading={isLoading}
        emptyMessage="Chưa có phiếu kiểm nào"
      />

      {data && data.pagination.totalPages > 1 && (
        <PaginationBar page={page} totalPages={data.pagination.totalPages} onChange={(p) => setPage(p)} />
      )}
    </div>
  )
}
