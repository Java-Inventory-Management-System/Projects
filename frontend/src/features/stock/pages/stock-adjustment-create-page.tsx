import { useState, useEffect, useMemo } from "react"
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
import { ArrowLeft, Search } from "lucide-react"
import { Empty, EmptyTitle } from "@/components/ui/empty"
import { toast } from "@/utils/toast"
import { mapResponsePage, mapProductUnit } from "@/utils/mappers"
import { ADJUSTMENT_TYPE, STOCK_CHECK_DIFF } from "@/utils/types"

const typeOptions = [
  { value: ADJUSTMENT_TYPE.DAMAGED, label: "Hư hỏng", desc: "Sản phẩm bị hư hỏng trong kho" },
  { value: ADJUSTMENT_TYPE.LOST, label: "Mất", desc: "Sản phẩm bị mất / thất lạc" },
  { value: ADJUSTMENT_TYPE.FOUND, label: "Thừa", desc: "Phát hiện hàng thừa ngoài kiểm kê" },
]

interface FormErrors {
  type?: string
  reason?: string
  productUnit?: string
  product?: string
}

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

  const [type, setType] = useState("")
  const [searchUnit, setSearchUnit] = useState("")
  const [searchProduct, setSearchProduct] = useState("")
  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(null)
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [reason, setReason] = useState(initialReason)
  const [imageUrl, setImageUrl] = useState("")
  const [showConfirm, setShowConfirm] = useState(false)
  const [showDraftDialog, setShowDraftDialog] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})

  const draftState = useMemo(() => ({ type, reason }), [type, reason])
  const isDirty = !!type || !!reason.trim()
  const { draftAvailable, restore, dismiss } = useFormDraft(
    "/stock/adjustments/new",
    draftState as unknown as Record<string, unknown>,
    isDirty,
    (data) => {
      const d = data as { type?: string; reason?: string }
      if (d.type) setType(d.type)
      if (d.reason) setReason(d.reason)
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
    enabled: type === ADJUSTMENT_TYPE.DAMAGED || type === ADJUSTMENT_TYPE.LOST,
  })

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ["products", searchProduct],
    queryFn: () => getProducts(0, 100, searchProduct || undefined),
    enabled: type === ADJUSTMENT_TYPE.FOUND,
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
          reason: reason.trim() || `Batch from stock check`,
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
    const errs: FormErrors = {}
    if (!type) errs.type = "Vui lòng chọn loại điều chỉnh"
    if (!reason.trim()) errs.reason = "Vui lòng nhập lý do"
    if ((type === ADJUSTMENT_TYPE.DAMAGED || type === ADJUSTMENT_TYPE.LOST) && !selectedUnitId) {
      errs.productUnit = "Vui lòng chọn sản phẩm"
    }
    if (type === ADJUSTMENT_TYPE.FOUND && !selectedUnitId && !selectedProductId) {
      errs.product = "Vui lòng chọn sản phẩm"
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
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
    const data: {
      type: string
      productUnitId?: number
      productId?: number
      quantity?: number
      reason: string
      imageUrl?: string
    } = {
      type,
      reason: reason.trim(),
    }

    if (type === ADJUSTMENT_TYPE.DAMAGED || type === ADJUSTMENT_TYPE.LOST) {
      data.productUnitId = selectedUnitId!
    }

    if (type === ADJUSTMENT_TYPE.FOUND && !selectedUnitId) {
      data.productId = selectedProductId!
      data.quantity = quantity
    }
    if (type === ADJUSTMENT_TYPE.FOUND && selectedUnitId) {
      data.productUnitId = selectedUnitId
    }

    if (imageUrl.trim()) data.imageUrl = imageUrl.trim()

    createMut.mutate(data)
  }

  const needsUnit = type === ADJUSTMENT_TYPE.DAMAGED || type === ADJUSTMENT_TYPE.LOST
  const needsProduct = type === ADJUSTMENT_TYPE.FOUND

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
        <RadioGroup
          value={type}
          onValueChange={(v) => {
            setType(v)
            setSelectedUnitId(null)
            setSelectedProductId(null)
            setErrors({})
          }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {typeOptions.map((opt) => (
              <Label
                key={opt.value}
                htmlFor={opt.value}
                className={`flex flex-col gap-1 rounded-lg border p-3 cursor-pointer transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5 ${
                  type === opt.value ? "border-primary bg-primary/5" : ""
                }`}
              >
                <RadioGroupItem value={opt.value} id={opt.value} className="sr-only" />
                <span className="font-medium text-sm">{opt.label}</span>
                <span className="text-xs text-muted-foreground">{opt.desc}</span>
              </Label>
            ))}
          </div>
        </RadioGroup>
        {errors.type && <p className="text-xs text-destructive">{errors.type}</p>}
      </div>

      {type && (
        <>
          <div className="space-y-2">
            <Label>
              {needsUnit ? "Chọn sản phẩm (serial)" : needsProduct ? "Chọn sản phẩm" : ""}{" "}
              <span className="text-destructive">*</span>
            </Label>

            {(needsUnit || (needsProduct && !selectedUnitId)) && (
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
                      {unitsData.content.map((u) => (
                        <tr
                          key={u.id}
                          className={`border-b last:border-0 cursor-pointer hover:bg-muted/30 ${
                            selectedUnitId === u.id ? "bg-primary/5" : ""
                          }`}
                          onClick={() => {
                            setSelectedUnitId(u.id)
                            setErrors((p) => ({ ...p, productUnit: undefined }))
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
                      ))}
                    </tbody>
                  </table>
                )
              ) : null}

              {needsProduct &&
                !selectedUnitId &&
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
                      {productsData.content.map((p) => (
                        <tr
                          key={p.id}
                          className={`border-b last:border-0 cursor-pointer hover:bg-muted/30 ${
                            selectedProductId === p.id ? "bg-primary/5" : ""
                          }`}
                          onClick={() => {
                            setSelectedProductId(p.id)
                            setErrors((p_) => ({ ...p_, product: undefined }))
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
                      ))}
                    </tbody>
                  </table>
                ))}
            </div>
            {errors.productUnit && <p className="text-xs text-destructive">{errors.productUnit}</p>}
            {errors.product && <p className="text-xs text-destructive">{errors.product}</p>}
          </div>

          {needsProduct && !selectedUnitId && (
            <div className="space-y-2">
              <Label htmlFor="quantity">
                Số lượng <span className="text-destructive">*</span>
              </Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                required
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value) || 1)}
                className="w-32"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="reason">
              Lý do <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="Mô tả chi tiết lý do điều chỉnh..."
              value={reason}
              onChange={(e) => {
                setReason(e.target.value)
                setErrors((p) => ({ ...p, reason: undefined }))
              }}
              rows={3}
              className={errors.reason ? "border-destructive" : ""}
            />
            {errors.reason && <p className="text-xs text-destructive">{errors.reason}</p>}
          </div>

          <div className="space-y-2">
            <Label>Ảnh minh chứng (không bắt buộc)</Label>
            <ImageUpload value={imageUrl} onChange={setImageUrl} />
          </div>
        </>
      )}

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => navigate("/stock/adjustments")}>
          Hủy
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={createMut.isPending || batchMut.isPending || (!locationState?.batch && !type)}
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
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Lý do (dùng chung cho tất cả)"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-24 shrink-0">Loại:</span>
                  <span className="font-medium">{typeOptions.find((o) => o.value === type)?.label}</span>
                </div>
                {selectedUnitId && (
                  <div className="flex gap-2">
                    <span className="text-muted-foreground w-24 shrink-0">Serial ID:</span>
                    <span className="font-mono text-xs">{selectedUnitId}</span>
                  </div>
                )}
                {selectedProductId && !selectedUnitId && (
                  <>
                    <div className="flex gap-2">
                      <span className="text-muted-foreground w-24 shrink-0">Sản phẩm ID:</span>
                      <span>{selectedProductId}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-muted-foreground w-24 shrink-0">Số lượng:</span>
                      <span>{quantity}</span>
                    </div>
                  </>
                )}
                <div>
                  <span className="text-muted-foreground">Lý do:</span>
                  <p className="mt-0.5 rounded-md border bg-muted/20 px-3 py-2 leading-relaxed">{reason}</p>
                </div>
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
