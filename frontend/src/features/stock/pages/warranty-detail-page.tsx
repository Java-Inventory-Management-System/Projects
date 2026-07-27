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
import { Check, X, ShieldCheck } from "lucide-react"
import { toast } from "@/utils/toast"
import { WARRANTY_STATUS, WARRANTY_RESOLUTION_TYPE, WARRANTY_RESULT } from "@/utils/types"
import { WarrantyTimeline } from "../components/warranty-timeline"
import { SerialSearchPicker } from "../components/serial-search-picker"

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string }> = {
  [WARRANTY_STATUS.PENDING]: { label: "Chờ xử lý", variant: "secondary" },
  [WARRANTY_STATUS.COMPLETED]: { label: "Đã xong", variant: "default" },
  [WARRANTY_STATUS.CANCELLED]: { label: "Đã hủy", variant: "destructive" },
}

const resolutionMeta: Record<string, { icon: string; title: string; desc: string }> = {
  [WARRANTY_RESOLUTION_TYPE.REPLACE]: { icon: "🔄", title: "Đổi mới", desc: "Đổi serial mới, giữ nguyên hạn BH gốc." },
  [WARRANTY_RESOLUTION_TYPE.RMA]: { icon: "📦", title: "Gửi NCC (RMA)", desc: "Gửi nhà cung cấp bảo hành. Cần RMA number." },
  [WARRANTY_RESOLUTION_TYPE.REPAIR]: { icon: "🔧", title: "Sửa chữa", desc: "Sửa tại kho. Unit giữ nguyên serial." },
  [WARRANTY_RESOLUTION_TYPE.REJECT]: { icon: "✕", title: "Từ chối", desc: "Từ chối yêu cầu. Unit trả khách nguyên trạng." },
  [WARRANTY_RESOLUTION_TYPE.RETURN_SUPPLIER]: { icon: "📤", title: "Trả NCC", desc: "Trả lại nhà cung cấp." },
}

export const WarrantyDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const perm = usePermission()

  const [dialog, setDialog] = useState<"resolve" | "complete" | "cancel" | null>(null)
  const [resolutionType, setResolutionType] = useState("")
  const [replacementUnitId, setReplacementUnitId] = useState<number | undefined>()
  const [rmaNumber, setRmaNumber] = useState("")
  const [expectedReturnAt, setExpectedReturnAt] = useState("")
  const [partnerNote, setPartnerNote] = useState("")
  const [result, setResult] = useState("")
  const [cancelNote, setCancelNote] = useState("")
  const [resolveNote, setResolveNote] = useState("")

  const isManager = perm.hasRole(...ROLES.CAN_APPROVE)

  const { data: wr, isLoading } = useQuery({
    queryKey: ["warranty-request", id],
    queryFn: () => getWarrantyRequestById(Number(id)),
    enabled: !!id,
  })

  const resolveMut = useMutation({
    mutationFn: () =>
      resolveWarrantyRequest(Number(id!), {
        resolutionType,
        replacementUnitId,
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
    setReplacementUnitId(undefined)
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

  const cfg = statusConfig[wr.status] ?? { label: wr.status, variant: "secondary" as const }
  const hasResolution = !!wr.resolutionType
  const isPending = wr.status === WARRANTY_STATUS.PENDING
  const isCompleted = wr.status === WARRANTY_STATUS.COMPLETED


  const milestones = [
    { label: "Tạo phiếu", timestamp: wr.createdAt, actor: null, done: true },
    { label: "Xử lý", timestamp: null, actor: null, done: hasResolution || !isPending },
    { label: "Kết thúc", timestamp: wr.completedAt, actor: wr.handledByName, done: !isPending },
  ]

  const showResolveCards = isPending && !hasResolution && isManager
  const showRepairPanel = isPending && wr.resolutionType === WARRANTY_RESOLUTION_TYPE.REPAIR
  const showRmaPanel = isPending && wr.resolutionType === WARRANTY_RESOLUTION_TYPE.RMA
  const showComplete = (showRepairPanel || showRmaPanel) && isManager
  const showCancel = isPending && isManager

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

      <div className="flex items-center gap-3">
        <Badge variant={cfg.variant} className={cfg.className}>{cfg.label}</Badge>
        <span className="font-mono text-xs text-muted-foreground">{wr.requestCode}</span>
      </div>

      <div className="rounded-lg border p-6">
        <WarrantyTimeline milestones={milestones} />
      </div>

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

      {showResolveCards && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Chọn hướng xử lý</h3>
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

      {isPending && !hasResolution && !isManager && (
        <div className="rounded-lg border border-muted bg-muted/10 p-4 text-center text-sm text-muted-foreground">
          Đang chờ QL xử lý.
        </div>
      )}

      {showRepairPanel && (
        <div className="rounded-lg border p-6 space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Sửa chữa</h3>
          <p className="text-sm text-muted-foreground">Đang sửa chữa tại kho. Xác nhận kết quả để hoàn tất.</p>
        </div>
      )}

      {showRmaPanel && (
        <div className="rounded-lg border p-6 space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Gửi NCC</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {wr.rmaNumber && (
              <div>
                <span className="text-muted-foreground">RMA number</span>
                <p className="font-mono mt-0.5">{wr.rmaNumber}</p>
              </div>
            )}
            {wr.sentToPartnerAt && (
              <div>
                <span className="text-muted-foreground">Ngày gửi</span>
                <p className="mt-0.5">{new Date(wr.sentToPartnerAt).toLocaleDateString("vi-VN")}</p>
              </div>
            )}
            {wr.expectedReturnAt && (
              <div>
                <span className="text-muted-foreground">Dự kiến trả</span>
                <p className="mt-0.5">{new Date(wr.expectedReturnAt).toLocaleDateString("vi-VN")}</p>
              </div>
            )}
            {wr.partnerNote && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Ghi chú NCC</span>
                <p className="mt-0.5">{wr.partnerNote}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {isCompleted && wr.resolutionType && (
        <div className="rounded-lg border p-6 space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Kết quả</h3>
          <div className="flex items-center gap-3">
            {resolutionMeta[wr.resolutionType] && (
              <>
                <span className="text-2xl">{resolutionMeta[wr.resolutionType]?.icon}</span>
                <div>
                  <p className="font-semibold">{resolutionMeta[wr.resolutionType]?.title}</p>
                  <p className="text-sm text-muted-foreground">{resolutionMeta[wr.resolutionType]?.desc}</p>
                </div>
              </>
            )}
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

      <div className="flex flex-wrap justify-end gap-2">
        {showCancel && (
          <Button variant="outline" className="text-destructive" onClick={() => setDialog("cancel")}>
            <X className="size-4 mr-1" /> Hủy phiếu
          </Button>
        )}
        {showComplete && (
          <Button onClick={() => setDialog("complete")}>
            <Check className="size-4 mr-1" /> Xác nhận kết quả
          </Button>
        )}
      </div>

      <Dialog open={dialog === "resolve"} onOpenChange={(v) => { if (!v) { setDialog(null); resetResolve() } }}>
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
                <SerialSearchPicker
                  productName={wr.productName}
                  productId={wr.productId}
                  excludeUnitId={wr.productUnitId}
                  value={replacementUnitId ?? null}
                  onChange={(id) => setReplacementUnitId(id ?? undefined)}
                  disabled={resolveMut.isPending}
                />
              )}

              {resolutionType === WARRANTY_RESOLUTION_TYPE.RMA && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="rma">RMA number <span className="text-destructive">*</span></Label>
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

              {resolutionType === WARRANTY_RESOLUTION_TYPE.REJECT && (
                <div className="space-y-2">
                  <Label htmlFor="rejectNote">Lý do từ chối <span className="text-destructive">*</span></Label>
                  <Textarea id="rejectNote" value={resolveNote} onChange={(e) => setResolveNote(e.target.value)} rows={2} placeholder="Bắt buộc nhập lý do từ chối" />
                </div>
              )}

              {resolutionType !== WARRANTY_RESOLUTION_TYPE.REJECT && (
                <div className="space-y-2">
                  <Label htmlFor="resolveNote">Ghi chú</Label>
                  <Textarea id="resolveNote" value={resolveNote} onChange={(e) => setResolveNote(e.target.value)} rows={2} />
                </div>
              )}
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
            <DialogTitle>Kết quả thực thi</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {wr?.resolutionType && (
              <div className="rounded-lg border p-3 bg-muted/10 text-sm">
                <span className="text-muted-foreground">Hướng xử lý:</span>{" "}
                <span className="font-medium">{resolutionMeta[wr.resolutionType]?.title}</span>
              </div>
            )}
            <div className="space-y-2">
              <Label>Kết quả <span className="text-destructive">*</span></Label>
              <select value={result} onChange={(e) => setResult(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                <option value="">Chọn kết quả</option>
                <option value={WARRANTY_RESULT.REPAIRED}>Đã sửa xong</option>
                {wr?.resolutionType === WARRANTY_RESOLUTION_TYPE.RMA && (
                  <option value={WARRANTY_RESULT.LOST}>Thất lạc / mất</option>
                )}
                {wr?.resolutionType === WARRANTY_RESOLUTION_TYPE.REPAIR && (
                  <option value={WARRANTY_RESULT.DEFECTIVE}>Lỗi không sửa được</option>
                )}
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
