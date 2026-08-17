import { useState, useCallback } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useReturnReceipts } from "@/hooks/use-returns"
import { toKey, RETURN_STATUS_VARIANT } from "@/utils/labels"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Plus, Eye, RefreshCw, Search } from "lucide-react"
import { usePermission } from "@/hooks/use-permission"
import { ROLES } from "@/utils/permissions"
import { DataTable, type Column } from "@/components/ui/data-table"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { ReturnReceipt } from "@/utils/types"
import { RETURN_RECEIPT_STATUS, RETURN_REASON } from "@/utils/types"

const VALID_STATUSES = [
  RETURN_RECEIPT_STATUS.PENDING_APPROVAL,
  RETURN_RECEIPT_STATUS.COMPLETED,
  RETURN_RECEIPT_STATUS.CANCELLED,
]
const VALID_REASONS = [
  RETURN_REASON.CHANGE_MIND,
  RETURN_REASON.DEFECTIVE,
  RETURN_REASON.WRONG_ITEM,
  RETURN_REASON.WARRANTY_CLAIM,
]

export const ReturnListPage = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const perm = usePermission()

  const page = Number(searchParams.get("page") ?? "0")
  const [pageSize, setPageSize] = useState(10)
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | undefined>(undefined)

  const rawStatus = searchParams.get("status")
  const rawReason = searchParams.get("reason")
  const statusFilter = rawStatus && VALID_STATUSES.includes(rawStatus) ? rawStatus : undefined
  const reasonFilter = rawReason && VALID_REASONS.includes(rawReason) ? rawReason : undefined
  const [searchText, setSearchText] = useState("")

  const handleSort = useCallback((key: string) => {
    setSort((prev) => {
      if (prev?.key !== key) return { key, dir: "asc" }
      if (prev.dir === "asc") return { key, dir: "desc" }
      return undefined
    })
  }, [])

  const { data, isLoading, isError, refetch } = useReturnReceipts(page, pageSize, statusFilter, reasonFilter, searchText || undefined)

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

  const reasonLabel: Record<string, string> = {
    CHANGE_MIND: t("returnReason.changeMind"),
    DEFECTIVE: t("returnReason.defective"),
    WRONG_ITEM: t("returnReason.wrongItem"),
    WARRANTY_CLAIM: t("returnReason.warrantyClaim"),
  }

  const columns: Column<ReturnReceipt>[] = [
    {
      header: t("table.checkCode"),
      sortKey: "receiptCode",
      render: (r) => <span className="font-mono text-xs">{r.receiptCode}</span>,
    },
    { header: t("table.customer"), render: (r) => <span className="font-medium">{r.customerName ?? "—"}</span> },
    {
      header: t("table.reason"),
      render: (r) => <Badge variant="outline">{reasonLabel[r.reason] ?? r.reason}</Badge>,
    },
    { header: t("returnList.itemCount"), render: (r) => <span>{r.items.length}</span> },
    {
      header: t("table.status"),
      render: (r) => {
        const st = { label: t(`returnStatus.${toKey(r.status)}`), variant: RETURN_STATUS_VARIANT[r.status] }
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
      className: "w-[70px]",
      render: (r) => (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => navigate(`/returns-qc/returns/${r.id}`)}>
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
        <h1 className="text-xl font-semibold tracking-tight">{t("returnList.title")}</h1>
        {perm.hasRole(...ROLES.CAN_CREATE_TRANSACTION) && (
          <Button onClick={() => navigate("/returns-qc/returns/new")}>
            <Plus className="size-4 mr-1" /> {t("returnList.create")}
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={searchText}
            onChange={(e) => { setSearchText(e.target.value); updateParams({ page: undefined }) }}
            placeholder={t("returnList.searchPlaceholder")}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter ?? "all"} onValueChange={(v) => { updateParams({ page: undefined, status: v === "all" ? undefined : v }) }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder={t("common.status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            <SelectItem value={RETURN_RECEIPT_STATUS.PENDING_APPROVAL}>{t("returnStatus.pendingApproval")}</SelectItem>
            <SelectItem value={RETURN_RECEIPT_STATUS.COMPLETED}>{t("returnStatus.completed")}</SelectItem>
            <SelectItem value={RETURN_RECEIPT_STATUS.CANCELLED}>{t("returnStatus.cancelled")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={reasonFilter ?? "all"} onValueChange={(v) => { updateParams({ page: undefined, reason: v === "all" ? undefined : v }) }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder={t("table.reason")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("table.reason")}</SelectItem>
            <SelectItem value={RETURN_REASON.CHANGE_MIND}>{t("returnReason.changeMind")}</SelectItem>
            <SelectItem value={RETURN_REASON.DEFECTIVE}>{t("returnReason.defective")}</SelectItem>
            <SelectItem value={RETURN_REASON.WRONG_ITEM}>{t("returnReason.wrongItem")}</SelectItem>
            <SelectItem value={RETURN_REASON.WARRANTY_CLAIM}>{t("returnReason.warrantyClaim")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isError ? (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center space-y-2">
          <p className="text-sm text-destructive">{t("returnList.loadError")}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="size-3 mr-1" /> {t("returnList.retry")}
          </Button>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={data?.content ?? []}
          isLoading={isLoading}
          emptyMessage={t("returnList.empty")}
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
