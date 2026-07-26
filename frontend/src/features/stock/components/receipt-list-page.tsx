import { useState, useCallback, type ComponentType } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { usePermission } from "@/hooks/use-permission"
import { Button } from "@/components/ui/button"
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
import { Plus, Eye, Check, X, ScanLine } from "lucide-react"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { toast } from "@/utils/toast"
import { IMPORT_RECEIPT_STATUS } from "@/utils/types"

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
  useHook: (
    page: number,
    size: number,
    sort?: string,
  ) => { data?: { content: R[]; pagination: { totalPages: number; totalElements: number } }; isLoading: boolean }
  cancelService: (id: number) => Promise<unknown>
  approveService: (id: number) => Promise<unknown>
  ViewModal: ComponentType<{ receipt: R | null; open: boolean; onOpenChange: (v: boolean) => void }>
  columns: Column<R>[]
}

export function ReceiptListPage<R extends Receipt>({
  title,
  newRoute,
  emptyMessage,
  queryKey,
  useHook,
  cancelService,
  approveService,
  ViewModal,
  columns,
}: Props<R>) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const { canCancel: hasCancelPerm, canApprove: hasApprovePerm } = usePermission()
  const page = Number(searchParams.get("page") ?? "0")
  const pageSize = Number(searchParams.get("size") ?? "10")
  const [viewReceipt, setViewReceipt] = useState<R | null>(null)
  const [cancelTarget, setCancelTarget] = useState<R | null>(null)
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | undefined>(undefined)
  const sortStr = sort ? `${sort.key},${sort.dir}` : undefined

  const handleSort = useCallback((key: string) => {
    setSort((prev) => {
      if (prev?.key !== key) return { key, dir: "asc" }
      if (prev.dir === "asc") return { key, dir: "desc" }
      return undefined
    })
  }, [])

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

  const { data, isLoading } = useHook(page, pageSize, sortStr)

  const cancelMut = useMutation({
    mutationFn: (id: number) => cancelService(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [queryKey] })
      setCancelTarget(null)
    },
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

  const handleApprove = useCallback(
    (receipt: R) => {
      approveMut.mutate(receipt.id, {
        onSuccess: () => toast.success(`Đã duyệt phiếu ${receipt.receiptCode}`),
        onError: (err) => toast.error(err instanceof Error ? err.message : "Không thể duyệt phiếu"),
      })
    },
    [approveMut],
  )

  const canApprove = useCallback((r: R) => r.status === IMPORT_RECEIPT_STATUS.PENDING_APPROVAL && hasApprovePerm(), [hasApprovePerm])

  const actionsCol: Column<R> = {
    header: "Thao tác",
    className: "w-[180px]",
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
        {(r.status === IMPORT_RECEIPT_STATUS.DRAFT || r.status === IMPORT_RECEIPT_STATUS.PENDING_APPROVAL) && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => navigate(`${newRoute}?id=${r.id}`)}>
                <ScanLine className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Nhập serial</TooltipContent>
          </Tooltip>
        )}
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
        {hasCancelPerm() && r.status !== IMPORT_RECEIPT_STATUS.CANCELLED && (
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
      <div className="flex flex-wrap items-center justify-between gap-2">
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
        sort={sort}
        onSort={handleSort}
        totalElements={data?.pagination.totalElements}
        page={page}
        totalPages={data?.pagination.totalPages}
        pageSize={pageSize}
        onPageChange={(p) => updateParams({ page: String(p) })}
        onPageSizeChange={(s) => {
          updateParams({ size: String(s), page: undefined })
        }}
      />

      <ViewModal
        receipt={viewReceipt}
        open={!!viewReceipt}
        onOpenChange={(v) => {
          if (!v) setViewReceipt(null)
        }}
      />

      <AlertDialog
        open={!!cancelTarget}
        onOpenChange={(v) => {
          if (!v) setCancelTarget(null)
        }}
      >
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
