import { useState, useCallback, type ComponentType } from "react"
import { useNavigate } from "react-router-dom"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { usePermission } from "@/hooks/use-permission"
import { useUrlState } from "@/hooks/use-url-state"
import { Button } from "@/components/ui/button"
import { DataTable, type Column } from "@/components/ui/data-table"
import { PaginationBar } from "@/components/ui/pagination-bar"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Plus, Eye, Check, X } from "lucide-react"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { toast } from "@/utils/toast"

interface Receipt {
  id: number
  receiptCode: string
  status: string
}

interface Props<R extends Receipt> {
  title: string
  newRoute: string
  emptyMessage: string
  queryKey: string
  useHook: (page: number, size: number) => { data?: { content: R[]; pagination: { totalPages: number } }; isLoading: boolean }
  cancelService: (id: number) => Promise<unknown>
  approveService: (id: number) => Promise<unknown>
  ViewModal: ComponentType<{ receipt: R | null; open: boolean; onOpenChange: (v: boolean) => void }>
  columns: Column<R>[]
}

export function ReceiptListPage<R extends Receipt>({
  title, newRoute, emptyMessage, queryKey, useHook,
  cancelService, approveService, ViewModal,
  columns,
}: Props<R>) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { canCancel: hasCancelPerm, canApprove: hasApprovePerm } = usePermission()
  const [page, setPage] = useUrlState("page", 0)
  const [pageSize, setPageSize] = useUrlState("size", 10)
  const [viewReceipt, setViewReceipt] = useState<R | null>(null)
  const [cancelTarget, setCancelTarget] = useState<R | null>(null)

  const { data, isLoading } = useHook(page, pageSize)

  const cancelMut = useMutation({
    mutationFn: (id: number) => cancelService(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [queryKey] }); setCancelTarget(null) },
  })

  const approveMut = useMutation({
    mutationFn: (id: number) => approveService(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [queryKey] }),
  })

  const handleCancel = async () => {
    if (!cancelTarget) return
    cancelMut.mutate(cancelTarget.id, {
      onSuccess: () => toast.success(`Đã hủy phiếu ${cancelTarget.receiptCode}`),
      onError: (err) => toast.error(err instanceof Error ? err.message : "Không thể hủy phiếu"),
    })
  }

  const handleApprove = useCallback((receipt: R) => {
    approveMut.mutate(receipt.id, {
      onSuccess: () => toast.success(`Đã duyệt phiếu ${receipt.receiptCode}`),
      onError: (err) => toast.error(err instanceof Error ? err.message : "Không thể duyệt phiếu"),
    })
  }, [approveMut])

  const canApprove = useCallback((r: R) => hasApprovePerm(r.status), [hasApprovePerm])

  const actionsCol: Column<R> = {
    header: "Thao tác",
    className: "w-[130px]",
    render: (r: R) => (
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => setViewReceipt(r)}>
              <Eye className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Xem chi tiết</TooltipContent>
        </Tooltip>
        {canApprove(r) && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => handleApprove(r)} disabled={approveMut.isPending}>
                <Check className="size-4 text-green-600" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Duyệt phiếu</TooltipContent>
          </Tooltip>
        )}
        {hasCancelPerm() && r.status !== "CANCELLED" && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => setCancelTarget(r)}>
                <X className="size-4 text-destructive" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Từ chối</TooltipContent>
          </Tooltip>
        )}
      </div>
    ),
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        <Button onClick={() => navigate(newRoute)}>
          <Plus className="size-4 mr-1" />
          Tạo mới
        </Button>
      </div>

      <DataTable
        columns={[...columns, actionsCol]}
        data={data?.content ?? []}
        isLoading={isLoading}
        emptyMessage={emptyMessage}
      />

      {data && data.pagination.totalPages > 1 && (
        <PaginationBar page={page} totalPages={data.pagination.totalPages} onChange={setPage} pageSize={pageSize} onPageSizeChange={(s) => { setPageSize(s); setPage(0) }} />
      )}

      <ViewModal receipt={viewReceipt} open={!!viewReceipt} onOpenChange={(v) => { if (!v) setViewReceipt(null) }} />

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
