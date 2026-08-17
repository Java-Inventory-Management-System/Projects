import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getStockAdjustmentById,
  approveStockAdjustment,
  rejectStockAdjustment,
  cancelStockAdjustment,
} from "@/services/stock-adjustment-service"
import { usePermission } from "@/hooks/use-permission"
import { invalidateDashboard } from "@/hooks/use-reports"
import { ADJUSTMENT_STATUS, ADJUSTMENT_TYPE } from "@/utils/types"
import { ROLES } from "@/utils/permissions"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Empty, EmptyTitle } from "@/components/ui/empty"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ButtonGroup } from "@/components/ui/button-group"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Check, X, Ban } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/utils/toast"
import { useTranslation } from "react-i18next"

export const StockAdjustmentDetailPage = () => {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const perm = usePermission()

  const [approvalAction, setApprovalAction] = useState<"approve" | "reject" | "cancel" | null>(null)
  const [approvalNote, setApprovalNote] = useState("")

  const { data: adj, isLoading } = useQuery({
    queryKey: ["stock-adjustment", id],
    queryFn: () => getStockAdjustmentById(Number(id)),
    enabled: !!id,
  })

  const approveMut = useMutation({
    mutationFn: () => approveStockAdjustment(Number(id!), approvalNote || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-adjustment", id] })
      qc.invalidateQueries({ queryKey: ["stock-adjustments"] })
      qc.invalidateQueries({ queryKey: ["my-stock-adjustments"] })
      qc.invalidateQueries({ queryKey: ["work-queue"] })
      qc.invalidateQueries({ queryKey: ["inventory"] })
      invalidateDashboard(qc)
      setApprovalAction(null)
      setApprovalNote("")
      toast.success(t("stockAdjDetail.approveSuccess"))
    },
    onError: (err: Error) => toast.error(err.message || t("stockAdjDetail.approveFail")),
  })

  const rejectMut = useMutation({
    mutationFn: () => rejectStockAdjustment(Number(id!), approvalNote || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-adjustment", id] })
      qc.invalidateQueries({ queryKey: ["stock-adjustments"] })
      qc.invalidateQueries({ queryKey: ["my-stock-adjustments"] })
      qc.invalidateQueries({ queryKey: ["work-queue"] })
      setApprovalAction(null)
      setApprovalNote("")
      toast.success(t("stockAdjDetail.rejectSuccess"))
    },
    onError: (err: Error) => toast.error(err.message || t("stockAdjDetail.rejectFail")),
  })

  const cancelMut = useMutation({
    mutationFn: () => cancelStockAdjustment(Number(id!)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-adjustment", id] })
      qc.invalidateQueries({ queryKey: ["stock-adjustments"] })
      qc.invalidateQueries({ queryKey: ["my-stock-adjustments"] })
      qc.invalidateQueries({ queryKey: ["work-queue"] })
      setApprovalAction(null)
      toast.success(t("stockAdjDetail.cancelSuccess"))
    },
    onError: (err: Error) => toast.error(err.message || t("stockAdjDetail.cancelFail")),
  })

  const typeLabel: Record<string, string> = { [ADJUSTMENT_TYPE.DAMAGED]: t("adjustmentType.damaged"), [ADJUSTMENT_TYPE.LOST]: t("adjustmentType.lost"), [ADJUSTMENT_TYPE.FOUND]: t("adjustmentType.found") }
  const typeColor: Record<string, "destructive" | "outline" | "default"> = {
    [ADJUSTMENT_TYPE.DAMAGED]: "destructive",
    [ADJUSTMENT_TYPE.LOST]: "destructive",
    [ADJUSTMENT_TYPE.FOUND]: "default",
  }
  const statusLabel: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    [ADJUSTMENT_STATUS.PENDING]: { label: t("status.pending"), variant: "secondary" },
    [ADJUSTMENT_STATUS.APPROVED]: { label: t("status.approved"), variant: "default" },
    [ADJUSTMENT_STATUS.REJECTED]: { label: t("status.rejected"), variant: "destructive" },
    [ADJUSTMENT_STATUS.CANCELLED]: { label: t("status.cancelled"), variant: "outline" },
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!adj) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Empty>
          <EmptyTitle>{t("stockAdjDetail.notFound")}</EmptyTitle>
        </Empty>
      </div>
    )
  }

  const st = statusLabel[adj.status] ?? { label: adj.status, variant: "secondary" }
  // MANAGER/ADMIN: approve/reject adjustments
  const isManager = perm.hasRole(...ROLES.CAN_APPROVE)
  const canApprove = adj.status === ADJUSTMENT_STATUS.PENDING && isManager && adj.createdBy !== perm.user?.id
  const canCancel = adj.status === ADJUSTMENT_STATUS.PENDING && adj.createdBy === perm.user?.id

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => navigate("/stock/ops/adjustments")}>{t("stockAdjDetail.breadcrumb")}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{adj.adjustCode}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex items-center gap-3">
        <Badge variant={typeColor[adj.type] ?? "outline"}>{typeLabel[adj.type] ?? adj.type}</Badge>
        <Badge variant={st.variant}>{st.label}</Badge>
      </div>

      <div className="rounded-lg border p-4 sm:p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 text-sm">
          <div>
            <span className="text-muted-foreground">{t("table.product")}</span>
            <p className="font-medium text-base mt-0.5">{adj.productName ?? "—"}</p>
            {adj.productSku && <p className="text-xs text-muted-foreground">{adj.productSku}</p>}
          </div>
          {adj.serialNumber && (
            <div>
              <span className="text-muted-foreground">{t("table.serial")}</span>
              <p className="font-mono text-sm mt-0.5">{adj.serialNumber}</p>
            </div>
          )}
          {adj.quantity && (
            <div>
              <span className="text-muted-foreground">{t("table.quantity")}</span>
              <p className="font-medium mt-0.5">{adj.quantity}</p>
            </div>
          )}
          {adj.imageUrl && (
            <div>
              <span className="text-muted-foreground">{t("stockAdjDetail.evidenceImages")}</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {adj.imageUrl.split(",").filter(Boolean).map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block size-20 rounded-lg overflow-hidden border"
                  >
                    <img src={url} alt={`evidence ${i}`} className="size-full object-cover hover:opacity-80 transition-opacity" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <span className="text-sm text-muted-foreground">{t("table.reason")}</span>
          <p className="mt-1 text-sm leading-relaxed rounded-md border bg-muted/20 px-4 py-3">{adj.reason}</p>
        </div>

        <Separator />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 text-sm pt-4">
          <div>
            <span className="text-muted-foreground">{t("label.creator")}</span>
            <p className="font-medium mt-0.5">{adj.createdByName}</p>
          </div>
          <div>
            <span className="text-muted-foreground">{t("label.createdDate")}</span>
            <p className="mt-0.5">{new Date(adj.createdAt).toLocaleString("vi-VN")}</p>
          </div>
          {adj.approvedByName && (
            <>
              <div>
                <span className="text-muted-foreground">{t("label.approver")}</span>
                <p className="font-medium mt-0.5">{adj.approvedByName}</p>
              </div>
              <div>
                <span className="text-muted-foreground">{t("stockAdjDetail.approvedDate")}</span>
                <p className="mt-0.5">{new Date(adj.approvedAt ?? adj.updatedAt).toLocaleString("vi-VN")}</p>
              </div>
            </>
          )}
          {adj.approvalNote && (
            <div className="col-span-2">
              <span className="text-muted-foreground">{t("stockAdjDetail.approvalNote")}</span>
              <p className="mt-1 text-sm leading-relaxed rounded-md border bg-muted/20 px-3 py-2">{adj.approvalNote}</p>
            </div>
          )}
        </div>
      </div>

      {canApprove && (
        <div className="flex justify-end">
          <ButtonGroup>
            <Button variant="outline" onClick={() => setApprovalAction("reject")}>
              <X className="size-4 mr-1" /> {t("dialog.reject")}
            </Button>
            <Button onClick={() => setApprovalAction("approve")}>
              <Check className="size-4 mr-1" /> {t("stockAdjDetail.approve")}
            </Button>
          </ButtonGroup>
        </div>
      )}
      {canCancel && (
        <div className="flex justify-end">
          <Button variant="outline" className="text-destructive" onClick={() => setApprovalAction("cancel")}>
            <Ban className="size-4 mr-1" /> {t("stockAdjDetail.cancel")}
          </Button>
        </div>
      )}

      <Dialog
        open={!!approvalAction}
        onOpenChange={(v) => {
          if (!v) {
            setApprovalAction(null)
            setApprovalNote("")
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {approvalAction === "approve" ? t("stockAdjDetail.approveDialogTitle")
                : approvalAction === "reject" ? t("stockAdjDetail.rejectDialogTitle")
                : t("stockAdjDetail.cancelDialogTitle")}
            </DialogTitle>
            {approvalAction === "cancel" && (
              <p className="text-sm text-muted-foreground">{t("stockAdjDetail.cancelDialogDesc", { code: adj.adjustCode })}</p>
            )}
          </DialogHeader>
          {approvalAction !== "cancel" && (
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">{t("form.noteOptional")}</label>
              <Textarea
                value={approvalNote}
                onChange={(e) => setApprovalNote(e.target.value)}
                placeholder={t("stockAdjDetail.notePlaceholder")}
                rows={3}
              />
            </div>
          </ScrollArea>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setApprovalAction(null)
                setApprovalNote("")
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => {
                if (approvalAction === "approve") approveMut.mutate()
                else if (approvalAction === "reject") rejectMut.mutate()
                else if (approvalAction === "cancel") cancelMut.mutate()
              }}
              disabled={approveMut.isPending || rejectMut.isPending || cancelMut.isPending}
              variant={approvalAction === "reject" || approvalAction === "cancel" ? "destructive" : "default"}
            >
              {approvalAction === "approve" ? t("dialog.approve")
                : approvalAction === "reject" ? t("stockAdjDetail.rejectConfirm")
                : t("stockAdjDetail.cancelConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
