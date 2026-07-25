import { useState } from "react"
import { useForm, useFieldArray, Controller } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createReturnReceipt } from "@/services/return-service"
import { getCustomers } from "@/services/customer-service"
import { getExportReceipts } from "@/services/export-service"
// ponytail: getProducts unused, kept for future export detail lookup
import http from "@/utils/http-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Plus, Search, X } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/utils/cn"
import { toast } from "@/utils/toast"
import { mapResponsePage, mapProductUnit } from "@/utils/mappers"
import {
  EXPORT_RECEIPT_STATUS,
  RETURN_REASON,
  RETURN_ITEM_CONDITION,
  RETURN_RESULTING_ACTION,
  PRODUCT_UNIT_STATUS,
} from "@/utils/types"

interface ReturnItemField {
  productUnitId: number
  productId: number
  quantity: number
  condition: string
  resultingAction: string
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
  const [serialSearch, setSerialSearch] = useState("")
  const [showSerialPicker, setShowSerialPicker] = useState(false)

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

  const { data: unitsData } = useQuery({
    queryKey: ["product-units", serialSearch],
    queryFn: async () => {
      const params: Record<string, unknown> = { page: 0, size: 50, sort: "importedAt,desc" }
      if (serialSearch) params.search = serialSearch
      const res = await http.get("/product-unit", { params })
      return mapResponsePage(res, mapProductUnit)
    },
    enabled: showSerialPicker && serialSearch.length > 0,
  })

  const addItem = (unitId: number, productId: number) => {
    if (fields.some((f) => f.productUnitId === unitId)) return
    append({ productUnitId: unitId, productId, quantity: 1, condition: RETURN_ITEM_CONDITION.GOOD, resultingAction: RETURN_RESULTING_ACTION.RESTOCK })
    setShowSerialPicker(false)
    setSerialSearch("")
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
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={serialSearch}
                onChange={(e) => setSerialSearch(e.target.value)}
                placeholder="Tìm serial sản phẩm..."
                className="pl-9"
              />
            </div>
            {unitsData && unitsData.content.length > 0 && (
              <div className="max-h-32 overflow-y-auto divide-y text-sm rounded-lg border">
                {unitsData.content
                  .filter((u) => u.status === PRODUCT_UNIT_STATUS.SOLD || u.status === PRODUCT_UNIT_STATUS.IN_STOCK)
                  .map((u) => (
                    <div
                      key={u.id}
                      className="flex cursor-pointer items-center justify-between px-3 py-1.5 hover:bg-muted/30"
                      onClick={() => addItem(u.id, u.productId)}
                    >
                      <div>
                        <span className="font-mono text-xs">{u.serialNumber}</span>
                        <span className="ml-2 font-medium">{u.productName}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {u.status}
                      </Badge>
                    </div>
                  ))}
              </div>
            )}
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => setShowSerialPicker(false)}>
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
                  <span className="font-medium">Unit #{item.productUnitId}</span>
                  <span className="text-xs text-muted-foreground ml-1">(Product #{item.productId})</span>
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
                          <SelectItem value={RETURN_RESULTING_ACTION.WARRANTY_TRANSFER}>Chuyển BH</SelectItem>
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
