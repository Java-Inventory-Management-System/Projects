import { useState, useCallback, useEffect, useRef } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { usePermission } from "@/hooks/use-permission"
import { ROLES } from "@/utils/permissions"
import { usePriceAdjustments, useMyPriceAdjustments } from "@/hooks/use-price-adjustments"
import { cancelPriceAdjustment } from "@/services/price-adjustment-service"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Plus, Eye, XCircle, Search, RefreshCw } from "lucide-react"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DataTable, type Column } from "@/components/ui/data-table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { PriceAdjustment } from "@/utils/types"
import { ADJUSTMENT_STATUS } from "@/utils/types"
import { toast } from "@/utils/toast"
import { useTranslation } from "react-i18next"

function PriceDiff({ oldPrice, newPrice }: { oldPrice: number; newPrice: number }) {
  const diff = newPrice - oldPrice
  const pct = oldPrice > 0 ? ((diff / oldPrice) * 100).toFixed(1) : "0.0"
  return (
    <span className="inline-flex items-center gap-1 tabular-nums">
      <span className="text-muted-foreground">{(oldPrice ?? 0).toLocaleString("vi-VN")}₫</span>
      <span className="text-muted-foreground">→</span>
      <span className={diff >= 0 ? "text-destructive" : "text-green-600"}>
        {(newPrice ?? 0).toLocaleString("vi-VN")}₫
      </span>
      <span className={`text-xs font-medium ${diff >= 0 ? "text-destructive" : "text-green-600"}`}>
        ({diff >= 0 ? "+" : ""}{pct}%)
      </span>
    </span>
  )
}

export function PriceAdjustmentListPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const perm = usePermission()
  const page = Number(searchParams.get("page") ?? "0")
  const statusFilter = searchParams.get("status") ?? ""
  const searchTerm = searchParams.get("search") ?? ""
  const isAdminManager = perm.hasRole(...ROLES.CAN_APPROVE)

  const [pageSize, setPageSize] = useState(20)
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | undefined>(undefined)
  const sortStr = sort ? `${sort.key},${sort.dir}` : undefined
  const [searchInput, setSearchInput] = useState(searchTerm)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const [cancelTarget, setCancelTarget] = useState<PriceAdjustment | null>(null)

  const handleSearch = useCallback((value: string) => {
    setSearchInput(value)
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      const next = new URLSearchParams(searchParams)
      next.set("page", "0")
      if (value) next.set("search", value)
      else next.delete("search")
      setSearchParams(next)
    }, 300)
  }, [searchParams, setSearchParams])

  useEffect(() => () => clearTimeout(searchTimer.current), [])

  const handleSort = useCallback((key: string) => {
    setSort((prev) => {
      if (prev?.key !== key) return { key, dir: "asc" }
      if (prev.dir === "asc") return { key, dir: "desc" }
      return undefined
    })
  }, [])

  const allAdj = usePriceAdjustments(page, pageSize, sortStr, statusFilter || undefined, searchTerm || undefined)
  const myAdj = useMyPriceAdjustments(page, pageSize, sortStr, statusFilter || undefined, searchTerm || undefined)
  const { data, isLoading, isError, refetch } = isAdminManager ? allAdj : myAdj

  const cancelMutation = useMutation({
    mutationFn: (id: number) => cancelPriceAdjustment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["price-adjustments"] })
      qc.invalidateQueries({ queryKey: ["my-price-adjustments"] })
      qc.invalidateQueries({ queryKey: ["work-queue"] })
      toast.success(t("priceAdjList.cancelSuccess"))
      setCancelTarget(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const statusLabel: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    [ADJUSTMENT_STATUS.PENDING]: { label: t("priceAdjStatus.pending"), variant: "outline" },
    [ADJUSTMENT_STATUS.APPROVED]: { label: t("priceAdjStatus.approved"), variant: "default" },
    [ADJUSTMENT_STATUS.REJECTED]: { label: t("priceAdjStatus.rejected"), variant: "destructive" },
    [ADJUSTMENT_STATUS.CANCELLED]: { label: t("priceAdjStatus.cancelled"), variant: "secondary" },
  }

  const clearFilters = useCallback(() => {
    setSearchInput("")
    setSearchParams(new URLSearchParams())
  }, [setSearchParams])

  const setPage = (p: number) => {
    const next = new URLSearchParams(searchParams)
    next.set("page", String(p))
    setSearchParams(next)
  }

  const columns: Column<PriceAdjustment>[] = [
    {
      header: t("table.checkCode"),
      sortKey: "adjustCode",
      render: (r) => <span className="font-mono text-xs">{r.adjustCode}</span>,
    },
    {
      header: t("table.product"),
      render: (r) => (
        <div className="text-sm">
          <span>{r.productName ?? "—"}</span>
          {r.productSku && <span className="text-muted-foreground ml-1 text-xs">({r.productSku})</span>}
        </div>
      ),
    },
    {
      header: t("priceAdjList.oldToNewPrice"),
      className: "w-56",
      render: (r) => <PriceDiff oldPrice={r.oldPrice ?? 0} newPrice={r.newPrice ?? 0} />,
    },
    {
      header: t("table.creator"),
      render: (r) => <span className="text-sm text-muted-foreground">{r.createdByName ?? "—"}</span>,
    },
    {
      header: t("table.status"),
      className: "w-28 text-center",
      render: (r) => {
        const s = statusLabel[r.status] ?? { label: r.status, variant: "secondary" as const }
        return (
          <div className="flex items-center gap-1 justify-center">
            <Badge variant={s.variant}>{s.label}</Badge>
            {isAdminManager && r.status === ADJUSTMENT_STATUS.PENDING && r.createdBy !== perm.user?.id && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="size-1.5 rounded-full bg-amber-500 inline-block animate-pulse" />
                </TooltipTrigger>
                <TooltipContent>{t("priceAdjList.pendingYourApproval")}</TooltipContent>
              </Tooltip>
            )}
          </div>
        )
      },
    },
    {
      header: t("table.actions"),
      className: "w-[120px]",
      render: (r) => (
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => navigate(`/stock/ops/price-adjustments/${r.id}`)}>
                <Eye className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("common.viewDetail")}</TooltipContent>
          </Tooltip>
          {r.status === ADJUSTMENT_STATUS.PENDING && r.createdBy === perm.user?.id && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setCancelTarget(r)}>
                  <XCircle className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("priceAdjList.cancel")}</TooltipContent>
            </Tooltip>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold tracking-tight">{t("priceAdjList.title")}</h1>
        {perm.hasRole(...ROLES.CAN_CREATE_PRICE_ADJUSTMENT) && (
          <Button onClick={() => navigate("/stock/ops/price-adjustments/new")}>
            <Plus className="size-4 mr-1" /> {t("priceAdjList.create")}
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            className="pl-8 w-56"
            placeholder={t("priceAdjList.searchPlaceholder")}
            value={searchInput}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            const next = new URLSearchParams(searchParams)
            next.set("page", "0")
            if (v && v !== "all") next.set("status", v)
            else next.delete("status")
            setSearchParams(next)
          }}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder={t("common.all")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            <SelectItem value={ADJUSTMENT_STATUS.PENDING}>{t("priceAdjStatus.pending")}</SelectItem>
            <SelectItem value={ADJUSTMENT_STATUS.APPROVED}>{t("priceAdjStatus.approved")}</SelectItem>
            <SelectItem value={ADJUSTMENT_STATUS.REJECTED}>{t("priceAdjStatus.rejected")}</SelectItem>
            <SelectItem value={ADJUSTMENT_STATUS.CANCELLED}>{t("priceAdjStatus.cancelled")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isError ? (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center space-y-2">
          <p className="text-sm text-destructive">{t("priceAdjList.loadError")}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="size-3 mr-1" /> {t("priceAdjList.retry")}
          </Button>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={data?.content ?? []}
          isLoading={isLoading}
          emptyMessage={
            searchTerm || statusFilter
              ? t("priceAdjList.emptyFilter")
              : t("priceAdjList.empty")
          }
          sort={sort}
          onSort={handleSort}
          totalElements={data?.pagination.totalElements}
          page={page}
          totalPages={data?.pagination.totalPages}
          pageSize={pageSize}
          onPageChange={(p) => setPage(p)}
          onPageSizeChange={(s) => {
            setPageSize(s)
            setPage(0)
          }}
        />
      )}

      {(searchTerm || statusFilter) && (
        <div className="text-center">
          <Button variant="link" size="sm" onClick={clearFilters}>
            {t("common.clear")}
          </Button>
        </div>
      )}

      {(data?.content.length ?? 0) === 0 && !isError && !isLoading && !searchTerm && !statusFilter && perm.hasRole(...ROLES.CAN_CREATE_PRICE_ADJUSTMENT) && (
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-3">{t("priceAdjList.empty")}</p>
          <Button onClick={() => navigate("/stock/ops/price-adjustments/new")}>
            <Plus className="size-4 mr-1" /> {t("priceAdjList.createFirst")}
          </Button>
        </div>
      )}

      <AlertDialog open={!!cancelTarget} onOpenChange={(v) => { if (!v) setCancelTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("priceAdjList.cancelDialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("priceAdjList.cancelDialogDesc", { code: cancelTarget?.adjustCode })}
              {" "}{t("priceAdjList.cannotUndo")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("dialog.no")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (cancelTarget) { const id = cancelTarget.id; setCancelTarget(null); cancelMutation.mutate(id) } }}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? t("priceAdjList.cancelProcessing") : t("priceAdjList.cancelConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
