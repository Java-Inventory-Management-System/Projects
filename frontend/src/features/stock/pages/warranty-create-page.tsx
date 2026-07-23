import { useState } from "react"
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
import { ArrowLeft, Search, ShieldCheck, X } from "lucide-react"
import { toast } from "@/utils/toast"
import type { WarrantyLookup } from "@/utils/types"

export const WarrantyCreatePage = () => {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [serialNumber, setSerialNumber] = useState("")
  const [customerQuery, setCustomerQuery] = useState("")
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null)
  const [selectedCustomerName, setSelectedCustomerName] = useState<string | null>(null)
  const [issueDescription, setIssueDescription] = useState("")
  const [note, setNote] = useState("")
  const [allowExpired, setAllowExpired] = useState(false)
  const [lookup, setLookup] = useState<WarrantyLookup | null>(null)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupError, setLookupError] = useState("")

  const handleLookup = async () => {
    if (!serialNumber.trim()) return
    setLookupLoading(true)
    setLookupError("")
    setLookup(null)
    try {
      const result = await lookupWarranty(serialNumber.trim())
      setLookup(result)
      if (result.customerName && !selectedCustomerId) {
        setSelectedCustomerId(result.customerId)
        setSelectedCustomerName(result.customerName)
      }
    } catch {
      setLookupError("Không tìm thấy serial hoặc có lỗi xảy ra")
    } finally {
      setLookupLoading(false)
    }
  }

  const { data: customersData } = useQuery({
    queryKey: ["customers", customerQuery],
    queryFn: () => getCustomers(0, 50, customerQuery || undefined),
    enabled: customerQuery.length > 0,
  })

  const createMut = useMutation({
    mutationFn: createWarrantyRequest,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["warranty-requests"] })
      toast.success("Tiếp nhận bảo hành thành công")
      navigate("/warranty")
    },
    onError: (err: Error) => toast.error(err.message || "Có lỗi xảy ra"),
  })

  const canSubmit = serialNumber.trim() && selectedCustomerId && issueDescription.trim()

  const handleSubmit = () => {
    if (!canSubmit) return
    createMut.mutate({
      serialNumber: serialNumber.trim(),
      customerId: selectedCustomerId,
      issueDescription: issueDescription.trim(),
      note: note.trim() || undefined,
      allowExpired: allowExpired || undefined,
    })
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/warranty")}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-xl font-semibold tracking-tight">Tiếp nhận bảo hành</h1>
      </div>

      <div className="space-y-4 rounded-lg border p-6">
        <div className="space-y-2">
          <Label htmlFor="serial">
            Tra cứu serial <span className="text-destructive">*</span>
          </Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="serial"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="Nhập serial sản phẩm..."
                className="pl-9"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleLookup()
                }}
              />
            </div>
            <Button onClick={handleLookup} disabled={lookupLoading || !serialNumber.trim()}>
              {lookupLoading ? "Đang tra..." : "Tra cứu"}
            </Button>
          </div>
        </div>

        {lookupLoading && (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-8 w-48" />
          </div>
        )}

        {lookupError && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
            {lookupError}
          </div>
        )}

        {lookup && (
          <div className="rounded-lg border bg-muted/10 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" />
              <span className="font-medium">{lookup.productName}</span>
              <span className="text-xs text-muted-foreground">{lookup.productSku}</span>
              <span className="font-mono text-xs text-muted-foreground">{lookup.serialNumber}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Trạng thái:</span>
                <span className="ml-2 font-medium">{lookup.productUnitStatus}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Bảo hành:</span>
                <Badge variant={lookup.eligible ? "default" : "destructive"} className="ml-2">
                  {lookup.eligible ? "Còn BH" : "Hết BH"}
                </Badge>
              </div>
              {lookup.customerName && (
                <div>
                  <span className="text-muted-foreground">Khách mua:</span>
                  <span className="ml-2">{lookup.customerName}</span>
                </div>
              )}
              {lookup.saleReceiptCode && (
                <div>
                  <span className="text-muted-foreground">Đơn xuất:</span>
                  <span className="ml-2 font-mono text-xs">{lookup.saleReceiptCode}</span>
                </div>
              )}
              {lookup.warrantyExpiresAt && (
                <div>
                  <span className="text-muted-foreground">Hết hạn BH:</span>
                  <span className="ml-2">{new Date(lookup.warrantyExpiresAt).toLocaleDateString("vi-VN")}</span>
                </div>
              )}
            </div>
            {lookup.history.length > 0 && (
              <div className="border-t pt-2">
                <span className="text-xs text-muted-foreground">Lịch sử BH ({lookup.history.length} lần)</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-4 rounded-lg border p-6">
        <div className="space-y-2">
          <Label>
            Khách hàng <span className="text-destructive">*</span>
          </Label>
          {selectedCustomerId ? (
            <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
              <span className="flex-1 font-medium">{selectedCustomerName}</span>
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={() => {
                  setSelectedCustomerId(null)
                  setSelectedCustomerName(null)
                }}
              >
                <X className="size-3" />
              </Button>
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={customerQuery}
                onChange={(e) => setCustomerQuery(e.target.value)}
                placeholder="Tìm khách hàng..."
                className="pl-9"
              />
            </div>
          )}
          {!selectedCustomerId && customersData && customersData.content.length > 0 && (
            <div className="rounded-lg border max-h-32 overflow-y-auto divide-y text-sm">
              {customersData.content.map((c) => (
                <div
                  key={c.id}
                  className="flex cursor-pointer items-center justify-between px-3 py-1.5 hover:bg-muted/30"
                  onClick={() => {
                    setSelectedCustomerId(c.id)
                    setSelectedCustomerName(c.name)
                    setCustomerQuery("")
                  }}
                >
                  <span className="font-medium">{c.name}</span>
                  {c.phone && <span className="text-xs text-muted-foreground">{c.phone}</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="issue">
            Mô tả lỗi <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="issue"
            value={issueDescription}
            onChange={(e) => setIssueDescription(e.target.value)}
            placeholder="Mô tả chi tiết lỗi khách báo..."
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="note">Ghi chú nội bộ</Label>
          <Textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ghi chú (không bắt buộc)..."
            rows={2}
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="allowExpired"
            checked={allowExpired}
            onChange={(e) => setAllowExpired(e.target.checked)}
            className="accent-primary"
          />
          <Label htmlFor="allowExpired" className="text-sm text-muted-foreground">
            Cho phép tiếp nhận dù hết hạn BH?
          </Label>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => navigate("/warranty")}>
          Hủy
        </Button>
        <Button onClick={handleSubmit} disabled={!canSubmit || createMut.isPending}>
          {createMut.isPending ? "Đang tạo..." : "Tiếp nhận"}
        </Button>
      </div>
    </div>
  )
}
