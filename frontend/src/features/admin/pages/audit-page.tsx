import { Fragment, useState, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useSearchParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { searchAuditLogs } from "@/services/audit-service"
import type { AuditLog } from "@/utils/types"
import { AUDIT_STATUS, AUDIT_ACTION } from "@/utils/types"
import { computeDiffRows } from "@/utils/audit-diff"
import { useUsers } from "@/hooks/use-users"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Eye, X, Search, ChevronsUpDown, Check, ChevronDown, ChevronRight } from "lucide-react"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { DataTable, type Column } from "@/components/ui/data-table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/utils/cn"
import { DatePicker } from "@/components/ui/date-picker"

const statusBadgeConfig: Record<string, { labelKey: string; variant: "default" | "destructive" | "secondary" }> = {
  [AUDIT_STATUS.SUCCESS]: { labelKey: "auditPage.statusSuccess", variant: "default" },
  [AUDIT_STATUS.FAILED]: { labelKey: "auditPage.statusFailed", variant: "destructive" },
}

function fmt(d: string) {
  return new Date(d).toLocaleString("vi-VN")
}

function LogSummary({ log }: { log: AuditLog }) {
  const { t } = useTranslation()
  const st = statusBadgeConfig[log.status] ?? { labelKey: undefined, variant: "secondary" as const }
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 rounded-md bg-muted p-3">
        <Badge variant={st.variant} className="text-[10px] shrink-0">
          {st.labelKey ? t(st.labelKey) : log.status}
        </Badge>
        <span className="text-sm font-semibold">{log.message || "—"}</span>
      </div>
      <p className="text-xs text-muted-foreground">
        {log.username || "SYSTEM"}
        {log.roleSnapshot ? ` (${log.roleSnapshot})` : ""} · {fmt(log.createdAt)} · IP {log.ipAddress || "—"}
      </p>
    </div>
  )
}

function AuditDiffSection({ log }: { log: AuditLog }) {
  const { t } = useTranslation()
  const result = useMemo(
    () => computeDiffRows(log.oldValue, log.newValue, log.messageFields),
    [log.oldValue, log.newValue, log.messageFields],
  )
  const [open, setOpen] = useState(false)
  if (result.rows.length === 0) return null
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
        {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        {t('auditPage.viewDetail')} ({result.rows.length})
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-1 grid grid-cols-[140px_1fr] gap-y-1 rounded-md bg-muted p-3 text-xs overflow-x-auto">
          {result.rows.map((r) => (
            <Fragment key={r.key}>
              <span className="text-muted-foreground min-w-0">{r.label}</span>
              <span className="min-w-0 truncate">
                {r.kind === "changed" && (
                  <>
                    <span className="text-red-500">−</span>{" "}
                    <span className="line-through text-muted-foreground">{r.oldDisplay}</span>
                    <span className="mx-1 text-muted-foreground">→</span>
                    <span className="text-green-600">+</span>{" "}
                    <span className="font-medium">{r.newDisplay}</span>
                  </>
                )}
                {r.kind === "added" && (
                  <>
                    <span className="text-green-600">+</span> {r.newDisplay}
                  </>
                )}
                {r.kind === "removed" && (
                  <>
                    <span className="text-red-500">−</span> {r.oldDisplay}
                  </>
                )}
              </span>
            </Fragment>
          ))}
          {result.truncated > 0 && (
            <Fragment>
              <span className="min-w-0" />
              <span className="min-w-0 text-muted-foreground">
                {t('auditPage.moreFields', { count: result.truncated })}
              </span>
            </Fragment>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

const actionOptions = Object.values(AUDIT_ACTION)

const entityOptions = [
  "USER", "BRAND", "CATEGORY", "SUPPLIER", "PRODUCT", "PRODUCT_IMAGE",
  "PRODUCT_UNIT", "IMPORT_RECEIPT", "EXPORT_RECEIPT", "RETURN_RECEIPT",
  "STOCK_CHECK", "STOCK_ADJUSTMENT", "PRICE_ADJUSTMENT", "PURCHASE_ORDER",
  "LOCATION", "CUSTOMER", "BOX",
]

export const AuditPage = () => {
  const { t } = useTranslation()
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

  const actionFilter = searchParams.get("action") ?? "all"
  const entityFilter = searchParams.get("entity") ?? ""
  const statusFilter = searchParams.get("status") ?? "all"
  const fromDate = searchParams.get("from") ?? ""
  const toDate = searchParams.get("to") ?? ""
  const userIdFilter = searchParams.get("userId") ?? ""
  const [viewLog, setViewLog] = useState<AuditLog | null>(null)
  const [actionOpen, setActionOpen] = useState(false)

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        for (const [key, val] of Object.entries(updates)) {
          if (val) next.set(key, val)
          else next.delete(key)
        }
        return next
      }, { replace: true })
    },
    [setSearchParams],
  )

  const { data, isLoading: loading } = useQuery({
    queryKey: ["audit-logs", page, pageSize, sortStr, actionFilter, entityFilter, statusFilter, fromDate, toDate, userIdFilter],
    queryFn: () => searchAuditLogs({
      page,
      size: pageSize,
      sort: sortStr,
      action: actionFilter === "all" ? undefined : actionFilter,
      entity: entityFilter || undefined,
      status: statusFilter === "all" ? undefined : statusFilter,
      userId: userIdFilter ? Number(userIdFilter) : undefined,
      from: fromDate ? fromDate + "T00:00:00Z" : undefined,
      to: toDate ? toDate + "T23:59:59Z" : undefined,
    }),
    placeholderData: (prev) => prev,
  })

  const { data: usersPage } = useUsers(0, 200)
  const users = usersPage?.content ?? []

  const s = data?.pagination

  const hasFilters = actionFilter !== "all" || !!entityFilter || statusFilter !== "all" || !!fromDate || !!toDate || !!userIdFilter

  const clearAll = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      for (const key of ["action", "entity", "status", "from", "to", "userId", "page"]) {
        next.delete(key)
      }
      return next
    }, { replace: true })
  }

  const activeChips: { key: string; label: string; onRemove: () => void }[] = []
  if (actionFilter !== "all") activeChips.push({ key: "action", label: `${t('auditPage.filterAction')}: ${actionFilter}`, onRemove: () => updateParams({ action: undefined }) })
  if (entityFilter) activeChips.push({ key: "entity", label: `${t('auditPage.filterEntity')}: ${entityFilter}`, onRemove: () => updateParams({ entity: undefined }) })
  if (statusFilter !== "all") {
    const st = statusBadgeConfig[statusFilter]
    activeChips.push({ key: "status", label: `${t('auditPage.filterStatus')}: ${st ? t(st.labelKey) : statusFilter}`, onRemove: () => updateParams({ status: undefined }) })
  }
  if (fromDate) activeChips.push({ key: "from", label: `${t('auditPage.filterFrom')}: ${fromDate}`, onRemove: () => updateParams({ from: undefined }) })
  if (toDate) activeChips.push({ key: "to", label: `${t('auditPage.filterTo')}: ${toDate}`, onRemove: () => updateParams({ to: undefined }) })
  if (userIdFilter) {
    const u = users.find((u) => String(u.id) === userIdFilter)
    activeChips.push({ key: "user", label: `${t('auditPage.filterUser')}: ${u?.fullName || userIdFilter}`, onRemove: () => updateParams({ userId: undefined }) })
  }

  const columns: Column<AuditLog>[] = [
    {
      header: t('auditPage.colTime'),
      sortKey: "createdAt",
      render: (log) => <span className="text-xs whitespace-nowrap text-muted-foreground">{fmt(log.createdAt)}</span>,
    },
    { header: t('auditPage.colUser'), render: (log) => <span className="text-xs">{log.username || "—"}</span> },
    { header: t('auditPage.colAction'), render: (log) => <span className="text-xs font-medium">{log.action}</span> },
    {
      header: t('auditPage.colMessage'),
      className: "min-w-[240px]",
      render: (log) => <span className="text-xs line-clamp-1">{log.message || "—"}</span>,
    },
    { header: t('auditPage.colEntity'), render: (log) => <span className="text-xs">{log.entityName}</span> },
    { header: t('auditPage.colEntityId'), render: (log) => <span className="text-xs font-mono">{log.entityId || "—"}</span> },
    { header: "IP", render: (log) => <span className="text-xs text-muted-foreground">{log.ipAddress || "—"}</span> },
    {
      header: t('auditPage.colStatus'),
      render: (log) => {
        const st = statusBadgeConfig[log.status] ?? { labelKey: undefined, variant: "secondary" as const }
        return (
          <Badge variant={st.variant} className="text-[10px]">
            {st.labelKey ? t(st.labelKey) : log.status}
          </Badge>
        )
      },
    },
    {
      header: t('auditPage.colActions'),
      className: "w-[70px]",
      render: (log) => (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => setViewLog(log)}>
              <Eye className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('auditPage.viewDetail')}</TooltipContent>
        </Tooltip>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight">{t('auditPage.title')}</h1>

      <div className="space-y-3">
        <div className="flex flex-wrap gap-2 items-end">
          <div className="space-y-1">
            <Label className="text-xs">{t('auditPage.filterActionLabel')}</Label>
            <Popover open={actionOpen} onOpenChange={setActionOpen}>
              <PopoverTrigger asChild>
                <button
                  role="combobox"
                  className="flex h-8 w-48 items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring hover:bg-accent hover:text-accent-foreground"
                >
                  <span className="truncate">
                    {actionFilter === "all" ? t('auditPage.all') : actionFilter}
                  </span>
                  <ChevronsUpDown className="ml-2 size-3.5 shrink-0 opacity-50" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-0">
                <Command>
                  <CommandInput placeholder={t('auditPage.searchAction')} className="h-8 text-xs" />
                  <CommandList>
                    <CommandEmpty className="text-xs py-4">{t('auditPage.actionNotFound')}</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="all"
                        onSelect={() => {
                          updateParams({ action: undefined, page: undefined })
                          setActionOpen(false)
                        }}
                        className="text-xs h-8"
                      >
                        <Check
                          className={cn(
                            "mr-2 size-3 shrink-0",
                            actionFilter === "all" ? "opacity-100" : "opacity-0",
                          )}
                        />
                        {t('auditPage.all')}
                      </CommandItem>
                      {actionOptions.map((a) => (
                        <CommandItem
                          key={a}
                          value={a}
                          onSelect={() => {
                            updateParams({ action: a, page: undefined })
                            setActionOpen(false)
                          }}
                          className="text-xs h-8"
                        >
                          <Check
                            className={cn(
                              "mr-2 size-3 shrink-0",
                              actionFilter === a ? "opacity-100" : "opacity-0",
                            )}
                          />
                          {a}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t('auditPage.filterEntityLabel')}</Label>
            <Select value={entityFilter || "all"} onValueChange={(v) => updateParams({ entity: v === "all" ? undefined : v, page: undefined })}>
              <SelectTrigger className="w-40 h-8 text-xs">
                <SelectValue placeholder={t('auditPage.all')} />
              </SelectTrigger>
              <SelectContent className="max-h-[50vh]">
                <SelectItem value="all">{t('auditPage.all')}</SelectItem>
                {entityOptions.map((e) => (
                  <SelectItem key={e} value={e}>
                    {e}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t('auditPage.filterStatusLabel')}</Label>
            <Select value={statusFilter} onValueChange={(v) => updateParams({ status: v === "all" ? undefined : v, page: undefined })}>
              <SelectTrigger className="w-40 h-8 text-xs">
                <SelectValue placeholder={t('auditPage.all')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('auditPage.all')}</SelectItem>
                <SelectItem value={AUDIT_STATUS.SUCCESS}>{t('auditPage.statusSuccess')}</SelectItem>
                <SelectItem value={AUDIT_STATUS.FAILED}>{t('auditPage.statusFailed')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t('auditPage.filterUserLabel')}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  role="combobox"
                  className="flex h-8 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring hover:bg-accent hover:text-accent-foreground"
                >
                  <span className="truncate">
                    {userIdFilter
                      ? users.find((u) => String(u.id) === userIdFilter)?.fullName ?? t('auditPage.all')
                      : t('auditPage.all')}
                  </span>
                  <ChevronsUpDown className="ml-2 size-3.5 shrink-0 opacity-50" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-44 p-0">
                <Command>
                  <CommandInput placeholder={t('auditPage.searchUser')} className="h-8 text-xs" />
                  <CommandList>
                    <CommandEmpty className="text-xs py-4">{t('auditPage.userNotFound')}</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value=""
                        onSelect={() => updateParams({ userId: undefined, page: undefined })}
                        className="text-xs h-8"
                      >
                        <Check
                          className={cn(
                            "mr-2 size-3 shrink-0",
                            !userIdFilter ? "opacity-100" : "opacity-0",
                          )}
                        />
                        {t('auditPage.all')}
                      </CommandItem>
                      {users.map((u) => (
                        <CommandItem
                          key={u.id}
                          value={`${u.fullName} ${u.username}`}
                          onSelect={() => updateParams({ userId: String(u.id), page: undefined })}
                          className="text-xs h-8"
                        >
                          <Check
                            className={cn(
                              "mr-2 size-3 shrink-0",
                              userIdFilter === String(u.id) ? "opacity-100" : "opacity-0",
                            )}
                          />
                          {u.fullName} ({u.username})
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t('auditPage.filterFromLabel')}</Label>
            <DatePicker
              value={fromDate}
              onChange={(v) => updateParams({ from: v || undefined, page: undefined })}
              className="w-40"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t('auditPage.filterToLabel')}</Label>
            <DatePicker
              value={toDate}
              onChange={(v) => updateParams({ to: v || undefined, page: undefined })}
              className="w-40"
            />
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={clearAll}>
              <X className="size-3.5 mr-1" /> {t('auditPage.clearFilters')}
            </Button>
          )}
        </div>

        {activeChips.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {activeChips.map((chip) => (
              <Badge key={chip.key} variant="secondary" className="gap-1 text-xs h-6 px-2 font-normal">
                {chip.label}
                <button onClick={chip.onRemove} className="ml-0.5 hover:text-foreground">
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        {s && !loading && (
          <p className="text-xs text-muted-foreground">
            <Search className="size-3 inline mr-1" />
            {t('auditPage.results', { count: s.totalElements })}
          </p>
        )}
      </div>

      <DataTable
        columns={columns}
        data={data?.content ?? []}
        isLoading={loading}
        emptyMessage={t('auditPage.empty')}
        sort={sort}
        onSort={handleSort}
        totalElements={s?.totalElements}
        page={page}
        totalPages={s?.totalPages}
        pageSize={pageSize}
        onPageChange={(p) => updateParams({ page: String(p) })}
        onPageSizeChange={(s) => {
          setPageSize(s)
          updateParams({ page: undefined })
        }}
      />

      <Dialog
        open={!!viewLog}
        onOpenChange={(v) => {
          if (!v) setViewLog(null)
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">{t('auditPage.dialogTitle')}</DialogTitle>
          </DialogHeader>
          {viewLog && (
            <div className="space-y-3 text-sm">
              <LogSummary log={viewLog} />
              {viewLog.errorMsg && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                  <span className="text-xs font-medium text-destructive">{t('auditPage.error')}</span>
                  <p className="mt-1 text-sm">{viewLog.errorMsg}</p>
                </div>
              )}
              <AuditDiffSection log={viewLog} />
              {(viewLog.entityId || viewLog.requestId) && (
                <p className="text-right text-[10px] text-muted-foreground/60">
                  {["log", viewLog.entityId ? `#${viewLog.entityId}` : "", viewLog.requestId ?? ""]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
