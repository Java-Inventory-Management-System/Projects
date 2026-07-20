import { useState, useEffect } from "react"
import { searchAuditLogs } from "@/features/admin/services/audit-service"
import type { AuditLog, ResponsePage } from "@/utils/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye } from "lucide-react"
import { DataTable, type Column } from "@/components/ui/data-table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PaginationBar } from "@/components/ui/pagination-bar"

const statusBadge: Record<string, { label: string; variant: "default" | "destructive" | "secondary" }> = {
  SUCCESS: { label: "Thành công", variant: "default" },
  FAILED: { label: "Thất bại", variant: "destructive" },
}

function fmt(d: string) {
  return new Date(d).toLocaleString("vi-VN")
}

const actionOptions = [
  "LOGIN", "LOGOUT", "CREATE", "UPDATE", "DELETE",
  "APPROVE", "REJECT", "CANCEL", "RESET_PASSWORD",
  "IMPORT", "EXPORT",
]

export const AuditPage = () => {
  const [data, setData] = useState<ResponsePage<AuditLog> | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)

  const [actionFilter, setActionFilter] = useState("all")
  const [entityFilter, setEntityFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [viewLog, setViewLog] = useState<AuditLog | null>(null)

  const fetch = async (p: number) => {
    setLoading(true)
    try {
      const res = await searchAuditLogs({
        page: p,
        size: 20,
        action: actionFilter === "all" ? undefined : actionFilter,
        entity: entityFilter || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
      })
      setData(res)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { setPage(0) }, [actionFilter, entityFilter, statusFilter])
  useEffect(() => { fetch(page) }, [page, actionFilter, entityFilter, statusFilter])

  const s = data?.pagination

  const columns: Column<AuditLog>[] = [
    {
      header: "Thời gian",
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
        return <Badge variant={st.variant} className="text-[10px]">{st.label}</Badge>
      },
    },
    {
      header: "Chi tiết",
      className: "w-[60px]",
      render: (log) => (
        <Button variant="ghost" size="icon" onClick={() => setViewLog(log)}>
          <Eye className="size-4" />
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight">Nhật ký hoạt động</h1>

      <div className="flex flex-wrap gap-2 items-end">
        <div className="space-y-1">
          <Label className="text-xs">Hành động</Label>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="Tất cả" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              {actionOptions.map((a) => (
                <SelectItem key={a} value={a}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Đối tượng</Label>
          <Input placeholder="Ví dụ: USER" className="w-36 h-8 text-xs" value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Trạng thái</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="Tất cả" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="SUCCESS">Thành công</SelectItem>
              <SelectItem value="FAILED">Thất bại</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data?.content ?? []}
        isLoading={loading}
        emptyMessage="Không có nhật ký nào"
      />

      {s && s.totalPages > 1 && (
        <PaginationBar page={page} totalPages={s.totalPages} onChange={(p) => setPage(p)} />
      )}

      <Dialog open={!!viewLog} onOpenChange={(v) => { if (!v) setViewLog(null) }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">Chi tiết nhật ký</DialogTitle>
          </DialogHeader>
          {viewLog && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Thời gian:</span><p className="font-medium">{fmt(viewLog.createdAt)}</p></div>
                <div><span className="text-muted-foreground">Người dùng:</span><p className="font-medium">{viewLog.username || "—"}</p></div>
                <div><span className="text-muted-foreground">Hành động:</span><p className="font-medium">{viewLog.action}</p></div>
                <div><span className="text-muted-foreground">Đối tượng:</span><p className="font-medium">{viewLog.entityName} #{viewLog.entityId || "?"}</p></div>
                <div><span className="text-muted-foreground">IP:</span><p className="font-medium">{viewLog.ipAddress || "—"}</p></div>
                <div><span className="text-muted-foreground">Request ID:</span><p className="font-mono text-xs">{viewLog.requestId || "—"}</p></div>
              </div>
              {viewLog.oldValue && (
                <div>
                  <span className="text-xs font-medium text-muted-foreground">GIÁ TRỊ CŨ</span>
                  <pre className="mt-1 rounded-md bg-muted p-3 text-xs overflow-x-auto">{JSON.stringify(JSON.parse(viewLog.oldValue), null, 2)}</pre>
                </div>
              )}
              {viewLog.newValue && (
                <div>
                  <span className="text-xs font-medium text-muted-foreground">GIÁ TRỊ MỚI</span>
                  <pre className="mt-1 rounded-md bg-muted p-3 text-xs overflow-x-auto">{JSON.stringify(JSON.parse(viewLog.newValue), null, 2)}</pre>
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
