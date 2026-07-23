import { useState, useCallback } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useReturnReceipts } from "@/hooks/use-returns"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Eye } from "lucide-react"
import { usePermission } from "@/hooks/use-permission"
import { ROLES } from "@/utils/permissions"
import { DataTable, type Column } from "@/components/ui/data-table"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import type { ReturnReceipt } from "@/utils/types"

const reasonLabel: Record<string, string> = {
  CHANGE_MIND: "Đổi ý",
  DEFECTIVE: "Hàng lỗi",
  WRONG_ITEM: "Sai hàng",
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

  const handleSort = useCallback((key: string) => {
    setSort((prev) => {
      if (prev?.key !== key) return { key, dir: "asc" }
      if (prev.dir === "asc") return { key, dir: "desc" }
      return undefined
    })
  }, [])

  const { data, isLoading } = useReturnReceipts(page, pageSize)
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
        {perm.hasRole(...ROLES.ALL_STOCK) && (
          <Button onClick={() => navigate("/returns/new")}>
            <Plus className="size-4 mr-1" /> Tạo phiếu trả hàng
          </Button>
        )}
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
