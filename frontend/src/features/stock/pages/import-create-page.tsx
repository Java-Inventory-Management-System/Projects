import { useState, useMemo, useReducer, useEffect, useRef } from "react"
import { useNavigate, useBlocker, useSearchParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createImportReceipt, confirmImportReceipt, getImportReceiptById } from "@/services/import-service"
import { getExportReceipts, getExportUnits, type ExportUnit } from "@/services/export-service"
import { usePurchaseOrders, usePurchaseOrderById } from "@/hooks/use-purchase-orders"
import { useLocationMap } from "@/hooks/use-location-map"
import { type DiscrepancyNote } from "@/utils/types"
import { EXPORT_RECEIPT_STATUS, EXPORT_REASON } from "@/utils/types"
import { toast } from "@/utils/toast"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useTranslation } from "react-i18next"
import { Check, ChevronLeft, ChevronRight } from "lucide-react"
import { ImportStepSerials } from "../components/import-create-step-serials"
import { ImportStepQc } from "../components/import-create-step-qc"
import { SerialModal } from "../components/serial-modal"
import { itemReducer } from "../reducers/import-create-reducer"
import { Label } from "@/components/ui/label"

const WARRANTY_RESULT_TYPES = ["REPAIRED", "REJECTED", "REPLACED"]
const ZONE_ORDER = ["A", "B", "C", "D", "E"]

const steps = (t: (k: string) => string) => [
  { num: 1, label: t("importCreate.stepSelectOrder") },
  { num: 2, label: t("importCreate.stepSerials") },
  { num: 3, label: t("importCreate.stepQcConfirm") },
]

function StepIndicator({ current }: { current: number }) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center gap-0">
      {steps(t).map((s, i) => (
        <div key={s.num} className="flex items-center">
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              current === s.num
                ? "bg-primary text-primary-foreground"
                : current > s.num
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            <span
              className={`flex size-5 items-center justify-center rounded-full text-[11px] font-bold ${
                current === s.num
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : current > s.num
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted-foreground/20 text-muted-foreground"
              }`}
            >
              {current > s.num ? <Check className="size-3" /> : s.num}
            </span>
            {s.label}
          </div>
          {i < steps(t).length - 1 && (
            <div className={`mx-1.5 h-px w-6 ${current > s.num ? "bg-primary/40" : "bg-border"}`} />
          )}
        </div>
      ))}
    </div>
  )
}

export const ImportCreatePage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()

  const resumeId = searchParams.get("id")
  const isResume = !!resumeId

  const [step, setStep] = useState(isResume ? 2 : 1)
  const [receiptId, setReceiptId] = useState<number | null>(isResume ? Number(resumeId) : null)
  const [selectedPoId, setSelectedPoId] = useState<number | null>(null)
  const [specialMode, setSpecialMode] = useState(false)
  const [selectedWarrantyExportId, setSelectedWarrantyExportId] = useState<number | null>(null)
  const [warrantyResultMap, setWarrantyResultMap] = useState<Record<string, string>>({})
  const [newSerialMap, setNewSerialMap] = useState<Record<string, string>>({})
  const [serialModalFor, setSerialModalFor] = useState<{
    productId: number
    productName: string
    productSku: string
    required: number
  } | null>(null)
  const [items, dispatch] = useReducer(itemReducer, [])
  const navigatingAfterMut = useRef(false)
  const [qcBlocked, setQcBlocked] = useState(false)
  const [note, setNote] = useState("")
  const [discrepancyNotes, setDiscrepancyNotes] = useState<DiscrepancyNote[]>([])

  const { data: poListRes } = usePurchaseOrders(0, 999, "createdAt,desc")
  const { data: po } = usePurchaseOrderById(Number(selectedPoId))
  const { data: locationMap } = useLocationMap()
  const { data: exportListRes } = useQuery({
    queryKey: ["export-receipts"],
    queryFn: () => getExportReceipts(0, 999),
  })
  const { data: warrantyUnits } = useQuery({
    queryKey: ["export-units", selectedWarrantyExportId],
    queryFn: () => getExportUnits(Number(selectedWarrantyExportId)),
    enabled: !!selectedWarrantyExportId,
  })

  const specialExports = useMemo(
    () =>
      (exportListRes?.content ?? []).filter(
        (e) =>
          (e.reason === EXPORT_REASON.WARRANTY_REPLACEMENT || e.reason === EXPORT_REASON.RETURN_SUPPLIER) &&
          e.status === EXPORT_RECEIPT_STATUS.COMPLETED,
      ),
    [exportListRes],
  )
  const selectedWarrantyExport = useMemo(
    () => specialExports.find((e) => e.id === selectedWarrantyExportId) ?? null,
    [specialExports, selectedWarrantyExportId],
  )
  const isSupplierReturnExport = selectedWarrantyExport?.reason === EXPORT_REASON.RETURN_SUPPLIER
  const warrantyGroups = useMemo(() => {
    const groups = new Map<number, ExportUnit[]>()
    for (const u of warrantyUnits ?? []) {
      const list = groups.get(u.productId) ?? []
      list.push(u)
      groups.set(u.productId, list)
    }
    return [...groups.entries()].map(([productId, units]) => ({
      productId,
      productName: units[0].productName,
      productSku: units[0].productSku,
      units,
    }))
  }, [warrantyUnits])

  const availablePOs = useMemo(
    () => (poListRes?.content ?? []).filter((po) => po.status !== "COMPLETED" && po.status !== "CANCELLED"),
    [poListRes],
  )

  const { data: receipt, isLoading: receiptLoading } = useQuery({
    queryKey: ["import-receipt", receiptId],
    queryFn: () => getImportReceiptById(Number(receiptId)),
    enabled: !!receiptId,
  })

  useEffect(() => {
    if (!receipt) return
    dispatch({
      type: "SET_ITEMS",
      payload: receipt.items.map((item) => ({
        tempId: item.id,
        productId: item.productId,
        productName: item.productName,
        productSku: item.productSku ?? "",
        categoryId: null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        warrantyMonths: item.warrantyMonths,
        serials: [],
        locationId: item.locationId ? String(item.locationId) : "",
        itemStatus: "NORMAL" as const,
        notReceivedReason: "",
      })),
    })
    setNote(receipt.note ?? "")
  }, [receipt])

  useEffect(() => {
    if (locationMap === undefined || items.length === 0) return
    const binOccupancy = new Map(
      locationMap.zones.flatMap((z) => z.shelves).flatMap((s) => s.bins).map((b) => [b.id, b.productCount]),
    )
    for (const item of items) {
      if (item.locationId) continue
      for (const zoneCode of ZONE_ORDER) {
        const zone = locationMap.zones.find((z) => z.zoneCode === zoneCode)
        if (!zone) continue
        const bin = zone.shelves
          .flatMap((s) => s.bins)
          .sort((a, b) => a.fullCode.localeCompare(b.fullCode))
          .find((b) => b.maxCapacity == null || binOccupancy.get(b.id)! < b.maxCapacity)
        if (bin) {
          dispatch({ type: "UPDATE_ITEM", tempId: item.tempId, field: "locationId", value: String(bin.id) })
          binOccupancy.set(bin.id, binOccupancy.get(bin.id)! + 1)
          break
        }
      }
    }
  }, [locationMap, items])

  const createMut = useMutation({
    mutationFn: createImportReceipt,
    onSuccess: (data) => {
      if (specialMode) {
        navigate("/stock/imports")
        return
      }
      setReceiptId(data.id)
      setStep(2)
      queryClient.invalidateQueries({ queryKey: ["import-receipts"] })
      toast.success(t("importCreate.createSuccess"))
    },
    onError: (err: Error) => {
      toast.error(err.message || t("importCreate.createError"))
    },
  })

  const submitMut = useMutation({
    mutationFn: (data: Parameters<typeof confirmImportReceipt>[1]) =>
      confirmImportReceipt(Number(receiptId), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["import-receipts"] })
      queryClient.invalidateQueries({ queryKey: ["import-receipt", receiptId] })
      toast.success(t("importCreate.submitSuccess"))
      navigatingAfterMut.current = true
      navigate("/stock/imports")
    },
    onError: (err: Error) => {
      toast.error(err.message || t("importCreate.error"))
    },
  })

  const itemsReadyForSubmit = useMemo(
    () => items.length > 0 && items.every((i) => i.serials.length > 0 || i.itemStatus === "NOT_RECEIVED"),
    [items],
  )

  const handleCreate = () => {
    if (!po) return
    createMut.mutate({
      purchaseOrderId: po.id,
      supplierId: po.supplierId,
      items: po.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    })
  }

  const handleWarrantyCreate = () => {
    if (!selectedWarrantyExport || warrantyGroups.length === 0) return
    if (!isSupplierReturnExport) {
      for (const g of warrantyGroups) {
        const result = warrantyResultMap[String(g.productId)] ?? "REPAIRED"
        const newSerials =
          (newSerialMap[String(g.productId)] ?? "")
            .split(/\r?\n/)
            .map((s) => s.trim())
            .filter(Boolean) ?? []
        if (result === "REPLACED" && newSerials.length !== g.units.length) {
          toast.error(t("importWarranty.invalidNewSerials", { name: g.productName }))
          return
        }
      }
    }
    createMut.mutate({
      originalWarrantyExportId: selectedWarrantyExport.id,
      supplierId: null,
      items: warrantyGroups.map((g) => {
        const result = warrantyResultMap[String(g.productId)] ?? "REPAIRED"
        const oldSerials = g.units.map((u) => u.serialNumber).filter(Boolean)
        const newSerials =
          (newSerialMap[String(g.productId)] ?? "")
            .split(/\r?\n/)
            .map((s) => s.trim())
            .filter(Boolean) ?? []
        return {
          productId: g.productId,
          quantity: g.units.length,
          unitPrice: 0,
          warrantyResultType: isSupplierReturnExport ? undefined : result,
          serialNumbers: isSupplierReturnExport || result !== "REPLACED" ? oldSerials : newSerials,
          replacementSourceSerials: !isSupplierReturnExport && result === "REPLACED" ? oldSerials : undefined,
        }
      }),
    })
  }

  const handleConfirm = () => {
    if (!itemsReadyForSubmit || !receiptId) return
    const missingItems = items.filter((i) => i.serials.length === 0 && i.itemStatus !== "NOT_RECEIVED")
    if (missingItems.length > 0) {
      toast.error(
        t("importCreate.missingSerials", { products: missingItems.map((i) => i.productName).join(", ") }),
      )
      return
    }
    const serials = items
      .filter((i) => i.itemStatus === "NORMAL" && i.serials.length > 0)
      .map((i) => ({
        itemId: i.tempId,
        serialNumbers: i.serials,
        locationId: i.locationId ? Number(i.locationId) : null,
      }))
    submitMut.mutate({ receiptId, serials })
  }

  const hasUnsaved = step > 1 && items.some((i) => i.serials.length > 0) && !submitMut.isSuccess

  useBlocker(
    ({ currentLocation, nextLocation }) =>
      !navigatingAfterMut.current && hasUnsaved && currentLocation.pathname !== nextLocation.pathname,
  )

  useEffect(() => {
    if (!hasUnsaved) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [hasUnsaved])

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/stock/imports")}>
          &larr; {t("common.back")}
        </Button>
        <h1 className="text-xl font-semibold tracking-tight">{t("importCreate.title")}</h1>
        {receiptId && receipt && (
          <span className="text-sm font-mono text-muted-foreground">{receipt.receiptCode}</span>
        )}
      </div>

      {!specialMode && <StepIndicator current={step} />}

      {/* Step 1: Chọn đơn hàng */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button
              variant={specialMode ? "outline" : "default"}
              size="sm"
              onClick={() => {
                setSpecialMode(false)
                setSelectedWarrantyExportId(null)
                setStep(1)
              }}
            >
              {t("importWarranty.modePo")}
            </Button>
            <Button
              variant={specialMode ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setSpecialMode(true)
                setSelectedWarrantyExportId(null)
                setStep(1)
              }}
            >
              {t("importWarranty.modeSpecial")}
            </Button>
          </div>

          {specialMode ? (
            <>
              <div className="max-w-sm space-y-2">
                <Label htmlFor="warrantyExport">{t("importWarranty.selectSpecial")}</Label>
                <Select
                  value={selectedWarrantyExportId ? String(selectedWarrantyExportId) : ""}
                  onValueChange={(v) => setSelectedWarrantyExportId(Number(v))}
                >
                  <SelectTrigger id="warrantyExport">
                    <SelectValue placeholder={t("importWarranty.selectSpecialPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {specialExports.map((e) => (
                      <SelectItem key={e.id} value={String(e.id)}>
                        <span className="block">
                          <span className="flex items-center gap-2">
                            <span className="font-medium">{e.receiptCode}</span>
                            <span className="text-[10px] uppercase text-muted-foreground">
                              {e.reason === EXPORT_REASON.RETURN_SUPPLIER
                                ? t("importWarranty.badgeReturnSupplier")
                                : t("importWarranty.badgeWarranty")}
                            </span>
                          </span>
                          <span className="block max-w-72 truncate text-xs text-muted-foreground">
                            {[...new Set((e.items ?? []).map((i) => i.productName))].filter(Boolean).join(", ") ||
                              (e.customerName ?? "-")}
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                    {specialExports.length === 0 && (
                      <div className="px-2 py-4 text-xs text-muted-foreground text-center">
                        {t("importWarranty.noExports")}
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {selectedWarrantyExport && (
                <div className="rounded-md border bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                  {t("importWarranty.locationNote")}
                </div>
              )}

              {selectedWarrantyExport && warrantyGroups.length > 0 && (
                <div className="space-y-3">
                  {warrantyGroups.map((g) => {
                    const result = warrantyResultMap[String(g.productId)] ?? "REPAIRED"
                    const enteredCount = (newSerialMap[String(g.productId)] ?? "")
                      .split(/\r?\n/)
                      .map((s) => s.trim())
                      .filter(Boolean).length
                    return (
                      <Card key={g.productId}>
                        <CardContent className="pt-4 pb-3 space-y-3">
                          <div className="flex flex-wrap items-center gap-2 text-sm">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium">{g.productName}</p>
                              <p className="text-xs text-muted-foreground">
                                x{g.units.length}
                                {g.productSku ? ` — SKU: ${g.productSku}` : ""}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {g.units.map((u) => (
                                <span
                                  key={u.id}
                                  className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono"
                                >
                                  {u.serialNumber}
                                </span>
                              ))}
                            </div>
                          </div>
                          {!isSupplierReturnExport && (
                            <div className="flex flex-wrap items-center gap-2">
                              <select
                                value={result}
                                onChange={(e) =>
                                  setWarrantyResultMap((prev) => ({
                                    ...prev,
                                    [String(g.productId)]: e.target.value,
                                  }))
                                }
                                className="h-8 text-xs rounded-md border border-input bg-background px-2"
                              >
                                {WARRANTY_RESULT_TYPES.map((rt) => (
                                  <option key={rt} value={rt}>
                                    {t(`importWarranty.result.${rt.toLowerCase()}`)}
                                  </option>
                                ))}
                              </select>
                              {result === "REPLACED" && (
                                <div className="flex flex-wrap items-center gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 gap-1 text-xs"
                                    onClick={() =>
                                      setSerialModalFor({
                                        productId: g.productId,
                                        productName: g.productName,
                                        productSku: g.productSku ?? "",
                                        required: g.units.length,
                                      })
                                    }
                                  >
                                    {t("importWarranty.newSerialsButton")}
                                  </Button>
                                  {enteredCount > 0 && (
                                    <span className="text-xs text-muted-foreground">
                                      {t("importWarranty.enteredSerials", {
                                        count: enteredCount,
                                        required: g.units.length,
                                      })}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}

              <SerialModal
                open={!!serialModalFor}
                onOpenChange={(open) => !open && setSerialModalFor(null)}
                productName={serialModalFor?.productName ?? ""}
                productSku={serialModalFor?.productSku ?? ""}
                required={serialModalFor?.required ?? 0}
                serials={
                  serialModalFor
                    ? (newSerialMap[String(serialModalFor.productId)] ?? "")
                        .split(/\r?\n/)
                        .map((s) => s.trim())
                        .filter(Boolean)
                    : []
                }
                onSave={(list) => {
                  if (serialModalFor) {
                    setNewSerialMap((prev) => ({
                      ...prev,
                      [String(serialModalFor.productId)]: list.join("\n"),
                    }))
                  }
                  setSerialModalFor(null)
                }}
              />
            </>
          ) : (
            <></>
          )}

          {!specialMode && (
          <>
          <h2 className="text-sm font-semibold text-muted-foreground">
            {receiptId ? t("importCreate.orderSelected") : t("importCreate.stepIndicator")}
          </h2>

          {!receiptId ? (
            <>
              <div className="max-w-sm space-y-2">
                <Label htmlFor="po">{t("importCreate.selectPOrder")}</Label>
                <Select
                  value={selectedPoId ? String(selectedPoId) : ""}
                  onValueChange={(v) => setSelectedPoId(Number(v))}
                >
                  <SelectTrigger id="po">
                    <SelectValue placeholder={t("importCreate.selectPOrderPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePOs.map((po) => (
                      <SelectItem key={po.id} value={String(po.id)}>
                        {po.poCode} — {po.supplierName}
                      </SelectItem>
                    ))}
                    {availablePOs.length === 0 && (
                      <div className="px-2 py-4 text-xs text-muted-foreground text-center">
                        {t("importCreate.noOrders")}
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {po && (
                  <Card>
                  <CardContent className="pt-4 pb-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground text-xs">{t("importCreate.orderCode")}</span>
                        <p className="font-medium font-mono">{po.poCode}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">{t("label.supplier")}</span>
                        <p className="font-medium">{po.supplierName}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">{t("importCreate.expectedDate")}</span>
                        <p className="font-medium">{new Date(po.expectedDate).toLocaleDateString("vi-VN")}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">{t("importCreate.totalAmount")}</span>
                        <p className="font-medium">{Number(po.totalAmount).toLocaleString("vi-VN")}đ</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {po && (
                <div className="rounded-lg border overflow-x-auto">
                  <Table>
                      <TableHeader>
                      <TableRow>
                        <TableHead>{t("table.product")}</TableHead>
                        <TableHead className="w-24">{t("table.sku")}</TableHead>
                        <TableHead className="w-20 text-right">{t("table.quantity")}</TableHead>
                        <TableHead className="w-24 text-right">{t("table.unitPrice")}</TableHead>
                        <TableHead className="w-20 text-right">{t("table.total")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {po.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.productName}</TableCell>
                          <TableCell className="font-mono text-xs">{item.productSku ?? "—"}</TableCell>
                          <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {Number(item.unitPrice).toLocaleString("vi-VN")}đ
                          </TableCell>
                          <TableCell className="text-right tabular-nums font-medium">
                            {Number(item.unitPrice * item.quantity).toLocaleString("vi-VN")}đ
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          ) : (
            /* After creation — readonly view when going back from step 2 */
            po && (
              <>
                <div className="rounded-md border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-800 dark:border-green-800 dark:bg-green-950/20 dark:text-green-300">
                  {t("importCreate.createdFrom")} <span className="font-mono font-medium">{po.poCode}</span>
                </div>
                <Card>
                  <CardContent className="pt-4 pb-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground text-xs">{t("importCreate.orderCode")}</span>
                    <p className="font-medium font-mono">{po.poCode}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">{t("label.supplier")}</span>
                    <p className="font-medium">{po.supplierName}</p>
                  </div>
                </div>
                  </CardContent>
                </Card>
                <div className="rounded-lg border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("table.product")}</TableHead>
                        <TableHead className="w-24">{t("table.sku")}</TableHead>
                        <TableHead className="w-20 text-right">{t("table.quantity")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {po.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.productName}</TableCell>
                          <TableCell className="font-mono text-xs">{item.productSku ?? "—"}</TableCell>
                          <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )
          )}
          </>
          )}
        </div>
      )}

      {/* Step 2: Nhập serial */}
      {step === 2 && (
        <>
          {receipt && (
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground text-xs">{t("label.supplier")}</span>
                    <p className="font-medium">{receipt.supplierName}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">{t("label.createdDate")}</span>
                    <p className="font-medium">{new Date(receipt.createdAt).toLocaleString("vi-VN")}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">{t("label.creator")}</span>
                    <p className="font-medium">{receipt.createdByName}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">{t("label.note")}</span>
                    <p className="font-medium">{receipt.note ?? "—"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          {receiptLoading && (
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-64 w-full" />
            </div>
          )}
          {!receiptLoading && (
            <ImportStepSerials
              items={items}
              dispatch={dispatch}
              discrepancyNotes={discrepancyNotes}
              onDiscrepancyNotesChange={setDiscrepancyNotes}
            />
          )}
        </>
      )}

      {/* Step 3: QC & Xác nhận */}
      {step === 3 && (
        <ImportStepQc
          items={items}
          note={note}
          setNote={setNote}
          onQcStatus={(status) => setQcBlocked(status.hasRecords && !status.done)}
        />
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between border-t pt-4">
        <div>
          {step > 1 && (!isResume || step > 2) ? (
            <Button variant="outline" onClick={() => setStep(step - 1)}>
              <ChevronLeft className="size-4 mr-1" /> {t("importCreate.back")}
            </Button>
          ) : (
            <Button variant="outline" onClick={() => navigate("/stock/imports")}>
              {t("importCreate.cancel")}
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          {step > 1 && (
            <Button variant="ghost" onClick={() => navigate("/stock/imports")}>
              {t("importCreate.cancel")}
            </Button>
          )}
          {!isResume && step === 1 && !specialMode && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button onClick={handleCreate} disabled={!selectedPoId || createMut.isPending}>
                    {createMut.isPending ? t("importCreate.creating") : t("importCreate.createReceipt")}
                  </Button>
                </span>
              </TooltipTrigger>
              {!selectedPoId && (
                <TooltipContent side="top" className="text-xs">
                  <p>{t("importCreate.noOrderSelected")}</p>
                </TooltipContent>
              )}
            </Tooltip>
          )}
          {!isResume && step === 1 && specialMode && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    onClick={handleWarrantyCreate}
                    disabled={!selectedWarrantyExportId || createMut.isPending}
                  >
                    {createMut.isPending
                      ? t("importCreate.creating")
                      : isSupplierReturnExport
                        ? t("importWarranty.createSupplierReturn")
                        : t("importWarranty.createWarranty")}
                  </Button>
                </span>
              </TooltipTrigger>
              {!selectedWarrantyExportId && (
                <TooltipContent side="top" className="text-xs">
                  <p>{t("importWarranty.noExportSelected")}</p>
                </TooltipContent>
              )}
            </Tooltip>
          )}
          {step === 2 && (
            <Button onClick={() => setStep(3)}>
              {t("importCreate.next")} <ChevronRight className="size-4 ml-1" />
            </Button>
          )}
          {step === 3 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    onClick={handleConfirm}
                    disabled={!itemsReadyForSubmit || submitMut.isPending || qcBlocked}
                  >
                    {submitMut.isPending ? t("importCreate.sending") : t("importCreate.confirm")}
                  </Button>
                </span>
              </TooltipTrigger>
              {(!itemsReadyForSubmit || qcBlocked) && (
                <TooltipContent side="top" className="text-xs">
                  {!itemsReadyForSubmit && <p>{t("importCreate.missingSerialsNote")}</p>}
                  {qcBlocked && <p>{t("importCreate.qcFailNote")}</p>}
                </TooltipContent>
              )}
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  )
}
