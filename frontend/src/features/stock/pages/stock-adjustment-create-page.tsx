import { useState, useEffect, useMemo, useCallback, useRef } from "react"
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
import { usePermission } from "@/hooks/use-permission"
import { cn } from "@/utils/cn"
import { ArrowLeft, Search, Info, ScanLine, CheckCircle2, XCircle, Plus, List } from "lucide-react"
import { Empty, EmptyTitle } from "@/components/ui/empty"
import { toast } from "@/utils/toast"
import { mapResponsePage, mapProductUnit } from "@/utils/mappers"
import { ADJUSTMENT_TYPE, STOCK_CHECK_DIFF, type ProductUnit } from "@/utils/types"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const presetReasons: Record<string, string[]> = {
  DAMAGED: ["Hàng bị va đập trong quá trình di chuyển", "Hàng bị ẩm mốc do điều kiện bảo quản", "Sản phẩm lỗi từ nhà cung cấp"],
  LOST: ["Không tìm thấy hàng trong quá trình kiểm kê", "Thất lạc trong quá trình xuất nhập"],
  FOUND: ["Kiểm kê phát hiện thừa", "Hàng trả lại không cập nhật hệ thống", "Nhập hàng quên ghi nhận"],
}

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

interface BatchResult {
  index: number
  serialNumber: string
  productName: string
  success: boolean
  error?: string
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
  const perm = usePermission()
  const submittingRef = useRef(false)
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
  const [showManualConfirm, setShowManualConfirm] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [showDraftDialog, setShowDraftDialog] = useState(false)
  const [foundMode, setFoundMode] = useState<"existing" | "new" | null>(null)
  const [scanInput, setScanInput] = useState("")
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null)
  const [batchResults, setBatchResults] = useState<BatchResult[]>([])
  const [successResult, setSuccessResult] = useState<{ adjustCode: string } | null>(null)

  const form = useForm<AdjustmentForm>({
    defaultValues: { type: "", selectedUnitId: null, selectedProductId: null, quantity: 1, foundSerialNumber: "", foundLocationId: "", reason: initialReason, imageUrl: "" },
  })
  const { formState } = form
  const watchedType = form.watch("type")
  const watchedReason = form.watch("reason")
  const watchedImageUrl = form.watch("imageUrl")

  useEffect(() => {
    if (watchedType === ADJUSTMENT_TYPE.FOUND) {
      if (!foundMode) setFoundMode("existing")
    } else {
      setFoundMode(null)
    }
  }, [watchedType, foundMode])

  useEffect(() => {
    if (watchedType === ADJUSTMENT_TYPE.DAMAGED && !watchedImageUrl.trim()) {
      form.setError("imageUrl", { message: "Ảnh là bắt buộc cho hàng hỏng" })
    } else if (formState.errors.imageUrl) {
      form.clearErrors("imageUrl")
    }
  }, [watchedType, watchedImageUrl, form, formState.errors.imageUrl])

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
    enabled: watchedType === ADJUSTMENT_TYPE.DAMAGED
      || watchedType === ADJUSTMENT_TYPE.LOST
      || (watchedType === ADJUSTMENT_TYPE.FOUND && foundMode === "existing"),
  })

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ["products", searchProduct],
    queryFn: () => getProducts(0, 100, searchProduct || undefined),
    enabled: watchedType === ADJUSTMENT_TYPE.FOUND && foundMode === "new",
  })

  const { data: locations } = useQuery({
    queryKey: ["locations", "active"],
    queryFn: async () => {
      const res = await http.get("/location", { params: { isActive: true, size: 200 } })
      return res.data?.content ?? res.data ?? []
    },
    enabled: watchedType === ADJUSTMENT_TYPE.FOUND && foundMode === "new",
  })

  const createMut = useMutation({
    mutationFn: createStockAdjustment,
    onSuccess: (data) => {
      clearDraft("/stock/adjustments/new")
      qc.invalidateQueries({ queryKey: ["stock-adjustments"] })
      const code = (data as { adjustCode?: string }).adjustCode ?? ""
      setSuccessResult({ adjustCode: code })
      form.reset()
      setFoundMode(null)
      setScanInput("")
      toast.success("Tạo phiếu điều chỉnh thành công")
    },
    onError: (err: Error) => toast.error(err.message || "Có lỗi xảy ra"),
  })

  const batchMut = useMutation({
    mutationFn: async (items: Array<{ productUnitId: number; difference: string; serialNumber: string; productName: string }>) => {
      const results: BatchResult[] = []
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        setBatchProgress({ current: i + 1, total: items.length })
        try {
          const type = item.difference === STOCK_CHECK_DIFF.UNEXPECTED ? ADJUSTMENT_TYPE.FOUND : ADJUSTMENT_TYPE.LOST
          await createStockAdjustment({
            type,
            productUnitId: item.productUnitId,
            reason: form.getValues("reason").trim() || `Batch from stock check`,
          })
          results.push({ index: i, serialNumber: item.serialNumber, productName: item.productName, success: true })
        } catch (err) {
          results.push({
            index: i,
            serialNumber: item.serialNumber,
            productName: item.productName,
            success: false,
            error: err instanceof Error ? err.message : "Lỗi không xác định",
          })
        }
      }
      return results
    },
    onSuccess: (results) => {
      qc.invalidateQueries({ queryKey: ["stock-adjustments"] })
      setBatchResults(results)
      setBatchProgress(null)
      setShowResult(true)
    },
    onError: () => {
      setBatchProgress(null)
      toast.error("Có lỗi khi tạo hàng loạt")
    },
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
    if (values.type === ADJUSTMENT_TYPE.FOUND && foundMode === "existing" && !values.selectedUnitId) {
      form.setError("selectedUnitId", { message: "Vui lòng chọn sản phẩm" }); valid = false
    }
    if (values.type === ADJUSTMENT_TYPE.FOUND && foundMode === "new" && !values.selectedProductId) {
      form.setError("selectedProductId", { message: "Vui lòng chọn sản phẩm" }); valid = false
    }
    if (values.type === ADJUSTMENT_TYPE.FOUND && foundMode === "new" && !values.foundSerialNumber.trim()) {
      form.setError("foundSerialNumber", { message: "Vui lòng nhập serial number" }); valid = false
    }
    if (values.type === ADJUSTMENT_TYPE.FOUND && foundMode === "new" && !values.foundLocationId) {
      form.setError("foundLocationId", { message: "Vui lòng chọn vị trí" }); valid = false
    }
    return valid
  }

  const buildSubmitData = () => {
    const values = form.getValues()
    const data: Parameters<typeof createStockAdjustment>[0] = {
      type: values.type,
      reason: values.reason.trim(),
    }
    if (values.type === ADJUSTMENT_TYPE.DAMAGED || values.type === ADJUSTMENT_TYPE.LOST) {
      data.productUnitId = values.selectedUnitId!
    }
    if (values.type === ADJUSTMENT_TYPE.FOUND && foundMode === "new") {
      data.productId = values.selectedProductId!
      data.quantity = values.quantity
      data.serialNumber = values.foundSerialNumber.trim()
      data.locationId = Number(values.foundLocationId)
    }
    if (values.type === ADJUSTMENT_TYPE.FOUND && foundMode === "existing" && values.selectedUnitId) {
      data.productUnitId = values.selectedUnitId
    }
    if (values.imageUrl.trim()) data.imageUrl = values.imageUrl.trim()
    return data
  }

  const handleSubmit = () => {
    if (submittingRef.current) return
    if (locationState?.batch && locationState.mismatches) {
      setShowConfirm(true)
      return
    }
    if (!validate()) return
    setShowManualConfirm(true)
  }

  const confirmManual = () => {
    setShowManualConfirm(false)
    submittingRef.current = true
    createMut.mutate(buildSubmitData(), {
      onSettled: () => { submittingRef.current = false },
    })
  }

  const confirmBatch = () => {
    setShowConfirm(false)
    batchMut.mutate(
      locationState!.mismatches!.map((m) => ({
        productUnitId: m.productUnitId,
        difference: m.difference,
        serialNumber: m.serialNumber,
        productName: m.productName,
      })),
    )
  }

  const handleScan = useCallback((value: string) => {
    setScanInput(value)
    if (!value.trim()) return
    if (!unitsData?.content) return
    const match = unitsData.content.find(
      (u: ProductUnit) =>
        u.serialNumber?.toLowerCase() === value.trim().toLowerCase()
        || u.productSku?.toLowerCase() === value.trim().toLowerCase(),
    )
    if (match) {
      form.setValue("selectedUnitId", match.id)
      form.setValue("selectedProductId", null)
      form.clearErrors("selectedUnitId")
      setScanInput("")
      toast.success(`Đã chọn: ${match.productName}`)
    }
  }, [unitsData, form])

  const displayUnitSearch = watchedType === ADJUSTMENT_TYPE.DAMAGED
    || watchedType === ADJUSTMENT_TYPE.LOST
    || (watchedType === ADJUSTMENT_TYPE.FOUND && foundMode === "existing")

  const needsUnit = watchedType === ADJUSTMENT_TYPE.DAMAGED || watchedType === ADJUSTMENT_TYPE.LOST
  const needsProduct = watchedType === ADJUSTMENT_TYPE.FOUND
  const isStockRole = perm.hasRole("STOCK")
  const density = isStockRole ? "spacious" : "compact"

  if (successResult) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
          <div className="rounded-full bg-green-100 p-3">
            <CheckCircle2 className="size-10 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold">Tạo phiếu điều chỉnh thành công</h2>
          {successResult.adjustCode && (
            <p className="font-mono text-sm text-muted-foreground">Mã phiếu: {successResult.adjustCode}</p>
          )}
          <p className="text-sm text-muted-foreground max-w-sm">Bạn có thể tạo phiếu mới hoặc về danh sách để xem.</p>
          <div className="flex gap-3 pt-2">
            <Button onClick={() => { setSuccessResult(null); form.reset(); setFoundMode(null); setScanInput("") }}>
              <Plus className="size-4 mr-1" /> Tạo phiếu khác
            </Button>
            <Button variant="outline" onClick={() => navigate("/stock/adjustments")}>
              <List className="size-4 mr-1" /> Về danh sách
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("mx-auto space-y-6", density === "spacious" ? "max-w-4xl" : "max-w-3xl")}>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size={density === "spacious" ? "default" : "sm"} onClick={() => navigate("/stock/adjustments")}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className={cn("font-semibold tracking-tight", density === "spacious" ? "text-2xl" : "text-xl")}>Tạo phiếu điều chỉnh tồn kho</h1>
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
                setFoundMode(null)
                setScanInput("")
                form.clearErrors()
              }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
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
          {needsProduct && (
            <div className="space-y-2">
              <Label>Sản phẩm này đã có trong hệ thống chưa? <span className="text-destructive">*</span></Label>
<div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={foundMode === "existing" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setFoundMode("existing")
                    form.setValue("selectedUnitId", null)
                    form.setValue("selectedProductId", null)
                    form.setValue("foundSerialNumber", "")
                    form.setValue("foundLocationId", "")
                    form.clearErrors()
                  }}
                >
                  Đã có trong hệ thống
                </Button>
                <Button
                  type="button"
                  variant={foundMode === "new" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setFoundMode("new")
                    form.setValue("selectedUnitId", null)
                    form.setValue("selectedProductId", null)
                    form.clearErrors()
                  }}
                >
                  Chưa có trong hệ thống
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>
              {needsUnit ? "Chọn sản phẩm (serial)" : needsProduct && foundMode === "existing" ? "Chọn sản phẩm (serial)" : needsProduct && foundMode === "new" ? "Chọn sản phẩm" : ""}{" "}
              <span className="text-destructive">*</span>
            </Label>

            {displayUnitSearch && (
              <>
<div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      placeholder={(needsUnit || foundMode === "existing") ? "Tìm theo serial, tên sản phẩm hoặc SKU..." : "Tìm sản phẩm..."}
                      value={searchUnit}
                      onChange={(e) => setSearchUnit(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <div className="relative w-full sm:w-48">
                    <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      placeholder="Quét mã..."
                      value={scanInput}
                      onChange={(e) => handleScan(e.target.value)}
                      className="pl-9 font-mono text-xs"
                    />
                  </div>
                </div>
                <div className="rounded-lg border overflow-x-auto max-h-48">
                  {unitsLoading ? (
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
                          <th className="px-2 py-1 font-medium">Vị trí</th>
                        </tr>
                      </thead>
                      <tbody>
                        {unitsData.content.map((u: ProductUnit) => {
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
                            <td className="px-2 py-1">
                              <Badge variant={u.status === "IN_STOCK" ? "default" : "secondary"} className="text-[10px]">
                                {u.status}
                              </Badge>
                            </td>
                            <td className="px-2 py-1 text-xs text-muted-foreground">{u.locationCode ?? "—"}</td>
                          </tr>
                        )})}
                      </tbody>
                    </table>
                  )}
                </div>
                {formState.errors.selectedUnitId?.message && <p className="text-xs text-destructive">{formState.errors.selectedUnitId.message}</p>}
              </>
            )}

            {needsProduct && foundMode === "new" && (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Tìm sản phẩm..."
                    value={searchProduct}
                    onChange={(e) => setSearchProduct(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="rounded-lg border overflow-x-auto max-h-48">
                  {productsLoading ? (
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
                        {productsData.content.map((p: { id: number; sku: string | null; name: string | null }) => {
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
                            }}
                          >
                            <td className="px-2 py-1">
                              <input type="radio" checked={selectedProductId === p.id} readOnly className="accent-primary" />
                            </td>
                            <td className="px-2 py-1 font-mono text-xs">{p.sku}</td>
                            <td className="px-2 py-1 font-medium">{p.name}</td>
                          </tr>
                        )})}
                      </tbody>
                    </table>
                  )}
                </div>
                {formState.errors.selectedProductId?.message && <p className="text-xs text-destructive">{formState.errors.selectedProductId.message}</p>}
              </>
            )}
          </div>

          {needsProduct && foundMode === "new" && (
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
            <div className="flex flex-wrap gap-1.5">
              {presetReasons[watchedType]?.map((r) => (
                <Badge
                  key={r}
                  variant="outline"
                  className="cursor-pointer text-xs font-normal hover:bg-muted"
                  onClick={() => form.setValue("reason", r)}
                >
                  {r}
                </Badge>
              ))}
            </div>
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
          {createMut.isPending
            ? "Đang tạo..."
            : batchMut.isPending
              ? `Đang xử lý ${batchProgress?.current ?? 0}/${batchProgress?.total ?? 0}...`
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
            <DialogDescription>
              Bạn có dữ liệu điều chỉnh chưa lưu từ lần trước. Chỉ khôi phục được loại điều chỉnh và lý do (không khôi phục được sản phẩm đã chọn). Muốn khôi phục?
            </DialogDescription>
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
            <DialogTitle>Xác nhận tạo hàng loạt</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <div className="flex gap-2">
              <span className="text-muted-foreground w-28 shrink-0">Số lượng:</span>
              <span className="font-medium">{locationState?.mismatches?.length ?? 0} phiếu</span>
            </div>
            <div className="rounded-lg border max-h-32 overflow-y-auto divide-y text-xs">
              {locationState?.mismatches?.map((m, i) => (
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>
              Quay lại
            </Button>
            <Button onClick={confirmBatch} disabled={batchMut.isPending}>
              {batchMut.isPending ? "Đang tạo..." : "Xác nhận"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showResult} onOpenChange={(v) => { if (!v) { setShowResult(false); navigate("/stock/adjustments") } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kết quả tạo hàng loạt</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {batchResults.map((r) => (
              <div key={r.index} className="flex items-start gap-2 rounded-lg border px-3 py-2 text-sm">
                {r.success ? (
                  <CheckCircle2 className="size-4 mt-0.5 text-green-600 shrink-0" />
                ) : (
                  <XCircle className="size-4 mt-0.5 text-destructive shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs">{r.serialNumber}</span>
                    <span className="text-muted-foreground truncate">{r.productName}</span>
                  </div>
                  {!r.success && <p className="text-xs text-destructive mt-0.5">{r.error}</p>}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => { setShowResult(false); navigate("/stock/adjustments") }}>
              {batchResults.filter((r) => r.success).length}/{batchResults.length} thành công — Về danh sách
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showManualConfirm} onOpenChange={(v) => { if (!v) setShowManualConfirm(false) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận tạo phiếu điều chỉnh</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            {(() => {
              const v = form.getValues()
              const t = typeOptions.find(o => o.value === v.type)
              return (
                <>
                  <div className="flex gap-2">
                    <span className="text-muted-foreground w-28 shrink-0">Loại:</span>
                    <span className="font-medium">{t?.label ?? v.type}</span>
                  </div>
                  {v.selectedUnitId && (() => {
                    const u = unitsData?.content.find((x: ProductUnit) => x.id === v.selectedUnitId)
                    return u ? (
                      <div className="flex gap-2">
                        <span className="text-muted-foreground w-28 shrink-0">Sản phẩm:</span>
                        <span><span className="font-medium">{u.productName}</span><span className="text-xs text-muted-foreground ml-1 font-mono">{u.serialNumber}</span></span>
                      </div>
                    ) : null
                  })()}
                  {v.type === ADJUSTMENT_TYPE.FOUND && foundMode === "new" && (
                    <>
                      <div className="flex gap-2">
                        <span className="text-muted-foreground w-28 shrink-0">Số lượng:</span>
                        <span className="font-medium">{v.quantity}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-muted-foreground w-28 shrink-0">Serial:</span>
                        <span className="font-mono text-xs">{v.foundSerialNumber}</span>
                      </div>
                    </>
                  )}
                  <div className="flex gap-2">
                    <span className="text-muted-foreground w-28 shrink-0">Lý do:</span>
                    <span className="text-muted-foreground">{v.reason}</span>
                  </div>
                  {v.imageUrl && (
                    <div className="flex gap-2">
                      <span className="text-muted-foreground w-28 shrink-0">Ảnh:</span>
                      <span className="text-xs text-muted-foreground">{v.imageUrl.split(",").filter(Boolean).length} ảnh</span>
                    </div>
                  )}
                </>
              )
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowManualConfirm(false)}>
              Quay lại
            </Button>
            <Button onClick={confirmManual} disabled={createMut.isPending}>
              {createMut.isPending ? "Đang tạo..." : "Xác nhận"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}