import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useTranslation } from "react-i18next"
import { useForm, Controller } from "react-hook-form"
import { useNavigate, useLocation } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createStockAdjustment, getStockAdjustmentsByUnit } from "@/services/stock-adjustment-service"
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
import { backgroundBatch } from "@/utils/background-batch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const getPresetReasons = (t: (key: string) => string): Record<string, string[]> => ({
  DAMAGED: [t("stockAdjCreate.reasonDamaged1"), t("stockAdjCreate.reasonDamaged2"), t("stockAdjCreate.reasonDamaged3")],
  LOST: [t("stockAdjCreate.reasonLost1"), t("stockAdjCreate.reasonLost2")],
  FOUND: [t("stockAdjCreate.reasonFound1"), t("stockAdjCreate.reasonFound2"), t("stockAdjCreate.reasonFound3")],
})

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

export const StockAdjustmentCreatePage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const location = useLocation()
  const perm = usePermission()
  const typeOptions = [
    { value: ADJUSTMENT_TYPE.DAMAGED, label: t('adjustmentType.damaged'), desc: t('stockAdjCreate.damagedDesc') },
    { value: ADJUSTMENT_TYPE.LOST, label: t('adjustmentType.lost'), desc: t('stockAdjCreate.lostDesc') },
    { value: ADJUSTMENT_TYPE.FOUND, label: t('adjustmentType.found'), desc: t('stockAdjCreate.foundDesc') },
  ]
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
  const formValues = form.getValues()
  const watchedType = form.watch("type")
  const watchedReason = form.watch("reason")

  useEffect(() => {
    if (watchedType === ADJUSTMENT_TYPE.FOUND) {
      if (!foundMode) setFoundMode("existing")
    } else {
      setFoundMode(null)
    }
  }, [watchedType, foundMode])

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

  const selectedUnitId = form.watch("selectedUnitId")
  const { data: unitAdjustments } = useQuery({
    queryKey: ["stock-adjustments", "by-unit", selectedUnitId],
    queryFn: () => getStockAdjustmentsByUnit(selectedUnitId!),
    enabled: !!selectedUnitId,
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
      toast.success(t("stockAdjCreate.createSuccess"))
    },
    onError: (err: Error) => toast.error(err.message || t("common.error")),
  })

  const showResultRef = useRef(showResult)
  showResultRef.current = showResult

  useEffect(() => {
    return backgroundBatch.subscribe(() => {
      const p = backgroundBatch.getProgress()
      setBatchProgress(p ? { current: p.current, total: p.total } : null)
      setBatchResults(backgroundBatch.getResults())
      if (!backgroundBatch.isRunning() && backgroundBatch.getResults().length > 0 && !showResultRef.current) {
        setShowResult(true)
      }
    })
  }, [])

  const validate = (): boolean => {
    form.clearErrors()
    const values = form.getValues()
    let valid = true
    if (!values.type) { form.setError("type", { message: t("stockAdjCreate.requireType") }); valid = false }
    if (!values.reason.trim()) { form.setError("reason", { message: t("stockAdjCreate.requireReason") }); valid = false }
    if ((values.type === ADJUSTMENT_TYPE.DAMAGED || values.type === ADJUSTMENT_TYPE.LOST) && !values.selectedUnitId) {
      form.setError("selectedUnitId", { message: t("stockAdjCreate.requireProduct") }); valid = false
    }
    if (values.type === ADJUSTMENT_TYPE.DAMAGED && !values.imageUrl.trim()) {
      form.setError("imageUrl", { message: t("stockAdjCreate.requireImage") }); valid = false
    }
    if (values.type === ADJUSTMENT_TYPE.FOUND && foundMode === "existing" && !values.selectedUnitId) {
      form.setError("selectedUnitId", { message: t("stockAdjCreate.requireProduct") }); valid = false
    }
    if (values.type === ADJUSTMENT_TYPE.FOUND && foundMode === "new" && !values.selectedProductId) {
      form.setError("selectedProductId", { message: t("stockAdjCreate.requireProduct") }); valid = false
    }
    if (values.type === ADJUSTMENT_TYPE.FOUND && foundMode === "new" && !values.foundSerialNumber.trim()) {
      form.setError("foundSerialNumber", { message: t("stockAdjCreate.requireSerial") }); valid = false
    }
    if (values.type === ADJUSTMENT_TYPE.FOUND && foundMode === "new" && !values.foundLocationId) {
      form.setError("foundLocationId", { message: t("stockAdjCreate.requireLocation") }); valid = false
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
    const reason = form.getValues("reason").trim()
    backgroundBatch.start(
      locationState!.mismatches!.map((m) => ({
        productUnitId: m.productUnitId,
        difference: m.difference,
        serialNumber: m.serialNumber,
        productName: m.productName,
      })),
      reason,
    )
    qc.invalidateQueries({ queryKey: ["stock-adjustments"] })
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
      toast.success(t("stockAdjCreate.selected", { product: match.productName }))
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
          <h2 className="text-xl font-semibold">{t("stockAdjCreate.createSuccess")}</h2>
          {successResult.adjustCode && (
            <p className="font-mono text-sm text-muted-foreground">{t("stockAdjCreate.receiptCode")}: {successResult.adjustCode}</p>
          )}
          <p className="text-sm text-muted-foreground max-w-sm">{t("stockAdjCreate.createSuccessDesc")}</p>
          <div className="flex gap-3 pt-2">
            <Button onClick={() => { setSuccessResult(null); form.reset(); setFoundMode(null); setScanInput("") }}>
              <Plus className="size-4 mr-1" /> {t("stockAdjCreate.createAnother")}
            </Button>
            <Button variant="outline" onClick={() => navigate("/stock/adjustments")}>
              <List className="size-4 mr-1" /> {t("stockAdjCreate.backToList")}
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
        <h1 className={cn("font-semibold tracking-tight", density === "spacious" ? "text-2xl" : "text-xl")}>{t("stockAdjCreate.title")}</h1>
      </div>

      <div className="space-y-2">
        <Label>
          {t("stockAdjCreate.adjustmentType")} <span className="text-destructive">*</span>
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
              <Label>{t("stockAdjCreate.productExists")} <span className="text-destructive">*</span></Label>
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
                  {t("stockAdjCreate.exists")}
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
                  {t("stockAdjCreate.notExists")}
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>
              {needsUnit ? t("stockAdjCreate.selectSerialProduct") : needsProduct && foundMode === "existing" ? t("stockAdjCreate.selectSerialProduct") : needsProduct && foundMode === "new" ? t("stockAdjCreate.selectProduct") : ""}{" "}
              <span className="text-destructive">*</span>
            </Label>

            {displayUnitSearch && (
              <>
<div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      placeholder={(needsUnit || foundMode === "existing") ? t("stockAdjCreate.searchSerialPlaceholder") : t("stockAdjCreate.searchProductPlaceholder")}
                      value={searchUnit}
                      onChange={(e) => setSearchUnit(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <div className="relative w-full sm:w-48">
                    <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      placeholder={t("stockAdjCreate.scanPlaceholder")}
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
                      <EmptyTitle>{t("stockAdjCreate.noProductsFound")}</EmptyTitle>
                    </Empty>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50 text-left">
                          <th className="w-8 px-2 py-1"></th>
                          <th className="px-2 py-1 font-medium">{t('adjustment.serial')}</th>
                          <th className="px-2 py-1 font-medium">{t('table.product')}</th>
                          <th className="px-2 py-1 font-medium">{t('table.status')}</th>
                          <th className="px-2 py-1 font-medium">{t('table.location')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {unitsData.content.map((u: ProductUnit) => {
                          const selectedUnitId = formValues.selectedUnitId
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
                {selectedUnitId && unitAdjustments && unitAdjustments.content.length > 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs space-y-0.5">
                    <p className="font-medium text-amber-800">{t("stockAdjCreate.unitHistory")}</p>
                    {unitAdjustments.content.slice(0, 3).map((a) => (
                      <p key={a.id} className="text-amber-700">
                        {a.type === "DAMAGED" ? t("adjustmentType.damaged") : a.type === "LOST" ? t("adjustmentType.lost") : t("adjustmentType.found")} — {a.status === "PENDING" ? t("status.pendingApproval") : a.status === "APPROVED" ? t("status.approved") : t("status.rejected")}
                        {" · "}{new Date(a.createdAt).toLocaleDateString("vi-VN")}
                      </p>
                    ))}
                    {unitAdjustments.content.some((a) => a.status === "PENDING") && (
                      <p className="text-amber-800 font-medium mt-1">⚠ {t("stockAdjCreate.pendingWarning")}</p>
                    )}
                  </div>
                )}
              </>
            )}

            {needsProduct && foundMode === "new" && (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    placeholder={t("stockAdjCreate.searchProductPlaceholder2")}
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
                      <EmptyTitle>{t("stockAdjCreate.noProductsFound")}</EmptyTitle>
                    </Empty>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50 text-left">
                          <th className="w-8 px-2 py-1"></th>
                          <th className="px-2 py-1 font-medium">{t('adjustment.sku')}</th>
                          <th className="px-2 py-1 font-medium">{t('table.product')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productsData.content.map((p: { id: number; sku: string | null; name: string | null }) => {
                          const selectedProductId = formValues.selectedProductId
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
                  {t("stockAdjCreate.quantity")} <span className="text-destructive">*</span>
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
                  {t('adjustment.serialNumberLabel')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="foundSerialNumber"
                  placeholder={t("stockAdjCreate.foundSerialPlaceholder")}
                  {...form.register("foundSerialNumber")}
                  className={formState.errors.foundSerialNumber ? "border-destructive" : ""}
                />
                {formState.errors.foundSerialNumber?.message && <p className="text-xs text-destructive">{formState.errors.foundSerialNumber.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="foundLocationId">
                  {t("stockAdjCreate.location")} <span className="text-destructive">*</span>
                </Label>
                <Controller
                  name="foundLocationId"
                  control={form.control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className={formState.errors.foundLocationId ? "border-destructive" : ""}>
                        <SelectValue placeholder={t("stockAdjCreate.selectLocation")} />
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
                <Info className="size-3" /> {t("stockAdjCreate.foundInfo")}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="reason">
              {t("stockAdjCreate.reason")} <span className="text-destructive">*</span>
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {getPresetReasons(t)[watchedType]?.map((r) => (
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
              placeholder={t("stockAdjCreate.reasonPlaceholder")}
              {...form.register("reason")}
              rows={3}
              className={formState.errors.reason ? "border-destructive" : ""}
            />
            {formState.errors.reason?.message && <p className="text-xs text-destructive">{formState.errors.reason.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>
              {t("stockAdjCreate.evidenceImages")}{needsUnit && watchedType === ADJUSTMENT_TYPE.DAMAGED ? <span className="text-destructive"> *</span> : " " + t("stockAdjCreate.optional")}
            </Label>
            <ImageUpload value={form.watch("imageUrl")} onChange={(v) => form.setValue("imageUrl", v)} />
            {formState.errors.imageUrl?.message && <p className="text-xs text-destructive">{formState.errors.imageUrl.message}</p>}
          </div>
        </>
      )}

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => navigate("/stock/adjustments")}>
          {t("common.cancel")}
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={createMut.isPending || backgroundBatch.isRunning() || (!locationState?.batch && !watchedType)}
        >
          {createMut.isPending
            ? t("stockAdjCreate.creating")
            : backgroundBatch.isRunning()
              ? t("stockAdjCreate.batchProgress", { current: batchProgress?.current ?? 0, total: batchProgress?.total ?? 0 })
              : locationState?.batch
                ? t("stockAdjCreate.createBatch", { count: locationState.mismatches?.length ?? 0 })
                : t("stockAdjCreate.create")}
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
            <DialogTitle>{t("stockAdjCreate.draftTitle")}</DialogTitle>
            <DialogDescription>
              {t("stockAdjCreate.draftDesc")}
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
              {t("dialog.discard")}
            </Button>
            <Button
              onClick={() => {
                setShowDraftDialog(false)
                restore()
              }}
            >
              {t("dialog.restore")}
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
            <DialogTitle>{t("stockAdjCreate.batchConfirmTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <div className="flex gap-2">
              <span className="text-muted-foreground w-28 shrink-0">{t("stockAdjCreate.quantity")}:</span>
              <span className="font-medium">{locationState?.mismatches?.length ?? 0} {t("stockAdjCreate.receipts")}</span>
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
              <span className="text-muted-foreground">{t("stockAdjCreate.reason")}:</span>
              <Input
                className="mt-1 h-8 text-sm"
                {...form.register("reason")}
                placeholder={t("stockAdjCreate.batchReasonPlaceholder")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>
              {t("dialog.back")}
            </Button>
            <Button onClick={confirmBatch} disabled={backgroundBatch.isRunning()}>
              {backgroundBatch.isRunning() ? t("stockAdjCreate.creating") : t("dialog.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showResult} onOpenChange={(v) => { if (!v) { setShowResult(false); navigate("/stock/adjustments") } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("stockAdjCreate.batchResultTitle")}</DialogTitle>
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
              {t("stockAdjCreate.batchResultSummary", { success: batchResults.filter((r) => r.success).length, total: batchResults.length })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showManualConfirm} onOpenChange={(v) => { if (!v) setShowManualConfirm(false) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("stockAdjCreate.confirmTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            {(() => {
              const v = form.getValues()
              const typeOpt = typeOptions.find(o => o.value === v.type)
              return (
                <>
                  <div className="flex gap-2">
                    <span className="text-muted-foreground w-28 shrink-0">{t("stockAdjCreate.type")}:</span>
                    <span className="font-medium">{typeOpt?.label ?? v.type}</span>
                  </div>
                  {v.selectedUnitId && (() => {
                    const u = unitsData?.content.find((x: ProductUnit) => x.id === v.selectedUnitId)
                    return u ? (
                      <div className="flex gap-2">
                        <span className="text-muted-foreground w-28 shrink-0">{t("stockAdjCreate.product")}:</span>
                        <span><span className="font-medium">{u.productName}</span><span className="text-xs text-muted-foreground ml-1 font-mono">{u.serialNumber}</span></span>
                      </div>
                    ) : null
                  })()}
                  {v.type === ADJUSTMENT_TYPE.FOUND && foundMode === "new" && (
                    <>
                      <div className="flex gap-2">
                        <span className="text-muted-foreground w-28 shrink-0">{t("stockAdjCreate.quantity")}:</span>
                        <span className="font-medium">{v.quantity}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-muted-foreground w-28 shrink-0">{t("adjustment.serialNumberLabel")}:</span>
                        <span className="font-mono text-xs">{v.foundSerialNumber}</span>
                      </div>
                    </>
                  )}
                  <div className="flex gap-2">
                    <span className="text-muted-foreground w-28 shrink-0">{t("stockAdjCreate.reason")}:</span>
                    <span className="text-muted-foreground">{v.reason}</span>
                  </div>
                  {v.imageUrl && (
                    <div className="flex gap-2">
                      <span className="text-muted-foreground w-28 shrink-0">{t("stockAdjCreate.image")}:</span>
                      <span className="text-xs text-muted-foreground">{v.imageUrl.split(",").filter(Boolean).length} {t("stockAdjCreate.images")}</span>
                    </div>
                  )}
                </>
              )
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowManualConfirm(false)}>
              {t("dialog.back")}
            </Button>
            <Button onClick={confirmManual} disabled={createMut.isPending}>
              {createMut.isPending ? t("stockAdjCreate.creating") : t("dialog.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
