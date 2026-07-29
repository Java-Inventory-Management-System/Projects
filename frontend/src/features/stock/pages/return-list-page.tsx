import { useState, useCallback } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useReturnReceipts } from "@/hooks/use-returns"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Plus, Eye, Search } from "lucide-react"
import { usePermission } from "@/hooks/use-permission"
import { ROLES } from "@/utils/permissions"
import { DataTable, type Column } from "@/components/ui/data-table"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { ReturnReceipt } from "@/utils/types"
import { RETURN_RECEIPT_STATUS, RETURN_REASON } from "@/utils/types"

const reasonLabel: Record<string, string> = {
  CHANGE_MIND: "Đổi ý",
  DEFECTIVE: "Hàng lỗi",
  WRONG_ITEM: "Sai hàng",
  WARRANTY_CLAIM: "Bảo hành",
}

const statusLabel: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  PENDING_APPROVAL: { label: "Chờ duyệt", variant: "secondary" },
  COMPLETED: { label: "Đã duyệt", variant: "default" },
  CANCELLED: { label: "Đã hủy", variant: "destructive" },
}

export const ReturnListPage = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const perm = usePermission()

  const page = Number(searchParams.get("page") ?? "0")
  const [pageSize, setPageSize] = useState(10)
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | undefined>(undefined)
  const sortStr = sort ? `${sort.key},${sort.dir}` : undefined

  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)
  const [reasonFilter, setReasonFilter] = useState<string | undefined>(undefined)
  const [searchText, setSearchText] = useState("")

  const handleSort = useCallback((key: string) => {
    setSort((prev) => {
      if (prev?.key !== key) return { key, dir: "asc" }
      if (prev.dir === "asc") return { key, dir: "desc" }
      return undefined
    })
  }, [])

  const { data, isLoading } = useReturnReceipts(page, pageSize, statusFilter, reasonFilter, searchText || undefined)

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

  const columns: Column<ReturnReceipt>[] = [
    {
      header: "Mã phiếu",
      sortKey: "receiptCode",
      render: (r) => <span className="font-mono text-xs">{r.receiptCode}</span>,
    },
    { header: "Khách hàng", render: (r) => <span className="font-medium">{r.customerName ?? "—"}</span> },
    {
      header: "Lý do",
      render: (r) => <Badge variant="outline">{reasonLabel[r.reason] ?? r.reason}</Badge>,
    },
    { header: "Số lượng SP", render: (r) => <span>{r.items.length}</span> },
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
            <Button variant="ghost" size="icon" onClick={() => navigate(`/returns/${r.id}`)}>
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
        <h1 className="text-xl font-semibold tracking-tight">Trả hàng</h1>
        {perm.hasRole(...ROLES.CAN_VIEW_INVENTORY) && (
          <Button onClick={() => navigate("/returns/new")}>
            <Plus className="size-4 mr-1" /> Tạo phiếu trả hàng
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={searchText}
            onChange={(e) => { setSearchText(e.target.value); updateParams({ page: undefined }) }}
            placeholder="Tìm mã phiếu..."
            className="pl-9"
          />
        </div>
        <Select value={statusFilter ?? "all"} onValueChange={(v) => { setStatusFilter(v === "all" ? undefined : v); updateParams({ page: undefined }) }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value={RETURN_RECEIPT_STATUS.PENDING_APPROVAL}>Chờ duyệt</SelectItem>
            <SelectItem value={RETURN_RECEIPT_STATUS.COMPLETED}>Đã duyệt</SelectItem>
            <SelectItem value={RETURN_RECEIPT_STATUS.CANCELLED}>Đã hủy</SelectItem>
          </SelectContent>
        </Select>
        <Select value={reasonFilter ?? "all"} onValueChange={(v) => { setReasonFilter(v === "all" ? undefined : v); updateParams({ page: undefined }) }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Lý do" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Lý do</SelectItem>
            <SelectItem value={RETURN_REASON.CHANGE_MIND}>Đổi ý</SelectItem>
            <SelectItem value={RETURN_REASON.DEFECTIVE}>Hàng lỗi</SelectItem>
            <SelectItem value={RETURN_REASON.WRONG_ITEM}>Sai hàng</SelectItem>
            <SelectItem value={RETURN_REASON.WARRANTY_CLAIM}>Bảo hành</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={data?.content ?? []}
        isLoading={isLoading}
        emptyMessage="Không có phiếu trả hàng nào"
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
