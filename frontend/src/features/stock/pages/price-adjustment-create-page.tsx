import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createPriceAdjustment } from "@/services/price-adjustment-service"
import { getImportReceipts } from "@/services/import-service"
import type { ImportReceipt, ResponsePage } from "@/utils/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/utils/toast"

export function PriceAdjustmentCreatePage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [receipts, setReceipts] = useState<ImportReceipt[]>([])
  const [receiptId, setReceiptId] = useState("")
  const [selectedItem, setSelectedItem] = useState("")
  const [newPrice, setNewPrice] = useState("")
  const [reason, setReason] = useState("")

  useEffect(() => {
    getImportReceipts(0, 50).then((r: ResponsePage<ImportReceipt>) => setReceipts(r.content))
  }, [])

  const currentReceipt = receipts.find((r) => r.id === Number(receiptId))
  const selectedReceiptItem = currentReceipt?.items.find((item) => item.id === Number(selectedItem))
  const oldPrice = selectedReceiptItem?.unitPrice ?? 0

  const save = useMutation({
    mutationFn: () =>
      createPriceAdjustment({
        importReceiptItemId: Number(selectedItem),
        newPrice: Number(newPrice),
        reason: reason.trim(),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["price-adjustments"] })
      toast.success("Tạo phiếu điều chỉnh giá thành công")
      navigate("/stock/price-adjustments")
    },
    onError: (e: Error) => toast.error(e.message || "Không thể tạo phiếu điều chỉnh giá"),
  })

  const handleSubmit = () => {
    if (!selectedItem) {
      toast.error("Chọn sản phẩm cần điều chỉnh")
      return
    }
    if (!newPrice || Number(newPrice) < 0) {
      toast.error("Giá mới không hợp lệ")
      return
    }
    if (!reason.trim()) {
      toast.error("Nhập lý do điều chỉnh")
      return
    }
    save.mutate()
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/stock/price-adjustments")}>
          <ArrowLeft className="size-4 mr-1" /> Quay lại
        </Button>
        <h1 className="text-xl font-semibold tracking-tight">Tạo phiếu điều chỉnh giá</h1>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Phiếu nhập</Label>
          <Select
            value={receiptId}
            onValueChange={(v) => {
              setReceiptId(v)
              setSelectedItem("")
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Chọn phiếu nhập" />
            </SelectTrigger>
            <SelectContent>
              {receipts.map((r) => (
                <SelectItem key={r.id} value={String(r.id)}>
                  {r.receiptCode} - {r.supplierName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {currentReceipt && (
          <div className="space-y-2">
            <Label>Sản phẩm</Label>
            <Select value={selectedItem} onValueChange={setSelectedItem}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn sản phẩm" />
              </SelectTrigger>
              <SelectContent>
                {currentReceipt.items.map((item) => (
                  <SelectItem key={item.id} value={String(item.id)}>
                    {item.productName} (giá cũ: {(item.unitPrice ?? 0).toLocaleString("vi-VN")}₫)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {selectedReceiptItem && (
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-center gap-4">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Giá cũ</p>
                  <p className="text-lg font-semibold text-muted-foreground">
                    {(oldPrice ?? 0).toLocaleString("vi-VN")}₫
                  </p>
                </div>
                <ArrowRight className="size-5 text-muted-foreground" />
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Giá mới</p>
                  <p className="text-lg font-semibold text-primary">{Number(newPrice || 0).toLocaleString("vi-VN")}₫</p>
                </div>
              </div>
              {Number(newPrice) > 0 && (
                <div className="mt-2 text-center">
                  <span
                    className={`text-xs font-medium ${Number(newPrice) > oldPrice ? "text-destructive" : "text-green-600"}`}
                  >
                    {Number(newPrice) > oldPrice ? "Tăng" : "Giảm"}{" "}
                    {Math.abs(((Number(newPrice) - oldPrice) / oldPrice) * 100).toFixed(1)}%
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="space-y-2">
          <Label htmlFor="newPrice">
            Giá mới <span className="text-destructive">*</span>
          </Label>
          <Input
            id="newPrice"
            type="number"
            min={0}
            required
            value={newPrice}
            onChange={(e) => setNewPrice(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="reason">
            Lý do <span className="text-destructive">*</span>
          </Label>
          <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={() => navigate("/stock/price-adjustments")}>
          Hủy
        </Button>
        <Button onClick={handleSubmit} disabled={save.isPending}>
          {save.isPending ? "Đang tạo..." : "Tạo phiếu"}
        </Button>
      </div>
    </div>
  )
}
