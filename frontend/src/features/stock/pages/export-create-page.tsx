import React, { useState, useEffect, useMemo, useCallback } from "react"
import { LocationCodePopover } from "../components/location-code-popover"
import { useTranslation } from "react-i18next"
import { useForm, useFieldArray, Controller } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createExportReceipt } from "@/services/export-service"
import { useProducts } from "@/hooks/use-products"
import { getSerialsForExport, getAllSerialsForProduct } from "@/services/product-unit-service"
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

export const ExportCreatePage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const reasons: { value: ExportReason; label: string }[] = [
    { value: EXPORT_REASON.SALE, label: t("exportReason.sale") },
    { value: EXPORT_REASON.INTERNAL, label: t("exportReason.internal") },
    { value: EXPORT_REASON.RETURN_SUPPLIER, label: t("exportReason.returnSupplier") },
    { value: EXPORT_REASON.DISPOSE, label: t("exportReason.dispose") },
  ]
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
  const [overrideDialog, setOverrideDialog] = useState<{ tempId: number; productId: number } | null>(null)
  const [overrideSerials, setOverrideSerials] = useState<Record<number, ProductUnit[]>>({})
  const [allProductSerials, setAllProductSerials] = useState<ProductUnit[]>([])
  const [overrideSelectedIds, setOverrideSelectedIds] = useState<number[]>([])
  const [overrideLoading, setOverrideLoading] = useState(false)

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
      toast.success(t("exportCreate.createSuccess"))
      navigate("/stock/exports")
    },
    onError: (err: Error) => toast.error(err.message || t("exportCreate.createError")),
  })

  const openOverrideDialog = useCallback(async (tempId: number, productId: number) => {
    setOverrideDialog({ tempId, productId })
    setOverrideLoading(true)
    const all = await getAllSerialsForProduct(productId)
    setAllProductSerials(all)
    const current = overrideSerials[tempId] ?? serials[tempId] ?? []
    setOverrideSelectedIds(current.map((s) => s.id))
    setOverrideLoading(false)
  }, [overrideSerials, serials])

  const confirmOverride = useCallback(() => {
    if (!overrideDialog) return
    const selected = allProductSerials.filter((s) => overrideSelectedIds.includes(s.id))
    setOverrideSerials((prev) => ({ ...prev, [overrideDialog.tempId]: selected }))
    setOverrideDialog(null)
  }, [overrideDialog, allProductSerials, overrideSelectedIds])

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
      toast.error(t(first.message))
      return
    }
    if (values.reason === EXPORT_REASON.SALE && !values.customerId) {
      toast.error(t("exportCreate.selectCustomerRequired"))
      return
    }
    createMut.mutate({
      reason: values.reason as ExportReason,
      customerId: values.customerId ? Number(values.customerId) : null,
      note: values.note || null,
      items: values.items.map((i) => {
        const overridden = overrideSerials[i.tempId]
        return {
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          ...(overridden ? { serialNumbers: overridden.map((s) => s.serialNumber) } : {}),
        }
      }),
    }, {
      onSuccess: (data) => {
        clearDraft("/stock/exports/new")
        qc.invalidateQueries({ queryKey: ["export-receipts"] })
        toast.success(t("exportCreate.createSuccess"))
        navigate(`/stock/exports/${data.id}`)
      },
      onError: (err: Error) => toast.error(err.message || t("exportCreate.createError")),
    })
  })

  const watchedReason = form.watch("reason")
  const watchedCustomerId = form.watch("customerId")
  const hasSerials = useMemo(() => {
    const hasAuto = Object.values(serials).some((arr) => arr.length > 0)
    const hasOverride = Object.values(overrideSerials).some((arr) => arr.length > 0)
    return hasAuto || hasOverride
  }, [serials, overrideSerials])

  return (
    <div className="mx-auto max-w-4xl space-y-4 lg:space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/stock/exports")}>
          &larr; {t("common.back")}
        </Button>
        <h1 className="text-xl font-semibold tracking-tight">{t("exportCreate.title")}</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="reason">{t("exportCreate.reason")}</Label>
          <Controller
            control={form.control}
            name="reason"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="reason">
                  <SelectValue placeholder={t("exportCreate.reasonPlaceholder")} />
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
            <Label htmlFor="customer">{t("exportCreate.customer")}</Label>
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
                    {t("exportCreate.searchCustomer")}
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
        <Label>{t("exportCreate.addProductLabel")}</Label>
        <div className="flex gap-2">
          <Select value={selectedProductId} onValueChange={setSelectedProductId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder={t("exportCreate.selectProductPlaceholder")} />
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
            <Plus className="size-4 mr-1" /> {t("common.add")}
          </Button>
        </div>
      </div>

      {fields.length > 0 && (
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.product")}</TableHead>
                <TableHead className="w-20 text-right">{t("table.qty")}</TableHead>
                <TableHead className="w-28 text-right">{t("table.unitPrice")}</TableHead>
                <TableHead className="w-28 text-right">{t("table.total")}</TableHead>
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
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">{t("exportCreate.expectedSerials")}</h3>
          </div>
          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("table.product")}</TableHead>
                  <TableHead>{t("table.serial")}</TableHead>
                  <TableHead>{t("table.location")}</TableHead>
                  <TableHead>{t("table.importDate")}</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((item) => {
                  const overridden = overrideSerials[item.tempId]
                  const itemSerials = overridden ?? serials[item.tempId] ?? []
                  if (itemSerials.length === 0) return null
                  return (
                    <React.Fragment key={item.tempId}>
                      {itemSerials.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="text-xs text-muted-foreground">{item.productName}</TableCell>
                          <TableCell className="font-mono text-xs">{s.serialNumber}</TableCell>
                          <TableCell><LocationCodePopover code={s.locationCode} /></TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(s.importedAt).toLocaleDateString("vi-VN")}
                          </TableCell>
                          {s === itemSerials[0] && (
                            <TableCell rowSpan={itemSerials.length}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-[11px] h-7 px-2"
                                onClick={() => openOverrideDialog(item.tempId, item.productId)}
                              >
                                {overridden ? t("exportCreate.editSerial") : t("exportCreate.changeSerial")}
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </React.Fragment>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">
          {t("exportCreate.total")}: {fields.reduce((s, i) => s + i.quantity * i.unitPrice, 0).toLocaleString("vi-VN")}₫
        </span>
      </div>

      <div className="space-y-2">
        <Label htmlFor="note">{t("exportCreate.note")}</Label>
        <Textarea
          id="note"
          placeholder={t("form.noteOptional")}
          {...form.register("note")}
        />
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={() => navigate("/stock/exports")}>
          {t("common.cancel")}
        </Button>
        <Button
          onClick={onSubmit}
          disabled={
            !watchedReason || fields.length === 0 || createMut.isPending || (watchedReason === EXPORT_REASON.SALE && !watchedCustomerId)
          }
        >
          {createMut.isPending ? t("common.processing") : t("exportCreate.submit")}
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
            <DialogTitle>{t("exportCreate.restoreTitle")}</DialogTitle>
            <DialogDescription>{t("exportCreate.restoreDescription")}</DialogDescription>
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

      <Dialog open={overrideDialog != null} onOpenChange={(v) => { if (!v) setOverrideDialog(null) }}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("exportCreate.selectSerialTitle")}</DialogTitle>
            <DialogDescription>
              {t("exportCreate.selectSerialDescription")}
            </DialogDescription>
          </DialogHeader>
          {overrideLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">{t("common.loading")}</div>
          ) : allProductSerials.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">{t("exportCreate.noSerials")}</div>
          ) : (
            <div className="space-y-1">
              {allProductSerials.map((s) => {
                const checked = overrideSelectedIds.includes(s.id)
                return (
                  <label
                    key={s.id}
                    className={`flex items-center gap-3 rounded px-3 py-2 text-sm cursor-pointer transition-colors ${
                      checked ? "bg-primary/5 ring-1 ring-primary/20" : "hover:bg-muted"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        setOverrideSelectedIds((prev) =>
                          checked ? prev.filter((id) => id !== s.id) : [...prev, s.id],
                        )
                      }}
                      className="size-4"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-xs font-medium truncate">{s.serialNumber}</p>
                      <p className="text-[10px] text-muted-foreground">
                        <LocationCodePopover code={s.locationCode} /> · {new Date(s.importedAt).toLocaleDateString("vi-VN")}
                      </p>
                    </div>
                  </label>
                )
              })}
            </div>
          )}
          <DialogFooter className="gap-2 flex-col sm:flex-row">
            <Button variant="outline" onClick={() => setOverrideDialog(null)} className="w-full sm:w-auto">
              {t("common.cancel")}
            </Button>
            <Button
              onClick={confirmOverride}
              disabled={overrideSelectedIds.length === 0}
              className="w-full sm:w-auto"
            >
              {t("exportCreate.confirmSerial", { count: overrideSelectedIds.length })}
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
