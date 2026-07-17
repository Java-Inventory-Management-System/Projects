import { useNavigate, useSearchParams } from "react-router-dom"
import { useAuthStore } from "@/store/auth-store"
import { usePriceAdjustments, useMyPriceAdjustments } from "@/hooks/use-price-adjustments"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Eye } from "lucide-react"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { DataTable, type Column } from "@/components/ui/data-table"
import { PaginationBar } from "@/components/ui/pagination-bar"
import type { PriceAdjustment } from "@/utils/types"

const statusLabel: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  PENDING: { label: "Chờ duyệt", variant: "outline" },
  APPROVED: { label: "Đã duyệt", variant: "default" },
  REJECTED: { label: "Từ chối", variant: "destructive" },
}

export function PriceAdjustmentListPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const user = useAuthStore((s) => s.user)
  const page = Number(searchParams.get("page") ?? "0")
  const statusFilter = searchParams.get("status") ?? ""
  const isAdminManager = user?.role === "ADMIN" || user?.role === "MANAGER"

  const { data, isLoading } = isAdminManager
    ? usePriceAdjustments(page, 20, statusFilter || undefined)
    : useMyPriceAdjustments(page, 20, statusFilter || undefined)

  const setPage = (p: number) => { const next = new URLSearchParams(searchParams); next.set("page", String(p)); setSearchParams(next) }
  const list = data?.content ?? []
  const totalPages = data?.pagination.totalPages ?? 0

  const columns: Column<PriceAdjustment>[] = [
    { header: "Mã phiếu", render: (r) => <span className="font-mono text-xs">{r.adjustCode}</span> },
    { header: "Sản phẩm", render: (r) => <span className="text-sm">{r.productName ?? "—"}</span> },
    {
      header: "Giá cũ",
      className: "w-24 text-right",
      render: (r) => <span className="tabular-nums">{r.oldPrice.toLocaleString("vi-VN")}₫</span>,
    },
    {
      header: "Giá mới",
      className: "w-24 text-right",
      render: (r) => <span className="tabular-nums">{r.newPrice.toLocaleString("vi-VN")}₫</span>,
    },
    { header: "Lý do", render: (r) => <span className="text-sm text-muted-foreground max-w-[200px] truncate">{r.reason}</span> },
    {
      header: "Trạng thái",
      className: "w-24 text-center",
      render: (r) => {
        const s = statusLabel[r.status] ?? { label: r.status, variant: "secondary" as const }
        return <Badge variant={s.variant}>{s.label}</Badge>
      },
    },
    {
      header: "",
      className: "w-14",
      render: (r) => (
        <Button variant="ghost" size="icon" onClick={() => navigate(`/stock/price-adjustments/${r.id}`)}>
          <Eye className="size-3.5" />
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Điều chỉnh giá</h1>
        <Button onClick={() => navigate("/stock/price-adjustments/new")}><Plus className="size-4 mr-1" /> Tạo phiếu</Button>
      </div>

      <div className="flex gap-2">
        <Select value={statusFilter} onValueChange={(v) => { const next = new URLSearchParams(searchParams); next.set("page", "0"); if (v) next.set("status", v); else next.delete("status"); setSearchParams(next) }}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Tất cả" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="PENDING">Chờ duyệt</SelectItem>
            <SelectItem value="APPROVED">Đã duyệt</SelectItem>
            <SelectItem value="REJECTED">Từ chối</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={list}
        isLoading={isLoading}
        emptyMessage="Chưa có phiếu điều chỉnh giá nào"
      />

      {totalPages > 1 && (
        <PaginationBar page={page} totalPages={totalPages} onChange={(p) => setPage(p)} />
      )}
    </div>
  )
}
