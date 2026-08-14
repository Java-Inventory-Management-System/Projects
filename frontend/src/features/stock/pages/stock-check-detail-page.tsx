import { useState, useCallback, useMemo, useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate, useParams } from "react-router-dom"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  recordStockCheckItems,
  completeStockCheck,
  reopenStockCheck,
  cancelStockCheck,
} from "@/services/stock-check-service"
import { useStockCheck, useStartStockCheck } from "@/hooks/use-stock-checks"
import { usePermission } from "@/hooks/use-permission"
import { invalidateDashboard } from "@/hooks/use-reports"
import { ROLES } from "@/utils/permissions"
import { STOCK_CHECK_STATUS, STOCK_CHECK_DIFF, PRODUCT_UNIT_STATUS, TRACKING_TYPE, type StockCheckItem } from "@/utils/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Empty, EmptyTitle } from "@/components/ui/empty"
import { PrintReceiptButton } from "../components/print-receipt"
import { AlertCircle, CheckCircle2, ClipboardCheck, ListChecks, RotateCcw, Ban, Play, Boxes } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { ButtonGroup } from "@/components/ui/button-group"
import { cn } from "@/utils/cn"
import { toast } from "@/utils/toast"
import { StockCheckItemsTable } from "../components/stock-check-items-table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Checkbox } from "@/components/ui/checkbox"

export const StockCheckDetailPage = () => {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const statusLabel: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    PENDING: { label: t("status.pending"), variant: "secondary" },
    IN_PROGRESS: { label: t("status.inProgress"), variant: "outline" },
    COMPLETED: { label: t("status.completed"), variant: "default" },
    APPROVED: { label: t("status.approved"), variant: "default" },
    CANCELLED: { label: t("status.cancelled"), variant: "destructive" },
    EXPIRED: { label: t("status.expired"), variant: "outline" },
  }
  const navigate = useNavigate()
  const qc = useQueryClient()
  const perm = usePermission()

  const [localItems, setLocalItems] = useState<StockCheckItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [cancelDialog, setCancelDialog] = useState(false)
  const [completeModal, setCompleteModal] = useState(false)
  const [reopenDialog, setReopenDialog] = useState(false)
  const [confirmUntouched, setConfirmUntouched] = useState(false)
  const localSeqRef = useRef(-1)

  const { data: check, isLoading } = useStockCheck(id ? Number(id) : null)

  useEffect(() => {
    if (check) setLocalItems(check.items)
  }, [check])

  const startMut = useStartStockCheck()

  const checkedCount = localItems.filter((i) => i.actualStatus != null).length
  const untouchedCount = localItems.filter((i) => i.actualStatus == null).length
  const bulkMissingCount = localItems.filter((i) => i.actualStatus == null && i.trackingType === TRACKING_TYPE.BULK && i.countedQuantity == null).length

  const itemsWithDiff = useMemo(() =>
    localItems.map((i) => {
      if (i.localOnly) return i
      if (i.actualStatus == null) return i
      if (i.difference != null) return i
      if (i.trackingType !== TRACKING_TYPE.SERIALIZED) return i
      if (i.expectedStatus === i.actualStatus) return { ...i, difference: STOCK_CHECK_DIFF.MATCH }
      const lostLike: readonly string[] = [PRODUCT_UNIT_STATUS.LOST, PRODUCT_UNIT_STATUS.REMOVED, PRODUCT_UNIT_STATUS.DISPOSED]
      if (lostLike.includes(i.actualStatus)) return { ...i, difference: STOCK_CHECK_DIFF.MISSING }
      return { ...i, difference: STOCK_CHECK_DIFF.UNEXPECTED }
    }), [localItems])

  const recordMut = useMutation({
    mutationFn: (data: {
      items: Array<{ productUnitId: number; actualStatus?: string; countedQuantity?: number; note?: string; photo?: string; suspectSeal?: boolean; damagedPackaging?: boolean }>
    }) => recordStockCheckItems(Number(id!), data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-check", id] })
      qc.invalidateQueries({ queryKey: ["stock-checks"] })
      toast.success(t("stockCheckDetail.recordSuccess"))
    },
    onError: (err: Error) => toast.error(err.message || t("stockCheckDetail.recordError")),
  })

  const updateItem = useCallback((itemId: number, field: string, value: unknown) => {
    if (field === "__remove__") {
      setLocalItems((prev) => prev.filter((i) => i.id !== itemId))
      return
    }
    setLocalItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, [field]: value } : i)))
  }, [])

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["stock-check", id] })
    qc.invalidateQueries({ queryKey: ["stock-checks"] })
    qc.invalidateQueries({ queryKey: ["my-stock-checks"] })
    qc.invalidateQueries({ queryKey: ["stock-check-zone-status"] })
    qc.invalidateQueries({ queryKey: ["inventory"] })
    invalidateDashboard(qc)
  }

  const completeMut = useMutation({
    mutationFn: () => completeStockCheck(Number(id!), confirmUntouched),
    onSuccess: () => {
      invalidateAll()
      setCompleteModal(false)
      toast.success(t("stockCheckDetail.completeSuccess"))
      navigate("/stock/ops/checks")
    },
    onError: (err: Error) => toast.error(err.message || t("stockCheckDetail.completeError")),
  })

  const reopenMut = useMutation({
    mutationFn: () => reopenStockCheck(Number(id!)),
    onSuccess: () => {
      invalidateAll()
      setReopenDialog(false)
      toast.success(t("stockCheckDetail.reopenSuccess"))
    },
    onError: (err: Error) => toast.error(err.message || t("stockCheckDetail.reopenError")),
  })

  const cancelMut = useMutation({
    mutationFn: () => cancelStockCheck(Number(id!)),
    onSuccess: () => {
      invalidateAll()
      setCancelDialog(false)
      toast.success(t("stockCheckDetail.cancelSuccess"))
    },
    onError: (err: Error) => toast.error(err.message || t("stockCheckDetail.cancelError")),
  })

  const handleStart = () => {
    startMut.mutate(Number(id!), {
      onSuccess: () => {
        invalidateAll()
        toast.success(t("stockCheckDetail.startSuccess"))
      },
      onError: (err: Error) => toast.error(err.message || t("stockCheckDetail.startError")),
    })
  }

  const handleSaveAndComplete = async () => {
    if (bulkMissingCount > 0) {
      toast.error(t("stockCheckDetail.bulkMissing", { count: bulkMissingCount }))
      setCompleteModal(false)
      return
    }
    const items = localItems
      .filter((i) => !i.localOnly)
      .map((i) => ({
        productUnitId: i.productUnitId,
        actualStatus: i.actualStatus ?? undefined,
        countedQuantity: i.countedQuantity ?? undefined,
        note: i.note || undefined,
        photo: i.photo || undefined,
        suspectSeal: i.suspectSeal ?? undefined,
        damagedPackaging: i.damagedPackaging ?? undefined,
      }))
    try {
      await recordMut.mutateAsync({ items })
      completeMut.mutate()
    } catch {
      /* toast handled by mutation */
    }
  }

  const handleBulkSet = useCallback((status: string) => {
    setLocalItems((prev) =>
      prev.map((i) => {
        if (i.localOnly) return i
        if (i.actualStatus != null) return i
        if (status === PRODUCT_UNIT_STATUS.LOST) {
          return { ...i, actualStatus: status, countedQuantity: 0 }
        }
        return { ...i, actualStatus: status, countedQuantity: i.trackingType === TRACKING_TYPE.SERIALIZED ? 1 : i.countedQuantity }
      }),
    )
  }, [])

  const handleAddUnexpected = useCallback(() => {
    const n = localSeqRef.current--
    setLocalItems((prev) => [
      ...prev,
      {
        id: n,
        productUnitId: n,
        serialNumber: "",
        productId: 0,
        productName: t("stockCheckItems.extraItem"),
        productSku: null,
        trackingType: "SERIALIZED",
        boxId: null,
        boxCode: null,
        expectedStatus: null,
        actualStatus: PRODUCT_UNIT_STATUS.IN_STOCK,
        countedQuantity: 1,
        difference: STOCK_CHECK_DIFF.UNEXPECTED,
        note: null,
        photo: null,
        autoFilled: false,
        suspectSeal: null,
        damagedPackaging: null,
        touchedAt: null,
        localOnly: true,
      },
    ])
  }, [t])

  const boxGroups = useMemo(() => {
    const groups = new Map<number, StockCheckItem[]>()
    for (const i of localItems) {
      if (i.localOnly || i.boxId == null) continue
      const list = groups.get(i.boxId) ?? []
      list.push(i)
      groups.set(i.boxId, list)
    }
    return [...groups.entries()].map(([boxId, items]) => ({
      boxId,
      boxCode: items[0].boxCode ?? String(boxId),
      items,
      checked: items.filter((i) => i.actualStatus != null).length,
      pendingCount: items.filter((i) => i.actualStatus == null).length,
    }))
  }, [localItems])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!check) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Empty>
          <EmptyTitle>{t("stockCheckDetail.notFound")}</EmptyTitle>
        </Empty>
      </div>
    )
  }

  const s = statusLabel[check.status] ?? { label: check.status, variant: "secondary" }
  const canOperateStock = perm.hasRole(...ROLES.CAN_OPERATE_STOCK)
  const canEdit = canOperateStock && check.status === STOCK_CHECK_STATUS.IN_PROGRESS
  const canStart = canOperateStock && check.status === STOCK_CHECK_STATUS.PENDING
  const canCancel = canOperateStock && (check.status === STOCK_CHECK_STATUS.PENDING || check.status === STOCK_CHECK_STATUS.IN_PROGRESS)

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => navigate("/stock/ops/checks")}>{t("nav.stockChecks")}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{check.checkCode}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {check.status === STOCK_CHECK_STATUS.PENDING && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 px-4 py-3 text-sm">
          <ListChecks className="size-5 text-amber-600 shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-amber-700 dark:text-amber-400">{t("stockCheckDetail.pendingBannerTitle")}</p>
            <p className="text-amber-600 dark:text-amber-300 mt-0.5">{t("stockCheckDetail.pendingBannerDesc")}</p>
          </div>
          {canStart && (
            <Button onClick={handleStart} disabled={startMut.isPending}>
              <Play className="size-4 mr-1" />
              {startMut.isPending ? t("stockCheckDetail.starting") : t("stockCheckDetail.start")}
            </Button>
          )}
        </div>
      )}

      {canEdit && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <ListChecks className="size-4" /> {t("stockCheckDetail.checkedProgress", { checked: checkedCount, total: check.totalItems })}
            </span>
            <span className="text-xs text-muted-foreground">
              {check.totalItems > 0 ? Math.round((checkedCount / check.totalItems) * 100) : 0}%
            </span>
          </div>
          <Progress value={check.totalItems > 0 ? (checkedCount / check.totalItems) * 100 : 0} className="h-2" />
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant={s.variant}>{s.label}</Badge>
          {check.binFrom || check.binTo ? (
            <span className="text-xs text-muted-foreground font-mono">
              {check.binFrom ?? "—"} – {check.binTo ?? "—"}
            </span>
          ) : null}
        </div>
        <div className="flex gap-2">
          <PrintReceiptButton id={check.id} type="stock-check" />
          {canEdit && (
            <ButtonGroup>
              <Button onClick={() => setCompleteModal(true)} disabled={recordMut.isPending || completeMut.isPending}>
                <ClipboardCheck className="size-4 mr-1" />
                {completeMut.isPending ? t("stockCheckDetail.completing") : t("stockCheckDetail.complete")}
              </Button>
            </ButtonGroup>
          )}
          {canOperateStock &&
            (check.status === STOCK_CHECK_STATUS.COMPLETED || check.status === STOCK_CHECK_STATUS.EXPIRED) && (
              <AlertDialog open={reopenDialog} onOpenChange={setReopenDialog}>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" disabled={reopenMut.isPending}>
                    <RotateCcw className="size-4 mr-1" />
                    {reopenMut.isPending ? t("stockCheckDetail.starting") : t("stockCheckDetail.reopen")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("stockCheckDetail.reopenConfirmTitle")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("stockCheckDetail.reopenConfirmDesc")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                    <AlertDialogAction onClick={() => reopenMut.mutate()}>{t("stockCheckDetail.reopenConfirm")}</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          {canCancel && (
            <AlertDialog open={cancelDialog} onOpenChange={setCancelDialog}>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-destructive hover:text-destructive">
                  <Ban className="size-4 mr-1" /> {t("stockCheckDetail.cancel")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("stockCheckDetail.cancelConfirmTitle")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("stockCheckDetail.cancelConfirmDesc")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-white hover:bg-destructive/90"
                    onClick={() => cancelMut.mutate()}
                  >
                    {cancelMut.isPending ? t("stockCheckDetail.cancelling") : t("stockCheckDetail.cancelConfirm")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {itemsWithDiff.some((i) => i.difference && i.difference !== STOCK_CHECK_DIFF.MATCH) && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{t("stockCheckDetail.diffSummary")}</p>
          <div className="grid gap-2">
            {itemsWithDiff
              .filter((i) => i.difference && i.difference !== STOCK_CHECK_DIFF.MATCH)
              .slice(0, 10)
              .map((i) => (
                <div
                  key={i.id}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm",
                    i.difference === STOCK_CHECK_DIFF.MISSING && "border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800",
                    i.difference === STOCK_CHECK_DIFF.UNEXPECTED && "border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800",
                  )}
                >
                  {i.difference === STOCK_CHECK_DIFF.MISSING ? (
                    <AlertCircle className="size-4 text-red-500 shrink-0" />
                  ) : (
                    <CheckCircle2 className="size-4 text-blue-500 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{i.productName}</span>
                    {i.serialNumber && <span className="text-xs text-muted-foreground ml-1 font-mono">{i.serialNumber}</span>}
                    {i.boxCode && <span className="text-[10px] ml-1.5 px-1.5 py-0.5 rounded bg-muted font-mono">{i.boxCode}</span>}
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] shrink-0",
                      i.difference === STOCK_CHECK_DIFF.MISSING && "border-red-200 text-red-600",
                      i.difference === STOCK_CHECK_DIFF.UNEXPECTED && "border-blue-200 text-blue-600",
                    )}
                  >
                    {i.difference === STOCK_CHECK_DIFF.MISSING ? t("stockCheckDetail.diffMissing") : t("stockCheckDetail.diffUnexpected")}
                  </Badge>
                </div>
              ))}
          </div>
        </div>
      )}

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">{t("stockCheckDetail.tabInfo")}</TabsTrigger>
          <TabsTrigger value="results">{t("stockCheckDetail.tabResults")}</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">{t("label.creator")}</span>
              <p className="font-medium">{check.createdByName}</p>
            </div>
            <div>
              <span className="text-muted-foreground">{t("label.createdDate")}</span>
              <p className="font-medium">{new Date(check.createdAt).toLocaleString("vi-VN")}</p>
            </div>
            {check.scopeType && (
              <div>
                <span className="text-muted-foreground">{t("stockCheckDetail.scope")}</span>
                <p className="font-medium">
                  {check.scopeType === "ZONE"
                    ? `${t("stockCheckDetail.zone")} ${check.scopeName ?? check.scopeId}`
                    : check.scopeType === "BOX"
                      ? `${t("stockCheckDetail.box")} ${check.scopeName ?? check.scopeId}`
                      : `${t("stockCheckDetail.category")} #${check.scopeId}`}
                </p>
              </div>
            )}
            {check.checkedByName && (
              <div>
                <span className="text-muted-foreground">{t("stockCheckDetail.checkedBy")}</span>
                <p className="font-medium">{check.checkedByName}</p>
              </div>
            )}
            {check.enteredByName && (
              <div>
                <span className="text-muted-foreground">{t("stockCheckDetail.enteredBy")}</span>
                <p className="font-medium">{check.enteredByName}</p>
              </div>
            )}
            {check.approvedByName && (
              <div>
                <span className="text-muted-foreground">{t("label.approver")}</span>
                <p className="font-medium">{check.approvedByName}</p>
              </div>
            )}
            {check.approvalNote && (
              <div>
                <span className="text-muted-foreground">{t("stockCheckDetail.approvalNote")}</span>
                <p className="font-medium">{check.approvalNote}</p>
              </div>
            )}
            {check.note && (
              <div className="col-span-2">
                <span className="text-muted-foreground">{t("label.note")}</span>
                <p className="mt-1 text-sm leading-relaxed rounded-md border bg-muted/20 px-3 py-2">{check.note}</p>
              </div>
            )}
          </div>
          <div className="flex gap-3 text-sm">
            <Badge variant="outline">{t("stockCheckDetail.total", { count: check.totalItems })}</Badge>
            <Badge variant="secondary">{t("stockCheckDetail.match", { count: check.matchCount })}</Badge>
            <Badge variant="outline" className="text-destructive">
              {t("stockCheckDetail.missing", { count: check.missingCount })}
            </Badge>
            <Badge variant="outline" className="text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700">
              {t("stockCheckDetail.unexpected", { count: check.unexpectedCount })}
            </Badge>
          </div>
        </TabsContent>

        <TabsContent value="results">
          {boxGroups.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">{t("stockCheckDetail.boxesTitle")}</p>
              <div className="grid gap-2">
                {boxGroups.map((g) => (
                  <div
                    key={g.boxId}
                    className="flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm"
                  >
                    <Boxes className="size-4 text-muted-foreground shrink-0" />
                    <span className="font-mono text-xs">{g.boxCode}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {t("stockCheckDetail.checkedInBox", { checked: g.checked, total: g.items.length })}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
          <StockCheckItemsTable
            items={itemsWithDiff}
            canEdit={canEdit}
            onUpdate={updateItem}
            onBulkSet={handleBulkSet}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onAddUnexpected={handleAddUnexpected}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={completeModal} onOpenChange={setCompleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("stockCheckDetail.completeDialogTitle")}</DialogTitle>
            <DialogDescription>
              {untouchedCount > 0 && (
                <span className="block text-amber-600 dark:text-amber-400 font-medium">
                  {t("stockCheckDetail.completeDialogUntouched", { count: untouchedCount })}
                </span>
              )}
              <span className="block">{t("stockCheckDetail.completeDialogAdjustment")}</span>
            </DialogDescription>
          </DialogHeader>
          {untouchedCount > 0 && (
            <label className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 px-3 py-2.5 text-sm cursor-pointer">
              <Checkbox
                checked={confirmUntouched}
                onCheckedChange={(v) => setConfirmUntouched(v === true)}
                className="mt-0.5"
              />
              <span className="text-amber-700 dark:text-amber-300">{t("stockCheckDetail.completeDialogUntouchedConfirm")}</span>
            </label>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteModal(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleSaveAndComplete} disabled={completeMut.isPending || (untouchedCount > 0 && !confirmUntouched)}>
              {completeMut.isPending ? t("stockCheckDetail.completing") : t("stockCheckDetail.complete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}