import { useState, useEffect, useMemo, useCallback } from "react"
import { useForm, useFieldArray, Controller } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createExportReceipt } from "@/services/export-service"
import { useProducts } from "@/hooks/use-products"
import { getSerialsForExport } from "@/services/product-unit-service"
import { CustomerSelectModal } from "@/features/stock/components/customer-select-modal"
import { exportFormSchema } from "@/features/stock/schemas/export-schema"
import type { ExportFormData } from "@/features/stock/schemas/export-schema"
import type { ExportReason, ProductUnit } from "@/utils/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Trash2, Plus, Search } from "lucide-react"
import { useFormDraft, clearDraft } from "@/hooks/use-form-draft"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "@/utils/toast"
import { EXPORT_REASON } from "@/utils/types"

interface ExportFormFields {
  reason: string
  customerId: string
  note: string
  items: {
    tempId: number
    productId: number
    productName: string
    productSku: string
    quantity: number
    unitPrice: number
  }[]
}

const reasons: { value: ExportReason; label: string }[] = [
  { value: EXPORT_REASON.SALE, label: "Bán hàng" },
  { value: EXPORT_REASON.INTERNAL, label: "Xuất nội bộ" },
  { value: EXPORT_REASON.RETURN_SUPPLIER, label: "Trả nhà cung cấp" },
  { value: EXPORT_REASON.DISPOSE, label: "Hủy hàng" },
]

export const ExportCreatePage = () => {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [customerName, setCustomerName] = useState("")
  const [selectModalOpen, setSelectModalOpen] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState("")
  const [showDraftDialog, setShowDraftDialog] = useState(false)

  const { data: productsRes } = useProducts(0, 100)
  const products = useMemo(() => productsRes?.content ?? [], [productsRes])

  const form = useForm<ExportFormFields>({
    defaultValues: { reason: "", customerId: "", note: "", items: [] },
  })
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" })

  const [serials, setSerials] = useState<Record<number, ProductUnit[]>>({})

  const formValues = form.watch()
  const draftState = useMemo(
    () => ({ reason: formValues.reason, customerId: formValues.customerId, customerName, note: formValues.note, items: formValues.items }),
    [formValues, customerName],
  )
  const isDirty = fields.length > 0
  const { draftAvailable, restore, dismiss } = useFormDraft(
    "/stock/exports/new",
    draftState as unknown as Record<string, unknown>,
    isDirty,
    (data) => {
      const d = data as typeof draftState
      form.reset({
        reason: d.reason ?? "",
        customerId: d.customerId ?? "",
        note: d.note ?? "",
        items: d.items ?? [],
      })
      setCustomerName(d.customerName ?? "")
    },
  )
  useEffect(() => {
    if (draftAvailable) setShowDraftDialog(true)
  }, [draftAvailable])

  useEffect(() => {
    if (fields.length === 0) {
      setSerials({})
      return
    }
    let cancelled = false
    const tempIds = fields.map((f) => f.tempId)
    Promise.all(fields.map((f) => getSerialsForExport(f.productId, f.quantity))).then((results) => {
      if (cancelled) return
      const map: Record<number, ProductUnit[]> = {}
      results.forEach((serials, idx) => {
        map[tempIds[idx]] = serials
      })
      setSerials(map)
    })
    return () => { cancelled = true }
  }, [fields])

  const createMut = useMutation({
    mutationFn: createExportReceipt,
    onSuccess: () => {
      clearDraft("/stock/exports/new")
      qc.invalidateQueries({ queryKey: ["export-receipts"] })
      toast.success("Tạo phiếu xuất thành công")
      navigate("/stock/exports")
    },
    onError: (err: Error) => toast.error(err.message || "Có lỗi xảy ra"),
  })

  const addItem = useCallback(() => {
    if (!selectedProductId) return
    const product = products.find((p) => p.id === Number(selectedProductId))
    if (!product) return
    append({
      tempId: Date.now(),
      productId: product.id,
      productName: product.name,
      productSku: product.sku ?? "",
      quantity: 1,
      unitPrice: product.sellPrice ?? 0,
    })
    setSelectedProductId("")
  }, [selectedProductId, products, append])

  const onSubmit = form.handleSubmit((values) => {
    const raw: ExportFormData = { reason: values.reason, customerId: values.customerId, note: values.note, items: values.items }
    const parsed = exportFormSchema.safeParse(raw)
    if (!parsed.success) {
      const first = parsed.error.issues[0]
      toast.error(first.message)
      return
    }
    if (values.reason === EXPORT_REASON.SALE && !values.customerId) {
      toast.error("Vui lòng chọn khách hàng")
      return
    }
    createMut.mutate({
      reason: values.reason as ExportReason,
      customerId: values.customerId ? Number(values.customerId) : null,
      note: values.note || null,
      items: values.items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
    })
  })

  const watchedReason = form.watch("reason")
  const watchedCustomerId = form.watch("customerId")
  const hasSerials = useMemo(() => Object.values(serials).some((arr) => arr.length > 0), [serials])

  return (
    <div className="mx-auto max-w-4xl space-y-4 lg:space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/stock/exports")}>
          &larr; Quay lại
        </Button>
        <h1 className="text-xl font-semibold tracking-tight">Tạo phiếu xuất kho</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="reason">Lý do xuất</Label>
          <Controller
            control={form.control}
            name="reason"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="reason">
                  <SelectValue placeholder="Chọn lý do" />
                </SelectTrigger>
                <SelectContent>
                  {reasons.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        {watchedReason === EXPORT_REASON.SALE && (
          <div className="space-y-2">
            <Label htmlFor="customer">Khách hàng</Label>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 justify-start font-normal h-10"
                onClick={() => setSelectModalOpen(true)}
              >
                {watchedCustomerId ? (
                  <span className="truncate">{customerName}</span>
                ) : (
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Search className="size-4" />
                    Tìm kiếm / Chọn khách hàng...
                  </span>
                )}
              </Button>
              {watchedCustomerId && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    form.setValue("customerId", "")
                    setCustomerName("")
                  }}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Thêm sản phẩm</Label>
        <div className="flex gap-2">
          <Select value={selectedProductId} onValueChange={setSelectedProductId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Chọn sản phẩm..." />
            </SelectTrigger>
            <SelectContent>
              {products.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.name} ({p.sku}) &mdash; {p.sellPrice?.toLocaleString("vi-VN")}₫
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={addItem} disabled={!selectedProductId}>
            <Plus className="size-4 mr-1" /> Thêm
          </Button>
        </div>
      </div>

      {fields.length > 0 && (
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sản phẩm</TableHead>
                <TableHead className="w-20 text-right">SL</TableHead>
                <TableHead className="w-28 text-right">Đơn giá</TableHead>
                <TableHead className="w-28 text-right">Thành tiền</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.map((item, index) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.productName}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={1}
                      className="h-8 w-16 text-right"
                      {...form.register(`items.${index}.quantity`, { valueAsNumber: true })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      className="h-8 w-24 text-right"
                      {...form.register(`items.${index}.unitPrice`, { valueAsNumber: true })}
                    />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {(item.quantity * item.unitPrice).toLocaleString("vi-VN")}₫
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => remove(index)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {fields.length > 0 && hasSerials && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Serial dự kiến xuất theo FIFO</h3>
          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sản phẩm</TableHead>
                  <TableHead>Serial</TableHead>
                  <TableHead>Vị trí</TableHead>
                  <TableHead>Ngày nhập</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((item) => {
                  const itemSerials = serials[item.tempId] ?? []
                  if (itemSerials.length === 0) return null
                  return itemSerials.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-xs text-muted-foreground">{item.productName}</TableCell>
                      <TableCell className="font-mono text-xs">{s.serialNumber}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{s.locationCode ?? "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(s.importedAt).toLocaleDateString("vi-VN")}
                      </TableCell>
                    </TableRow>
                  ))
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">
          Tổng: {fields.reduce((s, i) => s + i.quantity * i.unitPrice, 0).toLocaleString("vi-VN")}₫
        </span>
      </div>

      <div className="space-y-2">
        <Label htmlFor="note">Ghi chú</Label>
        <Textarea
          id="note"
          placeholder="Ghi chú (không bắt buộc)"
          {...form.register("note")}
        />
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={() => navigate("/stock/exports")}>
          Hủy
        </Button>
        <Button
          onClick={onSubmit}
          disabled={
            !watchedReason || fields.length === 0 || createMut.isPending || (watchedReason === EXPORT_REASON.SALE && !watchedCustomerId)
          }
        >
          {createMut.isPending ? "Đang tạo..." : "Tạo phiếu xuất"}
        </Button>
      </div>

      <Dialog
        open={showDraftDialog}
        onOpenChange={(v) => {
          if (!v) {
            setShowDraftDialog(false)
            dismiss()
          }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Khôi phục dữ liệu</DialogTitle>
            <DialogDescription>Bạn có dữ liệu xuất kho chưa lưu từ lần trước. Muốn khôi phục?</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowDraftDialog(false)
                dismiss()
              }}
            >
              Bỏ qua
            </Button>
            <Button
              onClick={() => {
                setShowDraftDialog(false)
                restore()
              }}
            >
              Khôi phục
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CustomerSelectModal
        open={selectModalOpen}
        onOpenChange={setSelectModalOpen}
        selectedCustomerId={watchedCustomerId ? Number(watchedCustomerId) : null}
        onSelect={(id, name) => {
          form.setValue("customerId", String(id))
          setCustomerName(name)
        }}
      />
    </div>
  )
}
