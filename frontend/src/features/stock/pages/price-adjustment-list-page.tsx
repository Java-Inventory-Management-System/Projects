import { useState, useCallback } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { usePermission } from "@/hooks/use-permission"
import { ROLES } from "@/utils/permissions"
import { usePriceAdjustments, useMyPriceAdjustments } from "@/hooks/use-price-adjustments"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Eye } from "lucide-react"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DataTable, type Column } from "@/components/ui/data-table"
import type { PriceAdjustment } from "@/utils/types"
import { ADJUSTMENT_STATUS } from "@/utils/types"

const statusLabel: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  PENDING: { label: "Chờ duyệt", variant: "outline" },
  APPROVED: { label: "Đã duyệt", variant: "default" },
  REJECTED: { label: "Từ chối", variant: "destructive" },
}

export function PriceAdjustmentListPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const perm = usePermission()
  const page = Number(searchParams.get("page") ?? "0")
  const statusFilter = searchParams.get("status") ?? ""
  // MANAGER/ADMIN → all adjustments; STOCK/SALES → own only
  const isAdminManager = perm.hasRole(...ROLES.MANAGER_ADMIN)

  const [pageSize, setPageSize] = useState(20)
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | undefined>(undefined)
  const sortStr = sort ? `${sort.key},${sort.dir}` : undefined

  const handleSort = useCallback((key: string) => {
    setSort((prev) => {
      if (prev?.key !== key) return { key, dir: "asc" }
      if (prev.dir === "asc") return { key, dir: "desc" }
      return undefined
    })
  }, [])

  const { data, isLoading } = isAdminManager
    ? usePriceAdjustments(page, pageSize, sortStr, statusFilter || undefined)
    : useMyPriceAdjustments(page, pageSize, sortStr, statusFilter || undefined)

  const setPage = (p: number) => {
    const next = new URLSearchParams(searchParams)
    next.set("page", String(p))
    setSearchParams(next)
  }

  const columns: Column<PriceAdjustment>[] = [
    {
      header: "Mã phiếu",
      sortKey: "adjustCode",
      render: (r) => <span className="font-mono text-xs">{r.adjustCode}</span>,
    },
    { header: "Sản phẩm", render: (r) => <span className="text-sm">{r.productName ?? "—"}</span> },
    {
      header: "Giá cũ",
      sortKey: "oldPrice",
      className: "w-24 text-right",
      render: (r) => <span className="tabular-nums">{(r.oldPrice ?? 0).toLocaleString("vi-VN")}₫</span>,
    },
    {
      header: "Giá mới",
      sortKey: "newPrice",
      className: "w-24 text-right",
      render: (r) => <span className="tabular-nums">{(r.newPrice ?? 0).toLocaleString("vi-VN")}₫</span>,
    },
    {
      header: "Lý do",
      render: (r) => <span className="text-sm text-muted-foreground max-w-[200px] truncate">{r.reason}</span>,
    },
    {
      header: "Trạng thái",
      className: "w-24 text-center",
      render: (r) => {
        const s = statusLabel[r.status] ?? { label: r.status, variant: "secondary" as const }
        return <Badge variant={s.variant}>{s.label}</Badge>
      },
    },
    {
      header: "Thao tác",
      className: "w-[70px]",
      render: (r) => (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => navigate(`/stock/price-adjustments/${r.id}`)}>
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold tracking-tight">Điều chỉnh giá</h1>
        <Button onClick={() => navigate("/stock/price-adjustments/new")}>
          <Plus className="size-4 mr-1" /> Tạo phiếu
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            const next = new URLSearchParams(searchParams)
            next.set("page", "0")
            if (v) next.set("status", v)
            else next.delete("status")
            setSearchParams(next)
          }}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Tất cả" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value={ADJUSTMENT_STATUS.PENDING}>Chờ duyệt</SelectItem>
            <SelectItem value={ADJUSTMENT_STATUS.APPROVED}>Đã duyệt</SelectItem>
            <SelectItem value={ADJUSTMENT_STATUS.REJECTED}>Từ chối</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={data?.content ?? []}
        isLoading={isLoading}
        emptyMessage="Chưa có phiếu điều chỉnh giá nào"
        sort={sort}
        onSort={handleSort}
        totalElements={data?.pagination.totalElements}
        page={page}
        totalPages={data?.pagination.totalPages}
        pageSize={pageSize}
        onPageChange={(p) => setPage(p)}
        onPageSizeChange={(s) => {
          setPageSize(s)
          setPage(0)
        }}
      />
    </div>
  )
}
