import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate, useParams } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getStockCheckById,
  recordStockCheckItems,
  completeStockCheck,
  startStockCheck,
  cancelStockCheck,
} from "@/services/stock-check-service"
import { usePermission } from "@/hooks/use-permission"
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
import { AlertCircle, CheckCircle2, HelpCircle, Save, ClipboardCheck, ListChecks, AlertTriangle, RotateCcw, Play, Ban } from "lucide-react"
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
import { saveDraft, loadDraft, deleteDraft } from "@/utils/indexed-db"
import { getBoxById, sealBox } from "@/services/box-service"
import { Label } from "@/components/ui/label"
import { LocationPicker } from "../components/location-picker"
import { Textarea } from "@/components/ui/textarea"
import { Boxes, PackageCheck } from "lucide-react"

export const StockCheckDetailPage = () => {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const statusLabel: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    PENDING: { label: t("status.pending"), variant: "secondary" },
    IN_PROGRESS: { label: t("status.inProgress"), variant: "outline" },
    COMPLETED: { label: t("status.completed"), variant: "default" },
    APPROVED: { label: t("status.approved"), variant: "default" },
    CANCELLED: { label: t("status.cancelled"), variant: "destructive" },
  }
  const navigate = useNavigate()
  const qc = useQueryClient()
  const perm = usePermission()

  const [localItems, setLocalItems] = useState<StockCheckItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [cancelDialog, setCancelDialog] = useState(false)
  const [completeModal, setCompleteModal] = useState(false)
  const [resetDialog, setResetDialog] = useState(false)
  const [sealTarget, setSealTarget] = useState<StockCheckItem | null>(null)
  const dirtyRef = useRef(false)
  const initialItemsRef = useRef<StockCheckItem[]>([])

  const { data: check, isLoading } = useQuery({
    queryKey: ["stock-check", id],
    queryFn: () => getStockCheckById(Number(id)),
    enabled: !!id,
  })

  // Load from BE, then overlay IndexedDB draft if available
  useEffect(() => {
    if (!check || initialItemsRef.current.length > 0) return
    initialItemsRef.current = check.items
    dirtyRef.current = false
    if (check.status === STOCK_CHECK_STATUS.PENDING || check.status === STOCK_CHECK_STATUS.IN_PROGRESS) {
      loadDraft(id!).then((draft) => {
        setLocalItems(draft ? draft.items : check.items)
      })
    } else {
      setLocalItems(check.items)
    }
  }, [check, id])

  const checkedCount = localItems.filter((i) => i.actualStatus != null).length
  const autoFillCount = localItems.filter((i) => i.actualStatus == null && i.trackingType === TRACKING_TYPE.SERIALIZED).length
  const bulkMissingCount = localItems.filter((i) => i.actualStatus == null && i.trackingType === TRACKING_TYPE.BULK && i.countedQuantity == null).length

  const itemsWithDiff = useMemo(() =>
    localItems.map((i) => {
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
      items: Array<{ productUnitId: number; actualStatus?: string; countedQuantity?: number; note?: string; photo?: string }>
    }) => recordStockCheckItems(Number(id!), data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-check", id] })
      qc.invalidateQueries({ queryKey: ["stock-checks"] })
      toast.success(t("stockCheckDetail.recordSuccess"))
    },
    onError: (err: Error) => toast.error(err.message || t("stockCheckDetail.recordError")),
  })

  // Auto-save to IndexedDB when dirty (debounced 1.5s)
  useEffect(() => {
    if (!dirtyRef.current || !id) return
    const timer = setTimeout(() => {
      saveDraft(id, localItems)
      dirtyRef.current = false
    }, 1500)
    return () => clearTimeout(timer)
  }, [localItems, id])

  const updateItem = useCallback((itemId: number, field: string, value: unknown) => {
    dirtyRef.current = true
    setLocalItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, [field]: value } : i)))
  }, [])

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["stock-check", id] })
    qc.invalidateQueries({ queryKey: ["stock-checks"] })
    qc.invalidateQueries({ queryKey: ["inventory"] })
    qc.invalidateQueries({ queryKey: ["inventory-summary"] })
  }

  const completeMut = useMutation({
    mutationFn: () => completeStockCheck(Number(id!)),
    onSuccess: (res) => {
      invalidateAll()
      deleteDraft(id!)
      setCompleteModal(false)
      const filled = res.autoFilledCount
      if (filled > 0) {
        toast.success(t("stockCheckDetail.completeAutoFill", { count: filled }))
      } else {
        toast.success(t("stockCheckDetail.completeSuccess"))
      }
      navigate("/stock/ops/checks")
    },
    onError: (err: Error) => toast.error(err.message || t("stockCheckDetail.completeError")),
  })

  const startMut = useMutation({
    mutationFn: () => startStockCheck(Number(id!)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-check", id] })
      toast.success(t("stockCheckDetail.startSuccess"))
    },
    onError: (err: Error) => toast.error(err.message || t("stockCheckDetail.startError")),
  })

  const cancelMut = useMutation({
    mutationFn: () => cancelStockCheck(Number(id!)),
    onSuccess: () => {
      invalidateAll()
      deleteDraft(id!)
      setCancelDialog(false)
      toast.success(t("stockCheckDetail.cancelSuccess"))
    },
    onError: (err: Error) => toast.error(err.message || t("stockCheckDetail.cancelError")),
  })

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
    }))
    try {
      await recordMut.mutateAsync({ items })
      completeMut.mutate()
    } catch {
      /* toast handled by mutation */
    }
  }

  const handleBulkSet = useCallback((status: string) => {
    dirtyRef.current = true
    setLocalItems((prev) =>
      prev.map((i) => {
        if (i.actualStatus != null) return i
        if (status === PRODUCT_UNIT_STATUS.LOST) {
          return { ...i, actualStatus: status, countedQuantity: 0 }
        }
        return { ...i, actualStatus: status, countedQuantity: i.trackingType === TRACKING_TYPE.SERIALIZED ? 1 : i.countedQuantity }
      }),
    )
  }, [])

  const handleSave = useCallback(() => {
    if (!id) return
    saveDraft(id, localItems)
    dirtyRef.current = false
    toast.success(t("stockCheckDetail.saveDraftSuccess"))
  }, [id, localItems, t])

  const handleReset = useCallback(() => {
    setLocalItems(initialItemsRef.current.map((i) => ({ ...i })))
    if (id) deleteDraft(id)
    dirtyRef.current = false
    setResetDialog(false)
    toast.success(t("stockCheckDetail.resetSuccess"))
  }, [id, t])

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
      checked: items.filter((i) => i.actualStatus != null).length,
      pendingCount: items.filter((i) => i.actualStatus == null).length,
    }))
  }, [localItems])

  const confirmWholeBox = useCallback(async (boxId: number) => {
    dirtyRef.current = true
    const bulkItems = localItems.filter((i) => i.boxId === boxId && i.trackingType === TRACKING_TYPE.BULK)
    let bulkQty: number | null = null
    if (bulkItems.length === 1) {
      const box = await getBoxById(boxId)
      bulkQty = box.sealedQuantity
    }
    setLocalItems((prev) =>
      prev.map((i) => {
        if (i.boxId !== boxId || i.actualStatus != null) return i
if (i.trackingType === TRACKING_TYPE.BULK) return { ...i, actualStatus: i.expectedStatus ?? PRODUCT_UNIT_STATUS.IN_STOCK, countedQuantity: bulkQty }
  return { ...i, actualStatus: i.expectedStatus ?? PRODUCT_UNIT_STATUS.IN_STOCK, countedQuantity: 1 }
      }),
    )
  }, [localItems])

  const sealMut = useMutation({
    mutationFn: sealBox,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-check", id] })
      qc.invalidateQueries({ queryKey: ["boxes"] })
      qc.invalidateQueries({ queryKey: ["product-units"] })
      setSealTarget(null)
      toast.success(t("box.sealSuccess"))
    },
    onError: (err: Error) => toast.error(err.message || t("box.error")),
  })

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
  const canEdit = canOperateStock && (check.status === STOCK_CHECK_STATUS.PENDING || check.status === STOCK_CHECK_STATUS.IN_PROGRESS)
  const canCancel = canOperateStock && (check.status === STOCK_CHECK_STATUS.PENDING || check.status === STOCK_CHECK_STATUS.IN_PROGRESS)
  const isRejectedBanner = check.status === STOCK_CHECK_STATUS.IN_PROGRESS && check.approvalNote != null

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

      {isRejectedBanner && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800 px-4 py-3 text-sm">
          <AlertTriangle className="size-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-700 dark:text-red-400">{t("stockCheckDetail.rejectedLabel")}</p>
            <p className="text-red-600 dark:text-red-300 mt-0.5">{check.approvalNote}</p>
          </div>
        </div>
      )}

      {(check.status === STOCK_CHECK_STATUS.IN_PROGRESS || check.status === STOCK_CHECK_STATUS.PENDING) && (
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
        </div>
        <div className="flex gap-2">
          <PrintReceiptButton id={check.id} type="stock-check" />
      {canEdit && (
        <ButtonGroup>
          <Button variant="outline" onClick={handleSave}>
            <Save className="size-4 mr-1" /> {t("stockCheckDetail.saveDraft")}
          </Button>
          <AlertDialog open={resetDialog} onOpenChange={setResetDialog}>
            <AlertDialogTrigger asChild>
              <Button variant="outline">
                <RotateCcw className="size-4 mr-1" /> {t("stockCheckDetail.reset")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("stockCheckDetail.resetConfirmTitle")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("stockCheckDetail.resetConfirmDesc")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                <AlertDialogAction onClick={handleReset}>{t("stockCheckDetail.resetConfirm")}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          {check.status === STOCK_CHECK_STATUS.PENDING ? (
            <Button onClick={() => startMut.mutate()} disabled={startMut.isPending}>
              <Play className="size-4 mr-1" />
              {startMut.isPending ? t("stockCheckDetail.starting") : t("stockCheckDetail.start")}
            </Button>
          ) : (
            <Button onClick={() => setCompleteModal(true)} disabled={recordMut.isPending || completeMut.isPending}>
              <ClipboardCheck className="size-4 mr-1" />
              {completeMut.isPending ? t("stockCheckDetail.completing") : t("stockCheckDetail.complete")}
            </Button>
          )}
        </ButtonGroup>
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
                    i.difference === STOCK_CHECK_DIFF.UNEXPECTED && "border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800",
                    i.difference === STOCK_CHECK_DIFF.PARTIAL_SHORTAGE && "border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800",
                  )}
                >
                  {i.difference === STOCK_CHECK_DIFF.MISSING ? (
                    <AlertCircle className="size-4 text-red-500 shrink-0" />
                  ) : i.difference === STOCK_CHECK_DIFF.UNEXPECTED ? (
                    <CheckCircle2 className="size-4 text-green-500 shrink-0" />
                  ) : (
                    <HelpCircle className="size-4 text-amber-500 shrink-0" />
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
                      i.difference === STOCK_CHECK_DIFF.UNEXPECTED && "border-green-200 text-green-600",
                      i.difference === STOCK_CHECK_DIFF.PARTIAL_SHORTAGE && "border-amber-200 text-amber-600",
                    )}
                  >
                    {i.difference === STOCK_CHECK_DIFF.MISSING ? t("stockCheckDetail.diffMissing") : i.difference === STOCK_CHECK_DIFF.UNEXPECTED ? t("stockCheckDetail.diffUnexpected") : t("stockCheckDetail.diffPartial")}
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
                <p className="font-medium">{check.scopeType === "ZONE" ? t("stockCheckDetail.zone") : t("stockCheckDetail.category")} #{check.scopeId}</p>
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
            <Badge variant="outline" className="text-destructive">
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
                    <div className="flex-1" />
                    {canEdit && g.pendingCount > 0 && (
                      <Button variant="outline" size="sm" onClick={() => confirmWholeBox(g.boxId)}>
                        <PackageCheck className="size-4 mr-1" /> {t("stockCheckDetail.confirmBox")}
                      </Button>
                    )}
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
            rowAction={
              canEdit
                ? (item) =>
                    item.trackingType === TRACKING_TYPE.SERIALIZED && item.actualStatus != null && item.boxId == null ? (
                      <Button variant="outline" size="sm" className="text-xs" onClick={() => setSealTarget(item)}>
                        <Boxes className="size-3 mr-1" /> {t("stockCheckDetail.closeToBox")}
                      </Button>
                    ) : null
                : undefined
            }
            onImportSerials={(e) => {
              const file = e.target.files?.[0]
              if (!file) return
              const reader = new FileReader()
              reader.onload = async () => {
                const content = reader.result as string
                try {
                  const { importStockCheckSerials } = await import("@/services/stock-check-service")
                  const updated = await importStockCheckSerials(Number(id!), content)
                  setLocalItems(updated.items)
                  saveDraft(id!, updated.items)
                  qc.invalidateQueries({ queryKey: ["stock-check", id] })
                  const lines = content.split(/[\n\r]+/).map((s: string) => s.trim()).filter(Boolean)
                  toast.success(t("stockCheckDetail.importSerialsSuccess", { total: lines.length, matched: updated.items.filter(i => i.actualStatus).length }))
                } catch (err) {
                  toast.error((err as Error).message || t("stockCheckDetail.importError"))
                }
              }
              reader.readAsText(file)
              e.target.value = ""
            }}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={sealTarget != null} onOpenChange={(open) => !open && setSealTarget(null)}>
        {sealTarget && (
          <SealUnitDialog
            unitId={sealTarget.productUnitId}
            unitCode={sealTarget.serialNumber || sealTarget.productName}
            onSeal={(data) => sealMut.mutate(data)}
            pending={sealMut.isPending}
          />
        )}
      </Dialog>

      <Dialog open={completeModal} onOpenChange={setCompleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("stockCheckDetail.completeDialogTitle")}</DialogTitle>
            <DialogDescription>
              {autoFillCount > 0 ? (
                <span>{t("stockCheckDetail.completeDialogAutoFill", { count: autoFillCount })}</span>
              ) : (
                <span>{t("stockCheckDetail.completeDialogSimple")}</span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteModal(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleSaveAndComplete} disabled={completeMut.isPending}>
              {autoFillCount > 0 ? t("stockCheckDetail.completeDialogAutoFillBtn") : t("stockCheckDetail.completeDialogSimpleBtn")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
interface SealUnitDialogProps {
  unitId: number
  unitCode: string
  onSeal: (data: { unitIds: number[]; locationId: number | null; note?: string }) => void
  pending: boolean
}

function SealUnitDialog({ unitId, unitCode, onSeal, pending }: SealUnitDialogProps) {
  const { t } = useTranslation()
  const [locationId, setLocationId] = useState<string>("")
  const [note, setNote] = useState("")

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{t("box.sealUnitTitle")}</DialogTitle>
        <DialogDescription>{unitCode}</DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>{t("box.location")}</Label>
          <LocationPicker value={locationId} onSelect={setLocationId} />
        </div>
        <div className="space-y-2">
          <Label>{t("box.note")}</Label>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
        </div>
      </div>
      <DialogFooter>
        <Button
          onClick={() => onSeal({ unitIds: [unitId], locationId: locationId ? Number(locationId) : null, note: note || undefined })}
          disabled={pending}
        >
          {t("box.seal")}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}
