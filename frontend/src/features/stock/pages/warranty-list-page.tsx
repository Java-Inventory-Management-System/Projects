import { useState, useCallback } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useWarrantyRequests } from "@/hooks/use-warranty"
import { usePermission } from "@/hooks/use-permission"
import { ROLES } from "@/utils/permissions"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { WARRANTY_STATUS } from "@/utils/types"
import { Plus, Eye, ChevronDown, ChevronUp } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { DataTable, type Column } from "@/components/ui/data-table"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import type { WarrantyRequest } from "@/utils/types"

const statusLabel: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  PENDING: { label: "Chờ tiếp nhận", variant: "secondary" },
  RECEIVED: { label: "Đã nhận hàng", variant: "outline" },
  UNDER_EVALUATION: { label: "Đang xử lý", variant: "default" },
  RESOLVED: { label: "Hoàn tất", variant: "default" },
}

const statusColor: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  RECEIVED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  UNDER_EVALUATION: "",
  RESOLVED: "",
}

export const WarrantyListPage = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const perm = usePermission()

  const page = Number(searchParams.get("page") ?? "0")
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

  const { data, isLoading } = useWarrantyRequests(page, pageSize, statusFilter || undefined, undefined)
  void sortStr

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

  const columns: Column<WarrantyRequest>[] = [
    {
      header: "Mã phiếu",
      sortKey: "requestCode",
      render: (r) => <span className="font-mono text-xs">{r.requestCode}</span>,
    },
    {
      header: "Sản phẩm",
      render: (r) => (
        <div>
          <span className="font-medium">{r.productName}</span>
          <span className="text-xs text-muted-foreground ml-1">{r.productSku}</span>
        </div>
      ),
    },
    { header: "Serial", render: (r) => <span className="font-mono text-xs">{r.serialNumber}</span> },
    { header: "Khách hàng", render: (r) => <span className="text-muted-foreground">{r.customerName ?? "—"}</span> },
    {
      header: "Trạng thái",
      render: (r) => {
        const st = statusLabel[r.status] ?? { label: r.status, variant: "secondary" as const }
        return (
          <Badge variant={st.variant} className={statusColor[r.status]}>
            {st.label}
          </Badge>
        )
      },
    },
    { header: "Người xử lý", render: (r) => <span className="text-muted-foreground">{r.handledByName ?? "—"}</span> },
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
            <Button variant="ghost" size="icon" onClick={() => navigate(`/warranty/${r.id}`)}>
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
        <h1 className="text-xl font-semibold tracking-tight">Bảo hành</h1>
        {perm.hasRole(...ROLES.ALL_STOCK) && (
          <Button onClick={() => navigate("/warranty/new")}>
            <Plus className="size-4 mr-1" /> Tiếp nhận bảo hành
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
              value={statusFilter}
              onValueChange={(v) => updateParams({ status: v || undefined, page: undefined })}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Tất cả trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value={WARRANTY_STATUS.PENDING}>Chờ tiếp nhận</SelectItem>
                <SelectItem value={WARRANTY_STATUS.RECEIVED}>Đã nhận hàng</SelectItem>
                <SelectItem value={WARRANTY_STATUS.UNDER_EVALUATION}>Đang xử lý</SelectItem>
                <SelectItem value={WARRANTY_STATUS.RESOLVED}>Hoàn tất</SelectItem>
              </SelectContent>
            </Select>
            {statusFilter && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => setSearchParams(new URLSearchParams())}
              >
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
        emptyMessage="Không có phiếu bảo hành nào"
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
