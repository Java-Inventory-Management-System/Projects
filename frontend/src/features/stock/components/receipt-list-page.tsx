import { useState, useCallback, type ComponentType } from "react"
import { useTranslation } from "react-i18next"
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
    status?: string,
  ) => { data?: { content: R[]; pagination: { totalPages: number; totalElements: number } }; isLoading: boolean }
  cancelService: (id: number) => Promise<unknown>
  approveService?: (id: number) => Promise<unknown>
  ViewModal: ComponentType<{ receipt: R | null; open: boolean; onOpenChange: (v: boolean) => void }>
  columns: Column<R>[]
  approvableStatus?: string
  cancelledStatus?: string
  completedStatus?: string
  scanStatuses?: string[]
  scanPerm?: () => boolean
  cancellableStatuses?: string[]
  cancelPerm?: () => boolean
  createPerm?: () => boolean
  statusTabs?: Array<{ value?: string; label: string }>
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
  approvableStatus = "PENDING_APPROVAL",
  cancelledStatus = "CANCELLED",
  completedStatus = "COMPLETED",
  scanStatuses = [IMPORT_RECEIPT_STATUS.DRAFT],
  scanPerm,
  cancellableStatuses,
  cancelPerm,
  createPerm,
  statusTabs,
}: Props<R>) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const { canCancel: hasCancelPerm, canApprove: hasApprovePerm } = usePermission()
  const canCancelPerm = cancelPerm ?? hasCancelPerm
  const page = Number(searchParams.get("page") ?? "0")
  const pageSize = Number(searchParams.get("size") ?? "10")
  const status = searchParams.get("status") ?? undefined
  const [viewReceipt, setViewReceipt] = useState<R | null>(null)
  const [cancelTarget, setCancelTarget] = useState<R | null>(null)
  const [approveTarget, setApproveTarget] = useState<R | null>(null)
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

  const { data, isLoading } = useHook(page, pageSize, sortStr, status)

  const cancelMut = useMutation({
    mutationFn: (id: number) => cancelService(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [queryKey] })
      qc.invalidateQueries({ queryKey: ["import-pending-count"] })
      qc.invalidateQueries({ queryKey: ["export-pending-count"] })
      setCancelTarget(null)
    },
  })

  const approveMut = useMutation({
    mutationFn: (id: number) => {
      if (!approveService) return Promise.reject(new Error("approve not supported"))
      return approveService(id)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [queryKey] })
      qc.invalidateQueries({ queryKey: ["import-pending-count"] })
      qc.invalidateQueries({ queryKey: ["export-pending-count"] })
    },
  })

  const handleCancel = async () => {
    if (!cancelTarget) return
    const { id, receiptCode } = cancelTarget
    setCancelTarget(null)
    cancelMut.mutate(id, {
      onSuccess: () => toast.success(t("receiptList.cancelled", { code: receiptCode })),
      onError: (err) => toast.error(err instanceof Error ? err.message : t("receiptList.cancelError")),
    })
  }

  const handleApproveConfirm = () => {
    if (!approveTarget) return
    const { id, receiptCode } = approveTarget
    setApproveTarget(null)
    approveMut.mutate(id, {
      onSuccess: () => {
        toast.success(t("receiptList.approved", { code: receiptCode }))
      },
      onError: (err) => toast.error(err instanceof Error ? err.message : t("receiptList.approveError")),
    })
  }

  const canApprove = useCallback((r: R) => r.status === approvableStatus && hasApprovePerm(), [approvableStatus, hasApprovePerm])

  const actionsCol: Column<R> = {
    header: t("table.actions"),
    className: "w-[180px]",
    render: (r: R) => (
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => setViewReceipt(r)}>
              <Eye className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t("common.viewDetail")}</TooltipContent>
        </Tooltip>
        {scanPerm?.() !== false && scanStatuses.includes(r.status) && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => navigate(`${newRoute}?id=${r.id}`)}>
                <ScanLine className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("receiptList.enterSerials")}</TooltipContent>
          </Tooltip>
        )}
        {approveService && canApprove(r) && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => setApproveTarget(r)} disabled={approveMut.isPending}>
                <Check className="size-4 text-green-600" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("receiptList.approveReceipt")}</TooltipContent>
          </Tooltip>
        )}
        {canCancelPerm() && r.status !== cancelledStatus && r.status !== completedStatus && (!cancellableStatuses || cancellableStatuses.includes(r.status)) && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => setCancelTarget(r)}>
                <X className="size-4 text-destructive" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("receiptList.cancelDialogTitle")}</TooltipContent>
          </Tooltip>
        )}
      </div>
    ),
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {(!createPerm || createPerm()) && (
          <Button onClick={() => navigate(newRoute)}>
            <Plus className="size-4 mr-1" />
            {t("common.createNew")}
          </Button>
        )}
      </div>

        {statusTabs && (
        <div className="flex flex-wrap items-center gap-1">
          {statusTabs.map((tab) => (
            <Button
              key={tab.value ?? "all"}
              variant={status === tab.value ? "secondary" : "ghost"}
              size="sm"
              className="h-8 text-xs"
              onClick={() => updateParams({ status: tab.value, page: undefined })}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      )}

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
        open={!!approveTarget}
        onOpenChange={(v) => {
          if (!v) setApproveTarget(null)
        }}
      >
        {approveService && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("receiptList.approveDialogTitle")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("receiptList.approveDialogDesc", { code: approveTarget?.receiptCode })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={approveMut.isPending}>{t("common.no")}</AlertDialogCancel>
              <AlertDialogAction disabled={approveMut.isPending} onClick={handleApproveConfirm}>
                {approveMut.isPending ? t("receiptList.approving") : t("receiptList.confirmApprove")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>

      <AlertDialog
        open={!!cancelTarget}
        onOpenChange={(v) => {
          if (!v) setCancelTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("receiptList.cancelDialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("receiptList.cancelDialogDesc", { code: cancelTarget?.receiptCode })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelMut.isPending}>{t("common.no")}</AlertDialogCancel>
            <AlertDialogAction disabled={cancelMut.isPending} onClick={handleCancel}>
              {cancelMut.isPending ? t("receiptList.cancelling") : t("receiptList.confirmCancel")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
