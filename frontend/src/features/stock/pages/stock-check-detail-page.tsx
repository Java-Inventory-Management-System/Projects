import { useState, useEffect, useCallback } from "react"
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
import { Save, ClipboardCheck, Check, X } from "lucide-react"
import { ButtonGroup } from "@/components/ui/button-group"
import { toast } from "@/utils/toast"
import { StockCheckItemsTable } from "../components/stock-check-items-table"
import { ApprovalDialog } from "../components/approval-dialog"

const statusLabel: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  PENDING: { label: "Pending", variant: "secondary" },
  IN_PROGRESS: { label: "Checking", variant: "outline" },
  COMPLETED: { label: "Pending Approval", variant: "default" },
  APPROVED: { label: "Approved", variant: "default" },
  REJECTED: { label: "Rejected", variant: "destructive" },
}

export const StockCheckDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const perm = usePermission()

  const [localItems, setLocalItems] = useState<StockCheckItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [approvalModal, setApprovalModal] = useState<"approve" | "reject" | null>(null)

  const { data: check, isLoading } = useQuery({
    queryKey: ["stock-check", id],
    queryFn: () => getStockCheckById(Number(id)),
    enabled: !!id,
  })

  useEffect(() => {
    if (check) setLocalItems(check.items)
  }, [check])

  const updateItem = useCallback((itemId: number, field: string, value: unknown) => {
    setLocalItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, [field]: value } : i)))
  }, [])

  const recordMut = useMutation({
    mutationFn: (data: {
      items: Array<{ productUnitId: number; actualStatus?: string; countedQuantity?: number; note?: string }>
    }) => recordStockCheckItems(Number(id!), data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-check", id] })
      qc.invalidateQueries({ queryKey: ["stock-checks"] })
      toast.success("Đã ghi kết quả kiểm")
    },
    onError: (err: Error) => toast.error(err.message || "Không thể ghi kết quả"),
  })

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
  // STOCK: record results, complete check
  const isStock = perm.hasRole("STOCK")
  // MANAGER/ADMIN: approve/reject
  const isManager = perm.hasRole(...ROLES.CAN_APPROVE)
  const canEdit =
    (check.status === STOCK_CHECK_STATUS.PENDING || check.status === STOCK_CHECK_STATUS.IN_PROGRESS) && isStock
  const canApprove = check.status === STOCK_CHECK_STATUS.COMPLETED && isManager
  const mismatchCount = localItems.filter((i) => i.difference && i.difference !== STOCK_CHECK_DIFF.MATCH).length

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
            <BreadcrumbLink onClick={() => navigate("/stock/checks")}>Stock Checks</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{check.checkCode}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant={s.variant}>{s.label}</Badge>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <ButtonGroup>
              <Button variant="outline" onClick={recordItems} disabled={recordMut.isPending}>
                <Save className="size-4 mr-1" />
                {recordMut.isPending ? "Saving..." : "Save"}
              </Button>
              <Button onClick={handleSaveAndComplete} disabled={recordMut.isPending || completeMut.isPending}>
                <ClipboardCheck className="size-4 mr-1" />
                {completeMut.isPending ? "Completing..." : "Complete"}
              </Button>
            </ButtonGroup>
          )}
          {canApprove && (
            <ButtonGroup>
              <Button variant="outline" onClick={() => setApprovalModal("reject")}>
                <X className="size-4 mr-1" /> Reject
              </Button>
              <Button onClick={() => setApprovalModal("approve")}>
                <Check className="size-4 mr-1" /> Approve
              </Button>
            </ButtonGroup>
          )}
          {check.status === STOCK_CHECK_STATUS.APPROVED && mismatchCount > 0 && (
            <Button
              onClick={() => {
                const mismatches = localItems.filter((i) => i.difference && i.difference !== STOCK_CHECK_DIFF.MATCH)
                navigate("/stock/adjustments/new", {
                  state: {
                    reason: `From ${check.checkCode} — ${mismatchCount} items mismatch`,
                    mismatches: mismatches.map((m) => ({
                      productUnitId: m.productUnitId,
                      productName: m.productName,
                      productSku: m.productSku,
                      serialNumber: m.serialNumber,
                      difference: m.difference,
                      expectedStatus: m.expectedStatus,
                    })),
                    batch: true,
                  },
                })
              }}
            >
              <ClipboardCheck className="size-4 mr-1" /> Tạo Adjustment ({mismatchCount})
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Created by:</span>
              <p className="font-medium">{check.createdByName}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Date:</span>
              <p className="font-medium">{new Date(check.createdAt).toLocaleString("vi-VN")}</p>
            </div>
            {check.approvedByName && (
              <div>
                <span className="text-muted-foreground">Approved by:</span>
                <p className="font-medium">{check.approvedByName}</p>
              </div>
            )}
            {check.approvalNote && (
              <div>
                <span className="text-muted-foreground">Approval note:</span>
                <p className="font-medium">{check.approvalNote}</p>
              </div>
            )}
            {check.note && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Note:</span>
                <p className="mt-1 text-sm leading-relaxed rounded-md border bg-muted/20 px-3 py-2">{check.note}</p>
              </div>
            )}
          </div>
          <div className="flex gap-3 text-sm">
            <Badge variant="outline">Total: {check.totalItems}</Badge>
            <Badge variant="secondary">Match: {check.matchCount}</Badge>
            <Badge variant="outline" className="text-destructive">
              Missing: {check.missingCount}
            </Badge>
            <Badge variant="outline" className="text-destructive">
              Error: {check.unexpectedCount}
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
        title={approvalModal === "approve" ? "Approve Stock Check" : "Reject Stock Check"}
        actions={[
          { label: "Reject", confirmLabel: "Confirm Reject", variant: "destructive", service: rejectStockCheck },
          { label: "Approve", confirmLabel: "Confirm Approve", service: approveStockCheck },
        ]}
        invalidateKeys={[["stock-check", id!], ["stock-checks"], ["inventory"], ["inventory-summary"]]}
      />
    </div>
  )
}
