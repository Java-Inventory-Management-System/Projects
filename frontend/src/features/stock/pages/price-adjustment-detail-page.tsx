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
import { ScrollArea } from "@/components/ui/scroll-area"
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

const statusLabel: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  PENDING: { label: "Chờ duyệt", variant: "outline" },
  APPROVED: { label: "Đã duyệt", variant: "default" },
  REJECTED: { label: "Từ chối", variant: "destructive" },
  CANCELLED: { label: "Đã huỷ", variant: "secondary" },
}

export function PriceAdjustmentDetailPage() {
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
    mutationFn: async (action: "approve" | "reject") => {
      if (action === "approve") return approvePriceAdjustment(Number(id), approvalNote || undefined)
      return rejectPriceAdjustment(Number(id), rejectReason.trim())
    },
    onSuccess: (_result, actionType) => {
      qc.invalidateQueries({ queryKey: ["price-adjustment", id] })
      qc.invalidateQueries({ queryKey: ["price-adjustments"] })
      qc.invalidateQueries({ queryKey: ["my-price-adjustments"] })
      const msg = actionType === "approve" ? `Đã duyệt phiếu ${adj?.adjustCode}` : `Đã từ chối phiếu ${adj?.adjustCode}`
      toast.success(msg)
      setConfirmAction(null)
      setApprovalNote("")
      setRejectReason("")
    },
    onError: (e: Error) => {
      const msg = e.message || ""
      if (msg.includes("price has changed") || msg.includes("giá đã thay đổi")) {
        setConfirmAction(null)
        setShowConflictDialog(true)
        setCurrentPrice(Number(msg.match(/[\d,]+/)?.[0] ?? 0))
      } else {
        toast.error(msg)
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
      toast.success(`Đã huỷ phiếu ${adj?.adjustCode}`)
      setConfirmAction(null)
    },
    onError: (e: Error) => {
      toast.error(e.message)
      setConfirmAction(null)
    },
  })

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
        <EmptyTitle>Không tìm thấy phiếu điều chỉnh giá</EmptyTitle>
        <EmptyDescription>
          Phiếu không tồn tại hoặc bạn không có quyền xem phiếu này.
        </EmptyDescription>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/stock/price-adjustments")}>
          Quay lại danh sách
        </Button>
      </Empty>
    )

  const s = statusLabel[adj.status] ?? { label: adj.status, variant: "secondary" as const }
  const isManagerAdmin = perm.canApprove()
  const isOwn = adj.createdBy === perm.user?.id
  const canApprove = isManagerAdmin && adj.status === ADJUSTMENT_STATUS.PENDING && !isOwn
  const canCancel = !isManagerAdmin && isOwn && adj.status === ADJUSTMENT_STATUS.PENDING
  const priceDiff = adj.newPrice - adj.oldPrice
  const priceDiffPct = adj.oldPrice > 0 ? ((priceDiff / adj.oldPrice) * 100).toFixed(1) : "0.0"

  return (
    <TooltipProvider>
    <div className="mx-auto max-w-2xl space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => navigate("/stock/price-adjustments")}>Điều chỉnh giá</BreadcrumbLink>
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
          {canApprove && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0}>
                    <Button variant="outline" className="text-destructive" onClick={() => setConfirmAction("reject")}>
                      <X className="size-4 mr-1" /> Từ chối
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>Từ chối phiếu điều chỉnh này</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0}>
                    <Button onClick={() => setConfirmAction("approve")}>
                      <Check className="size-4 mr-1" /> Duyệt
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>Duyệt phiếu điều chỉnh này</TooltipContent>
              </Tooltip>
            </>
          )}
          {isManagerAdmin && isOwn && adj.status === ADJUSTMENT_STATUS.PENDING && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0}>
                  <Button variant="outline" disabled className="cursor-not-allowed">
                    <Check className="size-4 mr-1" /> Duyệt
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>Bạn là người tạo phiếu này, không thể tự duyệt</TooltipContent>
            </Tooltip>
          )}
          {canCancel && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0}>
                  <Button variant="outline" className="text-destructive" onClick={() => setConfirmAction("cancel")}>
                    <Ban className="size-4 mr-1" /> Huỷ phiếu
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>Huỷ bỏ yêu cầu điều chỉnh giá này</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {isManagerAdmin && isOwn && adj.status === ADJUSTMENT_STATUS.PENDING && (
        <Alert variant="default" className="border-blue-200 bg-blue-50">
          <Info className="size-4 text-blue-600" />
          <AlertDescription className="text-blue-800 text-sm">
            Bạn là người tạo phiếu này, cần một Manager/Admin khác duyệt.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Sản phẩm:</span>
              <p className="font-medium">
                {adj.productName ?? "—"}{" "}
                {adj.productSku && <span className="text-muted-foreground">({adj.productSku})</span>}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Giá cũ → Giá mới:</span>
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
              <span className="text-muted-foreground">Người tạo:</span>
              <p className="font-medium">{adj.createdByName ?? "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Ngày tạo:</span>
              <p className="font-medium">
                {adj.createdAt ? new Date(adj.createdAt).toLocaleString("vi-VN") : "—"}
              </p>
            </div>
            {adj.approvedByName && (
              <div>
                <span className="text-muted-foreground">Người duyệt:</span>
                <p className="font-medium">{adj.approvedByName}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="text-sm">
            <span className="text-xs font-medium text-muted-foreground tracking-wide">LÝ DO</span>
            <p className="mt-1 whitespace-pre-wrap">{adj.reason}</p>
          </div>
        </CardContent>
      </Card>

      {adj.approvalNote && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm">
              <span className="text-xs font-medium text-muted-foreground tracking-wide">GHI CHÚ DUYỆT</span>
              <p className="mt-1 whitespace-pre-wrap">{adj.approvalNote}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approve Dialog */}
      <AlertDialog
        open={confirmAction === "approve"}
        onOpenChange={(v) => { if (!v) { setConfirmAction(null); setApprovalNote("") } }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Duyệt điều chỉnh giá</AlertDialogTitle>
            <AlertDialogDescription>
              Xác nhận duyệt phiếu <span className="font-mono font-medium">{adj.adjustCode}</span>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-2">
              <Label>Ghi chú (không bắt buộc)</Label>
              <Input
                value={approvalNote}
                onChange={(e) => setApprovalNote(e.target.value)}
                placeholder="Nhập ghi chú nếu cần"
              />
            </div>
          </ScrollArea>
          <AlertDialogFooter>
            <AlertDialogCancel>Không</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => action.mutate("approve")}
              disabled={action.isPending}
            >
              {action.isPending ? "Đang xử lý..." : "Xác nhận duyệt"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <AlertDialog
        open={confirmAction === "reject"}
        onOpenChange={(v) => { if (!v) { setConfirmAction(null); setRejectReason("") } }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Từ chối điều chỉnh giá</AlertDialogTitle>
            <AlertDialogDescription>
              Xác nhận từ chối phiếu <span className="font-mono font-medium">{adj.adjustCode}</span>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-2">
              <Label>
                Lý do từ chối <span className="text-destructive">*</span>
              </Label>
              <Input
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Nhập lý do từ chối"
              />
              {rejectReason.trim().length > 0 && rejectReason.trim().length < 5 && (
                <p className="text-xs text-destructive">Lý do phải có ít nhất 5 ký tự</p>
              )}
            </div>
          </ScrollArea>
          <AlertDialogFooter>
            <AlertDialogCancel>Không</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => action.mutate("reject")}
              disabled={action.isPending || rejectReason.trim().length < 5}
            >
              {action.isPending ? "Đang xử lý..." : "Xác nhận từ chối"}
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
            <AlertDialogTitle>Huỷ phiếu điều chỉnh giá</AlertDialogTitle>
            <AlertDialogDescription>
              Xác nhận huỷ phiếu <span className="font-mono font-medium">{adj.adjustCode}</span>?
              Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Không</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? "Đang huỷ..." : "Xác nhận huỷ"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Conflict Dialog */}
      <AlertDialog
        open={showConflictDialog}
        onOpenChange={(v) => { if (!v) {
          setShowConflictDialog(false)
          rejectPriceAdjustment(Number(id), "Giá đã thay đổi, phiếu cần tạo lại").catch(() => {})
        }}}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xung đột giá</AlertDialogTitle>
            <AlertDialogDescription>
              Giá sản phẩm đã thay đổi kể từ khi tạo phiếu này.
              {currentPrice > 0 && (
                <> Giá hiện tại: <span className="font-semibold">{(currentPrice).toLocaleString("vi-VN")}₫</span></>
              )}
              <br />
              Phiếu cần được tạo lại.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowConflictDialog(false)}>Đóng</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </TooltipProvider>
  )
}
