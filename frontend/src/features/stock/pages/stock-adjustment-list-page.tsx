import { useState, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useStockAdjustments, useMyStockAdjustments } from "@/hooks/use-stock-adjustments"
import { toKey, ADJUSTMENT_STATUS_VARIANT } from "@/utils/labels"
import { approveStockAdjustment, rejectStockAdjustment, cancelStockAdjustment } from "@/services/stock-adjustment-service"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Eye, Check, X, XCircle, ChevronDown, ChevronUp, RefreshCw } from "lucide-react"
import { usePermission } from "@/hooks/use-permission"
import { ROLES } from "@/utils/permissions"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DataTable, type Column } from "@/components/ui/data-table"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import type { StockAdjustment } from "@/utils/types"
import { ADJUSTMENT_STATUS, ADJUSTMENT_TYPE } from "@/utils/types"
import { toast } from "@/utils/toast"

const getTypeLabel = (t: (k: string) => string) => ({
  [ADJUSTMENT_TYPE.DAMAGED]: t("adjustmentType.damaged"),
  [ADJUSTMENT_TYPE.LOST]: t("adjustmentType.lost"),
  [ADJUSTMENT_TYPE.FOUND]: t("adjustmentType.found"),
})

const typeColor: Record<string, "destructive" | "outline" | "default"> = {
  [ADJUSTMENT_TYPE.DAMAGED]: "destructive",
  [ADJUSTMENT_TYPE.LOST]: "destructive",
  [ADJUSTMENT_TYPE.FOUND]: "default",
}

export const StockAdjustmentListPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
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

  const qc = useQueryClient()
  const approveMut = useMutation({
    mutationFn: (id: number) => approveStockAdjustment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-adjustments"] })
      qc.invalidateQueries({ queryKey: ["my-stock-adjustments"] })
      qc.invalidateQueries({ queryKey: ["work-queue"] })
      toast.success(t("stockAdjList.approveSuccess"))
    },
    onError: (e: Error) => toast.error(e.message || t("stockAdjList.approveError")),
  })
  const rejectMut = useMutation({
    mutationFn: (id: number) => rejectStockAdjustment(id, t("stockAdjList.defaultRejectReason")),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-adjustments"] })
      qc.invalidateQueries({ queryKey: ["my-stock-adjustments"] })
      qc.invalidateQueries({ queryKey: ["work-queue"] })
      toast.success(t("stockAdjList.rejectSuccess"))
    },
    onError: (e: Error) => toast.error(e.message || t("stockAdjList.rejectError")),
  })
  const cancelMut = useMutation({
    mutationFn: (id: number) => cancelStockAdjustment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-adjustments"] })
      qc.invalidateQueries({ queryKey: ["my-stock-adjustments"] })
      qc.invalidateQueries({ queryKey: ["work-queue"] })
      toast.success(t("stockAdjList.cancelSuccess"))
    },
    onError: (e: Error) => toast.error(e.message || t("stockAdjList.cancelError")),
  })

  const canApprove = perm.hasRole(...ROLES.CAN_APPROVE)

  const isStock = perm.hasRole("STOCK")
  const myAdj = useMyStockAdjustments(page, pageSize, sortStr, typeFilter || undefined, statusFilter || undefined)
  const allAdj = useStockAdjustments(page, pageSize, sortStr, typeFilter || undefined, statusFilter || undefined)
  const { data, isLoading, isError, refetch } = isStock ? myAdj : allAdj

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

  const tl = getTypeLabel(t)

  const columns: Column<StockAdjustment>[] = [
    {
      header: t("table.checkCode"),
      sortKey: "adjustCode",
      render: (r) => <span className="font-mono text-xs">{r.adjustCode}</span>,
    },
    {
      header: t("stockAdjList.type"),
      render: (r) => <Badge variant={typeColor[r.type] ?? "outline"}>{tl[r.type] ?? r.type}</Badge>,
    },
    {
      header: t("table.product"),
      render: (r) => (
        <>
          <span className="font-medium">{r.productName ?? "—"}</span>
          {r.productSku && <span className="text-xs text-muted-foreground ml-1">{r.productSku}</span>}
        </>
      ),
    },
    { header: t("table.reason"), render: (r) => <span className="max-w-[200px] truncate text-sm">{r.reason}</span> },
    {
      header: t("table.status"),
      render: (r) => {
        const st = { label: t(`status.${toKey(r.status)}`), variant: ADJUSTMENT_STATUS_VARIANT[r.status] }
        return <Badge variant={st.variant}>{st.label}</Badge>
      },
    },
    { header: t("table.creator"), render: (r) => <span className="text-muted-foreground">{r.createdByName}</span> },
    {
      header: t("table.createdDate"),
      sortKey: "createdAt",
      render: (r) => (
        <span className="text-muted-foreground text-xs">{new Date(r.createdAt).toLocaleDateString("vi-VN")}</span>
      ),
    },
    {
      header: t("table.actions"),
      className: "w-[160px]",
      render: (r) => (
        <div className="flex items-center gap-1">
          {canApprove && r.status === ADJUSTMENT_STATUS.PENDING && r.createdBy !== perm.user?.id && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-green-600" onClick={() => approveMut.mutate(r.id)}>
                    <Check className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("stockAdjList.approve")}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => rejectMut.mutate(r.id)}>
                    <X className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("stockAdjList.reject")}</TooltipContent>
              </Tooltip>
            </>
          )}
          {r.status === ADJUSTMENT_STATUS.PENDING && r.createdBy === perm.user?.id && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => cancelMut.mutate(r.id)}>
                  <XCircle className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("stockAdjList.cancel")}</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => navigate(`/stock/ops/adjustments/${r.id}`)}>
                <Eye className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("stockAdjList.viewDetail")}</TooltipContent>
          </Tooltip>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold tracking-tight">{t("stockAdjList.title")}</h1>
        {perm.hasRole(...ROLES.CAN_OPERATE_STOCK) && (
          <Button onClick={() => navigate("/stock/ops/adjustments/new")}>
            <Plus className="size-4 mr-1" /> {t("stockAdjList.create")}
          </Button>
        )}
      </div>

      <Collapsible open={filterOpen} onOpenChange={setFilterOpen}>
        <div className="flex items-center gap-2">
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1">
              {filterOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              {t("stockAdjList.filter")}
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="mt-2">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={typeFilter} onValueChange={(v) => updateParams({ type: v === "all" ? undefined : v, page: undefined })}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder={t("stockAdjList.allTypes")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("stockAdjList.allTypes")}</SelectItem>
                <SelectItem value={ADJUSTMENT_TYPE.DAMAGED}>{t("adjustmentType.damaged")}</SelectItem>
                <SelectItem value={ADJUSTMENT_TYPE.LOST}>{t("adjustmentType.lost")}</SelectItem>
                <SelectItem value={ADJUSTMENT_TYPE.FOUND}>{t("adjustmentType.found")}</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={(v) => updateParams({ status: v === "all" ? undefined : v, page: undefined })}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder={t("stockAdjList.allStatuses")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("stockAdjList.allStatuses")}</SelectItem>
                <SelectItem value={ADJUSTMENT_STATUS.PENDING}>{t("status.pending")}</SelectItem>
                <SelectItem value={ADJUSTMENT_STATUS.APPROVED}>{t("status.approved")}</SelectItem>
                <SelectItem value={ADJUSTMENT_STATUS.REJECTED}>{t("status.rejected")}</SelectItem>
                <SelectItem value={ADJUSTMENT_STATUS.CANCELLED}>{t("status.cancelled")}</SelectItem>
              </SelectContent>
            </Select>
            {(typeFilter || statusFilter) && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => setSearchParams(new URLSearchParams())}
              >
                {t("stockAdjList.clearFilter")}
              </Button>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {isError ? (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center space-y-2">
          <p className="text-sm text-destructive">{t("stockAdjList.loadError")}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="size-3 mr-1" /> {t("stockAdjList.retry")}
          </Button>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={data?.content ?? []}
          isLoading={isLoading}
          emptyMessage={t("stockAdjList.empty")}
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
      )}
    </div>
  )
}
