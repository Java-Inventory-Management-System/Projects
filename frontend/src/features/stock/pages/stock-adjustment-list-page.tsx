import { useState, useCallback } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useAuthStore } from "@/store/auth-store"
import { useStockAdjustments, useMyStockAdjustments } from "@/hooks/use-stock-adjustments"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Eye, ChevronDown, ChevronUp } from "lucide-react"
import { usePermission } from "@/hooks/use-permission"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { DataTable, type Column } from "@/components/ui/data-table"
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible"
import type { StockAdjustment } from "@/utils/types"

const typeLabel: Record<string, string> = {
  DAMAGED: "Hư hỏng",
  LOST: "Mất",
  FOUND: "Thừa",
}

const typeColor: Record<string, "destructive" | "outline" | "default"> = {
  DAMAGED: "destructive",
  LOST: "destructive",
  FOUND: "default",
}

const statusLabel: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  PENDING: { label: "Chờ duyệt", variant: "secondary" },
  APPROVED: { label: "Đã duyệt", variant: "default" },
  REJECTED: { label: "Từ chối", variant: "destructive" },
}

export const StockAdjustmentListPage = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const user = useAuthStore((s) => s.user)
  const perm = usePermission()

  const page = Number(searchParams.get("page") ?? "0")
  const typeFilter = searchParams.get("type") ?? ""
  const statusFilter = searchParams.get("status") ?? ""

  const [filterOpen, setFilterOpen] = useState(true)
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

  const isStock = user?.role === "STOCK"
  const { data, isLoading } = isStock
    ? useMyStockAdjustments(page, pageSize, sortStr, typeFilter || undefined, statusFilter || undefined)
    : useStockAdjustments(page, pageSize, sortStr, typeFilter || undefined, statusFilter || undefined)

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const next = new URLSearchParams(searchParams)
      for (const [key, val] of Object.entries(updates)) {
        if (val) next.set(key, val)
        else next.delete(key)
      }
      setSearchParams(next)
    },
    [searchParams, setSearchParams],
  )

  const columns: Column<StockAdjustment>[] = [
    { header: "Mã phiếu", sortKey: "adjustCode", render: (r) => <span className="font-mono text-xs">{r.adjustCode}</span> },
    {
      header: "Loại",
      render: (r) => <Badge variant={typeColor[r.type] ?? "outline"}>{typeLabel[r.type] ?? r.type}</Badge>,
    },
    {
      header: "Sản phẩm",
      render: (r) => (
        <>
          <span className="font-medium">{r.productName ?? "—"}</span>
          {r.productSku && <span className="text-xs text-muted-foreground ml-1">{r.productSku}</span>}
        </>
      ),
    },
    { header: "Lý do", render: (r) => <span className="max-w-[200px] truncate text-sm">{r.reason}</span> },
    {
      header: "Trạng thái",
      render: (r) => {
        const st = statusLabel[r.status] ?? { label: r.status, variant: "secondary" as const }
        return <Badge variant={st.variant}>{st.label}</Badge>
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
      header: "Thao tác",
      className: "w-[70px]",
      render: (r) => (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => navigate(`/stock/adjustments/${r.id}`)}>
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
        <h1 className="text-xl font-semibold tracking-tight">Điều chỉnh tồn kho</h1>
        {perm.hasRole("ADMIN", "MANAGER") && (
          <Button onClick={() => navigate("/stock/adjustments/new")}>
            <Plus className="size-4 mr-1" /> Tạo phiếu điều chỉnh
          </Button>
        )}
      </div>

      <Collapsible open={filterOpen} onOpenChange={setFilterOpen}>
        <div className="flex items-center gap-2">
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1">
              {filterOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              Bộ lọc
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="mt-2">
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={typeFilter}
              onValueChange={(v) => updateParams({ type: v || undefined, page: undefined })}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Tất cả loại" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả loại</SelectItem>
                <SelectItem value="DAMAGED">Hư hỏng</SelectItem>
                <SelectItem value="LOST">Mất</SelectItem>
                <SelectItem value="FOUND">Thừa</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={(v) => updateParams({ status: v || undefined, page: undefined })}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Tất cả trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="PENDING">Chờ duyệt</SelectItem>
                <SelectItem value="APPROVED">Đã duyệt</SelectItem>
                <SelectItem value="REJECTED">Từ chối</SelectItem>
              </SelectContent>
            </Select>
            {(typeFilter || statusFilter) && (
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => setSearchParams(new URLSearchParams())}>
                Xoá bộ lọc
              </Button>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <DataTable
        columns={columns}
        data={data?.content ?? []}
        isLoading={isLoading}
        emptyMessage="Không có phiếu điều chỉnh nào"
        sort={sort}
        onSort={handleSort}
        totalElements={data?.pagination.totalElements}
        page={page}
        totalPages={data?.pagination.totalPages}
        pageSize={pageSize}
        onPageChange={(p) => updateParams({ page: String(p) })}
        onPageSizeChange={(s) => { setPageSize(s); updateParams({ page: undefined }) }}
      />
    </div>
  )
}
