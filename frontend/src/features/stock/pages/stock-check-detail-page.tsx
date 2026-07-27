import { useState, useEffect, useCallback, useRef } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getStockCheckById,
  recordStockCheckItems,
  completeStockCheck,
  approveStockCheck,
  rejectStockCheck,
} from "@/services/stock-check-service"
import { usePermission } from "@/hooks/use-permission"
import { ROLES } from "@/utils/permissions"
import { STOCK_CHECK_STATUS, STOCK_CHECK_DIFF, PRODUCT_UNIT_STATUS, type StockCheckItem } from "@/utils/types"
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
import { AlertCircle, CheckCircle2, HelpCircle, Save, ClipboardCheck, Check, X, ListChecks } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { ButtonGroup } from "@/components/ui/button-group"
import { cn } from "@/utils/cn"
import { toast } from "@/utils/toast"
import { StockCheckItemsTable } from "../components/stock-check-items-table"
import { ApprovalDialog } from "../components/approval-dialog"

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
  const dirtyRef = useRef(false)

  const { data: check, isLoading } = useQuery({
    queryKey: ["stock-check", id],
    queryFn: () => getStockCheckById(Number(id)),
    enabled: !!id,
  })

  useEffect(() => {
    if (check) setLocalItems(check.items)
  }, [check])

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

  // ponytail: auto-save every 30s when dirty
  useEffect(() => {
    if (!id) return
    const isCheckActive = check?.status === STOCK_CHECK_STATUS.PENDING || check?.status === STOCK_CHECK_STATUS.IN_PROGRESS
    if (!isCheckActive) return
    const timer = setInterval(() => {
      if (!dirtyRef.current) return
      const items = localItems.map((i) => ({
        productUnitId: i.productUnitId,
        actualStatus: i.actualStatus ?? undefined,
        countedQuantity: i.countedQuantity ?? undefined,
        note: i.note || undefined,
      }))
      recordMut.mutate({ items }, { onSettled: () => { dirtyRef.current = false } })
    }, 30000)
    return () => clearInterval(timer)
  }, [id, check?.status])

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
    onSuccess: () => {
      invalidateAll()
      toast.success("Kiểm hoàn tất, chờ duyệt")
      navigate("/stock/checks")
    },
    onError: (err: Error) => toast.error(err.message || "Không thể hoàn tất kiểm"),
  })

  const handleSaveAndComplete = async () => {
    const items = localItems.map((i) => ({
      productUnitId: i.productUnitId,
      actualStatus: i.actualStatus ?? undefined,
      countedQuantity: i.countedQuantity ?? undefined,
      note: i.note || undefined,
    }))
    try {
      await recordMut.mutateAsync({ items })
      completeMut.mutate()
    } catch {
      /* toast handled by mutation */
    }
  }

  const handleBulkSet = useCallback((status: string) => {
    setLocalItems((prev) => prev.map((i) => ({ ...i, actualStatus: status })))
  }, [])

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
          <EmptyTitle>Stock check not found</EmptyTitle>
        </Empty>
      </div>
    )
  }

  const s = statusLabel[check.status] ?? { label: check.status, variant: "secondary" }
  // CAN_OPERATE_STOCK: record results, complete check
  const canOperateStock = perm.hasRole(...ROLES.CAN_OPERATE_STOCK)
  // MANAGER/ADMIN: approve/reject
  const isManager = perm.hasRole(...ROLES.CAN_APPROVE)
  const canEdit =
    (check.status === STOCK_CHECK_STATUS.PENDING || check.status === STOCK_CHECK_STATUS.IN_PROGRESS) && canOperateStock
  const canApprove = check.status === STOCK_CHECK_STATUS.COMPLETED && isManager

  const recordItems = () => {
    const items = localItems.map((i) => ({
      productUnitId: i.productUnitId,
      actualStatus: i.actualStatus ?? undefined,
      countedQuantity: i.countedQuantity ?? undefined,
      note: i.note || undefined,
    }))
    recordMut.mutate({ items })
  }

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

      {(check.status === STOCK_CHECK_STATUS.IN_PROGRESS || check.status === STOCK_CHECK_STATUS.PENDING) && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <ListChecks className="size-4" /> Đã kiểm: {localItems.filter(i => i.actualStatus).length}/{check.totalItems}
            </span>
            <span className="text-xs text-muted-foreground">{Math.round((localItems.filter(i => i.actualStatus).length / check.totalItems) * 100)}%</span>
          </div>
          <Progress value={(localItems.filter(i => i.actualStatus).length / check.totalItems) * 100} className="h-2" />
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant={s.variant}>{s.label}</Badge>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <ButtonGroup>
              <Button variant="outline" onClick={recordItems} disabled={recordMut.isPending}>
                <Save className="size-4 mr-1" />
                {recordMut.isPending ? "Đang lưu..." : "Lưu tạm"}
              </Button>
              <Button onClick={handleSaveAndComplete} disabled={recordMut.isPending || completeMut.isPending}>
                <ClipboardCheck className="size-4 mr-1" />
                {completeMut.isPending ? "Đang hoàn tất..." : "Hoàn tất kiểm kê"}
              </Button>
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

      {/* ponytail: top 10 diffs shown for quick scan; full list in Results tab */}
      {localItems.some((i) => i.difference && i.difference !== STOCK_CHECK_DIFF.MATCH) && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Chênh lệch phát hiện</p>
          <div className="grid gap-2">
            {localItems
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
            items={localItems}
            canEdit={canEdit}
            onUpdate={updateItem}
            onBulkSet={handleBulkSet}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onImportSerials={(e) => {
              const file = e.target.files?.[0]
              if (!file) return
              const reader = new FileReader()
              reader.onload = () => {
                const imported = (reader.result as string)
                  .split(/[\n\r]+/)
                  .map((s) => s.trim())
                  .filter(Boolean)
                if (imported.length === 0) {
                  toast.error("No valid serials in file")
                  return
                }
                const importedSet = new Set(imported)
                setLocalItems((prev) =>
                  prev.map((i) =>
                    importedSet.has(i.serialNumber)
                      ? { ...i, actualStatus: PRODUCT_UNIT_STATUS.IN_STOCK }
                      : { ...i, actualStatus: PRODUCT_UNIT_STATUS.LOST },
                  ),
                )
                toast.success(`Imported ${imported.length} serials`)
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
    </div>
  )
}
