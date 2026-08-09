import { useState, useCallback } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { usePermission } from "@/hooks/use-permission"
import { useStockChecks, useMyStockChecks } from "@/hooks/use-stock-checks"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Eye } from "lucide-react"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { DataTable, type Column } from "@/components/ui/data-table"
import type { StockCheck } from "@/utils/types"
import { STOCK_CHECK_STATUS } from "@/utils/types"
import { ROLES } from "@/utils/permissions"

export const StockCheckListPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const perm = usePermission()
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Number(searchParams.get("page") ?? "0")
  const statusFilter = searchParams.get("status") ?? ""
  const [pageSize, setPageSize] = useState(10)
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | undefined>(undefined)
  const sortStr = sort ? `${sort.key},${sort.dir}` : undefined

  const statusLabel: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    PENDING: { label: t("stockCheckList.pending"), variant: "secondary" },
    IN_PROGRESS: { label: t("stockCheckList.inProgress"), variant: "outline" },
    COMPLETED: { label: t("stockCheckList.completed"), variant: "default" },
    APPROVED: { label: t("stockCheckList.approved"), variant: "default" },
    CANCELLED: { label: t("stockCheckList.cancelled"), variant: "destructive" },
    EXPIRED: { label: t("stockCheckList.expired"), variant: "outline" },
  }

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

  const columns: Column<StockCheck>[] = [
    {
      header: t("stockCheckList.checkCode"),
      sortKey: "checkCode",
      render: (r) => <span className="font-mono text-xs">{r.checkCode}</span>,
    },
    {
      header: t("common.status"),
      render: (r) => {
        const s = statusLabel[r.status] ?? { label: r.status, variant: "secondary" as const }
        return <Badge variant={s.variant}>{s.label}</Badge>
      },
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
      className: "w-[80px]",
      render: (r) => (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => navigate(`/stock/ops/checks/${r.id}`)}>
              <Eye className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t("common.viewDetail")}</TooltipContent>
        </Tooltip>
      ),
    },
  ]

  return (
    <div className="space-y-4">
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
