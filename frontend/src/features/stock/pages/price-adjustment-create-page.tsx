import { useMemo } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useNavigate } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createPriceAdjustment, getPriceAdjustments } from "@/services/price-adjustment-service"
import { useImportReceipts } from "@/hooks/use-import-receipts"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/utils/toast"
import { FieldError } from "@/components/ui/field"
import { ADJUSTMENT_STATUS, IMPORT_RECEIPT_STATUS } from "@/utils/types"

const schema = z.object({
  receiptId: z.string().min(1, "Chọn phiếu nhập"),
  selectedItem: z.string().min(1, "Chọn sản phẩm cần điều chỉnh"),
  newPrice: z.coerce.number().min(1, "Giá mới phải lớn hơn 0"),
  reason: z.string().min(1, "Nhập lý do điều chỉnh"),
})

export function PriceAdjustmentCreatePage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data: receiptsRes } = useImportReceipts(0, 50, undefined, IMPORT_RECEIPT_STATUS.COMPLETED)

  const { data: pendingAdjustments } = useQuery({
    queryKey: ["price-adjustments", "pending-items"],
    queryFn: async () => {
      const res = await getPriceAdjustments(0, 999, undefined, ADJUSTMENT_STATUS.PENDING)
      return new Set(res.content.map((a) => a.importReceiptItemId))
    },
  })

  const form = useForm({ resolver: zodResolver(schema), defaultValues: { receiptId: "", selectedItem: "", newPrice: 0, reason: "" } })
  const receiptId = form.watch("receiptId")
  const selectedItem = form.watch("selectedItem")
  const newPrice = Number(form.watch("newPrice"))

  const receipts = useMemo(() => receiptsRes?.content ?? [], [receiptsRes])
  const currentReceipt = useMemo(() => receipts.find((r) => r.id === Number(receiptId)), [receipts, receiptId])
  const selectedReceiptItem = useMemo(() => currentReceipt?.items.find((item) => item.id === Number(selectedItem)), [currentReceipt, selectedItem])
  const oldPrice = selectedReceiptItem?.unitPrice ?? 0

  const save = useMutation({
    mutationFn: (data: { importReceiptItemId: number; newPrice: number; reason: string }) =>
      createPriceAdjustment(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["price-adjustments"] })
      toast.success("Tạo phiếu điều chỉnh giá thành công")
      navigate("/stock/price-adjustments")
    },
    onError: (e: Error) => toast.error(e.message || "Không thể tạo phiếu điều chỉnh giá"),
  })

  const onSubmit = form.handleSubmit((values) => {
    if (oldPrice > 0 && values.newPrice === oldPrice) {
      toast.error("Giá mới phải khác giá cũ")
      return
    }
    save.mutate({
      importReceiptItemId: Number(values.selectedItem),
      newPrice: values.newPrice,
      reason: values.reason.trim(),
    })
  })

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
          <Controller
            name="receiptId"
            control={form.control}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(v) => {
                  field.onChange(v)
                  form.setValue("selectedItem", "")
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
            )}
          />
          <FieldError errors={form.formState.errors.receiptId ? [{ message: form.formState.errors.receiptId.message ?? "" }] : undefined} />
        </div>

        {currentReceipt && (
          <div className="space-y-2">
            <Label>Sản phẩm</Label>
            <Controller
              name="selectedItem"
              control={form.control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn sản phẩm" />
                  </SelectTrigger>
                  <SelectContent>
                    {currentReceipt.items.map((item) => {
                      const hasPending = pendingAdjustments?.has(item.id)
                      return (
                        <SelectItem
                          key={item.id}
                          value={String(item.id)}
                          disabled={hasPending}
                        >
                          <span>
                            {item.productName} (giá cũ: {(item.unitPrice ?? 0).toLocaleString("vi-VN")}₫)
                            {hasPending && " ⛔"}
                          </span>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError errors={form.formState.errors.selectedItem ? [{ message: form.formState.errors.selectedItem.message ?? "" }] : undefined} />
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
                  <p className="text-lg font-semibold text-primary">{(newPrice || 0).toLocaleString("vi-VN")}₫</p>
                </div>
              </div>
              {newPrice > 0 && (
                <div className="mt-2 text-center">
                  <span
                    className={`text-xs font-medium ${newPrice > oldPrice ? "text-destructive" : "text-green-600"}`}
                  >
                    {newPrice > oldPrice ? "Tăng" : "Giảm"}{" "}
                    {Math.abs(((newPrice - oldPrice) / oldPrice) * 100).toFixed(1)}%
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
          <Input id="newPrice" type="number" min={0} {...form.register("newPrice", { valueAsNumber: true })} />
          <FieldError errors={form.formState.errors.newPrice ? [{ message: form.formState.errors.newPrice.message ?? "" }] : undefined} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="reason">
            Lý do <span className="text-destructive">*</span>
          </Label>
          <Textarea id="reason" {...form.register("reason")} rows={3} />
          <FieldError errors={form.formState.errors.reason ? [{ message: form.formState.errors.reason.message ?? "" }] : undefined} />
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={() => navigate("/stock/price-adjustments")}>
          Hủy
        </Button>
        <Button onClick={onSubmit} disabled={save.isPending}>
          {save.isPending ? "Đang tạo..." : "Tạo phiếu"}
        </Button>
      </div>
    </div>
  )
}
