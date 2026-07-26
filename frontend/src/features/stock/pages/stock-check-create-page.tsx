import { useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createStockCheck } from "@/services/stock-check-service"
import http from "@/utils/http-client"
import { mapResponsePage } from "@/utils/mappers"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft } from "lucide-react"
import { toast } from "@/utils/toast"
import type { StockCheckScopeType } from "@/utils/types"

export const StockCheckCreatePage = () => {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [scopeType, setScopeType] = useState<StockCheckScopeType | "">("")
  const [scopeId, setScopeId] = useState<string>("")
  const [note, setNote] = useState("")

  const { data: locations } = useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const res = await http.get("/location", { params: { page: 0, size: 500 } })
      return mapResponsePage(res, (r: unknown) => {
        const o = r as { id: number; zoneCode: string; fullCode: string }
        return o
      })
    },
    enabled: scopeType === "ZONE",
  })

  const zones = useMemo(() => {
    if (!locations?.content) return []
    const seen = new Set<string>()
    return locations.content.filter((l) => {
      if (seen.has(l.zoneCode)) return false
      seen.add(l.zoneCode)
      return true
    }).map((l) => ({
      zoneCode: l.zoneCode,
      locationId: l.id,
      exampleFullCode: l.fullCode,
    }))
  }, [locations])

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await http.get("/catalog/category")
      return mapResponsePage(res, (r: unknown) => {
        const o = r as { id: number; name: string }
        return o
      })
    },
    enabled: scopeType === "CATEGORY",
  })

  const handleSubmit = () => {
    if (!scopeType || !scopeId) {
      toast.error("Vui lòng chọn phạm vi kiểm")
      return
    }
    createMut.mutate({
      scopeType: scopeType as StockCheckScopeType,
      scopeId: Number(scopeId),
      note: note || undefined,
    })
  }

  const createMut = useMutation({
    mutationFn: createStockCheck,
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["stock-checks"] })
      toast.success("Tạo phiếu kiểm thành công")
      navigate(`/stock/checks/${res.id}`)
    },
    onError: (err: Error) => toast.error(err.message || "Có lỗi xảy ra"),
  })

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/stock/checks")}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-xl font-semibold tracking-tight">Tạo phiếu kiểm kho</h1>
      </div>

      <div className="space-y-4 rounded-lg border p-4">
        <h2 className="text-sm font-medium">Phạm vi kiểm</h2>

        <div className="space-y-2">
          <Label>Loại phạm vi</Label>
          <Select value={scopeType} onValueChange={(v) => { setScopeType(v as StockCheckScopeType); setScopeId("") }}>
            <SelectTrigger>
              <SelectValue placeholder="Chọn loại phạm vi..." />
            </SelectTrigger>
            <SelectContent className="max-h-[50vh]">
              <SelectItem value="ZONE">Khu vực (Zone)</SelectItem>
              <SelectItem value="CATEGORY">Danh mục (Category)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {scopeType === "ZONE" && (
          <div className="space-y-2">
            <Label>Khu vực</Label>
            {!locations ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select value={scopeId} onValueChange={setScopeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn khu vực..." />
                </SelectTrigger>
                <SelectContent className="max-h-[50vh]">
                  {zones.map((z) => (
                    <SelectItem key={z.zoneCode} value={String(z.locationId)}>
                      {z.zoneCode} ({z.exampleFullCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        {scopeType === "CATEGORY" && (
          <div className="space-y-2">
            <Label>Danh mục</Label>
            {!categories ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select value={scopeId} onValueChange={setScopeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn danh mục..." />
                </SelectTrigger>
                <SelectContent className="max-h-[50vh]">
                  {(categories.content ?? []).map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Hệ thống sẽ tự động lấy tất cả sản phẩm IN_STOCK trong phạm vi đã chọn.
        </p>
      </div>

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
        <Button onClick={handleSubmit} disabled={createMut.isPending || !scopeType || !scopeId}>
          {createMut.isPending ? "Đang tạo..." : "Tạo phiếu kiểm"}
        </Button>
      </div>
    </div>
  )
}
