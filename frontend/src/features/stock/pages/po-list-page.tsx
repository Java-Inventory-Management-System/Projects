import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { usePurchaseOrders } from "@/hooks/use-purchase-orders"
import { DataTable, type Column } from "@/components/ui/data-table"
import { PaginationBar } from "@/components/ui/pagination-bar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Eye } from "lucide-react"
import { usePermission } from "@/hooks/use-permission"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import type { PurchaseOrder } from "@/utils/types"
import { Empty, EmptyTitle } from "@/components/ui/empty"

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  DRAFT: { label: "Nháp", variant: "secondary" },
  PARTIAL: { label: "Giao một phần", variant: "default" },
  COMPLETED: { label: "Hoàn tất", variant: "default" },
  CANCELLED: { label: "Đã hủy", variant: "destructive" },
}

export function POListPage() {
  const navigate = useNavigate()
  const perm = usePermission()
  const [page, setPage] = useState(0)
  const { data, isLoading } = usePurchaseOrders(page, 20)

  const columns: Column<PurchaseOrder>[] = [
    { header: "Mã PO", render: (p) => <span className="font-mono text-xs">{p.poCode}</span> },
    { header: "NCC", render: (p) => <span className="font-medium">{p.supplierName}</span> },
    { header: "Tổng tiền", className: "text-right", render: (p) => <span className="tabular-nums">{p.totalAmount.toLocaleString("vi-VN")}₫</span> },
    { header: "Ngày giao", render: (p) => <span className="text-sm">{new Date(p.expectedDate).toLocaleDateString("vi-VN")}</span> },
    { header: "Trạng thái", render: (p) => { const s = statusConfig[p.status] ?? { label: p.status, variant: "secondary" }; return <Badge variant={s.variant}>{s.label}</Badge> }},
    { header: "Ngày tạo", render: (p) => <span className="text-xs text-muted-foreground">{new Date(p.createdAt).toLocaleDateString("vi-VN")}</span> },
    { header: "Thao tác", className: "w-[70px]", render: (p) => (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" onClick={() => navigate(`/stock/purchase-orders/${p.id}`)}>
            <Eye className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Xem chi tiết</TooltipContent>
      </Tooltip>
    )},
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Đơn đặt hàng</h1>
        {perm.hasRole("ADMIN", "MANAGER") && (
          <Button onClick={() => navigate("/stock/purchase-orders/new")}>
            <Plus className="size-4 mr-1" /> Tạo đơn hàng
          </Button>
        )}
      </div>
      <DataTable columns={columns} data={data?.content ?? []} isLoading={isLoading} emptyMessage="Chưa có đơn đặt hàng nào" />
      {data && data.pagination.totalPages > 1 && <PaginationBar page={page} totalPages={data.pagination.totalPages} onChange={setPage} />}
    </div>
  )
}
