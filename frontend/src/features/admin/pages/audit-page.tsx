import { useState, useEffect } from "react"
import { searchAuditLogs } from "@/services/audit-service"
import type { AuditLog, ResponsePage } from "@/utils/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Eye } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

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

      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Thời gian</TableHead>
              <TableHead>Người dùng</TableHead>
              <TableHead>Hành động</TableHead>
              <TableHead>Đối tượng</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="w-[60px]">Chi tiết</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : !data || data.content.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-sm text-muted-foreground">
                  Không có nhật ký nào
                </TableCell>
              </TableRow>
            ) : (
              data.content.map((log, i) => {
                const st = statusBadge[log.status] ?? { label: log.status, variant: "secondary" as const }
                return (
                  <TableRow key={`${log.createdAt}-${i}`}>
                    <TableCell className="text-xs whitespace-nowrap text-muted-foreground">{fmt(log.createdAt)}</TableCell>
                    <TableCell className="text-xs">{log.username || "—"}</TableCell>
                    <TableCell className="text-xs font-medium">{log.action}</TableCell>
                    <TableCell className="text-xs">{log.entityName}</TableCell>
                    <TableCell className="text-xs font-mono">{log.entityId || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{log.ipAddress || "—"}</TableCell>
                    <TableCell><Badge variant={st.variant} className="text-[10px]">{st.label}</Badge></TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => setViewLog(log)}>
                        <Eye className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {s && s.totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setPage(Math.max(0, page - 1))}
                className={page === 0 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
            {(() => {
              const t = s.totalPages, c = page
              const pages: (number | "ellipsis")[] = []
              if (t <= 7) { for (let i = 0; i < t; i++) pages.push(i) }
              else {
                pages.push(0)
                if (c > 3) pages.push("ellipsis")
                for (let i = Math.max(1, c - 2); i <= Math.min(t - 2, c + 2); i++) pages.push(i)
                if (c < t - 4) pages.push("ellipsis")
                pages.push(t - 1)
              }
              return pages.map((p, i) =>
                p === "ellipsis" ? (
                  <PaginationItem key={`e${i}`}>
                    <span className="px-2 text-muted-foreground">...</span>
                  </PaginationItem>
                ) : (
                  <PaginationItem key={p}>
                    <PaginationLink isActive={p === c} onClick={() => setPage(p)} className="cursor-pointer">{p + 1}</PaginationLink>
                  </PaginationItem>
                )
              )
            })()}
            <PaginationItem>
              <PaginationNext
                onClick={() => setPage(Math.min(s.totalPages - 1, page + 1))}
                className={page >= s.totalPages - 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
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
