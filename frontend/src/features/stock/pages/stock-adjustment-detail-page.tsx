import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getStockAdjustmentById,
  approveStockAdjustment,
  rejectStockAdjustment,
} from "@/features/stock/services/stock-adjustment-service"
import { useAuthStore } from "@/store/auth-store"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { ArrowLeft, Check, X } from "lucide-react"
import { toast } from "@/utils/toast"

const typeLabel: Record<string, string> = { DAMAGED: "Hư hỏng", LOST: "Mất", FOUND: "Thừa" }
const typeColor: Record<string, "destructive" | "outline" | "default"> = {
  DAMAGED: "destructive", LOST: "destructive", FOUND: "default",
}
const statusLabel: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  PENDING: { label: "Chờ duyệt", variant: "secondary" },
  APPROVED: { label: "Đã duyệt", variant: "default" },
  REJECTED: { label: "Từ chối", variant: "destructive" },
}

export const StockAdjustmentDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)

  const [approvalAction, setApprovalAction] = useState<"approve" | "reject" | null>(null)
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
      setApprovalAction(null); setApprovalNote("")
      toast.success("Đã duyệt phiếu điều chỉnh")
    },
    onError: (err: Error) => toast.error(err.message || "Duyệt thất bại"),
  })

  const rejectMut = useMutation({
    mutationFn: () => rejectStockAdjustment(Number(id!), approvalNote || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-adjustment", id] })
      qc.invalidateQueries({ queryKey: ["stock-adjustments"] })
      setApprovalAction(null); setApprovalNote("")
      toast.success("Đã từ chối phiếu điều chỉnh")
    },
    onError: (err: Error) => toast.error(err.message || "Từ chối thất bại"),
  })

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
        <p className="text-sm text-muted-foreground">Không tìm thấy phiếu điều chỉnh.</p>
      </div>
    )
  }

  const st = statusLabel[adj.status] ?? { label: adj.status, variant: "secondary" }
  const isManager = user?.role === "MANAGER" || user?.role === "ADMIN"
  const canApprove = adj.status === "PENDING" && isManager

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/stock/adjustments")}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-xl font-semibold tracking-tight font-mono">{adj.adjustCode}</h1>
        <Badge variant={typeColor[adj.type] ?? "outline"}>{typeLabel[adj.type] ?? adj.type}</Badge>
        <Badge variant={st.variant}>{st.label}</Badge>
      </div>

      <div className="rounded-lg border p-6 space-y-4">
        <div className="grid grid-cols-2 gap-6 text-sm">
          <div>
            <span className="text-muted-foreground">Sản phẩm</span>
            <p className="font-medium text-base mt-0.5">{adj.productName ?? "—"}</p>
            {adj.productSku && <p className="text-xs text-muted-foreground">{adj.productSku}</p>}
          </div>
          {adj.serialNumber && (
            <div>
              <span className="text-muted-foreground">Serial</span>
              <p className="font-mono text-sm mt-0.5">{adj.serialNumber}</p>
            </div>
          )}
          {adj.quantity && (
            <div>
              <span className="text-muted-foreground">Số lượng</span>
              <p className="font-medium mt-0.5">{adj.quantity}</p>
            </div>
          )}
          {adj.imageUrl && (
            <div>
              <span className="text-muted-foreground">Ảnh minh chứng</span>
              <a href={adj.imageUrl} target="_blank" rel="noopener noreferrer" className="block mt-0.5 text-sm text-primary underline">
                Xem ảnh
              </a>
            </div>
          )}
        </div>

        <div>
          <span className="text-sm text-muted-foreground">Lý do</span>
          <p className="mt-1 text-sm leading-relaxed rounded-md border bg-muted/20 px-4 py-3">{adj.reason}</p>
        </div>

        <div className="grid grid-cols-2 gap-6 text-sm border-t pt-4">
          <div>
            <span className="text-muted-foreground">Người tạo</span>
            <p className="font-medium mt-0.5">{adj.createdByName}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Ngày tạo</span>
            <p className="mt-0.5">{new Date(adj.createdAt).toLocaleString("vi-VN")}</p>
          </div>
          {adj.approvedByName && (
            <>
              <div>
                <span className="text-muted-foreground">Người duyệt</span>
                <p className="font-medium mt-0.5">{adj.approvedByName}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Ngày duyệt</span>
                <p className="mt-0.5">{new Date(adj.updatedAt).toLocaleString("vi-VN")}</p>
              </div>
            </>
          )}
          {adj.approvalNote && (
            <div className="col-span-2">
              <span className="text-muted-foreground">Ghi chú duyệt</span>
              <p className="mt-1 text-sm leading-relaxed rounded-md border bg-muted/20 px-3 py-2">{adj.approvalNote}</p>
            </div>
          )}
        </div>
      </div>

      {canApprove && (
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setApprovalAction("reject")}>
            <X className="size-4 mr-1" /> Từ chối
          </Button>
          <Button onClick={() => setApprovalAction("approve")}>
            <Check className="size-4 mr-1" /> Duyệt
          </Button>
        </div>
      )}

      <Dialog open={!!approvalAction} onOpenChange={(v) => { if (!v) { setApprovalAction(null); setApprovalNote("") } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{approvalAction === "approve" ? "Duyệt phiếu điều chỉnh" : "Từ chối phiếu điều chỉnh"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Ghi chú (không bắt buộc)</label>
            <Textarea
              value={approvalNote}
              onChange={(e) => setApprovalNote(e.target.value)}
              placeholder="Nhập ghi chú..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setApprovalAction(null); setApprovalNote("") }}>Hủy</Button>
            <Button
              onClick={() => {
                if (approvalAction === "approve") approveMut.mutate()
                else rejectMut.mutate()
              }}
              disabled={approveMut.isPending || rejectMut.isPending}
              variant={approvalAction === "reject" ? "destructive" : "default"}
            >
              {approvalAction === "approve" ? "Xác nhận duyệt" : "Xác nhận từ chối"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
