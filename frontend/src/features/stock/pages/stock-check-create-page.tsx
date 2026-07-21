import { useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createStockCheck } from "@/services/stock-check-service"
import { getImportReceipts } from "@/services/import-service"
import { mapResponsePage, mapProductUnit } from "@/utils/mappers"
import http from "@/utils/http-client"
import type { ImportReceipt, ProductUnit } from "@/utils/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, Search, Package } from "lucide-react"
import { Empty, EmptyTitle } from "@/components/ui/empty"
import { toast } from "@/utils/toast"

export const StockCheckCreatePage = () => {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [search, setSearch] = useState("")
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [note, setNote] = useState("")
  const [receiptFilter, setReceiptFilter] = useState("all")

  const { data: units, isLoading } = useQuery({
    queryKey: ["product-units", "in-stock"],
    queryFn: async () => {
      const res = await http.get("/product-unit/status/IN_STOCK", { params: { page: 0, size: 500 } })
      return mapResponsePage(res, mapProductUnit)
    },
  })

  const { data: receipts } = useQuery({
    queryKey: ["import-receipts"],
    queryFn: () => getImportReceipts(0, 50),
  })

  const { data: receiptUnits } = useQuery({
    queryKey: ["receipt-units", receiptFilter],
    queryFn: async () => {
      if (!receiptFilter) return [] as number[]
      const res = await http.get(`/import-receipt/${receiptFilter}/units`)
      return (res as Array<{ id: number }>).map((u) => u.id)
    },
    enabled: receiptFilter !== "all",
  })

  const receiptUnitIds = receiptUnits ?? []

  const filtered = useMemo(() => {
    const all = units?.content ?? []
    let result = all
    if (receiptFilter !== "all" && receiptUnitIds.length > 0) {
      result = result.filter((u) => receiptUnitIds.includes(u.id))
    }
    if (!search) return result
    const q = search.toLowerCase()
    return result.filter(
      (u) =>
        u.serialNumber.toLowerCase().includes(q) ||
        u.productName.toLowerCase().includes(q) ||
        u.productSku.toLowerCase().includes(q),
    )
  }, [units, search, receiptFilter, receiptUnitIds])

  const createMut = useMutation({
    mutationFn: createStockCheck,
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["stock-checks"] })
      toast.success("Tạo phiếu kiểm thành công")
      navigate(`/stock/checks/${res.id}`)
    },
    onError: (err: Error) => toast.error(err.message || "Có lỗi xảy ra"),
  })

  const toggle = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const handleSubmit = () => {
    if (selectedIds.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 sản phẩm để kiểm")
      return
    }
    createMut.mutate({ productUnitIds: selectedIds, note: note || undefined })
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/stock/checks")}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-xl font-semibold tracking-tight">Tạo phiếu kiểm kho</h1>
      </div>

      <div className="space-y-2">
        <Label>Tìm sản phẩm cần kiểm</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo serial, tên sản phẩm hoặc SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2 items-start">
          <Select value={receiptFilter} onValueChange={setReceiptFilter}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Lọc theo lô nhập..." />
            </SelectTrigger>
            <SelectContent className="max-h-[50vh]">
              <SelectItem value="all">Tất cả lô</SelectItem>
              {receipts?.content?.map((r) => (
                <SelectItem key={r.id} value={String(r.id)} className="font-mono text-xs">
                  {r.receiptCode}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {receiptFilter !== "all" && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => {
                setSelectedIds((prev) => {
                  const existing = new Set(prev)
                  receiptUnitIds.forEach((id) => existing.add(id))
                  return [...existing]
                })
              }}
              disabled={receiptUnitIds.length === 0}
            >
              <Package className="size-3 mr-1" />
              Chọn {receiptUnitIds.length} SP trong lô
            </Button>
          )}
        </div>
      </div>

      {receiptFilter !== "all" && (() => {
        const r = receipts?.content?.find((x) => String(x.id) === receiptFilter)
        return r ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <span className="font-medium">Lô:</span>
            <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{r.receiptCode}</span>
          </div>
        ) : null
      })()}

      <div className="rounded-lg border overflow-x-auto max-h-[50vh]">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-4">
            <Empty><EmptyTitle>{search ? "Không tìm thấy sản phẩm phù hợp." : "Không có sản phẩm nào trong kho."}</EmptyTitle></Empty>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="w-10 px-3 py-2">
                  <Checkbox
                    checked={filtered.length > 0 && selectedIds.length === filtered.length}
                    onCheckedChange={(v) =>
                      setSelectedIds(v ? filtered.map((u) => u.id) : [])
                    }
                  />
                </th>
                <th className="px-3 py-2 font-medium">Serial</th>
                <th className="px-3 py-2 font-medium">Sản phẩm</th>
                <th className="px-3 py-2 font-medium">SKU</th>
                <th className="px-3 py-2 font-medium">Vị trí</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr
                  key={u.id}
                  className="border-b last:border-0 hover:bg-muted/30 cursor-pointer"
                  onClick={() => toggle(u.id)}
                >
                  <td className="px-3 py-2">
                    <Checkbox checked={selectedIds.includes(u.id)} />
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{u.serialNumber}</td>
                  <td className="px-3 py-2 font-medium">{u.productName}</td>
                  <td className="px-3 py-2 text-muted-foreground">{u.productSku}</td>
                  <td className="px-3 py-2 text-muted-foreground">{u.locationCode ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedIds.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Đã chọn <strong>{selectedIds.length}</strong> sản phẩm
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor="note">Ghi chú</Label>
        <Textarea
          id="note"
          placeholder="Không bắt buộc"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => navigate("/stock/checks")}>
          Hủy
        </Button>
        <Button onClick={handleSubmit} disabled={createMut.isPending || selectedIds.length === 0}>
          {createMut.isPending ? "Đang tạo..." : "Tạo phiếu kiểm"}
        </Button>
      </div>
    </div>
  )
}
