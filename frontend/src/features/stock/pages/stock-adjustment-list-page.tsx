import { useState, useCallback, useEffect, useSyncExternalStore } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useStockAdjustments, useMyStockAdjustments } from "@/hooks/use-stock-adjustments"
import { approveStockAdjustment, rejectStockAdjustment } from "@/services/stock-adjustment-service"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Eye, Check, X, ChevronDown, ChevronUp, Loader2 } from "lucide-react"
import { usePermission } from "@/hooks/use-permission"
import { ROLES } from "@/utils/permissions"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DataTable, type Column } from "@/components/ui/data-table"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import type { StockAdjustment } from "@/utils/types"
import { ADJUSTMENT_STATUS, ADJUSTMENT_TYPE } from "@/utils/types"
import { toast } from "@/utils/toast"
import { backgroundBatch } from "@/utils/background-batch"

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

const getStatusLabel = (t: (k: string) => string) => ({
  PENDING: { label: t("status.pending"), variant: "secondary" as const },
  APPROVED: { label: t("status.approved"), variant: "default" as const },
  REJECTED: { label: t("status.rejected"), variant: "destructive" as const },
})

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
      toast.success(t("stockAdjList.approveSuccess"))
    },
    onError: (e: Error) => toast.error(e.message || t("stockAdjList.approveError")),
  })
  const rejectMut = useMutation({
    mutationFn: (id: number) => rejectStockAdjustment(id, t("stockAdjList.defaultRejectReason")),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-adjustments"] })
      qc.invalidateQueries({ queryKey: ["my-stock-adjustments"] })
      toast.success(t("stockAdjList.rejectSuccess"))
    },
    onError: (e: Error) => toast.error(e.message || t("stockAdjList.rejectError")),
  })

  const [batchDone, setBatchDone] = useState(false)

  const batch = useSyncExternalStore(backgroundBatch.subscribe, backgroundBatch.getSnapshot)

  useEffect(() => {
    if (!batch.running && batch.results.length > 0 && !batchDone) {
      setBatchDone(true)
      const ok = batch.results.filter((r) => r.success).length
      const total = batch.results.length
      if (ok === total) {
        toast.success(t("stockAdjList.batchSuccess", { ok, total }))
      } else {
        toast.warning(t("stockAdjList.batchWarning", { ok, total, fail: total - ok }))
      }
    }
  }, [batch, batchDone, t])

  const handleClearBatch = useCallback(() => {
    backgroundBatch.reset()
    setBatchDone(false)
    qc.invalidateQueries({ queryKey: ["stock-adjustments"] })
  }, [qc])

  const canApprove = perm.hasRole(...ROLES.CAN_APPROVE)

  const isStock = perm.hasRole("STOCK")
  const myAdj = useMyStockAdjustments(page, pageSize, sortStr, typeFilter || undefined, statusFilter || undefined)
  const allAdj = useStockAdjustments(page, pageSize, sortStr, typeFilter || undefined, statusFilter || undefined)
  const { data, isLoading } = isStock ? myAdj : allAdj

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
  const sl = getStatusLabel(t)

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
        const st = sl[r.status] ?? { label: r.status, variant: "secondary" as const }
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
          {canApprove && r.status === ADJUSTMENT_STATUS.PENDING && (
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
      {backgroundBatch.isRunning() && (
        <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950/20 dark:text-blue-300">
          <Loader2 className="size-4 animate-spin" />
          {t("stockAdjList.batchRunning", { current: batch.progress?.current ?? "?", total: batch.progress?.total ?? "?" })}
        </div>
      )}
      {batchDone && batch.results.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800 dark:border-green-800 dark:bg-green-950/20 dark:text-green-300">
          <span>
            {t("stockAdjList.batchDone", { ok: batch.results.filter((r) => r.success).length, total: batch.results.length })}
          </span>
          <Button variant="ghost" size="sm" onClick={handleClearBatch}>{t("stockAdjList.hide")}</Button>
        </div>
      )}
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
              onValueChange={(v) => updateParams({ status: v || undefined, page: undefined })}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder={t("stockAdjList.allStatuses")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("stockAdjList.allStatuses")}</SelectItem>
                <SelectItem value={ADJUSTMENT_STATUS.PENDING}>{t("status.pending")}</SelectItem>
                <SelectItem value={ADJUSTMENT_STATUS.APPROVED}>{t("status.approved")}</SelectItem>
                <SelectItem value={ADJUSTMENT_STATUS.REJECTED}>{t("status.rejected")}</SelectItem>
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
    </div>
  )
}
