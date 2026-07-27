import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getStockCheckById,
  recordStockCheckItems,
  completeStockCheck,
  startStockCheck,
  approveStockCheck,
  rejectStockCheck,
} from "@/services/stock-check-service"
import { usePermission } from "@/hooks/use-permission"
import { ROLES } from "@/utils/permissions"
import { STOCK_CHECK_STATUS, STOCK_CHECK_DIFF, PRODUCT_UNIT_STATUS, type StockCheckItem, type DifferenceType } from "@/utils/types"
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
import { AlertCircle, CheckCircle2, HelpCircle, Save, ClipboardCheck, Check, X, ListChecks, AlertTriangle, RotateCcw, Play } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { ButtonGroup } from "@/components/ui/button-group"
import { cn } from "@/utils/cn"
import { toast } from "@/utils/toast"
import { StockCheckItemsTable } from "../components/stock-check-items-table"
import { ApprovalDialog } from "../components/approval-dialog"
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

const statusLabel: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  PENDING: { label: "Chờ xử lý", variant: "secondary" },
  IN_PROGRESS: { label: "Đang kiểm", variant: "outline" },
  COMPLETED: { label: "Chờ duyệt", variant: "default" },
  APPROVED: { label: "Đã duyệt", variant: "default" },
}

export const StockCheckDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const perm = usePermission()

  const [localItems, setLocalItems] = useState<StockCheckItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [approvalModal, setApprovalModal] = useState<"approve" | "reject" | null>(null)
  const [completeModal, setCompleteModal] = useState(false)
  const [resetDialog, setResetDialog] = useState(false)
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
  const autoFillCount = localItems.filter((i) => i.actualStatus == null && i.trackingType === "SERIALIZED").length
  const bulkMissingCount = localItems.filter((i) => i.actualStatus == null && i.trackingType === "BULK" && i.countedQuantity == null).length

  const itemsWithDiff = useMemo(() =>
    localItems.map((i) => {
      if (i.actualStatus == null) return i
      if (i.difference != null) return i
      if (i.trackingType !== "SERIALIZED") return i
      if (i.expectedStatus === i.actualStatus) return { ...i, difference: "MATCH" as DifferenceType }
      const lostLike: readonly string[] = [PRODUCT_UNIT_STATUS.LOST, PRODUCT_UNIT_STATUS.REMOVED, PRODUCT_UNIT_STATUS.DISPOSED]
      if (lostLike.includes(i.actualStatus)) return { ...i, difference: "MISSING" as DifferenceType }
      return { ...i, difference: "UNEXPECTED" as DifferenceType }
    }), [localItems])

  const recordMut = useMutation({
    mutationFn: (data: {
      items: Array<{ productUnitId: number; actualStatus?: string; countedQuantity?: number; note?: string; photo?: string }>
    }) => recordStockCheckItems(Number(id!), data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-check", id] })
      qc.invalidateQueries({ queryKey: ["stock-checks"] })
      toast.success("Đã ghi kết quả kiểm")
    },
    onError: (err: Error) => toast.error(err.message || "Không thể ghi kết quả"),
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
      const filled = res.autoFilledCount
      if (filled > 0) {
        toast.success(`Hoàn tất kiểm kê. Đã tự động đánh dấu ${filled} serial còn hàng`)
      } else {
        toast.success("Kiểm hoàn tất, chờ duyệt")
      }
      navigate("/stock/checks")
    },
    onError: (err: Error) => toast.error(err.message || "Không thể hoàn tất kiểm"),
  })

  const startMut = useMutation({
    mutationFn: () => startStockCheck(Number(id!)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-check", id] })
      toast.success("Đã bắt đầu kiểm kê")
    },
    onError: (err: Error) => toast.error(err.message || "Không thể bắt đầu kiểm"),
  })

  const handleSaveAndComplete = async () => {
    if (bulkMissingCount > 0) {
      toast.error(`Còn ${bulkMissingCount} sản phẩm BULK chưa đếm số lượng`)
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
        return { ...i, actualStatus: status, countedQuantity: i.trackingType === "SERIALIZED" ? 1 : i.countedQuantity }
      }),
    )
  }, [])

  const handleSave = useCallback(() => {
    if (!id) return
    saveDraft(id, localItems)
    dirtyRef.current = false
    toast.success("Đã lưu tạm")
  }, [id, localItems])

  const handleReset = useCallback(() => {
    setLocalItems(initialItemsRef.current.map((i) => ({ ...i })))
    if (id) deleteDraft(id)
    dirtyRef.current = false
    setResetDialog(false)
    toast.success("Đã reset về trạng thái ban đầu")
  }, [id])

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
          <EmptyTitle>Không tìm thấy phiếu kiểm</EmptyTitle>
        </Empty>
      </div>
    )
  }

  const s = statusLabel[check.status] ?? { label: check.status, variant: "secondary" }
  const canOperateStock = perm.hasRole(...ROLES.CAN_OPERATE_STOCK)
  const isManager = perm.hasRole(...ROLES.CAN_APPROVE)
  const canEdit = canOperateStock
  const canApprove = check.status === STOCK_CHECK_STATUS.COMPLETED && isManager
  const isRejected = check.status === STOCK_CHECK_STATUS.IN_PROGRESS && check.approvalNote != null

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => navigate("/stock/checks")}>Kiểm kho</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{check.checkCode}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {isRejected && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800 px-4 py-3 text-sm">
          <AlertTriangle className="size-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-700 dark:text-red-400">Phiếu đã bị từ chối, lý do:</p>
            <p className="text-red-600 dark:text-red-300 mt-0.5">{check.approvalNote}</p>
          </div>
        </div>
      )}

      {(check.status === STOCK_CHECK_STATUS.IN_PROGRESS || check.status === STOCK_CHECK_STATUS.PENDING) && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <ListChecks className="size-4" /> Đã kiểm: {checkedCount}/{check.totalItems}
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
          {canEdit && (
            <ButtonGroup>
              <Button variant="outline" onClick={handleSave}>
                <Save className="size-4 mr-1" /> Lưu tạm
              </Button>
              <AlertDialog open={resetDialog} onOpenChange={setResetDialog}>
                <AlertDialogTrigger asChild>
                  <Button variant="outline">
                    <RotateCcw className="size-4 mr-1" /> Reset
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Xác nhận reset</AlertDialogTitle>
                    <AlertDialogDescription>
                      Thao tác này sẽ xoá tất cả trạng thái kiểm tra hiện tại và đưa về trạng thái ban đầu (lúc load từ server). Bạn có chắc chắn muốn tiếp tục?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Huỷ</AlertDialogCancel>
                    <AlertDialogAction onClick={handleReset}>Xác nhận reset</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              {check.status === STOCK_CHECK_STATUS.PENDING ? (
                <Button onClick={() => startMut.mutate()} disabled={startMut.isPending}>
                  <Play className="size-4 mr-1" />
                  {startMut.isPending ? "Đang bắt đầu..." : "Bắt đầu kiểm kê"}
                </Button>
              ) : (
                <Button onClick={() => setCompleteModal(true)} disabled={recordMut.isPending || completeMut.isPending}>
                  <ClipboardCheck className="size-4 mr-1" />
                  {completeMut.isPending ? "Đang hoàn tất..." : "Hoàn tất kiểm kê"}
                </Button>
              )}
            </ButtonGroup>
          )}
          {canApprove && (
            <ButtonGroup>
              <Button variant="outline" onClick={() => setApprovalModal("reject")}>
                <X className="size-4 mr-1" /> Từ chối
              </Button>
              <Button onClick={() => setApprovalModal("approve")}>
                <Check className="size-4 mr-1" /> Duyệt toàn bộ
              </Button>
            </ButtonGroup>
          )}
        </div>
      </div>

      {itemsWithDiff.some((i) => i.difference && i.difference !== STOCK_CHECK_DIFF.MATCH) && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Chênh lệch phát hiện</p>
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
                    {i.difference === STOCK_CHECK_DIFF.MISSING ? "MISSING" : i.difference === STOCK_CHECK_DIFF.UNEXPECTED ? "UNEXPECTED" : "PARTIAL"}
                  </Badge>
                </div>
              ))}
          </div>
        </div>
      )}

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Thông tin</TabsTrigger>
          <TabsTrigger value="results">Kết quả</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Người tạo:</span>
              <p className="font-medium">{check.createdByName}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Ngày tạo:</span>
              <p className="font-medium">{new Date(check.createdAt).toLocaleString("vi-VN")}</p>
            </div>
            {check.scopeType && (
              <div>
                <span className="text-muted-foreground">Phạm vi:</span>
                <p className="font-medium">{check.scopeType === "ZONE" ? "Khu vực" : "Danh mục"} #{check.scopeId}</p>
              </div>
            )}
            {check.approvedByName && (
              <div>
                <span className="text-muted-foreground">Người duyệt:</span>
                <p className="font-medium">{check.approvedByName}</p>
              </div>
            )}
            {check.approvalNote && (
              <div>
                <span className="text-muted-foreground">Ghi chú duyệt:</span>
                <p className="font-medium">{check.approvalNote}</p>
              </div>
            )}
            {check.note && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Ghi chú:</span>
                <p className="mt-1 text-sm leading-relaxed rounded-md border bg-muted/20 px-3 py-2">{check.note}</p>
              </div>
            )}
          </div>
          <div className="flex gap-3 text-sm">
            <Badge variant="outline">Tổng: {check.totalItems}</Badge>
            <Badge variant="secondary">Khớp: {check.matchCount}</Badge>
            <Badge variant="outline" className="text-destructive">
              Thiếu: {check.missingCount}
            </Badge>
            <Badge variant="outline" className="text-destructive">
              Lỗi: {check.unexpectedCount}
            </Badge>
          </div>
        </TabsContent>

        <TabsContent value="results">
          <StockCheckItemsTable
            items={itemsWithDiff}
            canEdit={canEdit}
            onUpdate={updateItem}
            onBulkSet={handleBulkSet}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
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
                  toast.success(`Import ${lines.length} serial, ${updated.items.filter(i => i.actualStatus).length} khớp`)
                } catch (err) {
                  toast.error((err as Error).message || "Lỗi import serials")
                }
              }
              reader.readAsText(file)
              e.target.value = ""
            }}
          />
        </TabsContent>
      </Tabs>

      <ApprovalDialog
        open={!!approvalModal}
        onOpenChange={(v) => {
          if (!v) setApprovalModal(null)
        }}
        id={Number(id)}
        title={approvalModal === "approve" ? "Duyệt phiếu kiểm kho" : "Từ chối phiếu kiểm kho"}
        actions={[
          { label: "Từ chối", confirmLabel: "Xác nhận từ chối", variant: "destructive", service: rejectStockCheck },
          { label: "Duyệt", confirmLabel: "Xác nhận duyệt", service: approveStockCheck },
        ]}
        invalidateKeys={[["stock-check", id!], ["stock-checks"], ["inventory"], ["inventory-summary"]]}
      />

      <Dialog open={completeModal} onOpenChange={setCompleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hoàn tất kiểm kê</DialogTitle>
            <DialogDescription>
              {autoFillCount > 0 ? (
                <span>
                  Còn <strong>{autoFillCount}</strong> serial chưa kiểm. Hệ thống sẽ tự động đánh dấu các serial này là
                  <strong> CÒN HÀNG (IN_STOCK)</strong>. Bạn có chắc chắn?
                </span>
              ) : (
                <span>Xác nhận hoàn tất kiểm kê?</span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteModal(false)}>Huỷ</Button>
            <Button onClick={handleSaveAndComplete} disabled={completeMut.isPending}>
              {autoFillCount > 0 ? "Xác nhận, đánh dấu còn hàng và hoàn tất" : "Xác nhận hoàn tất"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}