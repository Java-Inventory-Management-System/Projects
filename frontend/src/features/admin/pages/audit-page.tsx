import { useState, useEffect, useCallback } from "react"
import { searchAuditLogs } from "@/services/audit-service"
import type { AuditLog, ResponsePage, UserResponse } from "@/utils/types"
import { AUDIT_STATUS, AUDIT_ACTION } from "@/utils/types"
import { getUsers } from "@/services/user-service"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, X, Search, ChevronsUpDown, Check } from "lucide-react"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { DataTable, type Column } from "@/components/ui/data-table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command"
import { cn } from "@/utils/cn"

const statusBadge: Record<string, { label: string; variant: "default" | "destructive" | "secondary" }> = {
  [AUDIT_STATUS.SUCCESS]: { label: "Thành công", variant: "default" },
  [AUDIT_STATUS.FAILED]: { label: "Thất bại", variant: "destructive" },
}

function fmt(d: string) {
  return new Date(d).toLocaleString("vi-VN")
}

const actionOptions = [
  AUDIT_ACTION.LOGIN,
  AUDIT_ACTION.LOGOUT,
  AUDIT_ACTION.CREATE,
  AUDIT_ACTION.UPDATE,
  AUDIT_ACTION.DELETE,
  AUDIT_ACTION.APPROVE,
  AUDIT_ACTION.REJECT,
  AUDIT_ACTION.CANCEL,
  AUDIT_ACTION.RESET_PASSWORD,
  AUDIT_ACTION.IMPORT,
  AUDIT_ACTION.EXPORT,
]

const entityOptions = [
  "USER", "IMPORT_RECEIPT", "EXPORT_RECEIPT", "PRODUCT_UNIT",
  "WARRANTY_REQUEST", "RETURN_RECEIPT", "STOCK_CHECK", "STOCK_ADJUSTMENT",
  "PRICE_ADJUSTMENT", "PURCHASE_ORDER", "BRAND", "CATEGORY", "PRODUCT",
  "SUPPLIER", "LOCATION", "CUSTOMER", "SYSTEM_SETTINGS",
]

export const AuditPage = () => {
  const [data, setData] = useState<ResponsePage<AuditLog> | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
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

  const [actionFilter, setActionFilter] = useState("all")
  const [entityFilter, setEntityFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [userIdFilter, setUserIdFilter] = useState("")
  const [users, setUsers] = useState<UserResponse[]>([])
  const [viewLog, setViewLog] = useState<AuditLog | null>(null)

  useEffect(() => {
    getUsers(0, 200).then((r) => setUsers(r.content)).catch(() => {})
  }, [])

  useEffect(() => {
    setPage(0)
  }, [actionFilter, entityFilter, statusFilter, fromDate, toDate, userIdFilter])

  useEffect(() => {
    const doFetch = async () => {
      setLoading(true)
      try {
        const res = await searchAuditLogs({
          page,
          size: pageSize,
          sort: sortStr,
          action: actionFilter === "all" ? undefined : actionFilter,
          entity: entityFilter || undefined,
          status: statusFilter === "all" ? undefined : statusFilter,
          userId: userIdFilter ? Number(userIdFilter) : undefined,
          from: fromDate ? fromDate + "T00:00:00Z" : undefined,
          to: toDate ? toDate + "T23:59:59Z" : undefined,
        })
        setData(res)
      } catch {
        // silent
      } finally {
        setLoading(false)
      }
    }
    doFetch()
  }, [page, pageSize, sortStr, actionFilter, entityFilter, statusFilter, fromDate, toDate, userIdFilter])

  const s = data?.pagination

  const hasFilters = actionFilter !== "all" || !!entityFilter || statusFilter !== "all" || !!fromDate || !!toDate || !!userIdFilter

  const clearAll = () => {
    setActionFilter("all")
    setEntityFilter("")
    setStatusFilter("all")
    setFromDate("")
    setToDate("")
    setUserIdFilter("")
  }

  const activeChips: { key: string; label: string; onRemove: () => void }[] = []
  if (actionFilter !== "all") activeChips.push({ key: "action", label: `Hành động: ${actionFilter}`, onRemove: () => setActionFilter("all") })
  if (entityFilter) activeChips.push({ key: "entity", label: `Đối tượng: ${entityFilter}`, onRemove: () => setEntityFilter("") })
  if (statusFilter !== "all") {
    const st = statusBadge[statusFilter]?.label ?? statusFilter
    activeChips.push({ key: "status", label: `Trạng thái: ${st}`, onRemove: () => setStatusFilter("all") })
  }
  if (fromDate) activeChips.push({ key: "from", label: `Từ: ${fromDate}`, onRemove: () => setFromDate("") })
  if (toDate) activeChips.push({ key: "to", label: `Đến: ${toDate}`, onRemove: () => setToDate("") })
  if (userIdFilter) {
    const u = users.find((u) => String(u.id) === userIdFilter)
    activeChips.push({ key: "user", label: `Người dùng: ${u?.fullName || userIdFilter}`, onRemove: () => setUserIdFilter("") })
  }

  const columns: Column<AuditLog>[] = [
    {
      header: "Thời gian",
      sortKey: "createdAt",
      render: (log) => <span className="text-xs whitespace-nowrap text-muted-foreground">{fmt(log.createdAt)}</span>,
    },
    { header: "Người dùng", render: (log) => <span className="text-xs">{log.username || "—"}</span> },
    { header: "Hành động", render: (log) => <span className="text-xs font-medium">{log.action}</span> },
    { header: "Đối tượng", render: (log) => <span className="text-xs">{log.entityName}</span> },
    { header: "ID", render: (log) => <span className="text-xs font-mono">{log.entityId || "—"}</span> },
    { header: "IP", render: (log) => <span className="text-xs text-muted-foreground">{log.ipAddress || "—"}</span> },
    {
      header: "Trạng thái",
      render: (log) => {
        const st = statusBadge[log.status] ?? { label: log.status, variant: "secondary" as const }
        return (
          <Badge variant={st.variant} className="text-[10px]">
            {st.label}
          </Badge>
        )
      },
    },
    {
      header: "Thao tác",
      className: "w-[70px]",
      render: (log) => (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => setViewLog(log)}>
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
      <h1 className="text-xl font-semibold tracking-tight">Nhật ký hoạt động</h1>

      <div className="space-y-3">
        <div className="flex flex-wrap gap-2 items-end">
          <div className="space-y-1">
            <Label className="text-xs">Hành động</Label>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-40 h-8 text-xs">
                <SelectValue placeholder="Tất cả" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                {actionOptions.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Đối tượng</Label>
            <Select value={entityFilter || "all"} onValueChange={(v) => setEntityFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-40 h-8 text-xs">
                <SelectValue placeholder="Tất cả" />
              </SelectTrigger>
              <SelectContent className="max-h-[50vh]">
                <SelectItem value="all">Tất cả</SelectItem>
                {entityOptions.map((e) => (
                  <SelectItem key={e} value={e}>
                    {e}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Trạng thái</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue placeholder="Tất cả" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value={AUDIT_STATUS.SUCCESS}>Thành công</SelectItem>
                <SelectItem value={AUDIT_STATUS.FAILED}>Thất bại</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Người dùng</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-44 h-8 justify-between text-xs font-normal"
                >
                  {userIdFilter
                    ? users.find((u) => String(u.id) === userIdFilter)?.fullName ?? "Tất cả"
                    : "Tất cả"}
                  <ChevronsUpDown className="size-3 ml-1 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-44 p-0">
                <Command>
                  <CommandInput placeholder="Tìm người dùng..." className="h-8 text-xs" />
                  <CommandList>
                    <CommandEmpty className="text-xs py-4">Không tìm thấy</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value=""
                        onSelect={() => setUserIdFilter("")}
                        className="text-xs h-8"
                      >
                        <Check
                          className={cn(
                            "mr-2 size-3 shrink-0",
                            !userIdFilter ? "opacity-100" : "opacity-0",
                          )}
                        />
                        Tất cả
                      </CommandItem>
                      {users.map((u) => (
                        <CommandItem
                          key={u.id}
                          value={`${u.fullName} ${u.username}`}
                          onSelect={() => setUserIdFilter(String(u.id))}
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
            <Label className="text-xs">Từ ngày</Label>
            <Input
              type="date"
              className="w-36 h-8 text-xs"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Đến ngày</Label>
            <Input
              type="date"
              className="w-36 h-8 text-xs"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={clearAll}>
              <X className="size-3.5 mr-1" /> Xoá bộ lọc
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
            {s.totalElements} kết quả
          </p>
        )}
      </div>

      <DataTable
        columns={columns}
        data={data?.content ?? []}
        isLoading={loading}
        emptyMessage="Không có nhật ký nào"
        sort={sort}
        onSort={handleSort}
        totalElements={s?.totalElements}
        page={page}
        totalPages={s?.totalPages}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(s) => {
          setPageSize(s)
          setPage(0)
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
            <DialogTitle className="text-base">Chi tiết nhật ký</DialogTitle>
          </DialogHeader>
          {viewLog && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-muted-foreground">Thời gian:</span>
                  <p className="font-medium">{fmt(viewLog.createdAt)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Người dùng:</span>
                  <p className="font-medium">{viewLog.username || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Hành động:</span>
                  <p className="font-medium">{viewLog.action}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Đối tượng:</span>
                  <p className="font-medium">
                    {viewLog.entityName} #{viewLog.entityId || "?"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">IP:</span>
                  <p className="font-medium">{viewLog.ipAddress || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Request ID:</span>
                  <p className="font-mono text-xs">{viewLog.requestId || "—"}</p>
                </div>
              </div>
              {viewLog.oldValue && (
                <div>
                  <span className="text-xs font-medium text-muted-foreground">GIÁ TRỊ CŨ</span>
                  <pre className="mt-1 rounded-md bg-muted p-3 text-xs overflow-x-auto">
                    {JSON.stringify(JSON.parse(viewLog.oldValue), null, 2)}
                  </pre>
                </div>
              )}
              {viewLog.newValue && (
                <div>
                  <span className="text-xs font-medium text-muted-foreground">GIÁ TRỊ MỚI</span>
                  <pre className="mt-1 rounded-md bg-muted p-3 text-xs overflow-x-auto">
                    {JSON.stringify(JSON.parse(viewLog.newValue), null, 2)}
                  </pre>
                </div>
              )}
              {viewLog.errorMsg && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                  <span className="text-xs font-medium text-destructive">LỖI</span>
                  <p className="mt-1 text-sm">{viewLog.errorMsg}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
