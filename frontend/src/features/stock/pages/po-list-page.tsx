import { useState, useCallback } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
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

export function POListPage() {
  const { t } = useTranslation()
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

  const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    OPEN: { label: t("poStatus.open"), variant: "default" },
    PARTIAL: { label: t("poStatus.partial"), variant: "default" },
    COMPLETED: { label: t("poStatus.completed"), variant: "default" },
    CANCELLED: { label: t("poStatus.cancelled"), variant: "destructive" },
  }

  const columns: Column<PurchaseOrder>[] = [
    { header: t("poList.poCode"), sortKey: "poCode", render: (p) => <span className="font-mono text-xs">{p.poCode}</span> },
    { header: t("table.supplier"), render: (p) => <span className="font-medium">{p.supplierName}</span> },
    {
      header: t("table.totalAmount"),
      sortKey: "totalAmount",
      className: "text-right",
      render: (p) => <span className="tabular-nums">{(p.totalAmount ?? 0).toLocaleString("vi-VN")}₫</span>,
    },
    {
      header: t("poList.expectedDate"),
      render: (p) => <span className="text-sm">{new Date(p.expectedDate).toLocaleDateString("vi-VN")}</span>,
    },
    {
      header: t("table.status"),
      render: (p) => {
        const s = statusConfig[p.status] ?? { label: p.status, variant: "secondary" }
        return <Badge variant={s.variant}>{s.label}</Badge>
      },
    },
    {
      header: t("table.createdDate"),
      sortKey: "createdAt",
      render: (p) => (
        <span className="text-xs text-muted-foreground">{new Date(p.createdAt).toLocaleDateString("vi-VN")}</span>
      ),
    },
    {
      header: t("table.actions"),
      className: "w-[120px]",
      render: (p) => (
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => navigate(`/stock/purchase-orders/${p.id}`)}>
                <Eye className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("common.viewDetail")}</TooltipContent>
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
                      onSuccess: () => toast.success(t("poList.cancelSuccess", { code: p.poCode })),
                      onError: (e) => toast.error(e.message),
                    })
                  }}
                  disabled={cancelMut.isPending}
                >
                  <X className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("poList.cancelOrder")}</TooltipContent>
            </Tooltip>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold tracking-tight">{t("poList.title")}</h1>
        {perm.hasRole(...ROLES.MANAGER) && (
          <Button onClick={() => navigate("/stock/purchase-orders/new")}>
            <Plus className="size-4 mr-1" /> {t("poList.createOrder")}
          </Button>
        )}
      </div>
      <DataTable
        columns={columns}
        data={data?.content ?? []}
        isLoading={isLoading}
        emptyMessage={t("poList.empty")}
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
