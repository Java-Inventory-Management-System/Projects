import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getWarrantyRequestById,
  resolveWarrantyRequest,
  completeWarrantyRequest,
  cancelWarrantyRequest,
} from "@/services/warranty-service"
import { usePermission } from "@/hooks/use-permission"
import { ROLES } from "@/utils/permissions"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { WARRANTY_STATUS, WARRANTY_RESOLUTION_TYPE, WARRANTY_RESULT } from "@/utils/types"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Empty, EmptyTitle } from "@/components/ui/empty"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Check, X, ShieldCheck, AlertTriangle } from "lucide-react"
import { toast } from "@/utils/toast"
import { WarrantyTimeline } from "../components/warranty-timeline"

const statusLabel: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string }> = {
  [WARRANTY_STATUS.PENDING]: { label: "Chờ tiếp nhận", variant: "secondary" },
  [WARRANTY_STATUS.RECEIVED]: { label: "Đang kiểm tra", variant: "outline", className: "border-blue-300 text-blue-600 dark:text-blue-400" },
  [WARRANTY_STATUS.UNDER_EVALUATION]: { label: "Chờ QL duyệt", variant: "outline", className: "border-amber-300 text-amber-600 dark:text-amber-400" },
  [WARRANTY_STATUS.RESOLVED]: { label: "Đã xử lý", variant: "default" },
}

const resolutionMeta: Record<string, { icon: string; title: string; desc: string }> = {
  [WARRANTY_RESOLUTION_TYPE.REPAIR]: { icon: "🔧", title: "Sửa chữa", desc: "Sửa tại kho hoặc gửi NCC. Unit giữ nguyên serial." },
  [WARRANTY_RESOLUTION_TYPE.REPLACE]: { icon: "🔄", title: "Đổi mới", desc: "Đổi serial mới, giữ nguyên hạn BH gốc." },
  [WARRANTY_RESOLUTION_TYPE.REFUND]: { icon: "💰", title: "Hoàn tiền", desc: "Hoàn tiền cho khách, unit → returned." },
  [WARRANTY_RESOLUTION_TYPE.REJECT]: { icon: "✕", title: "Từ chối", desc: "Từ chối yêu cầu bảo hành. Unit trả khách nguyên trạng." },
}

export const WarrantyDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const perm = usePermission()

  const [dialog, setDialog] = useState<"resolve" | "complete" | "cancel" | null>(null)
  const [resolutionType, setResolutionType] = useState("")
  const [rmaNumber, setRmaNumber] = useState("")
  const [expectedReturnAt, setExpectedReturnAt] = useState("")
  const [partnerNote, setPartnerNote] = useState("")
  const [result, setResult] = useState("")
  const [cancelNote, setCancelNote] = useState("")
  const [resolveNote, setResolveNote] = useState("")

  const isManager = perm.hasRole(...ROLES.CAN_APPROVE)
  const isStock = perm.hasRole("STOCK")
  const isSales = perm.hasRole("SALES")

  const { data: wr, isLoading } = useQuery({
    queryKey: ["warranty-request", id],
    queryFn: () => getWarrantyRequestById(Number(id)),
    enabled: !!id,
  })

  const resolveMut = useMutation({
    mutationFn: () =>
      resolveWarrantyRequest(Number(id!), {
        resolutionType,
        rmaNumber: rmaNumber.trim() || undefined,
        expectedReturnAt: expectedReturnAt || undefined,
        partnerNote: partnerNote.trim() || undefined,
        note: resolveNote.trim() || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["warranty-request", id] })
      qc.invalidateQueries({ queryKey: ["warranty-requests"] })
      setDialog(null)
      resetResolve()
      toast.success("Đã xử lý phiếu bảo hành")
    },
    onError: (err: Error) => toast.error(err.message || "Xử lý thất bại"),
  })

  const completeMut = useMutation({
    mutationFn: () => completeWarrantyRequest(Number(id!), { result, note: resolveNote.trim() || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["warranty-request", id] })
      qc.invalidateQueries({ queryKey: ["warranty-requests"] })
      setDialog(null)
      setResult("")
      setResolveNote("")
      toast.success("Đã hoàn tất phiếu bảo hành")
    },
    onError: (err: Error) => toast.error(err.message || "Hoàn tất thất bại"),
  })

  const cancelMut = useMutation({
    mutationFn: () => cancelWarrantyRequest(Number(id!), { note: cancelNote }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["warranty-request", id] })
      qc.invalidateQueries({ queryKey: ["warranty-requests"] })
      setDialog(null)
      setCancelNote("")
      toast.success("Đã hủy phiếu bảo hành")
    },
    onError: (err: Error) => toast.error(err.message || "Hủy thất bại"),
  })

  const resetResolve = () => {
    setResolutionType("")
    setRmaNumber("")
    setExpectedReturnAt("")
    setPartnerNote("")
    setResolveNote("")
  }

  if (isLoading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )

  if (!wr)
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Empty>
          <EmptyTitle>Không tìm thấy phiếu bảo hành.</EmptyTitle>
        </Empty>
      </div>
    )

  const st = statusLabel[wr.status] ?? { label: wr.status, variant: "secondary" as const }
  const milestones = [
    { label: "Tiếp nhận", timestamp: wr.createdAt, actor: wr.createdByName, done: true },
    { label: "Đã nhận", timestamp: null, actor: null, done: wr.status !== WARRANTY_STATUS.PENDING },
    { label: "Đang đánh giá", timestamp: null, actor: null, done: wr.status === WARRANTY_STATUS.UNDER_EVALUATION || wr.status === WARRANTY_STATUS.RESOLVED },
    { label: "Hoàn tất", timestamp: wr.completedAt, actor: wr.handledByName, done: wr.status === WARRANTY_STATUS.RESOLVED },
  ]

  const canResolve = (wr.status === WARRANTY_STATUS.RECEIVED || wr.status === WARRANTY_STATUS.UNDER_EVALUATION) && isManager
  const canComplete = wr.status === WARRANTY_STATUS.UNDER_EVALUATION && isStock
  const canCancel = (wr.status === WARRANTY_STATUS.PENDING || wr.status === WARRANTY_STATUS.RECEIVED) && isManager
  const isReadOnly = isSales || (!canResolve && !canComplete && !canCancel)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => navigate("/warranty")}>Bảo hành</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{wr.requestCode}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant={st.variant} className={st.className}>{st.label}</Badge>
          <span className="font-mono text-xs text-muted-foreground">{wr.requestCode}</span>
        </div>
      </div>

      {/* Timeline */}
      <div className="rounded-lg border p-6">
        <WarrantyTimeline milestones={milestones} />
      </div>

      {/* Thông tin khách/SP */}
      <div className="rounded-lg border p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="size-5 text-primary" />
          <span className="font-semibold text-base">{wr.productName}</span>
          {wr.productSku && <span className="text-xs text-muted-foreground">{wr.productSku}</span>}
        </div>
        <div className="grid grid-cols-2 gap-6 text-sm">
          <div>
            <span className="text-muted-foreground">Serial</span>
            <p className="font-mono text-sm mt-0.5">{wr.serialNumber}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Khách hàng</span>
            <p className="font-medium mt-0.5">{wr.customerName ?? "—"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Ngày tạo</span>
            <p className="mt-0.5">{new Date(wr.createdAt).toLocaleString("vi-VN")}</p>
          </div>
          {wr.handledByName && (
            <div>
              <span className="text-muted-foreground">Người xử lý</span>
              <p className="font-medium mt-0.5">{wr.handledByName}</p>
            </div>
          )}
        </div>
        <div>
          <span className="text-sm text-muted-foreground">Mô tả lỗi</span>
          <p className="mt-1 text-sm leading-relaxed rounded-md border bg-muted/20 px-4 py-3">{wr.issueDescription}</p>
        </div>
        {wr.note && (
          <div>
            <span className="text-sm text-muted-foreground">Ghi chú</span>
            <p className="mt-1 text-sm leading-relaxed rounded-md border bg-muted/20 px-4 py-3">{wr.note}</p>
          </div>
        )}
      </div>

      {/* Panel động theo state */}
      {isReadOnly && wr.status !== WARRANTY_STATUS.RESOLVED && (
        <div className="rounded-lg border border-muted bg-muted/10 p-4 text-center text-sm text-muted-foreground">
          {wr.status === WARRANTY_STATUS.UNDER_EVALUATION
            ? "Đang chờ QL duyệt hướng xử lý."
            : "Phiếu đang được xử lý."}
        </div>
      )}

      {wr.status === WARRANTY_STATUS.RESOLVED && wr.resolutionType && (
        <div className="rounded-lg border p-6 space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Kết quả xử lý</h3>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{resolutionMeta[wr.resolutionType]?.icon ?? "🔧"}</span>
            <div>
              <p className="font-semibold">{resolutionMeta[wr.resolutionType]?.title ?? wr.resolutionType}</p>
              <p className="text-sm text-muted-foreground">{resolutionMeta[wr.resolutionType]?.desc ?? ""}</p>
            </div>
          </div>
          {wr.replacementSerialNumber && (
            <div className="text-sm">
              <span className="text-muted-foreground">Serial thay thế:</span>
              <span className="ml-2 font-mono">{wr.replacementSerialNumber}</span>
            </div>
          )}
          {wr.rmaNumber && (
            <div className="text-sm">
              <span className="text-muted-foreground">RMA:</span>
              <span className="ml-2 font-mono">{wr.rmaNumber}</span>
            </div>
          )}
        </div>
      )}

      {/* UNDER_EVALUATION — QL: 4 Resolution Cards */}
      {canResolve && wr.status === WARRANTY_STATUS.UNDER_EVALUATION && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Chọn hướng xử lý</h3>
          {isManager && (
            <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
              <AlertTriangle className="size-3 inline mr-1 -mt-0.5" />
              Đang duyệt thay QL
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(resolutionMeta).map(([key, meta]) => (
              <button
                key={key}
                type="button"
                onClick={() => { setResolutionType(key); setDialog("resolve") }}
                className="text-left rounded-lg border p-4 hover:border-primary hover:bg-accent/30 transition-colors space-y-2"
              >
                <span className="text-2xl block">{meta.icon}</span>
                <p className="font-semibold text-sm">{meta.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{meta.desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* RECEIVED — STOCK: form check (không có BE endpoint, hiện hướng dẫn) */}
      {wr.status === WARRANTY_STATUS.RECEIVED && isStock && (
        <div className="rounded-lg border p-4 text-sm text-muted-foreground">
          <p>Đã nhận hàng từ khách. Vui lòng kiểm tra và chuyển sang bước đánh giá.</p>
        </div>
      )}

      {/* PENDING — STOCK: nút nhận hàng */}
      {wr.status === WARRANTY_STATUS.PENDING && isStock && (
        <div className="rounded-lg border p-4 text-sm text-muted-foreground">
          <p>Khách đã gửi hàng chưa nhận vào kho.</p>
        </div>
      )}

      {/* RESOLVED — STOCK: execute panel */}
      {wr.status === WARRANTY_STATUS.RESOLVED && isStock && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Thực thi</h3>
          <div className="rounded-lg border p-4">
            {wr.resolutionType === WARRANTY_RESOLUTION_TYPE.REPAIR && (
              <p className="text-sm text-muted-foreground">Xác nhận đã sửa xong để hoàn tất phiếu.</p>
            )}
            {wr.resolutionType === WARRANTY_RESOLUTION_TYPE.REPLACE && (
              <p className="text-sm text-muted-foreground">Đã đổi hàng cho khách.</p>
            )}
            {wr.resolutionType === WARRANTY_RESOLUTION_TYPE.REFUND && (
              <p className="text-sm text-muted-foreground">Đã hoàn tiền cho khách.</p>
            )}
          </div>
          <Button onClick={() => setDialog("complete")}>
            <Check className="size-4 mr-1" /> Xác nhận hoàn tất
          </Button>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap justify-end gap-2">
        {canCancel && (
          <Button variant="outline" className="text-destructive" onClick={() => setDialog("cancel")}>
            <X className="size-4 mr-1" /> Hủy phiếu
          </Button>
        )}
        {canComplete && (
          <Button onClick={() => setDialog("complete")}>
            <Check className="size-4 mr-1" /> Hoàn tất
          </Button>
        )}
      </div>

      {/* Resolve dialog */}
      <Dialog
        open={dialog === "resolve"}
        onOpenChange={(v) => {
          if (!v) { setDialog(null); resetResolve() }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Xác nhận hướng xử lý</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[65vh]">
            <div className="space-y-4">
              <div className="rounded-lg border p-4 bg-muted/10">
                <span className="text-2xl block mb-1">{resolutionMeta[resolutionType]?.icon}</span>
                <p className="font-semibold">{resolutionMeta[resolutionType]?.title}</p>
                <p className="text-sm text-muted-foreground">{resolutionMeta[resolutionType]?.desc}</p>
              </div>

              {resolutionType === WARRANTY_RESOLUTION_TYPE.REPLACE && (
                <div className="space-y-2">
                  <Label htmlFor="rma">Serial thay thế (nếu có)</Label>
                  <Input id="rma" value={rmaNumber} onChange={(e) => setRmaNumber(e.target.value)} placeholder="Nhập serial sản phẩm thay thế..." />
                </div>
              )}

              {resolutionType === WARRANTY_RESOLUTION_TYPE.REPAIR && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="rma">RMA number (nếu gửi NCC)</Label>
                    <Input id="rma" value={rmaNumber} onChange={(e) => setRmaNumber(e.target.value)} placeholder="VD: RMA-2026-001" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expected">Dự kiến trả hàng</Label>
                    <Input id="expected" type="date" value={expectedReturnAt} onChange={(e) => setExpectedReturnAt(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="partnerNote">Ghi chú từ NCC</Label>
                    <Textarea id="partnerNote" value={partnerNote} onChange={(e) => setPartnerNote(e.target.value)} rows={2} />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="resolveNote">Ghi chú</Label>
                <Textarea id="resolveNote" value={resolveNote} onChange={(e) => setResolveNote(e.target.value)} rows={2} />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialog(null); resetResolve() }}>Hủy</Button>
            <Button onClick={() => resolveMut.mutate()} disabled={!resolutionType || resolveMut.isPending}>
              {resolveMut.isPending ? "Đang xử lý..." : "Xác nhận"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "complete"} onOpenChange={(v) => { if (!v) { setDialog(null); setResult(""); setResolveNote("") } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hoàn tất phiếu bảo hành</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Kết quả <span className="text-destructive">*</span></Label>
              <select value={result} onChange={(e) => setResult(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                <option value="">Chọn kết quả</option>
                <option value={WARRANTY_RESULT.REPAIRED}>Đã sửa xong</option>
                <option value={WARRANTY_RESULT.REPLACED}>Đã đổi hàng</option>
                <option value={WARRANTY_RESULT.REFUNDED}>Đã hoàn tiền</option>
                <option value={WARRANTY_RESULT.REJECTED}>Đã từ chối</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Ghi chú</Label>
              <Textarea value={resolveNote} onChange={(e) => setResolveNote(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialog(null); setResult(""); setResolveNote("") }}>Hủy</Button>
            <Button onClick={() => completeMut.mutate()} disabled={!result || completeMut.isPending}>
              {completeMut.isPending ? "Đang hoàn tất..." : "Xác nhận"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "cancel"} onOpenChange={(v) => { if (!v) { setDialog(null); setCancelNote("") } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hủy phiếu bảo hành</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Lý do hủy <span className="text-destructive">*</span></Label>
            <Textarea value={cancelNote} onChange={(e) => setCancelNote(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialog(null); setCancelNote("") }}>Hủy</Button>
            <Button variant="destructive" onClick={() => cancelMut.mutate()} disabled={!cancelNote.trim() || cancelMut.isPending}>
              {cancelMut.isPending ? "Đang hủy..." : "Xác nhận hủy"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
