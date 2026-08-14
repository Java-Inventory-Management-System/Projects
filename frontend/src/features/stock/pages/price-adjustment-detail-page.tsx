import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getPriceAdjustmentById,
  approvePriceAdjustment,
  rejectPriceAdjustment,
  cancelPriceAdjustment,
} from "@/services/price-adjustment-service"
import { usePermission } from "@/hooks/use-permission"
import { ADJUSTMENT_STATUS } from "@/utils/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Empty, EmptyTitle, EmptyDescription } from "@/components/ui/empty"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Check, X, Ban, Info } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Card, CardContent } from "@/components/ui/card"
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
import { toast } from "@/utils/toast"
import { useTranslation } from "react-i18next"
import { PriceHistoryPanel } from "@/features/stock/components/price-history-panel"

export function PriceAdjustmentDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const perm = usePermission()
  const [confirmAction, setConfirmAction] = useState<"approve" | "reject" | "cancel" | null>(null)
  const [approvalNote, setApprovalNote] = useState("")
  const [rejectReason, setRejectReason] = useState("")
  const [showConflictDialog, setShowConflictDialog] = useState(false)
  const [currentPrice, setCurrentPrice] = useState(0)

  const { data: adj, isLoading, isError } = useQuery({
    queryKey: ["price-adjustment", id],
    queryFn: () => getPriceAdjustmentById(Number(id)),
    enabled: !!id,
    retry: false,
  })

  const action = useMutation({
    mutationFn: async ({ action, reason }: { action: "approve" | "reject"; reason?: string }) => {
      if (action === "approve") return approvePriceAdjustment(Number(id), approvalNote || undefined)
      return rejectPriceAdjustment(Number(id), reason ?? "")
    },
    onSuccess: (_result, actionType) => {
      qc.invalidateQueries({ queryKey: ["price-adjustment", id] })
      qc.invalidateQueries({ queryKey: ["price-adjustments"] })
      qc.invalidateQueries({ queryKey: ["my-price-adjustments"] })
      const msg = actionType.action === "approve" ? t("priceAdjDetail.approveSuccess", { code: adj?.adjustCode }) : t("priceAdjDetail.rejectSuccess", { code: adj?.adjustCode })
      toast.success(msg)
      setConfirmAction(null)
      setApprovalNote("")
      setRejectReason("")
    },
    onError: (e: Error) => {
      const err = e as { code?: string; message?: string }
      if (err.code === 'PRICE_ADJ_PRICE_CHANGED') {
        setConfirmAction(null)
        setShowConflictDialog(true)
        setCurrentPrice(Number(err.message?.match(/[\d,]+/)?.[0] ?? 0))
      } else {
        toast.error(err.message || "")
        setConfirmAction(null)
      }
    },
  })

  const cancelMutation = useMutation({
    mutationFn: () => cancelPriceAdjustment(Number(id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["price-adjustment", id] })
      qc.invalidateQueries({ queryKey: ["price-adjustments"] })
      qc.invalidateQueries({ queryKey: ["my-price-adjustments"] })
      toast.success(t("priceAdjDetail.cancelSuccess", { code: adj?.adjustCode }))
      setConfirmAction(null)
    },
    onError: (e: Error) => {
      toast.error(e.message)
      setConfirmAction(null)
    },
  })

  const statusLabel: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    PENDING: { label: t("priceAdjStatus.pending"), variant: "outline" },
    APPROVED: { label: t("priceAdjStatus.approved"), variant: "default" },
    REJECTED: { label: t("priceAdjStatus.rejected"), variant: "destructive" },
    CANCELLED: { label: t("priceAdjStatus.cancelled"), variant: "secondary" },
  }

  if (isLoading)
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )

  if (isError || !adj)
    return (
      <Empty>
        <EmptyTitle>{t("priceAdjDetail.notFound")}</EmptyTitle>
        <EmptyDescription>
          {t("priceAdjDetail.notFoundDesc")}
        </EmptyDescription>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/stock/ops/price-adjustments")}>
          {t("priceAdjDetail.backToList")}
        </Button>
      </Empty>
    )

  const s = statusLabel[adj.status] ?? { label: adj.status, variant: "secondary" as const }
  const isManagerAdmin = perm.canApprove()
  const isOwn = adj.createdBy === perm.user?.id
  const canApprove = perm.canApprove(adj)
  const canCancel = isOwn && adj.status === ADJUSTMENT_STATUS.PENDING
  const showSelfBlock = !canApprove && isManagerAdmin && isOwn && adj.status === ADJUSTMENT_STATUS.PENDING
  const priceDiff = adj.newPrice - adj.oldPrice
  const priceDiffPct = adj.oldPrice > 0 ? ((priceDiff / adj.oldPrice) * 100).toFixed(1) : "0.0"

  return (
    <TooltipProvider>
    <div className="mx-auto max-w-6xl space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => navigate("/stock/ops/price-adjustments")}>{t("priceAdjDetail.breadcrumb")}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{adj.adjustCode}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight">{adj.adjustCode}</h1>
          <Badge variant={s.variant}>{s.label}</Badge>
        </div>
        <div className="flex gap-2">
          {canApprove ? (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0}>
                    <Button variant="outline" className="text-destructive" onClick={() => setConfirmAction("reject")}>
                      <X className="size-4 mr-1" /> {t("dialog.reject")}
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>{t("priceAdjDetail.rejectTooltip")}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0}>
                    <Button onClick={() => setConfirmAction("approve")}>
                      <Check className="size-4 mr-1" /> {t("priceAdjDetail.approve")}
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>{t("priceAdjDetail.approveTooltip")}</TooltipContent>
              </Tooltip>
            </>
          ) : showSelfBlock ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0}>
                  <Button variant="outline" disabled className="cursor-not-allowed">
                    <Check className="size-4 mr-1" /> {t("priceAdjDetail.approve")}
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>{t("priceAdjDetail.selfBlockTooltip")}</TooltipContent>
            </Tooltip>
          ) : null}
          {canCancel && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0}>
                  <Button variant="outline" className="text-destructive" onClick={() => setConfirmAction("cancel")}>
                    <Ban className="size-4 mr-1" /> {t("priceAdjDetail.cancel")}
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>{t("priceAdjDetail.cancelTooltip")}</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {showSelfBlock && (
        <Alert variant="default" className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20">
          <Info className="size-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-blue-800 text-sm dark:text-blue-300">
            {t("priceAdjDetail.selfBlockAlert")}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 items-start lg:grid-cols-[1fr_380px]">
      <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">{t("priceAdjDetail.product")}</span>
              <p className="font-medium">
                {adj.productName ?? "—"}{" "}
                {adj.productSku && <span className="text-muted-foreground">({adj.productSku})</span>}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">{t("priceAdjDetail.oldToNewPrice")}</span>
              <p className="font-medium">
                <span className="text-muted-foreground">{(adj.oldPrice ?? 0).toLocaleString("vi-VN")}₫</span>
                {" → "}
                <span className={priceDiff >= 0 ? "text-destructive" : "text-green-600"}>
                  {(adj.newPrice ?? 0).toLocaleString("vi-VN")}₫
                </span>
                <span className={`ml-1 text-xs font-medium ${priceDiff >= 0 ? "text-destructive" : "text-green-600"}`}>
                  ({priceDiff >= 0 ? "+" : ""}{priceDiffPct}%)
                </span>
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">{t("label.creator")}</span>
              <p className="font-medium">{adj.createdByName ?? "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">{t("label.createdDate")}</span>
              <p className="font-medium">
                {adj.createdAt ? new Date(adj.createdAt).toLocaleString("vi-VN") : "—"}
              </p>
            </div>
            {adj.approvedByName && (
              <div>
                <span className="text-muted-foreground">{t("label.approver")}</span>
                <p className="font-medium">{adj.approvedByName}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="text-sm">
            <span className="text-xs font-medium text-muted-foreground tracking-wide">{t("priceAdjDetail.reasonLabel")}</span>
            <p className="mt-1 whitespace-pre-wrap">{adj.reason}</p>
          </div>
        </CardContent>
      </Card>

      {adj.approvalNote && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm">
              <span className="text-xs font-medium text-muted-foreground tracking-wide">{t("priceAdjDetail.approvalNoteLabel")}</span>
              <p className="mt-1 whitespace-pre-wrap">{adj.approvalNote}</p>
            </div>
          </CardContent>
        </Card>
      )}
      </div>

      <aside className="lg:sticky lg:top-20">
        <PriceHistoryPanel productId={adj.productId} productName={adj.productName} />
      </aside>
      </div>

      {/* Approve Dialog */}
      <AlertDialog
        open={confirmAction === "approve"}
        onOpenChange={(v) => { if (!v) { setConfirmAction(null); setApprovalNote("") } }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("priceAdjDetail.approveDialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("priceAdjDetail.approveDialogDesc", { code: adj.adjustCode })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label>{t("form.noteOptional")}</Label>
            <Input
              value={approvalNote}
              onChange={(e) => setApprovalNote(e.target.value)}
              placeholder={t("priceAdjDetail.approvalNotePlaceholder")}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("dialog.no")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { setConfirmAction(null); action.mutate({ action: "approve" }) }}
              disabled={action.isPending}
            >
              {action.isPending ? t("dialog.processing") : t("dialog.approve")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <AlertDialog
        open={confirmAction === "reject"}
        onOpenChange={(v) => { if (!v) { setConfirmAction(null); setRejectReason("") } }}
      >
        <AlertDialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("priceAdjDetail.rejectDialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("priceAdjDetail.rejectDialogDesc", { code: adj.adjustCode })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label>
              {t("priceAdjDetail.rejectReason")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="reject-reason-input"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder={t("priceAdjDetail.rejectReasonPlaceholder")}
              autoFocus
            />
            {rejectReason.trim().length > 0 && rejectReason.trim().length < 5 && (
              <p className="text-xs text-destructive">{t("priceAdjDetail.rejectReasonMin")}</p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("dialog.no")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { setConfirmAction(null); action.mutate({ action: "reject", reason: rejectReason.trim() }) }}
              disabled={action.isPending || rejectReason.trim().length < 5}
            >
              {action.isPending ? t("dialog.processing") : t("priceAdjDetail.rejectConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Dialog */}
      <AlertDialog
        open={confirmAction === "cancel"}
        onOpenChange={(v) => { if (!v) setConfirmAction(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("priceAdjDetail.cancelDialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("priceAdjDetail.cancelDialogDesc", { code: adj.adjustCode })}
              {" "}{t("priceAdjDetail.cannotUndo")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("dialog.no")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { setConfirmAction(null); cancelMutation.mutate() }}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? t("priceAdjDetail.cancelProcessing") : t("priceAdjDetail.cancelConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Conflict Dialog */}
      <AlertDialog
        open={showConflictDialog}
        onOpenChange={(v) => { if (!v) {
          setShowConflictDialog(false)
          rejectPriceAdjustment(Number(id), t("priceAdjDetail.autoRejectReason")).catch(() => {})
        }}}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
        <AlertDialogTitle>{t("priceAdjDetail.conflictTitle")}</AlertDialogTitle>
        <AlertDialogDescription>
          {t("priceAdjDetail.conflictDesc")}
          {currentPrice > 0 && (
            <> {t("priceAdjDetail.conflictCurrentPrice")} <span className="font-semibold">{(currentPrice).toLocaleString("vi-VN")}₫</span></>
          )}
          <br />
          {t("priceAdjDetail.conflictNote")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowConflictDialog(false)}>{t("priceAdjDetail.close")}</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </TooltipProvider>
  )
}
