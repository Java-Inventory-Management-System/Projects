import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { lookupWarranty, createWarrantyRequest } from "@/services/warranty-service"
import { getCustomers } from "@/services/customer-service"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, Search, ShieldCheck, AlertTriangle, History, Printer } from "lucide-react"
import { toast } from "@/utils/toast"

interface WarrantyForm {
  serialNumber: string
  customerId: number | null
  issueDescription: string
  note: string
  allowExpired: boolean
}

export const WarrantyCreatePage = () => {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [customerQuery, setCustomerQuery] = useState("")
  const [selectedCustomerName, setSelectedCustomerName] = useState<string | null>(null)
  const [createdId, setCreatedId] = useState<number | null>(null)
  const [lookupKey, setLookupKey] = useState(0)

  const form = useForm<WarrantyForm>({
    defaultValues: { serialNumber: "", customerId: null, issueDescription: "", note: "", allowExpired: false },
  })

  const serialNumber = form.watch("serialNumber")
  const { data: lookup, isFetching: lookupLoading, isError: lookupIsError } = useQuery({
    queryKey: ["warranty-lookup", lookupKey, serialNumber],
    queryFn: () => lookupWarranty(serialNumber.trim()),
    enabled: lookupKey > 0 && !!serialNumber.trim(),
  })
  const lookupError = lookupIsError ? "Không tìm thấy serial hoặc có lỗi xảy ra" : ""

  const handleLookup = () => {
    if (!serialNumber.trim()) return
    setLookupKey((k) => k + 1)
  }

  useEffect(() => {
    if (lookup?.customerName && !form.getValues("customerId")) {
      form.setValue("customerId", lookup.customerId)
      setSelectedCustomerName(lookup.customerName)
    }
  }, [lookup])

  const { data: customersData } = useQuery({
    queryKey: ["customers", customerQuery],
    queryFn: () => getCustomers(0, 50, customerQuery || undefined),
    enabled: customerQuery.length > 0,
  })

  const createMut = useMutation({ mutationFn: createWarrantyRequest })

  const cid = form.watch("customerId")
  const issueDesc = form.watch("issueDescription")
  const allowExpired = form.watch("allowExpired")

  const isExpired = lookup && !lookup.eligible
  const canSubmit = serialNumber.trim() && cid && issueDesc.trim() && (allowExpired || !isExpired)

  const onSubmit = form.handleSubmit((values) => {
    if (!canSubmit) return
    createMut.mutate({
      serialNumber: values.serialNumber.trim(),
      customerId: values.customerId!,
      issueDescription: values.issueDescription.trim(),
      note: values.note.trim() || undefined,
      allowExpired: values.allowExpired || undefined,
    }, {
      onSuccess: (data) => {
        qc.invalidateQueries({ queryKey: ["warranty-requests"] })
        toast.success("Tiếp nhận bảo hành thành công")
        setCreatedId(data.id)
      },
      onError: (err: Error) => toast.error(err.message || "Có lỗi xảy ra"),
    })
  })

  const warrantyDaysLeft = lookup?.warrantyExpiresAt
    ? Math.ceil((new Date(lookup.warrantyExpiresAt).getTime() - Date.now()) / 86400000)
    : 0
  const totalWarrantyMonths = lookup?.warrantyExpiresAt && lookup?.purchaseDate
    ? Math.ceil((new Date(lookup.warrantyExpiresAt).getTime() - new Date(lookup.purchaseDate).getTime()) / 2592000000)
    : 24
  const warrantyPct = lookup?.warrantyExpiresAt
    ? Math.max(0, Math.min(100, (warrantyDaysLeft / (totalWarrantyMonths * 30)) * 100))
    : 0
  const barColor = warrantyDaysLeft > 30 ? "bg-green-500" : warrantyDaysLeft > 0 ? "bg-amber-500" : "bg-red-500"

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/warranty")}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-xl font-semibold tracking-tight">Tiếp nhận bảo hành</h1>
      </div>

      {/* Giai đoạn A — Tra cứu */}
      <div className="space-y-4 rounded-lg border p-6">
        <div className="space-y-2">
          <Label htmlFor="serial">
            Quét hoặc nhập số serial <span className="text-destructive">*</span>
          </Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="serial"
                {...form.register("serialNumber")}
                placeholder="Nhập serial sản phẩm..."
                className="pl-9"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") handleLookup() }}
              />
            </div>
            <Button onClick={handleLookup} disabled={lookupLoading || !serialNumber.trim()}>
              {lookupLoading ? "Đang tra..." : "Tra cứu"}
            </Button>
          </div>
        </div>

        {lookupLoading && (
          <div className="space-y-2">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-8 w-48" />
          </div>
        )}

        {lookupError && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
            {lookupError}. Kiểm tra lại serial hoặc xác nhận khách có mua tại đây không.
          </div>
        )}

        {/* Serial Info Card */}
        {lookup && (
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <ShieldCheck className="size-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{lookup.productName}</p>
                <p className="text-xs text-muted-foreground">
                  {lookup.productSku} — SN: <span className="font-mono">{lookup.serialNumber}</span>
                </p>
              </div>
              <Badge variant={lookup.eligible ? "default" : "destructive"}>
                {lookup.eligible ? "Còn BH" : "Hết BH"}
              </Badge>
            </div>

            {/* Progress bar warranty */}
            {lookup.warrantyExpiresAt && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Hạn BH: {new Date(lookup.warrantyExpiresAt).toLocaleDateString("vi-VN")}</span>
                  <span className={warrantyDaysLeft <= 30 && warrantyDaysLeft > 0 ? "text-amber-600 font-medium" : warrantyDaysLeft <= 0 ? "text-destructive font-medium" : ""}>
                    {warrantyDaysLeft > 0 ? `còn ${warrantyDaysLeft} ngày` : "Đã hết hạn"}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${warrantyPct}%` }} />
                </div>
              </div>
            )}

            {/* Customer info */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              {lookup.customerName && (
                <div>
                  <span className="text-muted-foreground">Khách mua:</span>
                  <span className="ml-1 font-medium">{lookup.customerName}</span>
                </div>
              )}
              {lookup.saleReceiptCode && (
                <div>
                  <span className="text-muted-foreground">Phiếu xuất:</span>
                  <span className="ml-1 font-mono">{lookup.saleReceiptCode}</span>
                </div>
              )}
              {lookup.purchaseDate && (
                <div>
                  <span className="text-muted-foreground">Ngày mua:</span>
                  <span className="ml-1">{new Date(lookup.purchaseDate).toLocaleDateString("vi-VN")}</span>
                </div>
              )}
            </div>

            {/* History */}
            {lookup.history.length > 0 && (
              <div className="border-t pt-2 mt-2">
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                  <History className="size-3" />
                  <span>Lịch sử BH ({lookup.history.length} lần)</span>
                  {lookup.history.length > 2 && <AlertTriangle className="size-3 text-amber-500 ml-1" />}
                </div>
                <div className="space-y-1">
                  {lookup.history.slice(0, 3).map((h) => (
                    <div key={h.id} className="flex justify-between text-xs bg-muted/20 rounded px-2 py-1">
                      <span className="font-mono">{h.requestCode}</span>
                      <span className="text-muted-foreground">{h.resolutionType ?? "—"}</span>
                      <span className="text-muted-foreground">{h.createdAt ? new Date(h.createdAt).toLocaleDateString("vi-VN") : "—"}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Out of warranty banner */}
            {isExpired && (
              <div className="rounded-md border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-400">
                <p className="font-medium">Sản phẩm đã hết hạn bảo hành.</p>
                <p className="text-xs mt-1">Không thể tiếp nhận theo diện BH shop.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Giai đoạn B — Nhập thông tin lỗi */}
      <div className={`space-y-4 rounded-lg border p-6 ${isExpired && !allowExpired ? "opacity-50 pointer-events-none" : ""}`}>
        <div className="space-y-2">
          <Label>
            Khách hàng <span className="text-destructive">*</span>
          </Label>
          {cid ? (
            <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
              <span className="flex-1 font-medium">{selectedCustomerName}</span>
              <Button variant="ghost" size="icon" className="size-6" onClick={() => { form.setValue("customerId", null); setSelectedCustomerName(null) }}>
                <span className="size-3 flex items-center justify-center">✕</span>
              </Button>
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input value={customerQuery} onChange={(e) => setCustomerQuery(e.target.value)} placeholder="Tìm khách hàng..." className="pl-9" />
            </div>
          )}
          {!cid && customersData && customersData.content.length > 0 && (
            <div className="rounded-lg border max-h-32 overflow-y-auto divide-y text-sm">
              {customersData.content.map((c) => (
                <div
                  key={c.id}
                  className="flex cursor-pointer items-center justify-between px-3 py-1.5 hover:bg-muted/30"
                  onClick={() => { form.setValue("customerId", c.id); setSelectedCustomerName(c.name); setCustomerQuery("") }}
                >
                  <span className="font-medium">{c.name}</span>
                  {c.phone && <span className="text-xs text-muted-foreground">{c.phone}</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="issue">Mô tả lỗi <span className="text-destructive">*</span></Label>
          <Textarea id="issue" {...form.register("issueDescription")} placeholder="Mô tả chi tiết lỗi khách báo..." rows={3} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="note">Ghi chú nội bộ</Label>
          <Textarea id="note" {...form.register("note")} placeholder="Ghi chú (không bắt buộc)..." rows={2} />
        </div>
      </div>

      {/* Vẫn tạo phiếu khi hết BH */}
      {isExpired && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <input type="checkbox" id="allowExpired" {...form.register("allowExpired")} className="accent-amber-600" />
          <Label htmlFor="allowExpired" className="text-sm text-amber-700 dark:text-amber-400 cursor-pointer">
            Vẫn tạo phiếu (ngoài BH, tính phí)
          </Label>
        </div>
      )}

      {createdId ? (
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="size-4 mr-1" /> In biên nhận
          </Button>
          <Button onClick={() => navigate(`/warranty/${createdId}`)}>
            Xem phiếu bảo hành
          </Button>
        </div>
      ) : (
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => navigate("/warranty")}>Hủy</Button>
          <Button onClick={onSubmit} disabled={!canSubmit || createMut.isPending}>
            {createMut.isPending ? "Đang tạo..." : "Tiếp nhận"}
          </Button>
        </div>
      )}
    </div>
  )
}
