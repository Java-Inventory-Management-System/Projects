import { useState, useCallback } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { usePermission } from "@/hooks/use-permission"
import { useStockChecks, useMyStockChecks } from "@/hooks/use-stock-checks"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Eye } from "lucide-react"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { DataTable, type Column } from "@/components/ui/data-table"
import type { StockCheck } from "@/utils/types"

const statusLabel: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  PENDING: { label: "Chờ xử lý", variant: "secondary" },
  IN_PROGRESS: { label: "Đang kiểm", variant: "outline" },
  COMPLETED: { label: "Chờ duyệt", variant: "default" },
  APPROVED: { label: "Đã duyệt", variant: "default" },
}

const statusOptions = [
  { value: "", label: "Tất cả" },
  { value: "PENDING", label: "Chờ xử lý" },
  { value: "IN_PROGRESS", label: "Đang kiểm" },
  { value: "COMPLETED", label: "Chờ duyệt" },
  { value: "APPROVED", label: "Đã duyệt" },
]

export const StockCheckListPage = () => {
  const navigate = useNavigate()
  const perm = usePermission()
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Number(searchParams.get("page") ?? "0")
  const statusFilter = searchParams.get("status") ?? ""
  const [pageSize, setPageSize] = useState(10)
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | undefined>(undefined)
  const sortStr = sort ? `${sort.key},${sort.dir}` : undefined

  const handleSort = useCallback((key: string) => {
    setSort((prev) => {
      if (prev?.key !== key) return { key, dir: "asc" }
      if (prev.dir === "asc") return { key, dir: "desc" }
      return undefined
    })
  }, [])

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const next = new URLSearchParams(searchParams)
      for (const [key, val] of Object.entries(updates)) {
        if (val) next.set(key, val)
        else next.delete(key)
      }
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  // STOCK → own checks only; MANAGER/ADMIN → all checks
  const isStock = perm.hasRole("STOCK")
  const { data, isLoading } = isStock
    ? useMyStockChecks(page, pageSize, sortStr, statusFilter || undefined)
    : useStockChecks(page, pageSize, sortStr, statusFilter || undefined)

  const columns: Column<StockCheck>[] = [
    {
      header: "Mã phiếu",
      sortKey: "checkCode",
      render: (r) => <span className="font-mono text-xs">{r.checkCode}</span>,
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
    {
      header: "Số items",
      className: "text-right",
      render: (r) => <span className="tabular-nums">{r.totalItems}</span>,
    },
    {
      header: "Số lỗi",
      className: "text-right",
      render: (r) => <span className="tabular-nums text-destructive">{r.missingCount + r.unexpectedCount || "—"}</span>,
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold tracking-tight">Kiểm kho</h1>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={(v) => updateParams({ status: v || undefined, page: undefined })}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent className="max-h-[50vh]">
              {statusOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => navigate("/stock/checks/new")}>
            <Plus className="size-4 mr-1" /> Tạo phiếu kiểm
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data?.content ?? []}
        isLoading={isLoading}
        emptyMessage="Chưa có phiếu kiểm nào"
        sort={sort}
        onSort={handleSort}
        totalElements={data?.pagination.totalElements}
        page={page}
        totalPages={data?.pagination.totalPages}
        pageSize={pageSize}
        onPageChange={(p) => updateParams({ page: String(p) })}
        onPageSizeChange={(s) => {
          setPageSize(s)
          updateParams({ page: undefined })
        }}
      />
    </div>
  )
}
