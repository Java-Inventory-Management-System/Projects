import { useRef, useState, useMemo, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { createReturnReceipt, getReturnableUnits, type BulkSummary, type ReturnableUnit } from "@/services/return-service"
import { getDefectCategories } from "@/services/defect-category-service"
import { getCustomers } from "@/services/customer-service"
import { getExportReceipts } from "@/services/export-service"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ImageUpload } from "@/components/ui/image-upload"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { ArrowLeft, Search, X, Sparkles, AlertTriangle } from "lucide-react"
import { cn } from "@/utils/cn"
import { toast } from "@/utils/toast"
import { useFormDraft, clearDraft } from "@/hooks/use-form-draft"
import {
  EXPORT_RECEIPT_STATUS,
  RETURN_REASON,
  RETURN_ITEM_CONDITION,
  type ReturnReason,
  RETURN_RESULTING_ACTION,
  TRACKING_TYPE,
} from "@/utils/types"

interface ReturnFormItem {
  key: string
  productUnitId: number | null
  productId: number
  productName: string
  productSku: string
  serialNumber: string
  trackingType: string
  quantity: number
  condition: string
  resultingAction: string
  description: string
  evidenceImage: string
}

interface ReturnItemConfig {
  condition: string
  resultingAction: string
  description: string
  evidenceImage: string
  defectCategoryId: number | null
}

const DEFAULT_ITEM_CONFIG: ReturnItemConfig = {
  condition: RETURN_ITEM_CONDITION.GOOD,
  resultingAction: RETURN_RESULTING_ACTION.RESTOCK,
  description: "",
  evidenceImage: "",
  defectCategoryId: null,
}

const DRAFT_PATH = "/returns-qc/returns/new"

const STEP_LABELS = ["returnCreate.step1", "returnCreate.step2", "returnCreate.step3"] as const

export const ReturnCreatePage = () => {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { t } = useTranslation()

  const [step, setStep] = useState(0)
  const [mode, setMode] = useState<"serial" | "bulk" | null>(null)
  const [serials, setSerials] = useState<Set<number>>(new Set())
  const [bulkQty, setBulkQty] = useState<Record<number, number>>({})
  const [configs, setConfigs] = useState<Record<string, ReturnItemConfig>>({})

  const [customerQuery, setCustomerQuery] = useState("")
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null)
  const [selectedCustomerName, setSelectedCustomerName] = useState<string | null>(null)
  const [exportQuery, setExportQuery] = useState("")
  const [selectedExportId, setSelectedExportId] = useState<number | null>(null)
  const [selectedExportCode, setSelectedExportCode] = useState<string | null>(null)
  const [selectedExportCreatedAt, setSelectedExportCreatedAt] = useState<string | null>(null)
  const [serialFilter, setSerialFilter] = useState("")

  const [showDraftDialog, setShowDraftDialog] = useState(false)
  const [applyAllOpen, setApplyAllOpen] = useState(false)
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const form = useForm<{ reason: ReturnReason; note: string }>({ defaultValues: { reason: RETURN_REASON.DEFECTIVE, note: "" } })
  const watchedReason = form.watch("reason")

  const { data: customersData } = useQuery({
    queryKey: ["customers", customerQuery],
    queryFn: () => getCustomers(0, 50, customerQuery || undefined),
    enabled: !selectedCustomerId,
  })

  const { data: exportsData } = useQuery({
    queryKey: ["exports", exportQuery, selectedCustomerId],
    queryFn: () => getExportReceipts(0, 50, undefined, EXPORT_RECEIPT_STATUS.COMPLETED, selectedCustomerId ?? undefined),
    enabled: !selectedExportId && !!selectedCustomerId,
  })

  const { data: returnable } = useQuery({
    queryKey: ["returnable-units", selectedExportId],
    queryFn: () => getReturnableUnits(selectedExportId!),
    enabled: !!selectedExportId,
  })

  const { data: defectCategories = [] } = useQuery({
    queryKey: ["defect-categories"],
    queryFn: getDefectCategories,
  })

  const createMut = useMutation({
    mutationFn: createReturnReceipt,
    onSuccess: () => {
      toast.success(t("returnCreate.createSuccess"))
      clearDraft(DRAFT_PATH)
      qc.invalidateQueries({ queryKey: ["return-receipts"] })
      qc.invalidateQueries({ queryKey: ["work-queue"] })
      navigate("/returns-qc/returns")
    },
    onError: (err: Error) => toast.error(err.message || t("returnCreate.createError")),
  })

  const bulkList = useMemo<BulkSummary[]>(
    () => (returnable?.bulkSummary ?? []).filter((b) => b.trackingType === TRACKING_TYPE.BULK),
    [returnable],
  )

  const unitById = useMemo(() => {
    const m = new Map<number, ReturnableUnit>()
    returnable?.units.forEach((u) => m.set(u.unitId, u))
    return m
  }, [returnable])

  const hasReturnable = useMemo(() => {
    if (!returnable) return null
    return returnable.units.length > 0 || bulkList.some((b) => b.remainingQty > 0)
  }, [returnable, bulkList])

  const serialGroups = useMemo(() => {
    const groups = new Map<number, ReturnableUnit[]>()
    for (const u of returnable?.units ?? []) {
      const arr = groups.get(u.productId) ?? []
      arr.push(u)
      groups.set(u.productId, arr)
    }
    return [...groups.entries()]
  }, [returnable])

  const filteredSerialGroups = useMemo(() => {
    const q = serialFilter.trim().toLowerCase()
    if (!q) return serialGroups
    return serialGroups
      .map(([pid, units]) => [
        pid,
        units.filter(
          (u) =>
            u.serialNumber.toLowerCase().includes(q) ||
            u.productName.toLowerCase().includes(q) ||
            u.productSku?.toLowerCase().includes(q),
        ),
      ] as [number, ReturnableUnit[]])
      .filter(([, units]) => units.length > 0)
  }, [serialGroups, serialFilter])

  const changeMindInfo = useMemo(() => {
    if (watchedReason !== RETURN_REASON.CHANGE_MIND || !selectedExportCreatedAt) return null
    const daysSince = Math.floor((Date.now() - new Date(selectedExportCreatedAt).getTime()) / 86400000)
    const remaining = 7 - daysSince
    return { daysSince, remaining, expired: remaining <= 0 }
  }, [watchedReason, selectedExportCreatedAt])

  const exportCreatedDaysSince = useMemo(() => {
    if (!selectedExportCreatedAt) return null
    return Math.floor((Date.now() - new Date(selectedExportCreatedAt).getTime()) / 86400000)
  }, [selectedExportCreatedAt])

  const changeMindExpired = exportCreatedDaysSince !== null && exportCreatedDaysSince >= 7

  const changeMindDeadline = selectedExportCreatedAt
    ? new Date(new Date(selectedExportCreatedAt).getTime() + 7 * 86400000).toLocaleDateString("vi-VN")
    : null

  const [qtyTouched, setQtyTouched] = useState<Record<number, boolean>>({})

  const returnItems = useMemo((): ReturnFormItem[] => {
    const result: ReturnFormItem[] = []
    for (const unitId of serials) {
      const u = unitById.get(unitId)
      if (!u) continue
      const key = `ser:${u.unitId}`
      const cfg = configs[key] ?? DEFAULT_ITEM_CONFIG
      result.push({
        key,
        productUnitId: u.unitId,
        productId: u.productId,
        productName: u.productName,
        productSku: u.productSku,
        serialNumber: u.serialNumber,
        trackingType: TRACKING_TYPE.SERIALIZED,
        quantity: 1,
        ...cfg,
      })
    }
    for (const [pidStr, qty] of Object.entries(bulkQty)) {
      if (qty <= 0) continue
      const b = bulkList.find((x) => x.productId === Number(pidStr))
      if (!b) continue
      const key = `bulk:${b.productId}`
      const cfg = configs[key] ?? DEFAULT_ITEM_CONFIG
      result.push({
        key,
        productUnitId: null,
        productId: b.productId,
        productName: b.productName,
        productSku: b.productSku,
        serialNumber: "",
        trackingType: TRACKING_TYPE.BULK,
        quantity: qty,
        ...cfg,
      })
    }
    return result
  }, [serials, bulkQty, configs, unitById, bulkList])

  const actionsFor = (trackingType: string, condition: string): string[] => {
    if (condition === RETURN_ITEM_CONDITION.GOOD) return [RETURN_RESULTING_ACTION.RESTOCK]
    if (trackingType === TRACKING_TYPE.SERIALIZED) {
      return [
        RETURN_RESULTING_ACTION.SCRAP,
        RETURN_RESULTING_ACTION.WARRANTY_TRANSFER,
        RETURN_RESULTING_ACTION.REJECT,
      ]
    }
    return [RETURN_RESULTING_ACTION.SCRAP, RETURN_RESULTING_ACTION.REJECT]
  }

  const updateConfig = (key: string, field: keyof ReturnItemConfig, value: string) => {
    const parsed = field === "defectCategoryId" ? (value ? Number(value) : null) : value
    setConfigs((prev) => ({ ...prev, [key]: { ...(prev[key] ?? DEFAULT_ITEM_CONFIG), [field]: parsed } }))
  }

  const updateCondition = (item: ReturnFormItem, condition: string) => {
    const cfg = configs[item.key] ?? DEFAULT_ITEM_CONFIG
    const valid = actionsFor(item.trackingType, condition)
    const nextAction = valid.includes(cfg.resultingAction) ? cfg.resultingAction : valid[0]
    setConfigs((prev) => ({ ...prev, [item.key]: { ...cfg, condition, resultingAction: nextAction } }))
  }

  const applyAllSkipped = useMemo(() => {
    if (returnItems.length <= 1) return 0
    const first = returnItems[0]
    if (first.resultingAction !== RETURN_RESULTING_ACTION.WARRANTY_TRANSFER) return 0
    return returnItems.filter((i) => i.condition !== RETURN_ITEM_CONDITION.DEFECTIVE).length
  }, [returnItems])

  const applyAll = () => {
    const first = returnItems[0]
    setConfigs((prev) => {
      const next: typeof prev = {}
      for (const item of returnItems) {
        const existing = prev[item.key] ?? DEFAULT_ITEM_CONFIG
        const incompatible =
          first.resultingAction === RETURN_RESULTING_ACTION.WARRANTY_TRANSFER &&
          item.condition !== RETURN_ITEM_CONDITION.DEFECTIVE
        next[item.key] = incompatible
          ? existing
          : {
              ...existing,
              condition: first.condition,
              resultingAction: first.resultingAction,
              defectCategoryId: first.defectCategoryId,
              description: first.description,
              evidenceImage: first.evidenceImage,
            }
      }
      return next
    })
    setApplyAllOpen(false)
  }

  const removeReturnItem = (item: ReturnFormItem) => {
    setConfigs((prev) => {
      const next = { ...prev }
      delete next[item.key]
      return next
    })
    if (item.trackingType === TRACKING_TYPE.SERIALIZED) {
      setSerials((prev) => {
        const next = new Set(prev)
        next.delete(item.productUnitId!)
        return next
      })
    } else {
      setBulkQty((prev) => {
        const next = { ...prev }
        delete next[item.productId]
        return next
      })
    }
  }

  const toggleSerial = (unitId: number) => {
    setSerials((prev) => {
      const next = new Set(prev)
      if (next.has(unitId)) next.delete(unitId)
      else next.add(unitId)
      return next
    })
  }

  const handleBulkQty = (b: BulkSummary, raw: string) => {
    setQtyTouched((prev) => ({ ...prev, [b.productId]: true }))
    const v = parseInt(raw) || 0
    const clamped = Math.max(0, Math.min(v, b.remainingQty))
    setBulkQty((prev) => {
      const next = { ...prev }
      if (clamped > 0) next[b.productId] = clamped
      else delete next[b.productId]
      return next
    })
  }

  const selectMode = (m: "serial" | "bulk") => {
    setMode(m)
    setSerials(new Set())
    setBulkQty({})
    setConfigs({})
    setSerialFilter("")
  }

  const selectExport = (e: { id: number; receiptCode: string; createdAt: string }) => {
    setSelectedExportId(e.id)
    setSelectedExportCode(e.receiptCode)
    setSelectedExportCreatedAt(e.createdAt)
    setExportQuery("")
    setMode(null)
    setSerials(new Set())
    setBulkQty({})
    setConfigs({})
    setSerialFilter("")
  }

  const clearExport = () => {
    setSelectedExportId(null)
    setSelectedExportCode(null)
    setSelectedExportCreatedAt(null)
    setMode(null)
    setSerials(new Set())
    setBulkQty({})
    setConfigs({})
    setSerialFilter("")
  }

  const clearCustomer = () => {
    setSelectedCustomerId(null)
    setSelectedCustomerName(null)
    clearExport()
  }

  const step0Valid =
    !!selectedCustomerId && !!selectedExportId && !!watchedReason && hasReturnable !== false

  const step1Valid = mode !== null && returnItems.length > 0

  const onSubmit = () => {
    if (returnItems.length === 0) return
    const errors: Record<string, string> = {}
    for (const item of returnItems) {
      if (item.trackingType === TRACKING_TYPE.BULK && item.quantity <= 0) {
        errors[item.key] = t("returnCreate.qtyRequired", { name: item.productName })
      }
      if (
        item.condition === RETURN_ITEM_CONDITION.DEFECTIVE &&
        (!item.description.trim() || !item.evidenceImage.trim() || !item.defectCategoryId)
      ) {
        errors[item.key] = t("returnCreate.missingEvidence", { name: item.productName })
      }
    }
    const firstKey = Object.keys(errors)[0]
    if (firstKey) {
      rowRefs.current[firstKey]?.scrollIntoView({ behavior: "smooth", block: "center" })
      setConfigs((prev) => ({ ...prev }))
      toast.error(errors[firstKey])
      return
    }
    createMut.mutate({
      customerId: selectedCustomerId!,
      originalExportReceiptId: selectedExportId!,
      reason: watchedReason,
      note: form.watch("note").trim() || undefined,
      items: returnItems.map((i) => ({
        productUnitId: i.productUnitId,
        productId: i.productId,
        quantity: i.quantity,
        condition: i.condition,
        resultingAction: i.resultingAction,
        description: i.description.trim() || undefined,
        evidenceImage: i.evidenceImage.trim() || undefined,
        defectCategoryId: i.defectCategoryId,
      })),
    })
  }

  const reasonOptions = [
    { value: RETURN_REASON.DEFECTIVE, label: t("returnReason.defective") },
    { value: RETURN_REASON.CHANGE_MIND, label: t("returnReason.changeMind") },
    { value: RETURN_REASON.WRONG_ITEM, label: t("returnReason.wrongItem") },
    { value: RETURN_REASON.WARRANTY_CLAIM, label: t("returnReason.warrantyClaim") },
  ]

  interface ReturnDraft {
    v: 3
    savedAt?: number
    customerId: number | null
    customerName: string | null
    exportId: number | null
    exportCode: string | null
    exportCreatedAt: string | null
    reason: ReturnReason
    note: string
    mode: "serial" | "bulk" | null
    serialUnitIds: number[]
    bulkQty: Record<number, number>
    configs: Record<string, ReturnItemConfig>
  }
  const draftState = useMemo<ReturnDraft>(
    () => ({
      v: 3,
      savedAt: Date.now(),
      customerId: selectedCustomerId,
      customerName: selectedCustomerName,
      exportId: selectedExportId,
      exportCode: selectedExportCode,
      exportCreatedAt: selectedExportCreatedAt,
      reason: watchedReason,
      note: form.watch("note") ?? "",
      mode,
      serialUnitIds: [...serials],
      bulkQty,
      configs,
    }),
    [selectedCustomerId, selectedCustomerName, selectedExportId, selectedExportCode, selectedExportCreatedAt, watchedReason, form, mode, serials, bulkQty, configs],
  )
  const draftDirty = !!(selectedCustomerId || selectedExportId || serials.size > 0 || Object.keys(bulkQty).length > 0)
  const { draftAvailable, restore, dismiss } = useFormDraft<ReturnDraft>(
    DRAFT_PATH,
    draftState as unknown as ReturnDraft,
    draftDirty,
    (data) => {
      const d = data as ReturnDraft
      if (d.v !== 3) return
      setSelectedCustomerId(d.customerId)
      setSelectedCustomerName(d.customerName)
      setSelectedExportId(d.exportId)
      setSelectedExportCode(d.exportCode)
      setSelectedExportCreatedAt(d.exportCreatedAt)
      setMode(d.mode)
      setSerials(new Set(d.serialUnitIds ?? []))
      setBulkQty(d.bulkQty ?? {})
      setConfigs(d.configs ?? {})
      if (d.reason) form.setValue("reason", d.reason)
      if (d.note) form.setValue("note", d.note)
      if ((d.serialUnitIds?.length ?? 0) > 0 || Object.keys(d.bulkQty ?? {}).length > 0) setStep(2)
    },
  )
  useEffect(() => {
    if (draftAvailable) setShowDraftDialog(true)
  }, [draftAvailable])

  const isChangeMind = watchedReason === RETURN_REASON.CHANGE_MIND

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/returns-qc/returns")}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-xl font-semibold tracking-tight">{t("returnCreate.title")}</h1>
      </div>

      <div className="flex items-center gap-2">
        {STEP_LABELS.map((labelKey, i) => (
          <div key={labelKey} className="flex flex-1 items-center gap-2">
            <div
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                i === step
                  ? "bg-primary text-primary-foreground"
                  : i < step
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {i + 1}
            </div>
            <span
              className={cn(
                "text-xs font-medium",
                i === step ? "text-foreground" : i < step ? "text-primary" : "text-muted-foreground",
              )}
            >
              {t(labelKey)}
            </span>
            {i < STEP_LABELS.length - 1 && <div className="h-px flex-1 bg-border" />}
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-4 rounded-lg border p-6">
          <div className="space-y-2">
            <Label>
              {t("returnCreate.customer")} <span className="text-destructive">*</span>
            </Label>
            {selectedCustomerId ? (
              <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
                <span className="flex-1 font-medium">{selectedCustomerName}</span>
                <Button variant="ghost" size="icon" className="size-6" onClick={clearCustomer}>
                  <X className="size-3" />
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  value={customerQuery}
                  onChange={(e) => setCustomerQuery(e.target.value)}
                  placeholder={t("returnCreate.searchCustomerPlaceholder")}
                  className="pl-9"
                />
              </div>
            )}
            {!selectedCustomerId && customersData && (
              <div className="rounded-lg border max-h-32 overflow-y-auto divide-y text-sm">
                {customersData.content.length > 0 ? (
                  customersData.content.map((c) => (
                    <div
                      key={c.id}
                      className="flex cursor-pointer items-center justify-between px-3 py-1.5 hover:bg-muted/30"
                      onClick={() => {
                        setSelectedCustomerId(c.id)
                        setSelectedCustomerName(c.name)
                        setCustomerQuery("")
                      }}
                    >
                      <span className="font-medium">{c.name}</span>
                      {c.phone && <span className="text-xs text-muted-foreground">{c.phone}</span>}
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-2 text-xs text-muted-foreground">
                    {customerQuery ? t("returnCreate.noCustomerFound") : t("returnCreate.typeToSearchCustomer")}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>
              {t("returnCreate.originalExport")} <span className="text-destructive">*</span>
            </Label>
            {selectedExportId ? (
              <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
                <span className="flex-1 font-mono text-xs font-medium">{selectedExportCode}</span>
                {exportCreatedDaysSince !== null && (
                  <span
                    className={cn(
                      "text-xs",
                      exportCreatedDaysSince >= 7 ? "text-red-500" : "text-muted-foreground",
                    )}
                  >
                    {exportCreatedDaysSince >= 7
                      ? t("returnCreate.changeMindExpired", { days: exportCreatedDaysSince })
                      : t("returnCreate.changeMindRemaining", { days: 7 - exportCreatedDaysSince })}
                  </span>
                )}
                <Button variant="ghost" size="icon" className="size-6" onClick={clearExport}>
                  <X className="size-3" />
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    value={exportQuery}
                    onChange={(e) => setExportQuery(e.target.value)}
                    placeholder={t("returnCreate.searchExportPlaceholder")}
                    className="pl-9"
                  />
                </div>
                <div className="rounded-lg border max-h-40 overflow-y-auto divide-y text-sm">
                  {exportsData?.content.map((e) => (
                    <div
                      key={e.id}
                      className="flex cursor-pointer items-center justify-between px-3 py-1.5 hover:bg-muted/30"
                      onClick={() => selectExport(e)}
                    >
                      <span className="font-mono text-xs font-medium">{e.receiptCode}</span>
                      <span className="text-xs text-muted-foreground">{e.customerName ?? "—"}</span>
                    </div>
                  ))}
                  {exportsData && exportsData.content.length === 0 && (
                    <div className="px-3 py-2 text-xs text-muted-foreground">{t("returnCreate.noExports")}</div>
                  )}
                </div>
              </div>
            )}
            {hasReturnable === false && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800 px-3 py-2 text-xs text-red-600">
                <AlertTriangle className="size-3.5 shrink-0" />
                {t("returnCreate.noReturnableExport")}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>
              {t("returnCreate.reason")} <span className="text-destructive">*</span>
            </Label>
            <div className="flex flex-wrap gap-2">
              {reasonOptions.map((opt) => {
                const isChangeMindExpired = opt.value === RETURN_REASON.CHANGE_MIND && changeMindExpired
                return (
                  <label
                    key={opt.value}
                    title={
                      isChangeMindExpired
                        ? t("returnCreate.changeMindExpiredOption", { days: exportCreatedDaysSince })
                        : undefined
                    }
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                      watchedReason === opt.value
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/30",
                      isChangeMindExpired && "opacity-40 cursor-not-allowed",
                    )}
                  >
                    <input
                      type="radio"
                      name="reason"
                      value={opt.value}
                      checked={watchedReason === opt.value}
                      disabled={isChangeMindExpired}
                      onChange={(e) => {
                        if (isChangeMindExpired) return
                        form.setValue("reason", e.target.value as ReturnReason)
                      }}
                      className="size-3.5 text-primary"
                    />
                    <span>{opt.label}</span>
                  </label>
                )
              })}
            </div>
            {changeMindExpired && (
              <p className="text-xs text-red-600">{t("returnCreate.changeMindExpiredOption", { days: exportCreatedDaysSince })}</p>
            )}
            {changeMindInfo && (
              <div
                className={cn(
                  "text-sm mt-2 rounded-lg border px-4 py-3 flex items-start gap-2",
                  changeMindInfo.expired
                    ? "border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800 text-red-600"
                    : "border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 text-blue-600",
                )}
              >
                <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                <div>
                  {changeMindInfo.expired
                    ? t("returnCreate.changeMindExpiredDetail", { days: changeMindInfo.daysSince, date: changeMindDeadline })
                    : t("returnCreate.changeMindRemainingDetail", { remaining: changeMindInfo.remaining, days: changeMindInfo.daysSince, date: changeMindDeadline })}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">{t("returnCreate.note")}</Label>
            <Textarea
              id="note"
              {...form.register("note")}
              placeholder={t("form.notePlaceholder")}
              rows={2}
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={() => setStep(1)} disabled={!step0Valid}>
              {t("returnCreate.continue")}
            </Button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4 rounded-lg border p-6">
          <div className="space-y-2">
            <Label>{t("returnCreate.modeLabel")}</Label>
            <div className="flex gap-2">
              {(["serial", "bulk"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => selectMode(m)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm transition-colors",
                    mode === m ? "border-primary bg-primary/5" : "hover:bg-muted/30",
                  )}
                >
                  {m === "serial" ? t("returnCreate.modeSerial") : t("returnCreate.modeBulk")}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{t("returnCreate.modeHint")}</p>
          </div>

          {mode === "serial" && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  value={serialFilter}
                  onChange={(e) => setSerialFilter(e.target.value)}
                  placeholder={t("returnCreate.searchSerialPlaceholder")}
                  className="pl-9 h-8 text-xs"
                />
              </div>
              {filteredSerialGroups.length > 0 ? (
                filteredSerialGroups.map(([productId, units]) => {
                  const selectable = units.filter((u) => !u.held)
                  const groupAllSelected = selectable.length > 0 && selectable.every((u) => serials.has(u.unitId))
                  const groupSomeSelected = selectable.some((u) => serials.has(u.unitId))
                  return (
                  <div key={productId} className="rounded-lg border divide-y">
                    <div className="flex items-center justify-between px-3 py-2 bg-muted/30">
                      <div className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          className="size-3.5 shrink-0"
                          checked={groupAllSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = groupSomeSelected && !groupAllSelected
                          }}
                          disabled={selectable.length === 0}
                          onChange={() => {
                            setSerials((prev) => {
                              const next = new Set(prev)
                              if (groupAllSelected) selectable.forEach((u) => next.delete(u.unitId))
                              else selectable.forEach((u) => next.add(u.unitId))
                              return next
                            })
                          }}
                        />
                        <span className="text-xs font-medium truncate">{units[0].productName}</span>
                        {units[0].productSku && (
                          <span className="text-xs text-muted-foreground">SKU: {units[0].productSku}</span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {t("returnCreate.selected", {
                          count: units.filter((u) => serials.has(u.unitId)).length,
                          total: units.filter((u) => !u.held).length,
                        })}
                      </span>
                    </div>
                    <div className="max-h-48 overflow-y-auto divide-y">
                      {units.map((u) => (
                        <label
                          key={u.unitId}
                          className={cn(
                            "flex items-center gap-2 px-3 py-1.5 text-sm",
                            u.held ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-muted/30",
                          )}
                        >
                          <input
                            type="checkbox"
                            className="size-3.5 shrink-0"
                            checked={serials.has(u.unitId)}
                            disabled={u.held}
                            onChange={() => toggleSerial(u.unitId)}
                          />
                          <span className="font-mono text-xs">{u.serialNumber}</span>
                          {u.warrantyExpiresAt &&
                            (new Date(u.warrantyExpiresAt).getTime() < Date.now() ? (
                              <span className="ml-auto text-xs text-red-600 rounded bg-red-50 dark:bg-red-950/30 px-1.5 py-0.5 shrink-0">
                                {t("returnCreate.warrantyExpired")}
                              </span>
                            ) : (
                              <span className="ml-auto text-xs text-emerald-700 rounded bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 shrink-0">
                                {t("returnCreate.warrantyUntil", {
                                  date: new Date(u.warrantyExpiresAt).toLocaleDateString("vi-VN"),
                                })}
                              </span>
                            ))}
                          {u.held && (
                            <span className="ml-auto text-xs text-amber-600 rounded bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.5 shrink-0">
                              {t("returnCreate.serialHeld")}
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                  )
                })
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">
                  {serialFilter ? t("returnCreate.noSerialMatch") : t("returnCreate.noSerialsAvailable")}
                </p>
              )}
            </div>
          )}

          {mode === "bulk" && (
            <div className="space-y-2">
              {bulkList.length > 0 ? (
                bulkList.map((b) => {
                  const qty = bulkQty[b.productId] ?? 0
                  const exhausted = b.remainingQty <= 0
                  return (
                    <div key={b.productId} className="flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{b.productName}</p>
                        <p className="text-xs text-muted-foreground">
                          {t("returnCreate.soldReturnedRemaining", {
                            sold: b.soldQty,
                            returned: b.returnedQty,
                            remaining: b.remainingQty,
                          })}
                        </p>
                      </div>
                      {exhausted ? (
                        <span className="text-xs text-muted-foreground rounded bg-muted px-1.5 py-0.5 shrink-0">
                          {t("returnCreate.fullyReturned")}
                        </span>
                      ) : (
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground text-xs">{t("returnCreate.return")}:</span>
                            <Input
                              type="number"
                              min={0}
                              max={b.remainingQty}
                              value={qty === 0 ? "" : qty}
                              onChange={(e) => handleBulkQty(b, e.target.value)}
                              className={cn(
                                "h-7 w-16 text-xs text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                                qtyTouched[b.productId] && qty <= 0 && "border-red-500 focus-visible:ring-red-500",
                              )}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs shrink-0"
                              onClick={() => handleBulkQty(b, String(b.remainingQty))}
                            >
                              {t("returnCreate.max")}
                            </Button>
                          </div>
                          {qtyTouched[b.productId] && qty <= 0 && (
                            <p className="text-xs text-red-600">
                              {t("returnCreate.qtyRequired", { name: b.productName })}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">{t("returnCreate.noBulkProducts")}</p>
              )}
            </div>
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(0)}>
              {t("returnCreate.back")}
            </Button>
            <Button onClick={() => setStep(2)} disabled={!step1Valid}>
              {t("returnCreate.continue")}
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4 rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <Label className="text-base">{t("returnCreate.returnProducts")}</Label>
            {returnItems.length > 1 && (
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setApplyAllOpen(true)}>
                <Sparkles className="size-3 mr-1" /> {t("returnCreate.applyAll")}
              </Button>
            )}
          </div>

          {returnItems.length > 0 ? (
            <div className="rounded-lg border divide-y text-sm">
              {returnItems.map((item) => {
                const validActions = actionsFor(item.trackingType, item.condition)
                const missingEvidence =
                  item.condition === RETURN_ITEM_CONDITION.DEFECTIVE &&
                  (!item.description.trim() || !item.evidenceImage.trim() || !item.defectCategoryId)
                const unusualCombo = isChangeMind && item.condition === RETURN_ITEM_CONDITION.DEFECTIVE
                return (
                  <div
                    key={item.key}
                    ref={(el) => {
                      rowRefs.current[item.key] = el
                    }}
                    className={cn(
                      "grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto]",
                      missingEvidence && "bg-red-50/60 dark:bg-red-950/10 ring-1 ring-inset ring-red-300 dark:ring-red-800",
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-medium px-1.5 py-0.5 rounded shrink-0 bg-muted text-muted-foreground">
                        {item.trackingType === TRACKING_TYPE.SERIALIZED
                          ? t("trackingType.serialized")
                          : t("trackingType.bulk")}
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{item.productName}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.serialNumber && <span className="font-mono">{item.serialNumber}</span>}
                          {item.productSku && (
                            <span className="ml-2 text-muted-foreground">SKU: {item.productSku}</span>
                          )}
                        </p>
                      </div>
                      <span className="text-muted-foreground shrink-0 ml-auto">x{item.quantity}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      <select
                        value={item.condition}
                        onChange={(e) => updateCondition(item, e.target.value)}
                        className="h-8 text-xs rounded-md border border-input bg-background px-2"
                      >
                        <option value={RETURN_ITEM_CONDITION.GOOD}>{t("returnCondition.good")}</option>
                        <option value={RETURN_ITEM_CONDITION.DEFECTIVE}>{t("returnCondition.defective")}</option>
                      </select>
                      {validActions.length === 1 ? (
                        <span className="h-8 flex items-center rounded-md bg-muted px-2 text-xs text-muted-foreground">
                          {t("returnAction.restock")}
                        </span>
                      ) : (
                        <select
                          value={item.resultingAction}
                          onChange={(e) => updateConfig(item.key, "resultingAction", e.target.value)}
                          className="h-8 text-xs rounded-md border border-input bg-background px-2"
                        >
                          {validActions.map((act) => (
                            <option key={act} value={act}>
                              {act === RETURN_RESULTING_ACTION.SCRAP && t("returnAction.scrap")}
                              {act === RETURN_RESULTING_ACTION.REJECT && t("returnAction.reject")}
                              {act === RETURN_RESULTING_ACTION.WARRANTY_TRANSFER && t("returnAction.warrantyTransfer")}
                            </option>
                          ))}
                        </select>
                      )}
                      <Button variant="ghost" size="icon" className="size-6 shrink-0" onClick={() => removeReturnItem(item)}>
                        <X className="size-3" />
                      </Button>
                    </div>
                    {item.condition === RETURN_ITEM_CONDITION.DEFECTIVE && (
                      <div className="sm:col-span-2 space-y-2">
                        <div className="grid gap-2 sm:grid-cols-[minmax(0,240px)_1fr]">
                          <select
                            value={item.defectCategoryId ?? ""}
                            onChange={(e) => updateConfig(item.key, "defectCategoryId", e.target.value)}
                            className="h-8 text-xs rounded-md border border-input bg-background px-2 w-full"
                          >
                            <option value="">{t("returnCreate.selectDefect")}</option>
                            {defectCategories
                              .filter((d) => d.isActive)
                              .map((d) => (
                                <option key={d.id} value={d.id}>
                                  {d.name} ({d.code})
                                </option>
                              ))}
                          </select>
                          <Textarea
                            placeholder={t("returnCreate.descriptionPlaceholder")}
                            value={item.description}
                            onChange={(e) => updateConfig(item.key, "description", e.target.value)}
                            className="min-h-10 text-xs"
                          />
                        </div>
                        <ImageUpload
                          value={item.evidenceImage}
                          onChange={(v) => updateConfig(item.key, "evidenceImage", v)}
                        />
                        {missingEvidence && (
                          <p className="text-xs text-red-600">
                            {t("returnCreate.missingEvidence", { name: item.productName })}
                          </p>
                        )}
                      </div>
                    )}
                    {unusualCombo && (
                      <div className="sm:col-span-2 flex items-center gap-1.5 text-xs text-amber-600">
                        <AlertTriangle className="size-3.5 shrink-0" />
                        {t("returnCreate.unusualCombo")}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground py-2 text-center">
              {t("returnCreate.noProductsSelected")}
            </p>
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>
              {t("returnCreate.back")}
            </Button>
            <Button onClick={onSubmit} disabled={returnItems.length === 0 || createMut.isPending}>
              {createMut.isPending
                ? t("returnCreate.creating")
                : t("returnCreate.create", { count: returnItems.length })}
            </Button>
          </div>
        </div>
      )}

      <Dialog open={applyAllOpen} onOpenChange={(v) => { if (!v) setApplyAllOpen(false) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("returnCreate.applyAllConfirm")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <p className="text-muted-foreground">
              {t("returnCreate.applyAllConfirmDesc", {
                product: returnItems[0]?.productName,
                count: returnItems.length,
              })}
            </p>
            {applyAllSkipped > 0 && (
              <p className="text-xs text-amber-600">{t("returnCreate.applyAllKeep", { count: applyAllSkipped })}</p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setApplyAllOpen(false)}>
              {t("dialog.back")}
            </Button>
            <Button onClick={applyAll}>{t("returnCreate.applyAll")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <DialogTitle>{t("returnCreate.restoreTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t("returnCreate.restoreDescription")}</p>
          {draftState.savedAt && (
            <p className="text-xs text-muted-foreground">
              {t("returnCreate.draftSavedAt", { time: new Date(draftState.savedAt).toLocaleTimeString("vi-VN") })}
            </p>
          )}
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
    </div>
  )
}