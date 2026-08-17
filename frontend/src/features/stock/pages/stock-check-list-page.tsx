import { useState, useCallback } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useQueryClient } from "@tanstack/react-query"
import { usePermission } from "@/hooks/use-permission"
import { useStockChecks, useMyStockChecks, useStockCheckZoneStatus, useStartStockCheck } from "@/hooks/use-stock-checks"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Eye, Play, AlertTriangle } from "lucide-react"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { DataTable, type Column } from "@/components/ui/data-table"
import { toKey, STOCK_CHECK_STATUS_VARIANT } from "@/utils/labels"
import type { StockCheck } from "@/utils/types"
import { STOCK_CHECK_STATUS } from "@/utils/types"
import { ROLES } from "@/utils/permissions"
import { toast } from "@/utils/toast"

export const StockCheckListPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const perm = usePermission()
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Number(searchParams.get("page") ?? "0")
  const statusFilter = searchParams.get("status") ?? ""
  const [pageSize, setPageSize] = useState(10)
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | undefined>(undefined)
  const sortStr = sort ? `${sort.key},${sort.dir}` : undefined

  const statusOptions = [
    { value: "all", label: t("common.all") },
    { value: STOCK_CHECK_STATUS.PENDING, label: t("stockCheckList.pending") },
    { value: STOCK_CHECK_STATUS.IN_PROGRESS, label: t("stockCheckList.inProgress") },
    { value: STOCK_CHECK_STATUS.COMPLETED, label: t("stockCheckList.completed") },
    { value: STOCK_CHECK_STATUS.APPROVED, label: t("stockCheckList.approved") },
    { value: STOCK_CHECK_STATUS.CANCELLED, label: t("stockCheckList.cancelled") },
    { value: STOCK_CHECK_STATUS.EXPIRED, label: t("stockCheckList.expired") },
  ]

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
  const myChecks = useMyStockChecks(page, pageSize, sortStr, statusFilter || undefined)
  const allChecks = useStockChecks(page, pageSize, sortStr, statusFilter || undefined)
  const { data, isLoading } = isStock ? myChecks : allChecks

  const { data: zoneStatus } = useStockCheckZoneStatus()
  const startMut = useStartStockCheck()

  const dueCount = zoneStatus?.zones.reduce((acc, z) => acc + (z.dueClusterCount ?? 0), 0) ?? 0
  const pendingChecks = zoneStatus?.pendingChecks ?? 0

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["stock-checks"] })
    qc.invalidateQueries({ queryKey: ["my-stock-checks"] })
    qc.invalidateQueries({ queryKey: ["stock-check-zone-status"] })
  }

  const handleStart = (check: StockCheck) => {
    startMut.mutate(check.id, {
      onSuccess: () => {
        invalidateAll()
        toast.success(t("stockCheckList.startSuccess"))
        navigate(`/stock/ops/checks/${check.id}`)
      },
      onError: (err: Error) => toast.error(err.message || t("stockCheckList.startError")),
    })
  }

  const columns: Column<StockCheck>[] = [
    {
      header: t("stockCheckList.checkCode"),
      sortKey: "checkCode",
      render: (r) => <span className="font-mono text-xs">{r.checkCode}</span>,
    },
    {
      header: t("common.status"),
      render: (r) => {
        const s = { label: t(`stockCheckList.${toKey(r.status)}`), variant: STOCK_CHECK_STATUS_VARIANT[r.status] }
        return <Badge variant={s.variant}>{s.label}</Badge>
      },
    },
    {
      header: t("stockCheckList.scope"),
      render: (r) => (
        <div className="min-w-[120px]">
          <span className="text-xs">{r.scopeName ?? `${r.scopeType} #${r.scopeId}`}</span>
          {(r.shelfCodes && r.shelfCodes.length > 0) && (
            <span className="block font-mono text-xs text-muted-foreground">
              {r.shelfCodes.join(", ")}
            </span>
          )}
        </div>
      ),
    },
    { header: t("stockCheckList.creator"), render: (r) => <span className="text-muted-foreground">{r.createdByName}</span> },
    {
      header: t("stockCheckList.createdDate"),
      sortKey: "createdAt",
      render: (r) => (
        <span className="text-muted-foreground text-xs">{new Date(r.createdAt).toLocaleDateString("vi-VN")}</span>
      ),
    },
    {
      header: t("stockCheckList.itemCount"),
      className: "text-right",
      render: (r) => <span className="tabular-nums">{r.totalItems}</span>,
    },
    {
      header: t("stockCheckList.errorCount"),
      className: "text-right",
      render: (r) => {
        const total = r.missingCount + r.unexpectedCount
        return (
          <span className={`tabular-nums ${total > 0 ? "text-destructive" : "text-muted-foreground"}`}>
            {total}
          </span>
        )
      },
    },
    {
      header: t("common.actions"),
      className: "w-[120px]",
      render: (r) => (
        <div className="flex items-center gap-1">
          {r.status === STOCK_CHECK_STATUS.PENDING && perm.hasRole(...ROLES.CAN_OPERATE_STOCK) && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" disabled={startMut.isPending} onClick={() => handleStart(r)}>
                  <Play className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("stockCheckList.start")}</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => navigate(`/stock/ops/checks/${r.id}`)}>
                <Eye className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("common.viewDetail")}</TooltipContent>
          </Tooltip>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      {dueCount > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 px-4 py-3 text-sm">
          <AlertTriangle className="size-5 text-amber-600 shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-amber-700 dark:text-amber-400">{t("stockCheckList.zoneDueTitle")}</p>
            <p className="text-amber-600 dark:text-amber-300 mt-0.5">
              {t("stockCheckList.zoneDueDesc", { zones: dueCount, pending: pendingChecks })}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/stock/ops/checks/new")}>
            <Plus className="size-3.5 mr-1" /> {t("stockCheckList.create")}
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold tracking-tight">{t("nav.stockChecks")}</h1>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={(v) => updateParams({ status: v || undefined, page: undefined })}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder={t("stockCheckList.statusFilter")} />
            </SelectTrigger>
            <SelectContent className="max-h-[50vh]">
              {statusOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {perm.hasRole(...ROLES.CAN_OPERATE_STOCK) && (
            <Button onClick={() => navigate("/stock/ops/checks/new")}>
              <Plus className="size-4 mr-1" /> {t("stockCheckList.create")}
            </Button>
          )}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data?.content ?? []}
        isLoading={isLoading}
        emptyMessage={t("stockCheckList.empty")}
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