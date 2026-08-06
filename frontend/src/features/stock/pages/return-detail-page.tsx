import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getReturnReceiptById, approveReturnReceipt, cancelReturnReceipt } from "@/services/return-service"
import { usePermission } from "@/hooks/use-permission"
import { ROLES } from "@/utils/permissions"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Empty, EmptyTitle } from "@/components/ui/empty"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Check, X, ExternalLink, Circle } from "lucide-react"
import { PrintReceiptButton } from "../components/print-receipt"
import { toast } from "@/utils/toast"
import { RETURN_RECEIPT_STATUS } from "@/utils/types"
import { cn } from "@/utils/cn"
import { useTranslation } from "react-i18next"

export const ReturnDetailPage = () => {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const perm = usePermission()

  const [showCancel, setShowCancel] = useState(false)
  const [showApprove, setShowApprove] = useState(false)

  const { data: receipt, isLoading } = useQuery({
    queryKey: ["return-receipt", id],
    queryFn: () => getReturnReceiptById(Number(id)),
    enabled: !!id,
  })

  const approveMut = useMutation({
    mutationFn: () => approveReturnReceipt(Number(id!)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["return-receipt", id] })
      qc.invalidateQueries({ queryKey: ["return-receipts"] })
      qc.invalidateQueries({ queryKey: ["inventory"] })
      setShowApprove(false)
      toast.success(t("returnDetail.approveSuccess"))
    },
    onError: (err: Error) => toast.error(err.message || t("returnDetail.approveFail")),
  })

  const cancelMut = useMutation({
    mutationFn: () => cancelReturnReceipt(Number(id!)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["return-receipt", id] })
      qc.invalidateQueries({ queryKey: ["return-receipts"] })
      setShowCancel(false)
      toast.success(t("returnDetail.cancelSuccess"))
    },
    onError: (err: Error) => toast.error(err.message || t("returnDetail.cancelFail")),
  })

  const reasonLabel: Record<string, string> = {
    CHANGE_MIND: t("returnReason.changeMind"),
    DEFECTIVE: t("returnReason.defective"),
    WRONG_ITEM: t("returnReason.wrongItem"),
  }

  const statusLabel: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
    PENDING_APPROVAL: { label: t("returnStatus.pendingApproval"), variant: "secondary" },
    COMPLETED: { label: t("returnStatus.completed"), variant: "default" },
    CANCELLED: { label: t("returnStatus.cancelled"), variant: "destructive" },
  }

  const conditionLabel: Record<string, string> = {
    GOOD: t("returnCondition.good"),
    DEFECTIVE: t("returnCondition.defective"),
  }

  const actionLabel: Record<string, string> = {
    RESTOCK: t("returnAction.restock"),
    SCRAP: t("returnAction.scrap"),
    WARRANTY_TRANSFER: t("returnAction.warrantyTransfer"),
  }

  if (isLoading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )

  if (!receipt)
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Empty>
          <EmptyTitle>{t("returnDetail.notFound")}</EmptyTitle>
        </Empty>
      </div>
    )

  const st = statusLabel[receipt.status] ?? { label: receipt.status, variant: "secondary" as const }
  const canApprove = receipt.status === RETURN_RECEIPT_STATUS.PENDING_APPROVAL && perm.hasRole(...ROLES.CAN_APPROVE)
  const canCancel = receipt.status === RETURN_RECEIPT_STATUS.PENDING_APPROVAL

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => navigate("/returns-qc/returns")}>{t("returnDetail.breadcrumb")}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{receipt.receiptCode}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center gap-3">
        <Badge variant={st.variant}>{st.label}</Badge>
        <span className="font-mono text-xs text-muted-foreground">{receipt.receiptCode}</span>
      </div>

      <div className="flex items-start gap-6 px-1 py-3 text-xs">
        <div className="flex items-center gap-2">
          <Circle className={cn("size-3 fill-current", receipt.status !== RETURN_RECEIPT_STATUS.CANCELLED ? "text-blue-500" : "text-muted-foreground")} />
          <div>
            <p className="font-medium">{t("returnDetail.createReceipt")}</p>
            <p className="text-muted-foreground">{new Date(receipt.createdAt).toLocaleString("vi-VN")}</p>
            <p className="text-muted-foreground">{receipt.createdByName}</p>
          </div>
        </div>
        <div className="w-6 border-t border-muted-foreground/30 mt-3" />
        <div className="flex items-center gap-2">
          <Circle className={cn("size-3 fill-current", receipt.status === RETURN_RECEIPT_STATUS.COMPLETED ? "text-green-500" : receipt.status === RETURN_RECEIPT_STATUS.CANCELLED ? "text-red-500" : "text-muted-foreground")} />
          <div>
            <p className="font-medium">{receipt.status === RETURN_RECEIPT_STATUS.CANCELLED ? t("returnStatus.cancelled") : t("returnDetail.approve")}</p>
            {receipt.approvedAt ? (
              <>
                <p className="text-muted-foreground">{new Date(receipt.approvedAt).toLocaleString("vi-VN")}</p>
                <p className="text-muted-foreground">{receipt.approvedByName}</p>
              </>
            ) : (
              <p className="text-muted-foreground italic">{receipt.status === RETURN_RECEIPT_STATUS.CANCELLED ? "" : t("returnStatus.pendingApproval")}</p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-lg border p-6 space-y-4">
        <div className="grid grid-cols-2 gap-6 text-sm">
          <div>
            <span className="text-muted-foreground">{t("label.customer")}</span>
            <p className="font-medium mt-0.5">{receipt.customerName ?? "—"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">{t("table.reason")}</span>
            <p className="font-medium mt-0.5">{reasonLabel[receipt.reason] ?? receipt.reason}</p>
          </div>
          <div>
            <span className="text-muted-foreground">{t("returnDetail.originalExport")}</span>
            <p className="font-mono text-xs mt-0.5">
              {receipt.originalExportReceiptId
                ? <a className="inline-flex items-center gap-1 text-blue-600 hover:underline cursor-pointer" onClick={() => navigate(`/stock/exports/${receipt.originalExportReceiptId}`)}>
                    <ExternalLink className="size-3" /> #{receipt.originalExportReceiptId}
                  </a>
                : "—"}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">{t("label.createdDate")}</span>
            <p className="mt-0.5">{new Date(receipt.createdAt).toLocaleString("vi-VN")}</p>
          </div>
          <div>
            <span className="text-muted-foreground">{t("label.creator")}</span>
            <p className="font-medium mt-0.5">{receipt.createdByName}</p>
          </div>
          {receipt.approvedByName && (
            <div>
              <span className="text-muted-foreground">{t("label.approver")}</span>
              <p className="font-medium mt-0.5">{receipt.approvedByName}</p>
            </div>
          )}
        </div>

        {receipt.note && (
          <div>
            <span className="text-sm text-muted-foreground">{t("returnDetail.note")}</span>
            <p className="mt-1 text-sm leading-relaxed rounded-md border bg-muted/20 px-4 py-3">{receipt.note}</p>
          </div>
        )}

        <Separator />
        <div className="space-y-2">
          <span className="text-sm font-medium">{t("returnDetail.returnProducts", { count: receipt.items.length })}</span>
          <div className="rounded-lg border divide-y text-sm">
            {receipt.items.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{item.productName ?? `Product #${item.productId}`}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.serialNumber && <span className="font-mono">{item.serialNumber}</span>}
                    {item.productSku && <span className="ml-2">SKU: {item.productSku}</span>}
                    <span className="ml-2">x{item.quantity}</span>
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {conditionLabel[item.condition] ?? item.condition}
                </Badge>
                <Badge className="text-[10px]">{actionLabel[item.resultingAction] ?? item.resultingAction}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <PrintReceiptButton id={receipt.id} type="return" label={t("returnDetail.print")} />
        {canCancel && (
          <Button variant="outline" className="text-destructive" onClick={() => setShowCancel(true)}>
            <X className="size-4 mr-1" /> {t("returnDetail.cancelReceipt")}
          </Button>
        )}
        {canApprove && (
          <Button onClick={() => setShowApprove(true)} disabled={approveMut.isPending}>
            <Check className="size-4 mr-1" /> {t("returnDetail.approve")}
          </Button>
        )}
      </div>

      <Dialog open={showApprove} onOpenChange={(v) => { if (!v) setShowApprove(false) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("returnDetail.approveDialogTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("returnDetail.approveDialogDesc", { code: receipt.receiptCode })}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprove(false)}>
              {t("dialog.back")}
            </Button>
            <Button onClick={() => { setShowApprove(false); approveMut.mutate() }} disabled={approveMut.isPending}>
              {approveMut.isPending ? t("returnDetail.approving") : t("dialog.approve")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showCancel}
        onOpenChange={(v) => {
          if (!v) setShowCancel(false)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("returnDetail.cancelDialogTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t("returnDetail.cancelDialogDesc")}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancel(false)}>
              {t("dialog.back")}
            </Button>
            <Button variant="destructive" onClick={() => { setShowCancel(false); cancelMut.mutate() }} disabled={cancelMut.isPending}>
              {cancelMut.isPending ? t("returnDetail.cancelling") : t("returnDetail.cancelConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
