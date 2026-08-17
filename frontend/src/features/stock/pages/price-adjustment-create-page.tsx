import { useEffect, useState, useMemo, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createPriceAdjustment, getAvailableItemsByProduct } from "@/services/price-adjustment-service"
import { getProducts } from "@/services/product-service"
import { useDebounce } from "@/hooks/use-debounce"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, ArrowRight, AlertTriangle, Search, Loader2, TrendingUp, TrendingDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/utils/toast"
import { FieldError } from "@/components/ui/field"
import { PriceHistoryPanel } from "@/features/stock/components/price-history-panel"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const getSchema = (t: (k: string) => string) => z.object({
  selectedItem: z.string().min(1, t("priceAdjCreate.requireItem")),
  newPrice: z.coerce.number().min(1, t("priceAdjCreate.invalidPrice")),
  reason: z.string().min(10, t("priceAdjCreate.reasonMin")).max(500, t("priceAdjCreate.reasonMax")),
})

export function PriceAdjustmentCreatePage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [confirmLeave, setConfirmLeave] = useState(false)
const [searchTerm, setSearchTerm] = useState("")
const [selectedProductId, setSelectedProductId] = useState<number | null>(null)
const [displayPrice, setDisplayPrice] = useState("")

  const form = useForm({ resolver: zodResolver(getSchema(t)), defaultValues: { selectedItem: "", newPrice: 0, reason: "" } })
  const selectedItemStr = form.watch("selectedItem")
  const newPrice = Number(form.watch("newPrice"))

  const isDirty = Object.values(form.formState.dirtyFields).length > 0

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) e.preventDefault()
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [isDirty])

  const debouncedSearch = useDebounce(searchTerm, 300)

  const { data: productsRes, isLoading: searchLoading } = useQuery({
    queryKey: ["products", "list", "100", debouncedSearch],
    queryFn: () => getProducts(0, 100, undefined, debouncedSearch || undefined),
  })

  const { data: availableItems, isLoading: itemsLoading } = useQuery({
    queryKey: ["available-items", selectedProductId],
    queryFn: () => getAvailableItemsByProduct(selectedProductId!),
    enabled: !!selectedProductId,
  })

  const selItem = useMemo(
    () => availableItems?.find((i) => String(i.importReceiptItemId) === selectedItemStr) ?? null,
    [availableItems, selectedItemStr],
  )
  const oldPrice = selItem?.unitPrice ?? 0

  const priceDiffPct = oldPrice > 0 ? Math.abs(((newPrice - oldPrice) / oldPrice) * 100) : 0
  const showPriceWarning = newPrice > 0 && oldPrice > 0 && priceDiffPct > 50

  const allItemsPending = availableItems && availableItems.length > 0 && availableItems.every((i) => i.hasPending)

  const save = useMutation({
    mutationFn: (data: { importReceiptItemId: number; newPrice: number; reason: string }) =>
      createPriceAdjustment(data),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["price-adjustments"] })
      qc.invalidateQueries({ queryKey: ["my-price-adjustments"] })
      toast.success(t("priceAdjCreate.createSuccess", { code: result.adjustCode }))
      navigate("/stock/ops/price-adjustments")
    },
    onError: (e: Error) => toast.error(e.message || t("priceAdjCreate.createError")),
  })

  const handleCreate = useCallback(
    (values: { selectedItem: string; newPrice: number; reason: string }) => {
      const item = availableItems?.find((i) => String(i.importReceiptItemId) === values.selectedItem)
      if (!item) { toast.error(t("priceAdjCreate.batchNotFound")); return }
      if (oldPrice > 0 && values.newPrice === oldPrice) {
        toast.error(t("priceAdjCreate.priceMustDiff"))
        return
      }
      save.mutate({
        importReceiptItemId: Number(values.selectedItem),
        newPrice: values.newPrice,
        reason: values.reason.trim(),
      })
    },
    [availableItems, oldPrice, save, t],
  )

  const products = (productsRes?.content ?? []).filter((p) => p.isActive)

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => {
          if (isDirty) setConfirmLeave(true)
          else navigate("/stock/ops/price-adjustments")
        }}>
          <ArrowLeft className="size-4 mr-1" /> {t("common.back")}
        </Button>
        <h1 className="text-xl font-semibold tracking-tight">{t("priceAdjCreate.title")}</h1>
      </div>

      <div className="grid gap-6 items-start lg:grid-cols-[1fr_380px]">
      <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-4">
        {/* Step 1: Search product */}
        <div className="space-y-2">
          <Label>{t("priceAdjCreate.searchProduct")}</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder={t("priceAdjCreate.searchProductPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchLoading && (
              <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />
            )}
          </div>
          {searchTerm.length >= 2 && products.length === 0 && !searchLoading && (
            <p className="text-xs text-muted-foreground">{t("priceAdjCreate.noProductFound")}</p>
          )}
        </div>

        {/* Product list */}
        {!selectedProductId && products.length > 0 && (
          <div className="space-y-1 border rounded-lg divide-y max-h-[50vh] overflow-y-auto">
            {products.map((p) => (
              <button
                key={p.id}
                type="button"
                className="w-full text-left px-4 py-3 text-sm hover:bg-muted/50 transition-colors"
                onClick={() => setSelectedProductId(p.id)}
              >
                <span className="font-medium">{p.name}</span>
                {p.sku && <span className="text-muted-foreground ml-2 text-xs">({p.sku})</span>}
              </button>
            ))}
          </div>
        )}

        {/* Selected product badge */}
        {selectedProductId && products.length > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-sm">
              {products.find((p) => p.id === selectedProductId)?.name ?? t("priceAdjCreate.productLabel", { id: selectedProductId })}
            </Badge>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setSelectedProductId(null); form.setValue("selectedItem", "") }}>
              {t("priceAdjCreate.changeProduct")}
            </Button>
          </div>
        )}

        {/* Step 2: Select batch (import receipt item) */}
        {itemsLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 justify-center">
            <Loader2 className="size-4 animate-spin" /> {t("priceAdjCreate.loadingBatches")}
          </div>
        )}

        {availableItems && availableItems.length === 0 && !itemsLoading && (
          <Alert>
            <AlertDescription>{t("priceAdjCreate.noBatches")}</AlertDescription>
          </Alert>
        )}

        {allItemsPending && availableItems && availableItems.length > 0 && (
          <Alert variant="default" className="border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
            <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="text-amber-800 text-sm dark:text-amber-300">
              {t("priceAdjCreate.allBatchesPending")}
            </AlertDescription>
          </Alert>
        )}

        {availableItems && availableItems.length > 0 && !allItemsPending && !selItem && (
          <div className="space-y-2">
            <Label>{t("priceAdjCreate.selectBatch")}</Label>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {availableItems.map((item) => (
                <button
                  key={item.importReceiptItemId}
                  type="button"
                  disabled={item.hasPending}
                  onClick={() => form.setValue("selectedItem", String(item.importReceiptItemId))}
                  className={`w-full text-left border rounded-lg p-3 transition-colors ${
                    item.hasPending
                      ? "opacity-50 cursor-not-allowed border-muted"
                      : "hover:border-primary cursor-pointer"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{item.receiptCode}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.receiptDate ? new Date(item.receiptDate).toLocaleDateString("vi-VN") : "—"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm tabular-nums">{(item.unitPrice ?? 0).toLocaleString("vi-VN")}₫</p>
                      {item.hasPending && (
                        <Badge variant="outline" className="text-xs">{t("priceAdjStatus.pending")}</Badge>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <FieldError errors={form.formState.errors.selectedItem ? [{ message: form.formState.errors.selectedItem.message ?? "" }] : undefined} />
          </div>
        )}

        {/* Price — inline: Giá cũ: X₫ → [input]₫ ↑ Tăng Y% */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            {selItem ? (
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {t("priceAdjCreate.oldPrice")} <span className="font-semibold tabular-nums">{(oldPrice ?? 0).toLocaleString("vi-VN")}₫</span>
              </span>
            ) : (
              <span className="text-sm font-medium whitespace-nowrap">{t("priceAdjCreate.newPriceLabel")}</span>
            )}
            {selItem && <ArrowRight className="size-4 text-muted-foreground/30 shrink-0" />}
            <div className="flex items-center gap-1 min-w-[120px] flex-1">
              <Input
                type="text"
                inputMode="numeric"
                placeholder="0"
                className="h-9 w-full"
                value={displayPrice}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9.,]/g, "").replace(",", ".")
                  const num = raw ? Number(raw) : 0
                  form.setValue("newPrice", num, { shouldValidate: true })
                  setDisplayPrice(num ? num.toLocaleString("vi-VN", { maximumFractionDigits: 2 }) + "₫" : "")
                }}
                onFocus={() => {
                  if (newPrice > 0) setDisplayPrice(String(newPrice))
                }}
                onBlur={() => {
                  if (newPrice > 0) setDisplayPrice(newPrice.toLocaleString("vi-VN", { maximumFractionDigits: 2 }) + "₫")
                }}
              />
            </div>
            {newPrice > 0 && oldPrice > 0 && newPrice !== oldPrice && (
              <span
                className={`inline-flex items-center gap-1 text-sm font-semibold whitespace-nowrap ${
                  newPrice > oldPrice ? "text-destructive" : "text-green-600"
                }`}
                aria-live="polite"
              >
                {newPrice > oldPrice ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
                {newPrice > oldPrice ? t("priceAdjCreate.increase") : t("priceAdjCreate.decrease")} {priceDiffPct.toFixed(1)}%
              </span>
            )}
          </div>
          <FieldError errors={form.formState.errors.newPrice ? [{ message: form.formState.errors.newPrice.message ?? "" }] : undefined} />
          {showPriceWarning && (
            <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 rounded-lg px-4 py-2 border border-amber-200 dark:text-amber-300 dark:bg-amber-950/20 dark:border-amber-800">
              <AlertTriangle className="size-4 shrink-0" />
              {t("priceAdjCreate.priceWarning")}
            </div>
          )}
        </div>

        {/* Reason */}
        <div className="space-y-2">
          <Label htmlFor="reason">
            {t("priceAdjCreate.reasonLabel")} <span className="text-destructive">*</span>
          </Label>
          <Textarea id="reason" {...form.register("reason")} rows={3} placeholder={t("priceAdjCreate.reasonPlaceholder")} />
          <FieldError errors={form.formState.errors.reason ? [{ message: form.formState.errors.reason.message ?? "" }] : undefined} />
        </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" type="button" onClick={() => {
          if (isDirty) setConfirmLeave(true)
          else navigate("/stock/ops/price-adjustments")
        }}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? (
            <>
              <span className="size-4 mr-1 animate-spin rounded-full border-2 border-current border-t-transparent" />
              {t("priceAdjCreate.creating")}
            </>
          ) : (
            t("priceAdjCreate.create")
          )}
        </Button>
      </div>
      </form>

      <aside className="lg:sticky lg:top-20">
        <PriceHistoryPanel
          productId={selectedProductId}
          productName={products.find((p) => p.id === selectedProductId)?.name}
        />
      </aside>
      </div>

      <AlertDialog open={confirmLeave} onOpenChange={(v) => { if (!v) setConfirmLeave(false) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("priceAdjCreate.unsavedTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("priceAdjCreate.unsavedDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("dialog.stay")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setConfirmLeave(false); navigate("/stock/ops/price-adjustments") }}>
              {t("dialog.leave")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}