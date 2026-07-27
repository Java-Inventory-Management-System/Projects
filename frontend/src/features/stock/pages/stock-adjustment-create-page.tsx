import { useState, useEffect, useMemo } from "react"
import { useForm, Controller } from "react-hook-form"
import { useNavigate, useLocation } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createStockAdjustment } from "@/services/stock-adjustment-service"
import { getProducts } from "@/services/product-service"
import http from "@/utils/http-client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ImageUpload } from "@/components/ui/image-upload"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { useFormDraft, clearDraft } from "@/hooks/use-form-draft"
import { ArrowLeft, Search, Info } from "lucide-react"
import { Empty, EmptyTitle } from "@/components/ui/empty"
import { toast } from "@/utils/toast"
import { mapResponsePage, mapProductUnit } from "@/utils/mappers"
import { ADJUSTMENT_TYPE, STOCK_CHECK_DIFF } from "@/utils/types"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface AdjustmentForm {
  type: string
  selectedUnitId: number | null
  selectedProductId: number | null
  quantity: number
  foundSerialNumber: string
  foundLocationId: string
  reason: string
  imageUrl: string
}

const typeOptions = [
  { value: ADJUSTMENT_TYPE.DAMAGED, label: "Hư hỏng", desc: "Sản phẩm bị hư hỏng trong kho" },
  { value: ADJUSTMENT_TYPE.LOST, label: "Mất", desc: "Sản phẩm bị mất / thất lạc" },
  { value: ADJUSTMENT_TYPE.FOUND, label: "Thừa", desc: "Phát hiện hàng thừa ngoài kiểm kê" },
]

export const StockAdjustmentCreatePage = () => {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const location = useLocation()
  const locationState = location.state as {
    reason?: string
    mismatches?: Array<{
      productUnitId: number
      productName: string
      productSku: string
      serialNumber: string
      difference: string
    }>
    batch?: boolean
  } | null
  const initialReason = locationState?.reason ?? ""

  const [searchUnit, setSearchUnit] = useState("")
  const [searchProduct, setSearchProduct] = useState("")
  const [showConfirm, setShowConfirm] = useState(false)
  const [showDraftDialog, setShowDraftDialog] = useState(false)
  const [selectedUnitInfo, setSelectedUnitInfo] = useState<{ serialNumber: string; productName: string; productSku: string } | null>(null)
  const [selectedProductInfo, setSelectedProductInfo] = useState<{ name: string; sku: string } | null>(null)

  const form = useForm<AdjustmentForm>({
    defaultValues: { type: "", selectedUnitId: null, selectedProductId: null, quantity: 1, foundSerialNumber: "", foundLocationId: "", reason: initialReason, imageUrl: "" },
  })
  const { formState } = form
  const watchedType = form.watch("type")
  const watchedReason = form.watch("reason")
  const watchedUnitId = form.watch("selectedUnitId")

  const draftState = useMemo(() => ({ type: watchedType, reason: watchedReason }), [watchedType, watchedReason])
  const isDirty = !!watchedType || !!watchedReason.trim()
  const { draftAvailable, restore, dismiss } = useFormDraft(
    "/stock/adjustments/new",
    draftState as unknown as Record<string, unknown>,
    isDirty,
    (data) => {
      const d = data as { type?: string; reason?: string }
      if (d.type) form.setValue("type", d.type)
      if (d.reason) form.setValue("reason", d.reason)
    },
  )
  useEffect(() => {
    if (draftAvailable) setShowDraftDialog(true)
  }, [draftAvailable])

  const { data: unitsData, isLoading: unitsLoading } = useQuery({
    queryKey: ["product-units", searchUnit],
    queryFn: async () => {
      const params: Record<string, unknown> = { page: 0, size: 100, sort: "importedAt,desc" }
      if (searchUnit) params.search = searchUnit
      const res = await http.get("/product-unit", { params })
      return mapResponsePage(res, mapProductUnit)
    },
    enabled: watchedType === ADJUSTMENT_TYPE.DAMAGED || watchedType === ADJUSTMENT_TYPE.LOST,
  })

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ["products", searchProduct],
    queryFn: () => getProducts(0, 100, searchProduct || undefined),
    enabled: watchedType === ADJUSTMENT_TYPE.FOUND,
  })

  const { data: locations } = useQuery({
    queryKey: ["locations", "active"],
    queryFn: async () => {
      const res = await http.get("/location", { params: { isActive: true, size: 200 } })
      return res.data?.content ?? res.data ?? []
    },
    enabled: watchedType === ADJUSTMENT_TYPE.FOUND && !watchedUnitId,
  })

  const createMut = useMutation({
    mutationFn: createStockAdjustment,
    onSuccess: () => {
      clearDraft("/stock/adjustments/new")
      qc.invalidateQueries({ queryKey: ["stock-adjustments"] })
      toast.success("Tạo phiếu điều chỉnh thành công")
      navigate("/stock/adjustments")
    },
    onError: (err: Error) => toast.error(err.message || "Có lỗi xảy ra"),
  })

  const batchMut = useMutation({
    mutationFn: async (items: Array<{ productUnitId: number; difference: string }>) => {
      for (const item of items) {
        const type = item.difference === STOCK_CHECK_DIFF.UNEXPECTED ? ADJUSTMENT_TYPE.FOUND : ADJUSTMENT_TYPE.LOST
        await createStockAdjustment({
          type,
          productUnitId: item.productUnitId,
          reason: initialReason.trim() || `Batch from stock check`,
        })
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-adjustments"] })
      toast.success(`Đã tạo ${locationState?.mismatches?.length ?? 0} phiếu điều chỉnh`)
      navigate("/stock/adjustments")
    },
    onError: (err: Error) => toast.error(err.message || "Có lỗi khi tạo hàng loạt"),
  })

  const validate = (): boolean => {
    form.clearErrors()
    const values = form.getValues()
    let valid = true
    if (!values.type) { form.setError("type", { message: "Vui lòng chọn loại điều chỉnh" }); valid = false }
    if (!values.reason.trim()) { form.setError("reason", { message: "Vui lòng nhập lý do" }); valid = false }
    if ((values.type === ADJUSTMENT_TYPE.DAMAGED || values.type === ADJUSTMENT_TYPE.LOST) && !values.selectedUnitId) {
      form.setError("selectedUnitId", { message: "Vui lòng chọn sản phẩm" }); valid = false
    }
    if (values.type === ADJUSTMENT_TYPE.DAMAGED && !values.imageUrl.trim()) {
      form.setError("imageUrl", { message: "Ảnh là bắt buộc cho hàng hỏng" }); valid = false
    }
    if (values.type === ADJUSTMENT_TYPE.FOUND && !values.selectedUnitId && !values.selectedProductId) {
      form.setError("selectedProductId", { message: "Vui lòng chọn sản phẩm" }); valid = false
    }
    if (values.type === ADJUSTMENT_TYPE.FOUND && !values.selectedUnitId && !values.foundSerialNumber.trim()) {
      form.setError("foundSerialNumber", { message: "Vui lòng nhập serial number" }); valid = false
    }
    if (values.type === ADJUSTMENT_TYPE.FOUND && !values.selectedUnitId && !values.foundLocationId) {
      form.setError("foundLocationId", { message: "Vui lòng chọn vị trí" }); valid = false
    }
    return valid
  }

  const handleSubmit = () => {
    if (locationState?.batch && locationState.mismatches) {
      setShowConfirm(true)
      return
    }
    if (!validate()) return
    setShowConfirm(true)
  }

  const confirmSubmit = () => {
    setShowConfirm(false)
    if (locationState?.batch && locationState.mismatches) {
      batchMut.mutate(
        locationState.mismatches.map((m) => ({
          productUnitId: m.productUnitId,
          difference: m.difference,
        })),
      )
      return
    }
    const values = form.getValues()
    const data: {
      type: string
      productUnitId?: number
      productId?: number
      quantity?: number
      reason: string
      imageUrl?: string
      serialNumber?: string
      locationId?: number
    } = {
      type: values.type,
      reason: values.reason.trim(),
    }

    if (values.type === ADJUSTMENT_TYPE.DAMAGED || values.type === ADJUSTMENT_TYPE.LOST) {
      data.productUnitId = values.selectedUnitId!
    }

    if (values.type === ADJUSTMENT_TYPE.FOUND && !values.selectedUnitId) {
      data.productId = values.selectedProductId!
      data.quantity = values.quantity
      data.serialNumber = values.foundSerialNumber.trim()
      data.locationId = Number(values.foundLocationId)
    }
    if (values.type === ADJUSTMENT_TYPE.FOUND && values.selectedUnitId) {
      data.productUnitId = values.selectedUnitId
    }

    if (values.imageUrl.trim()) data.imageUrl = values.imageUrl.trim()

    createMut.mutate(data)
  }

  const needsUnit = watchedType === ADJUSTMENT_TYPE.DAMAGED || watchedType === ADJUSTMENT_TYPE.LOST
  const needsProduct = watchedType === ADJUSTMENT_TYPE.FOUND

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/stock/adjustments")}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-xl font-semibold tracking-tight">Tạo phiếu điều chỉnh tồn kho</h1>
      </div>

      <div className="space-y-2">
        <Label>
          Loại điều chỉnh <span className="text-destructive">*</span>
        </Label>
        <Controller
          control={form.control}
          name="type"
          render={({ field }) => (
            <RadioGroup
              value={field.value}
              onValueChange={(v) => {
                field.onChange(v)
                form.setValue("selectedUnitId", null)
                form.setValue("selectedProductId", null)
                setSelectedUnitInfo(null)
                setSelectedProductInfo(null)
                form.clearErrors()
              }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {typeOptions.map((opt) => (
                  <Label
                    key={opt.value}
                    htmlFor={opt.value}
                    className={`flex flex-col gap-1 rounded-lg border p-3 cursor-pointer transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5 ${
                      watchedType === opt.value ? "border-primary bg-primary/5" : ""
                    }`}
                  >
                    <RadioGroupItem value={opt.value} id={opt.value} className="sr-only" />
                    <span className="font-medium text-sm">{opt.label}</span>
                    <span className="text-xs text-muted-foreground">{opt.desc}</span>
                  </Label>
                ))}
              </div>
            </RadioGroup>
          )}
        />
        {formState.errors.type?.message && <p className="text-xs text-destructive">{formState.errors.type.message}</p>}
      </div>

      {watchedType && (
        <>
          <div className="space-y-2">
            <Label>
              {needsUnit ? "Chọn sản phẩm (serial)" : needsProduct ? "Chọn sản phẩm" : ""}{" "}
              <span className="text-destructive">*</span>
            </Label>

            {(needsUnit || (needsProduct && !watchedUnitId)) && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder={needsUnit ? "Tìm theo serial, tên sản phẩm hoặc SKU..." : "Tìm sản phẩm..."}
                  value={needsUnit ? searchUnit : searchProduct}
                  onChange={(e) => {
                    if (needsUnit) setSearchUnit(e.target.value)
                    else setSearchProduct(e.target.value)
                  }}
                  className="pl-9"
                />
              </div>
            )}

            <div className="rounded-lg border overflow-x-auto max-h-48">
              {needsUnit ? (
                unitsLoading ? (
                  <div className="p-3 space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-8 w-full" />
                    ))}
                  </div>
                ) : !unitsData || unitsData.content.length === 0 ? (
                  <Empty className="py-4">
                    <EmptyTitle>Không tìm thấy sản phẩm.</EmptyTitle>
                  </Empty>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50 text-left">
                        <th className="w-8 px-2 py-1"></th>
                        <th className="px-2 py-1 font-medium">Serial</th>
                        <th className="px-2 py-1 font-medium">Sản phẩm</th>
                        <th className="px-2 py-1 font-medium">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unitsData.content.map((u) => {
                        const selectedUnitId = form.watch("selectedUnitId")
                        return (
                        <tr
                          key={u.id}
                          className={`border-b last:border-0 cursor-pointer hover:bg-muted/30 ${
                            selectedUnitId === u.id ? "bg-primary/5" : ""
                          }`}
                          onClick={() => {
                            form.setValue("selectedUnitId", u.id)
                            form.setValue("selectedProductId", null)
                            form.clearErrors("selectedUnitId")
                            setSelectedUnitInfo({ serialNumber: u.serialNumber, productName: u.productName, productSku: u.productSku })
                          }}
                        >
                          <td className="px-2 py-1">
                            <input type="radio" checked={selectedUnitId === u.id} readOnly className="accent-primary" />
                          </td>
                          <td className="px-2 py-1 font-mono text-xs">{u.serialNumber}</td>
                          <td className="px-2 py-1">
                            <span className="font-medium">{u.productName}</span>
                            <span className="text-xs text-muted-foreground ml-1">{u.productSku}</span>
                          </td>
                          <td className="px-2 py-1 text-xs text-muted-foreground">{u.status}</td>
                        </tr>
                      )
                    })}
                    </tbody>
                  </table>
                )
              ) : null}

              {needsProduct &&
                !form.watch("selectedUnitId") &&
                (productsLoading ? (
                  <div className="p-3 space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-8 w-full" />
                    ))}
                  </div>
                ) : !productsData || productsData.content.length === 0 ? (
                  <Empty className="py-4">
                    <EmptyTitle>Không tìm thấy sản phẩm.</EmptyTitle>
                  </Empty>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50 text-left">
                        <th className="w-8 px-2 py-1"></th>
                        <th className="px-2 py-1 font-medium">SKU</th>
                        <th className="px-2 py-1 font-medium">Sản phẩm</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productsData.content.map((p) => {
                        const selectedProductId = form.watch("selectedProductId")
                        return (
                        <tr
                          key={p.id}
                          className={`border-b last:border-0 cursor-pointer hover:bg-muted/30 ${
                            selectedProductId === p.id ? "bg-primary/5" : ""
                          }`}
                          onClick={() => {
                            form.setValue("selectedProductId", p.id)
                            form.setValue("selectedUnitId", null)
                            form.clearErrors("selectedProductId")
                            setSelectedProductInfo({ name: p.name ?? "", sku: p.sku ?? "" })
                          }}
                        >
                          <td className="px-2 py-1">
                            <input
                              type="radio"
                              checked={selectedProductId === p.id}
                              readOnly
                              className="accent-primary"
                            />
                          </td>
                          <td className="px-2 py-1 font-mono text-xs">{p.sku}</td>
                          <td className="px-2 py-1 font-medium">{p.name}</td>
                        </tr>
                      )})}
                    </tbody>
                  </table>
                ))}
            </div>
            {formState.errors.selectedUnitId?.message && <p className="text-xs text-destructive">{formState.errors.selectedUnitId.message}</p>}
            {formState.errors.selectedProductId?.message && <p className="text-xs text-destructive">{formState.errors.selectedProductId.message}</p>}
          </div>

          {needsProduct && !form.watch("selectedUnitId") && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">
                  Số lượng <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  min={1}
                  required
                  {...form.register("quantity", { valueAsNumber: true })}
                  className="w-32"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="foundSerialNumber">
                  Serial number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="foundSerialNumber"
                  placeholder="Nhập serial number của sản phẩm tìm thấy..."
                  {...form.register("foundSerialNumber")}
                  className={formState.errors.foundSerialNumber ? "border-destructive" : ""}
                />
                {formState.errors.foundSerialNumber?.message && <p className="text-xs text-destructive">{formState.errors.foundSerialNumber.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="foundLocationId">
                  Vị trí <span className="text-destructive">*</span>
                </Label>
                <Controller
                  name="foundLocationId"
                  control={form.control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className={formState.errors.foundLocationId ? "border-destructive" : ""}>
                        <SelectValue placeholder="Chọn vị trí" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[50vh]">
                        {(Array.isArray(locations) ? locations : []).map((loc: { id: number; fullCode: string }) => (
                          <SelectItem key={loc.id} value={String(loc.id)}>{loc.fullCode}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {formState.errors.foundLocationId?.message && <p className="text-xs text-destructive">{formState.errors.foundLocationId.message}</p>}
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Info className="size-3" /> Dùng khi tìm thấy sản phẩm chưa từng được ghi nhận trong hệ thống
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="reason">
              Lý do <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="Mô tả chi tiết lý do điều chỉnh..."
              {...form.register("reason")}
              rows={3}
              className={formState.errors.reason ? "border-destructive" : ""}
            />
            {formState.errors.reason?.message && <p className="text-xs text-destructive">{formState.errors.reason.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>
              Ảnh minh chứng{needsUnit && watchedType === ADJUSTMENT_TYPE.DAMAGED ? <span className="text-destructive"> *</span> : " (không bắt buộc)"}
            </Label>
            <ImageUpload value={form.watch("imageUrl")} onChange={(v) => form.setValue("imageUrl", v)} />
            {formState.errors.imageUrl?.message && <p className="text-xs text-destructive">{formState.errors.imageUrl.message}</p>}
          </div>
        </>
      )}

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => navigate("/stock/adjustments")}>
          Hủy
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={createMut.isPending || batchMut.isPending || (!locationState?.batch && !watchedType)}
        >
          {createMut.isPending || batchMut.isPending
            ? "Đang tạo..."
            : locationState?.batch
              ? `Tạo Adjustment (${locationState.mismatches?.length ?? 0})`
              : "Tạo phiếu điều chỉnh"}
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
            <DialogDescription>Bạn có dữ liệu điều chỉnh chưa lưu từ lần trước. Muốn khôi phục?</DialogDescription>
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

      <Dialog
        open={showConfirm}
        onOpenChange={(v) => {
          if (!v) setShowConfirm(false)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {locationState?.batch ? "Xác nhận tạo hàng loạt" : "Xác nhận tạo phiếu điều chỉnh"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            {locationState?.batch && locationState.mismatches ? (
              <>
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-28 shrink-0">Số lượng:</span>
                  <span className="font-medium">{locationState.mismatches.length} phiếu</span>
                </div>
                <div className="rounded-lg border max-h-32 overflow-y-auto divide-y text-xs">
                  {locationState.mismatches.map((m, i) => (
                    <div key={i} className="flex items-center gap-2 px-2 py-1.5">
                      <Badge
                        variant={m.difference === STOCK_CHECK_DIFF.UNEXPECTED ? "default" : "destructive"}
                        className="text-[10px]"
                      >
                        {m.difference}
                      </Badge>
                      <span className="font-mono">{m.serialNumber}</span>
                      <span className="text-muted-foreground truncate">{m.productName}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <span className="text-muted-foreground">Lý do:</span>
                  <Input
                    className="mt-1 h-8 text-sm"
                    {...form.register("reason")}
                    placeholder="Lý do (dùng chung cho tất cả)"
                  />
                </div>
              </>
              ) : (
                <>
                  {(() => {
                    const values = form.getValues()
                    return (
                    <div className="space-y-2 text-sm">
                    <div className="flex gap-2">
                      <span className="text-muted-foreground w-24 shrink-0">Loại:</span>
                      <span className="font-medium">{typeOptions.find((o) => o.value === values.type)?.label}</span>
                    </div>
                    {values.selectedUnitId && selectedUnitInfo && (
                      <div className="flex gap-2">
                        <span className="text-muted-foreground w-24 shrink-0">Serial:</span>
                        <div>
                          <span className="font-mono text-xs">{selectedUnitInfo.serialNumber}</span>
                          <span className="text-xs text-muted-foreground ml-2">{selectedUnitInfo.productName}</span>
                        </div>
                      </div>
                    )}
                    {values.selectedProductId && !values.selectedUnitId && selectedProductInfo && (
                      <>
                        <div className="flex gap-2">
                          <span className="text-muted-foreground w-24 shrink-0">Sản phẩm:</span>
                          <span>{selectedProductInfo.name}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-muted-foreground w-24 shrink-0">Số lượng:</span>
                          <span>{values.quantity}</span>
                        </div>
                      </>
                    )}
                    <div>
                      <span className="text-muted-foreground">Lý do:</span>
                      <p className="mt-0.5 rounded-md border bg-muted/20 px-3 py-2 leading-relaxed">{values.reason}</p>
                    </div>
                    </div>)
                  })()}
                </>
              )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>
              Quay lại
            </Button>
            <Button onClick={confirmSubmit} disabled={createMut.isPending || batchMut.isPending}>
              {createMut.isPending || batchMut.isPending ? "Đang tạo..." : "Xác nhận"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
