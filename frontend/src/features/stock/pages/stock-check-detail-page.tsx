import { useState, useCallback, useMemo, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate, useParams } from "react-router-dom"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  recordStockCheckItems,
  completeStockCheck,
  reopenStockCheck,
  cancelStockCheck,
  addExtraStockCheckItem,
  getStockCheckPrintHtml,
} from "@/services/stock-check-service"
import { useStockCheck, useStartStockCheck } from "@/hooks/use-stock-checks"
import { usePermission } from "@/hooks/use-permission"
import { invalidateDashboard } from "@/hooks/use-reports"
import { ROLES } from "@/utils/permissions"
import { AUTH_ENABLED } from "@/utils/http-client"
import { STOCK_CHECK_STATUS, STOCK_CHECK_DIFF, PRODUCT_UNIT_STATUS, TRACKING_TYPE, UNVERIFIED_STATUS, type StockCheckItem } from "@/utils/types"
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
import { AlertCircle, ClipboardCheck, RotateCcw, Ban, Play, Boxes, MoreHorizontal, Printer, CheckCircle2 } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/utils/cn"
import { toast } from "@/utils/toast"
import { StockCheckItemsTable } from "../components/stock-check-items-table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
} from "@/components/ui/alert-dialog"

export const StockCheckDetailPage = () => {
  const { t, i18n } = useTranslation()
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
  const [itemFilter, setItemFilter] = useState<"all" | "mismatch" | "untouched">("all")
  const [activeTab, setActiveTab] = useState("info")
  const [cancelDialog, setCancelDialog] = useState(false)
  const [completeModal, setCompleteModal] = useState(false)
  const [reopenDialog, setReopenDialog] = useState(false)

  const { data: check, isLoading } = useStockCheck(id ? Number(id) : null)

  useEffect(() => {
    if (check) setLocalItems(check.items)
  }, [check])

  const startMut = useStartStockCheck()

  const checkedCount = localItems.filter((i) => i.actualStatus != null && i.actualStatus !== UNVERIFIED_STATUS).length
  const untouchedCount = localItems.filter((i) => i.actualStatus == null).length
  const unverifiedCount = localItems.filter((i) => i.actualStatus === UNVERIFIED_STATUS).length
  const surplusCount = localItems.filter((i) => i.difference === STOCK_CHECK_DIFF.SURPLUS).length
  const bulkMissingCount = localItems.filter((i) => i.actualStatus == null && i.trackingType === TRACKING_TYPE.BULK && i.countedQuantity == null).length

  const itemsWithDiff = useMemo(() =>
    localItems.map((i) => {
      if (i.actualStatus == null || i.actualStatus === UNVERIFIED_STATUS) return i
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
    mutationFn: () => completeStockCheck(Number(id!)),
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

  const extraMut = useMutation({
    mutationFn: (data: { sku: string; serialNumber?: string; countedQuantity?: number; note?: string }) =>
      addExtraStockCheckItem(Number(id!), data),
    onSuccess: (res) => {
      setLocalItems(res.items)
      invalidateAll()
      toast.success(t("stockCheckDetail.extraSuccess"))
    },
    onError: (err: Error) => { throw err },
  })

  const handleStart = () => {
    startMut.mutate(Number(id!), {
      onSuccess: () => {
        invalidateAll()
        setActiveTab("results")
        toast.success(t("stockCheckDetail.startSuccess"))
      },
      onError: (err: Error) => toast.error(err.message || t("stockCheckDetail.startError")),
    })
  }

  const handlePrint = async () => {
    try {
      const html = await getStockCheckPrintHtml(Number(id!), i18n.language)
      const w = window.open("", "_blank")
      if (!w) return
      w.document.write(html)
      w.document.close()
    } catch {
      toast.error(t("print.printFailed"))
    }
  }

  const handleSaveAndComplete = async () => {
    if (bulkMissingCount > 0) {
      toast.error(t("stockCheckDetail.bulkMissing", { count: bulkMissingCount }))
      setCompleteModal(false)
      return
    }
    const items = localItems.map((i) => ({
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
        if (i.difference === STOCK_CHECK_DIFF.SURPLUS) return i
        if (status === PRODUCT_UNIT_STATUS.LOST) {
          return { ...i, actualStatus: status, countedQuantity: 0 }
        }
        return { ...i, actualStatus: status, countedQuantity: i.trackingType === TRACKING_TYPE.SERIALIZED ? 1 : i.countedQuantity }
      }),
    )
  }, [])

  const boxGroups = useMemo(() => {
    const groups = new Map<number, StockCheckItem[]>()
    for (const i of localItems) {
      if (i.boxId == null) continue
      const list = groups.get(i.boxId) ?? []
      list.push(i)
      groups.set(i.boxId, list)
    }
    return [...groups.entries()].map(([boxId, items]) => ({
      boxId,
      boxCode: items[0].boxCode ?? String(boxId),
      items,
      checked: items.filter((i) => i.actualStatus != null && i.actualStatus !== UNVERIFIED_STATUS).length,
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
  const canCancel = canOperateStock &&
    (check.status === STOCK_CHECK_STATUS.PENDING || check.status === STOCK_CHECK_STATUS.IN_PROGRESS) &&
    (!AUTH_ENABLED || (perm.user != null && check.createdBy != null && perm.user.id === check.createdBy))
  const canReopen = canOperateStock && (check.status === STOCK_CHECK_STATUS.COMPLETED || check.status === STOCK_CHECK_STATUS.EXPIRED)

  const summary = {
    missing: localItems.filter((i) => i.difference === STOCK_CHECK_DIFF.MISSING).length,
    unexpected: localItems.filter((i) => i.difference === STOCK_CHECK_DIFF.UNEXPECTED || i.difference === STOCK_CHECK_DIFF.PARTIAL_SHORTAGE).length,
    surplus: surplusCount,
    suspectSeal: localItems.filter((i) => i.suspectSeal).length,
    damagedPackaging: localItems.filter((i) => i.damagedPackaging).length,
  }

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

      {(check.status === STOCK_CHECK_STATUS.PENDING || canEdit) && (
        <div className="rounded-lg border bg-card px-4 py-3.5">
          {check.status === STOCK_CHECK_STATUS.PENDING ? (
            <div className="flex items-center gap-3">
              <AlertCircle className="size-5 text-muted-foreground shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">{t("stockCheckDetail.pendingBannerTitle")}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t("stockCheckDetail.pendingBannerDesc")}</p>
              </div>
              {canStart && (
                <Button onClick={handleStart} disabled={startMut.isPending}>
                  <Play className="size-4 mr-1" />
                  {startMut.isPending ? t("stockCheckDetail.starting") : t("stockCheckDetail.start")}
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <ClipboardCheck className="size-4" /> {t("stockCheckDetail.checkedProgress", { checked: checkedCount, total: check.totalItems })}
                </span>
                <span className="text-xs text-muted-foreground">
                  {check.totalItems > 0 ? Math.round((checkedCount / check.totalItems) * 100) : 0}%
                </span>
              </div>
              <Progress value={check.totalItems > 0 ? (checkedCount / check.totalItems) * 100 : 0} className="h-2" />
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant={s.variant}>{s.label}</Badge>
          {check.scopeType === "ZONE" && (
            <span className="text-xs text-muted-foreground">
              {t("stockCheckDetail.zone")} {check.scopeName ?? check.scopeId}
            </span>
          )}
          {check.shelfCodes && check.shelfCodes.length > 0 && (
            <span className="text-xs text-muted-foreground font-mono">
              {check.shelfCodes.join(", ")}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <Button onClick={() => setCompleteModal(true)} disabled={recordMut.isPending || completeMut.isPending}>
              <ClipboardCheck className="size-4 mr-1" />
              {completeMut.isPending ? t("stockCheckDetail.completing") : t("stockCheckDetail.complete")}
            </Button>
          )}
          {canReopen && (
            <AlertDialog open={reopenDialog} onOpenChange={setReopenDialog}>
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
              <Button variant="outline" onClick={() => setReopenDialog(true)} disabled={reopenMut.isPending}>
                <RotateCcw className="size-4 mr-1" />
                {reopenMut.isPending ? t("stockCheckDetail.starting") : t("stockCheckDetail.reopen")}
              </Button>
            </AlertDialog>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label={t("stockCheckDetail.moreActions")}>
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handlePrint}>
                <Printer className="size-3.5" /> {t("print.print")}
              </DropdownMenuItem>
              {canCancel && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setCancelDialog(true)}>
                    <Ban className="size-3.5" /> {t("stockCheckDetail.cancel")}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
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
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          {check.status === STOCK_CHECK_STATUS.PENDING ? (
            <div className="flex min-h-[30vh] items-center justify-center rounded-lg border">
              <Empty>
                <EmptyTitle>{t("stockCheckDetail.pendingEmpty")}</EmptyTitle>
              </Empty>
            </div>
          ) : (
            <>
              {boxGroups.length > 0 && (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {boxGroups.map((g) => {
                    const done = g.checked === g.items.length
                    return (
                      <div
                        key={g.boxId}
                        className={cn(
                          "rounded-lg border px-4 py-2.5 text-sm",
                          done && "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/10",
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Boxes className="size-4 text-muted-foreground shrink-0" />
                          <span className="font-mono text-xs">{g.boxCode}</span>
                          <Badge variant="outline" className={cn("text-[10px]", done && "border-green-300 text-green-700 dark:border-green-700 dark:text-green-400")}>
                            {done && <CheckCircle2 className="size-3 mr-0.5 inline" />}
                            {t("stockCheckDetail.checkedInBox", { checked: g.checked, total: g.items.length })}
                          </Badge>
                        </div>
                        <ul className="mt-2 space-y-1 border-t pt-2 max-h-40 overflow-y-auto">
                          {g.items.map((i) => {
                            const checked = i.actualStatus != null && i.actualStatus !== UNVERIFIED_STATUS
                            return (
                              <li key={i.id} className="flex items-center gap-1.5 text-xs">
                                {checked ? (
                                  <CheckCircle2 className="size-3 text-green-600 shrink-0 dark:text-green-400" />
                                ) : (
                                  <span className="size-2.5 rounded-full bg-amber-400 shrink-0" />
                                )}
                                <span className="font-mono truncate">{i.serialNumber || i.productSku || "—"}</span>
                                <span className="truncate text-muted-foreground">{i.productName}</span>
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    )
                  })}
                </div>
              )}
              <StockCheckItemsTable
                items={itemsWithDiff}
                canEdit={canEdit}
                onUpdate={updateItem}
                onBulkSet={handleBulkSet}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                filter={itemFilter}
                onFilterChange={setItemFilter}
                onAddExtra={(data) => extraMut.mutateAsync(data)}
                extraPending={extraMut.isPending}
              />
            </>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={completeModal} onOpenChange={setCompleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("stockCheckDetail.completeDialogTitle")}</DialogTitle>
            <DialogDescription className="space-y-2">
              {unverifiedCount > 0 && (
                <span className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 px-3 py-2 text-sm font-medium text-amber-700 dark:text-amber-400">
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  {t("stockCheckDetail.completeDialogUnverified", { count: unverifiedCount })}
                </span>
              )}
              {surplusCount > 0 && (
                <span className="flex items-start gap-2 rounded-md border border-green-200 bg-green-50 dark:bg-green-950/10 dark:border-green-800 px-3 py-2 text-sm text-green-700 dark:text-green-400">
                  <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
                  {t("stockCheckDetail.completeDialogSurplus", { count: surplusCount })}
                </span>
              )}
              <span className="block text-xs text-muted-foreground">{t("stockCheckDetail.completeDialogAdjustment")}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-2 text-center">
            <SummaryCell label={t("stockCheckDetail.sumChecked")} value={checkedCount} className="text-foreground" />
            <SummaryCell label={t("stockCheckDetail.sumMissing")} value={summary.missing} className="text-red-600 dark:text-red-400" />
            <SummaryCell label={t("stockCheckDetail.sumUnexpected")} value={summary.unexpected} className="text-blue-600 dark:text-blue-400" />
            <SummaryCell label={t("stockCheckDetail.sumSurplus")} value={summary.surplus} className="text-violet-600 dark:text-violet-400" />
            <SummaryCell label={t("stockCheckDetail.sumSuspectSeal")} value={summary.suspectSeal} className="text-amber-600 dark:text-amber-400" />
            <SummaryCell label={t("stockCheckDetail.sumDamagedPackaging")} value={summary.damagedPackaging} className="text-amber-600 dark:text-amber-400" />
          </div>
          <DialogFooter className="flex-wrap gap-2">
            <Button variant="outline" onClick={() => setCompleteModal(false)}>{t("common.cancel")}</Button>
            {untouchedCount > 0 && (
              <Button
                variant="outline"
                onClick={() => {
                  setCompleteModal(false)
                  setItemFilter("untouched")
                  setActiveTab("results")
                }}
              >
                {t("stockCheckDetail.viewUntouched", { count: untouchedCount })}
              </Button>
            )}
            <Button onClick={handleSaveAndComplete} disabled={completeMut.isPending}>
              {completeMut.isPending ? t("stockCheckDetail.completing") : t("stockCheckDetail.complete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={cancelDialog} onOpenChange={setCancelDialog}>
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
    </div>
  )
}

function SummaryCell({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 px-2 py-2">
      <p className={cn("text-lg font-semibold leading-none", className)}>{value}</p>
      <p className="mt-1 text-[10px] leading-tight text-muted-foreground">{label}</p>
    </div>
  )
}