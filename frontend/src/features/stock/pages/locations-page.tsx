import { useState, useCallback, useEffect } from "react"
import { useDebounce } from "@/hooks/use-debounce"
import { getLocations, createLocation, updateLocation, toggleLocation } from "@/features/stock/services/location-service"
import type { LocationResponse } from "@/utils/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Search, Plus, RefreshCw, Pencil, ToggleLeft, ToggleRight } from "lucide-react"
import { DataTable, type Column } from "@/components/ui/data-table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "@/utils/toast"

interface FormData {
  zoneCode: string
  shelfCode: string
  binCode: string
  description: string
}

const emptyForm: FormData = { zoneCode: "", shelfCode: "", binCode: "", description: "" }

export const LocationsPage = () => {
  const [data, setData] = useState<LocationResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounce(search, 300)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [saving, setSaving] = useState(false)

  const fetch = useCallback(() => {
    setLoading(true)
    setError(null)
    getLocations()
      .then(setData)
      .catch((err) => setError((err as Error).message || "Không thể tải danh sách"))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  const openEdit = (loc: LocationResponse) => {
    setEditingId(loc.id)
    setForm({ zoneCode: loc.zoneCode, shelfCode: loc.shelfCode, binCode: loc.binCode, description: loc.description ?? "" })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.zoneCode.trim() || !form.shelfCode.trim() || !form.binCode.trim()) {
      toast.error("Vui lòng nhập đầy đủ Khu, Kệ, Ngăn")
      return
    }
    setSaving(true)
    try {
      if (editingId) {
        await updateLocation(editingId, form)
        toast.success("Cập nhật vị trí thành công")
      } else {
        await createLocation(form)
        toast.success("Thêm vị trí thành công")
      }
      setDialogOpen(false)
      fetch()
    } catch (err) {
      toast.error((err as Error).message || "Có lỗi xảy ra")
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (id: number) => {
    try {
      await toggleLocation(id)
      toast.success("Đã thay đổi trạng thái vị trí")
      fetch()
    } catch (err) {
      toast.error((err as Error).message || "Có lỗi xảy ra")
    }
  }

  const filtered = data.filter((loc) => {
    if (!debouncedSearch) return true
    const kw = debouncedSearch.toLowerCase()
    return loc.fullCode.toLowerCase().includes(kw) || (loc.description?.toLowerCase() ?? "").includes(kw)
  })

  const columns: Column<LocationResponse>[] = [
    { header: "Mã vị trí", render: (loc) => <span className="font-mono text-xs font-medium">{loc.fullCode}</span> },
    { header: "Khu", render: (loc) => <span>Khu {loc.zoneCode}</span> },
    { header: "Kệ", render: (loc) => <span>{loc.shelfCode}</span> },
    { header: "Ngăn", render: (loc) => <span>{loc.binCode}</span> },
    { header: "Mô tả", render: (loc) => <span className="text-muted-foreground text-xs max-w-[200px] truncate">{loc.description || "—"}</span> },
    {
      header: "Trạng thái",
      render: (loc) => <Badge variant={loc.isActive ? "default" : "secondary"}>{loc.isActive ? "Đang hoạt động" : "Ngừng hoạt động"}</Badge>,
    },
    {
      header: "Thao tác",
      className: "w-[120px]",
      render: (loc) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => openEdit(loc)} title="Sửa"><Pencil className="size-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => handleToggle(loc.id)} title={loc.isActive ? "Vô hiệu hóa" : "Kích hoạt"}>
            {loc.isActive ? <ToggleRight className="size-4 text-destructive" /> : <ToggleLeft className="size-4 text-muted-foreground" />}
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Quản lý vị trí kho</h1>
        <Button onClick={openCreate}>
          <Plus className="size-4 mr-1" /> Thêm vị trí
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo mã vị trí..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border p-8 text-center">
          <p className="text-sm text-destructive mb-2">{error}</p>
          <Button variant="outline" size="sm" onClick={fetch}>
            <RefreshCw className="size-3 mr-1" /> Thử lại
          </Button>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          isLoading={loading}
          emptyMessage={debouncedSearch ? "Không tìm thấy vị trí nào" : "Chưa có vị trí nào"}
        />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Sửa vị trí" : "Thêm vị trí mới"}</DialogTitle>
            <DialogDescription>
              Vị trí được xác định bởi Khu + Kệ + Ngăn. Mã tự động sinh theo định dạng Khu-Kệ-Ngăn.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="zoneCode">Khu</Label>
                <Input id="zoneCode" placeholder="Ví dụ: A" value={form.zoneCode} onChange={(e) => setForm((f) => ({ ...f, zoneCode: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shelfCode">Kệ</Label>
                <Input id="shelfCode" placeholder="01" value={form.shelfCode} onChange={(e) => setForm((f) => ({ ...f, shelfCode: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="binCode">Ngăn</Label>
                <Input id="binCode" placeholder="01" value={form.binCode} onChange={(e) => setForm((f) => ({ ...f, binCode: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Mô tả (không bắt buộc)</Label>
              <Textarea id="description" placeholder="Ví dụ: Khu A - Kệ 01 - Ngăn 01" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            {form.zoneCode && form.shelfCode && form.binCode && (
              <p className="text-xs text-muted-foreground">
                Mã vị trí: <span className="font-mono font-semibold">{form.zoneCode}-{form.shelfCode}-{form.binCode}</span>
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Đang lưu..." : editingId ? "Cập nhật" : "Thêm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
