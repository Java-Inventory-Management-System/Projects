import { useState, useCallback } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { usePurchaseOrders, useCancelPurchaseOrder } from "@/hooks/use-purchase-orders"
import { DataTable, type Column } from "@/components/ui/data-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Eye, X } from "lucide-react"
import { usePermission } from "@/hooks/use-permission"
import { ROLES } from "@/utils/permissions"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { toast } from "@/utils/toast"
import type { PurchaseOrder } from "@/utils/types"

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  DRAFT: { label: "Nháp", variant: "secondary" },
  PARTIAL: { label: "Giao một phần", variant: "default" },
  COMPLETED: { label: "Hoàn tất", variant: "default" },
  CANCELLED: { label: "Đã hủy", variant: "destructive" },
}

export function POListPage() {
  const navigate = useNavigate()
  const perm = usePermission()
  const cancelMut = useCancelPurchaseOrder()
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Number(searchParams.get("page") ?? "0")
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

  const { data, isLoading } = usePurchaseOrders(page, pageSize, sortStr)

  const columns: Column<PurchaseOrder>[] = [
    { header: "Mã PO", sortKey: "poCode", render: (p) => <span className="font-mono text-xs">{p.poCode}</span> },
    { header: "NCC", render: (p) => <span className="font-medium">{p.supplierName}</span> },
    {
      header: "Tổng tiền",
      sortKey: "totalAmount",
      className: "text-right",
      render: (p) => <span className="tabular-nums">{(p.totalAmount ?? 0).toLocaleString("vi-VN")}₫</span>,
    },
    {
      header: "Ngày giao",
      render: (p) => <span className="text-sm">{new Date(p.expectedDate).toLocaleDateString("vi-VN")}</span>,
    },
    {
      header: "Trạng thái",
      render: (p) => {
        const s = statusConfig[p.status] ?? { label: p.status, variant: "secondary" }
        return <Badge variant={s.variant}>{s.label}</Badge>
      },
    },
    {
      header: "Ngày tạo",
      sortKey: "createdAt",
      render: (p) => (
        <span className="text-xs text-muted-foreground">{new Date(p.createdAt).toLocaleDateString("vi-VN")}</span>
      ),
    },
    {
      header: "Thao tác",
      className: "w-[120px]",
      render: (p) => (
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => navigate(`/stock/purchase-orders/${p.id}`)}>
                <Eye className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Xem chi tiết</TooltipContent>
          </Tooltip>
          {p.status !== "CANCELLED" && p.status !== "COMPLETED" && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    cancelMut.mutate(p.id, {
                      onSuccess: () => toast.success(`Đã hủy ${p.poCode}`),
                      onError: (e) => toast.error(e.message),
                    })
                  }}
                  disabled={cancelMut.isPending}
                >
                  <X className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Hủy đơn hàng</TooltipContent>
            </Tooltip>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold tracking-tight">Đơn đặt hàng</h1>
        {perm.hasRole(...ROLES.MANAGER) && (
          <Button onClick={() => navigate("/stock/purchase-orders/new")}>
            <Plus className="size-4 mr-1" /> Tạo đơn hàng
          </Button>
        )}
      </div>
      <DataTable
        columns={columns}
        data={data?.content ?? []}
        isLoading={isLoading}
        emptyMessage="Chưa có đơn đặt hàng nào"
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
