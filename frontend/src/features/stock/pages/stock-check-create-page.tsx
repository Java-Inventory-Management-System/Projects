import { useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { useMutation, useQuery } from "@tanstack/react-query"
import { createStockCheck } from "@/features/stock/services/stock-check-service"
import { mapResponsePage, mapProductUnit } from "@/utils/mappers"
import http from "@/utils/http-client"
import type { ProductUnit } from "@/utils/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, Search } from "lucide-react"
import { toast } from "@/utils/toast"

export const StockCheckCreatePage = () => {
  const navigate = useNavigate()
  const [search, setSearch] = useState("")
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [note, setNote] = useState("")

  const { data: units, isLoading } = useQuery({
    queryKey: ["product-units", "in-stock"],
    queryFn: async () => {
      const res = await http.get("/product-unit/status/IN_STOCK", { params: { page: 0, size: 500 } })
      return mapResponsePage(res, mapProductUnit)
    },
  })

  const filtered = useMemo(() => {
    if (!units?.content) return []
    if (!search) return units.content
    const q = search.toLowerCase()
    return units.content.filter(
      (u) =>
        u.serialNumber.toLowerCase().includes(q) ||
        u.productName.toLowerCase().includes(q) ||
        u.productSku.toLowerCase().includes(q),
    )
  }, [units, search])

  const createMut = useMutation({
    mutationFn: createStockCheck,
    onSuccess: (res) => {
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
      </div>

      <div className="rounded-lg border overflow-x-auto max-h-[50vh]">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            {search ? "Không tìm thấy sản phẩm phù hợp." : "Không có sản phẩm nào trong kho."}
          </p>
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
