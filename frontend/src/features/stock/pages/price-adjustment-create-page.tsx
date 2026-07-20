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
import { ArrowLeft } from "lucide-react"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
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

  const save = useMutation({
    mutationFn: () => createPriceAdjustment({
      importReceiptItemId: Number(selectedItem),
      newPrice: Number(newPrice),
      reason: reason.trim(),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["price-adjustments"] }); toast.success("Tạo phiếu điều chỉnh giá thành công"); navigate("/stock/price-adjustments") },
    onError: (e: Error) => toast.error(e.message),
  })

  const handleSubmit = () => {
    if (!selectedItem) { toast.error("Chọn sản phẩm cần điều chỉnh"); return }
    if (!newPrice || Number(newPrice) < 0) { toast.error("Giá mới không hợp lệ"); return }
    if (!reason.trim()) { toast.error("Nhập lý do điều chỉnh"); return }
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
          <Select value={receiptId} onValueChange={(v) => { setReceiptId(v); setSelectedItem("") }}>
            <SelectTrigger><SelectValue placeholder="Chọn phiếu nhập" /></SelectTrigger>
            <SelectContent>
              {receipts.map((r) => <SelectItem key={r.id} value={String(r.id)}>{r.receiptCode} - {r.supplierName}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {currentReceipt && (
          <div className="space-y-2">
            <Label>Sản phẩm</Label>
            <Select value={selectedItem} onValueChange={setSelectedItem}>
              <SelectTrigger><SelectValue placeholder="Chọn sản phẩm" /></SelectTrigger>
              <SelectContent>
                {currentReceipt.items.map((item) => (
                  <SelectItem key={item.id} value={String(item.id)}>
                    {item.productName} (giá cũ: {item.unitPrice.toLocaleString("vi-VN")}₫)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="newPrice">Giá mới <span className="text-destructive">*</span></Label>
          <Input id="newPrice" type="number" min={0} required value={newPrice} onChange={(e) => setNewPrice(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="reason">Lý do <span className="text-destructive">*</span></Label>
          <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={() => navigate("/stock/price-adjustments")}>Hủy</Button>
        <Button onClick={handleSubmit} disabled={save.isPending}>{save.isPending ? "Đang tạo..." : "Tạo phiếu"}</Button>
      </div>
    </div>
  )
}
