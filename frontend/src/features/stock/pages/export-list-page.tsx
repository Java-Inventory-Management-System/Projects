import { useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { cancelExportReceipt, approveExportReceipt } from "@/features/stock/services/export-service"
import { useExportReceipts } from "@/hooks/use-export-receipts"
import { usePermission } from "@/hooks/use-permission"
import type { ExportReceipt } from "@/utils/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, Eye, X, Check } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
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
import { ViewExportModal } from "../components/view-export-modal"
import { toast } from "@/utils/toast"

const statusLabel: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  PENDING_APPROVAL: { label: "Chờ duyệt", variant: "outline" },
  COMPLETED: { label: "Hoàn tất", variant: "default" },
  CANCELLED: { label: "Đã hủy", variant: "destructive" },
}

const reasonLabel: Record<string, string> = {
  SALE: "Bán hàng",
  INTERNAL: "Nội bộ",
  RETURN_SUPPLIER: "Trả NCC",
  DISPOSE: "Hủy",
}

export const ExportListPage = () => {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { canCancel: hasCancelPerm, canApprove: hasApprovePerm } = usePermission()
  const [page, setPage] = useState(0)
  const [viewReceipt, setViewReceipt] = useState<ExportReceipt | null>(null)
  const [cancelTarget, setCancelTarget] = useState<ExportReceipt | null>(null)

  const { data, isLoading: loading } = useExportReceipts(page, 10)

  const cancelMut = useMutation({
    mutationFn: (id: number) => cancelExportReceipt(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["export-receipts"] }); setCancelTarget(null) },
  })

  const approveMut = useMutation({
    mutationFn: (id: number) => approveExportReceipt(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["export-receipts"] }),
  })

  const handleCancel = async () => {
    if (!cancelTarget) return
    cancelMut.mutate(cancelTarget.id, {
      onSuccess: () => toast.success(`Đã hủy phiếu ${cancelTarget.receiptCode}`),
      onError: (err) => toast.error(err instanceof Error ? err.message : "Không thể hủy phiếu"),
    })
  }

  const handleApprove = useCallback((receipt: ExportReceipt) => {
    approveMut.mutate(receipt.id, {
      onSuccess: () => toast.success(`Đã duyệt phiếu ${receipt.receiptCode}`),
      onError: (err) => toast.error(err instanceof Error ? err.message : "Không thể duyệt phiếu"),
    })
  }, [approveMut])

  const canApprove = useCallback((r: ExportReceipt) => hasApprovePerm(r.status), [hasApprovePerm])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Xuất kho</h1>
        <Button onClick={() => navigate("/stock/exports/new")}>
          <Plus className="size-4 mr-1" />
          Tạo phiếu xuất
        </Button>
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã phiếu</TableHead>
              <TableHead>Lý do</TableHead>
              <TableHead>Khách hàng</TableHead>
              <TableHead className="text-right">Tổng tiền</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Người tạo</TableHead>
              <TableHead>Ngày tạo</TableHead>
              <TableHead>Người duyệt</TableHead>
              <TableHead className="w-[130px]">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 9 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : !data || data.content.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-8">
                  Chưa có phiếu xuất nào.
                </TableCell>
              </TableRow>
            ) : (
              data.content.map((r) => {
                const s = statusLabel[r.status] ?? { label: r.status, variant: "secondary" }
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.receiptCode}</TableCell>
                    <TableCell>{reasonLabel[r.reason] ?? r.reason}</TableCell>
                    <TableCell className="text-muted-foreground">{r.customerName ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.totalAmount.toLocaleString("vi-VN")}₫
                    </TableCell>
                    <TableCell>
                      <Badge variant={s.variant}>{s.label}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{r.createdByName}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {new Date(r.createdAt).toLocaleDateString("vi-VN")}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{r.approvedByName ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setViewReceipt(r)}>
                          <Eye className="size-4" />
                        </Button>
                        {canApprove(r) && (
                          <Button variant="ghost" size="icon" onClick={() => handleApprove(r)} disabled={approveMut.isPending}>
                            <Check className="size-4 text-green-600" />
                          </Button>
                        )}
                        {hasCancelPerm() && r.status !== "CANCELLED" && (
                          <Button variant="ghost" size="icon" onClick={() => setCancelTarget(r)}>
                            <X className="size-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {data && data.pagination.totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setPage(Math.max(0, page - 1))}
                className={page === 0 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
            {(() => {
              const t = data.pagination.totalPages, c = page
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
                    <PaginationLink isActive={p === c} onClick={() => setPage(p)} className="cursor-pointer">
                      {p + 1}
                    </PaginationLink>
                  </PaginationItem>
                )
              )
            })()}
            <PaginationItem>
              <PaginationNext
                onClick={() => setPage(Math.min(data.pagination.totalPages - 1, page + 1))}
                className={page >= data.pagination.totalPages - 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      <ViewExportModal receipt={viewReceipt} open={!!viewReceipt} onOpenChange={(v) => { if (!v) setViewReceipt(null) }} />

      <AlertDialog open={!!cancelTarget} onOpenChange={(v) => { if (!v) setCancelTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận hủy phiếu</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn hủy phiếu <strong>{cancelTarget?.receiptCode}</strong>? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelMut.isPending}>Không</AlertDialogCancel>
            <AlertDialogAction disabled={cancelMut.isPending} onClick={handleCancel}>
              {cancelMut.isPending ? "Đang hủy..." : "Xác nhận hủy"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
