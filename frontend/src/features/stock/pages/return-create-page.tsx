import { useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { createReturnReceipt, lookupReturnUnit } from "@/services/return-service"
import { getCustomers } from "@/services/customer-service"
import { getExportReceipts, getExportReceiptById, getExportUnits } from "@/services/export-service"
import type { ExportUnit } from "@/services/export-service"
import type { ExportReceiptItem } from "@/utils/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { ArrowLeft, Plus, Search, X, Sparkles } from "lucide-react"
import { cn } from "@/utils/cn"
import { toast } from "@/utils/toast"
import {
  EXPORT_RECEIPT_STATUS,
  RETURN_REASON,
  RETURN_ITEM_CONDITION,
  RETURN_RESULTING_ACTION,
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
}

export const ReturnCreatePage = () => {
  const navigate = useNavigate()

  const [customerQuery, setCustomerQuery] = useState("")
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null)
  const [selectedCustomerName, setSelectedCustomerName] = useState<string | null>(null)
  const [exportQuery, setExportQuery] = useState("")
  const [selectedExportId, setSelectedExportId] = useState<number | null>(null)
  const [selectedExportCode, setSelectedExportCode] = useState<string | null>(null)
  const [selectedExportCreatedAt, setSelectedExportCreatedAt] = useState<string | null>(null)

  const [itemQtyMap, setItemQtyMap] = useState<Record<number, number>>({})
  const [itemSerialMap, setItemSerialMap] = useState<Record<number, ExportUnit[]>>({})
  const [itemConfigMap, setItemConfigMap] = useState<Record<string, { condition: string; resultingAction: string }>>({})

  const [productSearchQuery, setProductSearchQuery] = useState("")

  const [serialPickerExportItemId, setSerialPickerExportItemId] = useState<number | null>(null)
  const [serialPickerSelection, setSerialPickerSelection] = useState<Set<number>>(new Set())
  const [serialPickerUnits, setSerialPickerUnits] = useState<ExportUnit[]>([])
  const [serialPickerLoading, setSerialPickerLoading] = useState(false)
  const [serialSearchQuery, setSerialSearchQuery] = useState("")
  const [searchSerialInput, setSearchSerialInput] = useState("")
  const [searchSerialResult, setSearchSerialResult] = useState<{
    found: boolean
    inExport: boolean
    productId: number | null
    productName: string | null
    serialNumber: string | null
  } | null>(null)
  const [searchSerialLoading, setSearchSerialLoading] = useState(false)

  const form = useForm({ defaultValues: { reason: RETURN_REASON.DEFECTIVE, note: "" } })
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

  const { data: exportDetail } = useQuery({
    queryKey: ["export-detail", selectedExportId],
    queryFn: () => getExportReceiptById(selectedExportId!),
    enabled: !!selectedExportId,
  })

  const createMut = useMutation({
    mutationFn: createReturnReceipt,
    onSuccess: () => {
      toast.success("Tạo phiếu trả hàng thành công")
      navigate("/returns")
    },
    onError: (err: Error) => toast.error(err.message || "Có lỗi xảy ra"),
  })

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

  const filteredExportItems = useMemo(() => {
    if (!exportDetail?.items) return []
    if (!productSearchQuery.trim()) return exportDetail.items
    const q = productSearchQuery.toLowerCase()
    return exportDetail.items.filter(
      (item) =>
        item.productName?.toLowerCase().includes(q) ||
        item.productSku?.toLowerCase().includes(q),
    )
  }, [exportDetail, productSearchQuery])

  const returnItems = useMemo((): ReturnFormItem[] => {
    const items: ReturnFormItem[] = []

    for (const [exportItemIdStr, qty] of Object.entries(itemQtyMap)) {
      if (qty <= 0) continue
      const exportItem = exportDetail?.items.find((i) => i.id === Number(exportItemIdStr))
      if (!exportItem) continue
      const key = `bulk:${exportItem.id}`
      const config = itemConfigMap[key] ?? {
        condition: RETURN_ITEM_CONDITION.GOOD,
        resultingAction: RETURN_RESULTING_ACTION.RESTOCK,
      }
      items.push({
        key,
        productUnitId: null,
        productId: exportItem.productId,
        productName: exportItem.productName ?? "",
        productSku: exportItem.productSku ?? "",
        serialNumber: "",
        trackingType: "BULK",
        quantity: qty,
        ...config,
      })
    }

    for (const [exportItemIdStr, units] of Object.entries(itemSerialMap)) {
      for (const unit of units) {
        const key = `ser:${unit.id}`
        const config = itemConfigMap[key] ?? {
          condition: RETURN_ITEM_CONDITION.GOOD,
          resultingAction: RETURN_RESULTING_ACTION.RESTOCK,
        }
        items.push({
          key,
          productUnitId: unit.id,
          productId: unit.productId,
          productName: unit.productName,
          productSku: unit.productSku,
          serialNumber: unit.serialNumber,
          trackingType: "SERIALIZED",
          quantity: 1,
          ...config,
        })
      }
    }

    return items
  }, [itemQtyMap, itemSerialMap, itemConfigMap, exportDetail])

  const handleQtyChange = (exportItemId: number, qty: number) => {
    const clamped = Math.max(0, Math.min(qty, exportDetail?.items.find((i) => i.id === exportItemId)?.quantity ?? qty))
    setItemQtyMap((prev) => {
      const next = { ...prev }
      if (clamped > 0) next[exportItemId] = clamped
      else delete next[exportItemId]
      return next
    })
  }

  const openSerialPicker = async (exportItem: ExportReceiptItem) => {
    if (!selectedExportId) return
    setSerialPickerExportItemId(exportItem.id)
    setSerialPickerSelection(new Set(itemSerialMap[exportItem.id]?.map((u) => u.id) ?? []))
    setSerialSearchQuery("")
    setSerialPickerLoading(true)
    try {
      const units = await getExportUnits(selectedExportId, exportItem.productId)
      setSerialPickerUnits(units)
    } catch {
      toast.error("Lỗi tải danh sách serial")
      setSerialPickerUnits([])
    } finally {
      setSerialPickerLoading(false)
    }
  }

  const confirmSerialPicker = () => {
    const exportItemId = serialPickerExportItemId
    if (exportItemId === null) return
    const selectedUnits = serialPickerUnits.filter((u) => serialPickerSelection.has(u.id))
    setItemSerialMap((prev) => {
      const next = { ...prev }
      if (selectedUnits.length > 0) next[exportItemId] = selectedUnits
      else delete next[exportItemId]
      return next
    })
    setSerialPickerExportItemId(null)
    setSerialPickerSelection(new Set())
    setSerialPickerUnits([])
  }

  const closeSerialPicker = () => {
    setSerialPickerExportItemId(null)
    setSerialPickerSelection(new Set())
    setSerialPickerUnits([])
  }

  const removeReturnItem = (itemKey: string) => {
    if (itemKey.startsWith("bulk:")) {
      const exportItemId = Number(itemKey.slice(5))
      setItemQtyMap((prev) => {
        const next = { ...prev }
        delete next[exportItemId]
        return next
      })
    } else if (itemKey.startsWith("ser:")) {
      const unitId = Number(itemKey.slice(4))
      for (const [eIdStr, units] of Object.entries(itemSerialMap)) {
        if (units.some((u) => u.id === unitId)) {
          const exportItemId = Number(eIdStr)
          setItemSerialMap((prev) => {
            const next = { ...prev }
            const filtered = next[exportItemId]?.filter((u) => u.id !== unitId) ?? []
            if (filtered.length > 0) next[exportItemId] = filtered
            else delete next[exportItemId]
            return next
          })
          break
        }
      }
    }
    setItemConfigMap((prev) => {
      const next = { ...prev }
      delete next[itemKey]
      return next
    })
  }

  const updateItemConfig = (key: string, field: "condition" | "resultingAction", value: string) => {
    setItemConfigMap((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] ?? {
          condition: RETURN_ITEM_CONDITION.GOOD,
          resultingAction: RETURN_RESULTING_ACTION.RESTOCK,
        }),
        [field]: value,
      },
    }))
  }

  const applyAllConfig = () => {
    if (returnItems.length === 0) return
    const first = returnItems[0]
    setItemConfigMap((prev) => {
      const next: typeof prev = {}
      for (const key of Object.keys(prev)) {
        next[key] = { condition: first.condition, resultingAction: first.resultingAction }
      }
      return next
    })
    toast.success("Đã áp dụng cho tất cả")
  }

  const doSearchSerial = async () => {
    if (!searchSerialInput.trim() || !selectedExportId) return
    setSearchSerialLoading(true)
    setSearchSerialResult(null)
    try {
      const res = await lookupReturnUnit(searchSerialInput.trim(), selectedExportId)
      if (res.found && res.inExport && res.productId) {
        setSearchSerialResult({
          found: true,
          inExport: true,
          productId: res.productId,
          productName: res.productName,
          serialNumber: res.serialNumber,
        })
      } else if (res.found && !res.inExport) {
        setSearchSerialResult({
          found: true,
          inExport: false,
          productId: res.productId,
          productName: res.productName,
          serialNumber: res.serialNumber,
        })
      } else {
        setSearchSerialResult({ found: false, inExport: false, productId: null, productName: null, serialNumber: null })
      }
    } catch {
      toast.error("Lỗi tra cứu serial")
    } finally {
      setSearchSerialLoading(false)
    }
  }

  const selectExport = (e: { id: number; receiptCode: string; createdAt: string }) => {
    setSelectedExportId(e.id)
    setSelectedExportCode(e.receiptCode)
    setSelectedExportCreatedAt(e.createdAt)
    setExportQuery("")
    setItemQtyMap({})
    setItemSerialMap({})
    setItemConfigMap({})
    setProductSearchQuery("")
  }

  const clearExport = () => {
    setSelectedExportId(null)
    setSelectedExportCode(null)
    setSelectedExportCreatedAt(null)
    setItemQtyMap({})
    setItemSerialMap({})
    setItemConfigMap({})
  }

  const clearCustomer = () => {
    setSelectedCustomerId(null)
    setSelectedCustomerName(null)
    clearExport()
  }

  const onSubmit = form.handleSubmit((values) => {
    if (!selectedCustomerId || !selectedExportId || returnItems.length === 0) return
    const missingSerial = returnItems.find(
      (i) => i.trackingType === "SERIALIZED" && (!i.productUnitId || i.productUnitId <= 0),
    )
    if (missingSerial) {
      toast.error(`Vui lòng chọn serial cho "${missingSerial.productName}"`)
      return
    }
    createMut.mutate({
      customerId: selectedCustomerId,
      originalExportReceiptId: selectedExportId,
      reason: values.reason,
      note: values.note.trim() || undefined,
      items: returnItems.map((i) => ({
        productUnitId: i.productUnitId,
        productId: i.productId,
        quantity: i.quantity,
        condition: i.condition,
        resultingAction: i.resultingAction,
      })),
    })
  })

  const reasonOptions = [
    { value: RETURN_REASON.DEFECTIVE, label: "Hàng lỗi" },
    { value: RETURN_REASON.CHANGE_MIND, label: "Đổi ý" },
    { value: RETURN_REASON.WRONG_ITEM, label: "Sai hàng" },
    { value: RETURN_REASON.WARRANTY_CLAIM, label: "Bảo hành" },
  ]

  const changeMindExpired = exportCreatedDaysSince !== null && exportCreatedDaysSince >= 7

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/returns")}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-xl font-semibold tracking-tight">Tạo phiếu trả hàng</h1>
      </div>

      <div className="space-y-4 rounded-lg border p-6">
        <div className="space-y-2">
          <Label>
            Khách hàng <span className="text-destructive">*</span>
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
                placeholder="Tìm khách hàng..."
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
                  {customerQuery ? "Không tìm thấy khách hàng" : "Gõ tên để tìm khách hàng..."}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>
            Đơn xuất gốc <span className="text-destructive">*</span>
          </Label>
          {selectedExportId ? (
            <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
              <span className="flex-1 font-mono text-xs font-medium">{selectedExportCode}</span>
              {exportCreatedDaysSince !== null && (
                <span
                  className={cn(
                    "text-[10px]",
                    exportCreatedDaysSince >= 7 ? "text-red-500" : "text-muted-foreground",
                  )}
                >
                  {exportCreatedDaysSince >= 7
                    ? `Đã ${exportCreatedDaysSince} ngày — hết hạn đổi ý`
                    : `Còn ${7 - exportCreatedDaysSince} ngày để đổi ý`}
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
                  placeholder="Tìm mã đơn xuất..."
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
                  <div className="px-3 py-2 text-xs text-muted-foreground">Không có đơn xuất nào</div>
                )}
              </div>
            </div>
          )}
        </div>

        {selectedExportId && exportDetail?.items && exportDetail.items.length > 0 && (
          <div className="space-y-2 rounded-lg border p-3 bg-muted/10">
            <Label className="text-xs text-muted-foreground">
              Sản phẩm trong đơn xuất
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={productSearchQuery}
                onChange={(e) => setProductSearchQuery(e.target.value)}
                placeholder="Tìm theo tên sản phẩm hoặc SKU..."
                className="pl-9 h-8 text-xs"
              />
            </div>
            <div className="rounded-lg border divide-y text-xs max-h-64 overflow-y-auto">
              {filteredExportItems.length > 0 ? (
                filteredExportItems.map((item) => {
                  const isSerialized = item.trackingType === "SERIALIZED"
                  const serialCount = itemSerialMap[item.id]?.length ?? 0
                  return (
                    <div key={item.id}>
                      <div className="flex items-center gap-3 px-3 py-2">
                        <div className="flex-1 min-w-0">
                          <span className="font-medium">{item.productName}</span>
                          {item.productSku && (
                            <span className="ml-2 text-muted-foreground">SKU: {item.productSku}</span>
                          )}
                        </div>
                        <span className={cn(
                          "text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0",
                          isSerialized
                            ? "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/30"
                            : "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/30",
                        )}>
                          {isSerialized ? "SERIALIZED" : "BULK"}
                        </span>
                        <span className="text-muted-foreground shrink-0">Đã mua: {item.quantity}</span>
                        {isSerialized ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs shrink-0"
                            onClick={() => openSerialPicker(item)}
                          >
                            Chọn serial
                            {serialCount > 0 && (
                              <span className="ml-1.5 text-blue-500 font-semibold">
                                {serialCount}/{item.quantity}
                              </span>
                            )}
                          </Button>
                        ) : (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-muted-foreground">Trả:</span>
                            <Input
                              type="number"
                              min={0}
                              max={item.quantity}
                              value={itemQtyMap[item.id] ?? 0}
                              onChange={(e) => {
                                const v = parseInt(e.target.value) || 0
                                handleQtyChange(item.id, v)
                              }}
                              className="h-7 w-16 text-xs text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  {productSearchQuery
                    ? "Không tìm thấy sản phẩm phù hợp"
                    : "Đơn xuất không có sản phẩm"}
                </div>
              )}
            </div>

            {selectedExportId && (
              <div className="flex items-center gap-2 pt-1">
                <Search className="size-3 text-muted-foreground shrink-0" />
                <Input
                  value={searchSerialInput}
                  onChange={(e) => {
                    setSearchSerialInput(e.target.value)
                    setSearchSerialResult(null)
                  }}
                  onKeyDown={(e) => e.key === "Enter" && doSearchSerial()}
                  placeholder="Tra nhanh serial..."
                  className="h-7 text-xs flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs shrink-0"
                  onClick={doSearchSerial}
                  disabled={searchSerialLoading || !searchSerialInput.trim()}
                >
                  {searchSerialLoading ? "Đang tra..." : "Tra"}
                </Button>
              </div>
            )}
            {searchSerialResult && (
              <div
                className={cn(
                  "rounded-lg border px-3 py-2 text-xs",
                  searchSerialResult.found && searchSerialResult.inExport
                    ? "border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800"
                    : "border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800",
                )}
              >
                {searchSerialResult.found && searchSerialResult.inExport ? (
                  <div className="flex items-center justify-between gap-2">
                    <span>
                      <span className="font-mono font-medium">{searchSerialResult.serialNumber}</span>
                      {searchSerialResult.productName && (
                        <span className="ml-2 text-muted-foreground">— {searchSerialResult.productName}</span>
                      )}
                      <span className="ml-1 text-green-600">(thuộc đơn xuất này)</span>
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 text-xs shrink-0"
                      onClick={() => {
                        const searchResult = searchSerialResult
                        setProductSearchQuery(searchResult.productName ?? "")
                        setSearchSerialResult(null)
                        setSearchSerialInput("")
                        toast.success(
                          `Đã tìm thấy "${searchResult.serialNumber}", bấm "Chọn serial" để xem`,
                        )
                      }}
                    >
                      Tìm SP
                    </Button>
                  </div>
                ) : searchSerialResult.found && !searchSerialResult.inExport ? (
                  <p>
                    Serial <span className="font-mono">{searchSerialResult.serialNumber}</span> không thuộc đơn xuất này
                  </p>
                ) : (
                  <p>
                    Không tìm thấy serial <span className="font-mono">{searchSerialInput}</span>
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label>
            Lý do trả <span className="text-destructive">*</span>
          </Label>
          <div className="flex flex-wrap gap-2">
            {reasonOptions.map((opt) => {
              const isChangeMindExpired = opt.value === RETURN_REASON.CHANGE_MIND && changeMindExpired
              return (
                <label
                  key={opt.value}
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
                      if (!isChangeMindExpired) form.setValue("reason", e.target.value)
                    }}
                    className="size-3.5 text-primary"
                  />
                  <span>{opt.label}</span>
                </label>
              )
            })}
          </div>
          {changeMindInfo && (
            <div
              className={cn(
                "text-sm mt-2 rounded-lg border px-4 py-3",
                changeMindInfo.expired
                  ? "border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800 text-red-600"
                  : "border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 text-blue-600",
              )}
            >
              {changeMindInfo.expired
                ? `Đã quá hạn đổi ý — ${changeMindInfo.daysSince} ngày kể từ xuất kho`
                : `Còn ${changeMindInfo.remaining} ngày để đổi ý (${changeMindInfo.daysSince} ngày kể từ xuất kho)`}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4 rounded-lg border p-6">
        <div className="flex items-center justify-between">
          <Label className="text-base">Sản phẩm trả</Label>
          {returnItems.length > 1 && (
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={applyAllConfig}>
              <Sparkles className="size-3 mr-1" /> Áp dụng cho tất cả
            </Button>
          )}
        </div>

        {returnItems.length > 0 ? (
          <div className="rounded-lg border divide-y text-sm">
            {returnItems.map((item) => {
              const validActions =
                item.condition === RETURN_ITEM_CONDITION.GOOD
                  ? [RETURN_RESULTING_ACTION.RESTOCK]
                  : [
                      RETURN_RESULTING_ACTION.SCRAP,
                      RETURN_RESULTING_ACTION.REJECT,
                      RETURN_RESULTING_ACTION.WARRANTY_TRANSFER,
                    ]

              return (
                <div key={item.key} className="flex flex-wrap items-center gap-2 px-3 py-2">
                  <span className="font-mono text-xs text-muted-foreground w-8 shrink-0">
                    {item.trackingType === "SERIALIZED" ? "S" : "B"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{item.productName}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.serialNumber && <span className="font-mono">{item.serialNumber}</span>}
                      {item.productSku && (
                        <span className="ml-2 text-muted-foreground">SKU: {item.productSku}</span>
                      )}
                    </p>
                  </div>
                  <span className="text-muted-foreground shrink-0">x{item.quantity}</span>
                  <div className="flex items-center gap-2">
                    {item.trackingType === "SERIALIZED" && (
                      <span className="text-[10px] text-blue-500 border border-blue-200 rounded px-1">
                        Có serial
                      </span>
                    )}
                    <select
                      value={item.condition}
                      onChange={(e) => {
                        const newCond = e.target.value
                        updateItemConfig(item.key, "condition", newCond)
                        const newValidActions =
                          newCond === RETURN_ITEM_CONDITION.GOOD
                            ? [RETURN_RESULTING_ACTION.RESTOCK]
                            : [
                                RETURN_RESULTING_ACTION.SCRAP,
                                RETURN_RESULTING_ACTION.REJECT,
                                RETURN_RESULTING_ACTION.WARRANTY_TRANSFER,
                              ]
                        if (!newValidActions.includes(item.resultingAction)) {
                          updateItemConfig(item.key, "resultingAction", newValidActions[0])
                        }
                      }}
                      className="h-7 text-xs rounded-md border border-input bg-background px-2"
                    >
                      <option value={RETURN_ITEM_CONDITION.GOOD}>Còn nguyên</option>
                      <option value={RETURN_ITEM_CONDITION.DEFECTIVE}>Lỗi</option>
                    </select>
                    <select
                      value={item.resultingAction}
                      onChange={(e) => updateItemConfig(item.key, "resultingAction", e.target.value)}
                      className="h-7 text-xs rounded-md border border-input bg-background px-2"
                    >
                      {validActions.map((act) => (
                        <option key={act} value={act}>
                          {act === RETURN_RESULTING_ACTION.RESTOCK && "Nhập lại kho"}
                          {act === RETURN_RESULTING_ACTION.SCRAP && "Hủy"}
                          {act === RETURN_RESULTING_ACTION.REJECT && "Từ chối"}
                          {act === RETURN_RESULTING_ACTION.WARRANTY_TRANSFER && "Chuyển BH"}
                        </option>
                      ))}
                    </select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 shrink-0"
                      onClick={() => removeReturnItem(item.key)}
                    >
                      <X className="size-3" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground py-2 text-center">
            Chưa chọn sản phẩm nào để trả
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="note">Ghi chú</Label>
        <Textarea
          id="note"
          {...form.register("note")}
          placeholder="Ghi chú (không bắt buộc)..."
          rows={2}
        />
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => navigate("/returns")}>
          Hủy
        </Button>
        <Button
          onClick={onSubmit}
          disabled={
            !selectedCustomerId ||
            !selectedExportId ||
            returnItems.length === 0 ||
            createMut.isPending
          }
        >
          {createMut.isPending
            ? "Đang tạo..."
            : `Tạo phiếu (${returnItems.length} SP)`}
        </Button>
      </div>

      <Dialog
        open={serialPickerExportItemId !== null}
        onOpenChange={(open) => {
          if (!open) closeSerialPicker()
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              Chọn serial
              {serialPickerExportItemId !== null && (
                <span className="text-muted-foreground font-normal ml-1">
                  — {exportDetail?.items.find((i) => i.id === serialPickerExportItemId)?.productName}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          {serialPickerLoading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Đang tải...</p>
          ) : serialPickerUnits.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Không có serial khả dụng
            </p>
          ) : (
            <div className="space-y-3">
              <Input
                value={serialSearchQuery}
                onChange={(e) => setSerialSearchQuery(e.target.value)}
                placeholder="Tìm serial..."
                className="h-8 text-sm"
              />
              <div className="max-h-48 overflow-y-auto space-y-1">
                {serialPickerUnits
                  .filter(
                    (u) =>
                      !serialSearchQuery ||
                      u.serialNumber.toLowerCase().includes(serialSearchQuery.toLowerCase()),
                  )
                  .map((unit) => (
                    <label
                      key={unit.id}
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/30 text-sm"
                    >
                      <input
                        type="checkbox"
                        className="size-3.5 shrink-0"
                        checked={serialPickerSelection.has(unit.id)}
                        onChange={() => {
                          setSerialPickerSelection((prev) => {
                            const next = new Set(prev)
                            if (next.has(unit.id)) next.delete(unit.id)
                            else next.add(unit.id)
                            return next
                          })
                        }}
                      />
                      <span className="font-mono">{unit.serialNumber}</span>
                      {unit.productSku && (
                        <span className="text-muted-foreground text-xs ml-auto">
                          {unit.productSku}
                        </span>
                      )}
                    </label>
                  ))}
                {serialPickerUnits.filter(
                  (u) =>
                    !serialSearchQuery ||
                    u.serialNumber.toLowerCase().includes(serialSearchQuery.toLowerCase()),
                ).length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    Không tìm thấy serial phù hợp
                  </p>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Đã chọn: {serialPickerSelection.size} / {serialPickerUnits.length}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={closeSerialPicker}>
              Hủy
            </Button>
            <Button
              size="sm"
              onClick={confirmSerialPicker}
              disabled={serialPickerSelection.size === 0}
            >
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
