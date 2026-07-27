import { useState } from "react"
import { useForm, useFieldArray, Controller } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createReturnReceipt, lookupReturnUnit } from "@/services/return-service"
import { getCustomers } from "@/services/customer-service"
import { getExportReceipts } from "@/services/export-service"
// ponytail: getProducts unused, kept for future export detail lookup
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Plus, Search, X } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/utils/cn"
import { toast } from "@/utils/toast"
import {
  EXPORT_RECEIPT_STATUS,
  RETURN_REASON,
  RETURN_ITEM_CONDITION,
  RETURN_RESULTING_ACTION,
} from "@/utils/types"

interface ReturnItemField {
  productUnitId: number
  productId: number
  productName: string
  productSku: string
  serialNumber: string
  quantity: number
  condition: string
  resultingAction: string
  trackingType: string
}
interface ReturnFormFields {
  reason: string
  note: string
  items: ReturnItemField[]
}

export const ReturnCreatePage = () => {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [customerQuery, setCustomerQuery] = useState("")
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null)
  const [selectedCustomerName, setSelectedCustomerName] = useState<string | null>(null)
  const [exportQuery, setExportQuery] = useState("")
  const [selectedExportId, setSelectedExportId] = useState<number | null>(null)
  const [selectedExportCode, setSelectedExportCode] = useState<string | null>(null)
  const [selectedExportCreatedAt, setSelectedExportCreatedAt] = useState<string | null>(null)
  const [serialInput, setSerialInput] = useState("")
  const [showSerialPicker, setShowSerialPicker] = useState(false)
  const [lookupResult, setLookupResult] = useState<{
    found: boolean
    inExport: boolean
    productUnitId: number | null
    productId: number | null
    productName: string | null
    productSku: string | null
    serialNumber: string | null
    status: string | null
  } | null>(null)
  const [lookupLoading, setLookupLoading] = useState(false)

  const form = useForm<ReturnFormFields>({
    defaultValues: { reason: RETURN_REASON.DEFECTIVE, note: "", items: [] },
  })
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" })
  const watchedReason = form.watch("reason")

  const { data: customersData } = useQuery({
    queryKey: ["customers", customerQuery],
    queryFn: () => getCustomers(0, 50, customerQuery || undefined),
    enabled: customerQuery.length > 0 && !selectedCustomerId,
  })

  const { data: exportsData } = useQuery({
    queryKey: ["exports", exportQuery],
    queryFn: () => getExportReceipts(0, 50, undefined, EXPORT_RECEIPT_STATUS.COMPLETED),
    enabled: !selectedExportId,
  })

  const doLookup = async () => {
    if (!serialInput.trim() || !selectedExportId) return
    setLookupLoading(true)
    setLookupResult(null)
    try {
      const res = await lookupReturnUnit(serialInput.trim(), selectedExportId)
      setLookupResult(res)
    } catch {
      toast.error("Lỗi tra cứu serial")
    } finally {
      setLookupLoading(false)
    }
  }

  const addLookedUpItem = () => {
    if (!lookupResult || !lookupResult.found || !lookupResult.inExport || !lookupResult.productUnitId || !lookupResult.productId) return
    if (fields.some((f) => f.productUnitId === lookupResult.productUnitId)) {
      toast.error("Sản phẩm đã có trong danh sách")
      return
    }
    append({
      productUnitId: lookupResult.productUnitId,
      productId: lookupResult.productId,
      productName: lookupResult.productName ?? "",
      productSku: lookupResult.productSku ?? "",
      serialNumber: lookupResult.serialNumber ?? "",
      quantity: 1,
      condition: RETURN_ITEM_CONDITION.GOOD,
      resultingAction: RETURN_RESULTING_ACTION.RESTOCK,
      trackingType: "SERIALIZED",
    })
    setShowSerialPicker(false)
    setSerialInput("")
    setLookupResult(null)
  }

  const createMut = useMutation({
    mutationFn: createReturnReceipt,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["return-receipts"] })
      toast.success("Tạo phiếu trả hàng thành công")
      navigate("/returns")
    },
    onError: (err: Error) => toast.error(err.message || "Có lỗi xảy ra"),
  })

  const changeMindInfo = watchedReason === RETURN_REASON.CHANGE_MIND && selectedExportCreatedAt
    ? (() => {
        const daysSince = Math.floor((Date.now() - new Date(selectedExportCreatedAt).getTime()) / 86400000)
        const remaining = 7 - daysSince
        return { daysSince, remaining, expired: remaining <= 0 }
      })()
    : null

  const onSubmit = form.handleSubmit((values) => {
    if (!selectedCustomerId || !selectedExportId || values.items.length === 0) return
    createMut.mutate({
      customerId: selectedCustomerId,
      originalExportReceiptId: selectedExportId,
      reason: values.reason,
      note: values.note.trim() || undefined,
      items: values.items.map((i) => ({
        productUnitId: i.productUnitId,
        productId: i.productId,
        quantity: i.quantity,
        condition: i.condition,
        resultingAction: i.resultingAction,
      })),
    })
  })

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
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={() => {
                  setSelectedCustomerId(null)
                  setSelectedCustomerName(null)
                }}
              >
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
          {!selectedCustomerId && customersData && customersData.content.length > 0 && (
            <div className="rounded-lg border max-h-32 overflow-y-auto divide-y text-sm">
              {customersData.content.map((c) => (
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
              ))}
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
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={() => {
                  setSelectedExportId(null)
                  setSelectedExportCode(null)
                }}
              >
                <X className="size-3" />
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border max-h-40 overflow-y-auto divide-y text-sm">
              {exportsData?.content.map((e) => (
                <div
                  key={e.id}
                  className="flex cursor-pointer items-center justify-between px-3 py-1.5 hover:bg-muted/30"
                  onClick={() => {
                    setSelectedExportId(e.id)
                    setSelectedExportCode(e.receiptCode)
                    setSelectedExportCreatedAt(e.createdAt)
                    setExportQuery("")
                  }}
                >
                  <span className="font-mono text-xs font-medium">{e.receiptCode}</span>
                  <span className="text-xs text-muted-foreground">{e.customerName ?? "—"}</span>
                </div>
              ))}
              {exportsData && exportsData.content.length === 0 && (
                <div className="px-3 py-2 text-xs text-muted-foreground">Không có đơn xuất nào</div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="reason">
            Lý do trả <span className="text-destructive">*</span>
          </Label>
          <Controller
            control={form.control}
            name="reason"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={RETURN_REASON.CHANGE_MIND}>Đổi ý</SelectItem>
                  <SelectItem value={RETURN_REASON.DEFECTIVE}>Hàng lỗi</SelectItem>
                  <SelectItem value={RETURN_REASON.WRONG_ITEM}>Sai hàng</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
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
          {selectedExportId && (
            <Button variant="outline" size="sm" onClick={() => setShowSerialPicker(true)}>
              <Plus className="size-3 mr-1" /> Thêm sản phẩm
            </Button>
          )}
        </div>

        {showSerialPicker && (
          <div className="space-y-2 rounded-lg border p-3 bg-muted/10">
            <Label className="text-xs text-muted-foreground">Tra serial trong đơn xuất</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  value={serialInput}
                  onChange={(e) => { setSerialInput(e.target.value); setLookupResult(null) }}
                  onKeyDown={(e) => e.key === "Enter" && doLookup()}
                  placeholder="Nhập serial..."
                  className="pl-9"
                />
              </div>
              <Button size="sm" onClick={doLookup} disabled={lookupLoading || !serialInput.trim()}>
                {lookupLoading ? "Đang tra..." : "Tra"}
              </Button>
            </div>
            {lookupResult && (
              <div className={cn(
                "rounded-lg border px-3 py-2 text-sm",
                lookupResult.found && lookupResult.inExport
                  ? "border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800"
                  : "border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800",
              )}>
                {lookupResult.found && lookupResult.inExport ? (
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="font-medium">{lookupResult.productName}</p>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-mono">{lookupResult.serialNumber}</span>
                        {lookupResult.productSku && <span className="ml-2">SKU: {lookupResult.productSku}</span>}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={addLookedUpItem}>
                      Thêm
                    </Button>
                  </div>
                ) : lookupResult.found && !lookupResult.inExport ? (
                  <p className="text-sm">Serial <span className="font-mono">{lookupResult.serialNumber}</span> không thuộc đơn xuất này</p>
                ) : (
                  <p className="text-sm">Không tìm thấy serial <span className="font-mono">{serialInput}</span></p>
                )}
              </div>
            )}
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => { setShowSerialPicker(false); setLookupResult(null); setSerialInput("") }}>
                Đóng
              </Button>
            </div>
          </div>
        )}

        {fields.length > 0 && (
          <div className="rounded-lg border divide-y text-sm">
            {fields.map((item, index) => (
              <div key={item.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
                <span className="font-mono text-xs text-muted-foreground w-8">#{index + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{item.productName}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.serialNumber && <span className="font-mono">{item.serialNumber}</span>}
                    {item.productSku && <span className="ml-2 text-muted-foreground">SKU: {item.productSku}</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Controller
                    control={form.control}
                    name={`items.${index}.condition`}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="h-7 w-24 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={RETURN_ITEM_CONDITION.GOOD}>Còn nguyên</SelectItem>
                          <SelectItem value={RETURN_ITEM_CONDITION.DEFECTIVE}>Lỗi</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <Controller
                    control={form.control}
                    name={`items.${index}.resultingAction`}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="h-7 w-32 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={RETURN_RESULTING_ACTION.RESTOCK}>Nhập lại kho</SelectItem>
                          <SelectItem value={RETURN_RESULTING_ACTION.SCRAP}>Hủy</SelectItem>
                          {item.trackingType === "SERIALIZED" && (
                            <SelectItem value={RETURN_RESULTING_ACTION.WARRANTY_TRANSFER}>Chuyển BH</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <Button variant="ghost" size="icon" className="size-6" onClick={() => remove(index)}>
                    <X className="size-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
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
          disabled={!selectedCustomerId || !selectedExportId || fields.length === 0 || createMut.isPending}
        >
          {createMut.isPending ? "Đang tạo..." : "Tạo phiếu trả hàng"}
        </Button>
      </div>
    </div>
  )
}
