import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { getSuppliers, createSupplier, updateSupplier, toggleSupplierActive } from "@/features/products/services/supplier-service"
import type { SupplierResponse } from "@/utils/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Plus, Pencil, Power } from "lucide-react"
import { DataTable, type Column } from "@/components/ui/data-table"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "@/utils/toast"

export function SuppliersPage() {
  const qc = useQueryClient()
  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => getSuppliers(),
  })
  const [dialog, setDialog] = useState<{ open: boolean; edit?: SupplierResponse }>({ open: false })
  const [name, setName] = useState("")
  const [contactPerson, setContactPerson] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [address, setAddress] = useState("")
  const [taxCode, setTaxCode] = useState("")
  const [note, setNote] = useState("")

  const openCreate = () => { setName(""); setContactPerson(""); setPhone(""); setEmail(""); setAddress(""); setTaxCode(""); setNote(""); setDialog({ open: true }) }
  const openEdit = (s: SupplierResponse) => {
    setName(s.name); setContactPerson(s.contactPerson ?? ""); setPhone(s.phone ?? "")
    setEmail(s.email ?? ""); setAddress(s.address ?? ""); setTaxCode(s.taxCode ?? ""); setNote(s.note ?? "")
    setDialog({ open: true, edit: s })
  }

  const save = useMutation({
    mutationFn: async () => {
      const data = { name: name.trim(), contactPerson: contactPerson || null, phone: phone || null, email: email || null, address: address || null, taxCode: taxCode || null, note: note || null }
      if (dialog.edit) return updateSupplier(dialog.edit.id, data)
      return createSupplier(data)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["suppliers"] }); setDialog({ open: false }); toast.success(dialog.edit ? "Cập nhật thành công" : "Tạo thành công") },
    onError: (e: Error) => toast.error(e.message),
  })

  const toggle = useMutation({
    mutationFn: (id: number) => toggleSupplierActive(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["suppliers"] }),
    onError: (e: Error) => toast.error(e.message),
  })

  const columns: Column<SupplierResponse>[] = [
    { header: "Tên", render: (s) => <span className="font-medium">{s.name}</span> },
    { header: "Liên hệ", render: (s) => <span className="text-sm text-muted-foreground">{s.contactPerson ?? "—"}</span> },
    { header: "SĐT", render: (s) => <span className="text-sm">{s.phone ?? "—"}</span> },
    { header: "Email", render: (s) => <span className="text-sm">{s.email ?? "—"}</span> },
    { header: "Địa chỉ", render: (s) => <span className="text-sm">{s.address ?? "—"}</span> },
    { header: "MST", render: (s) => <span className="text-sm">{s.taxCode ?? "—"}</span> },
    { header: "Trạng thái", className: "w-24 text-center", render: (s) => <Badge variant={s.isActive ? "default" : "secondary"}>{s.isActive ? "Hoạt động" : "Ngừng"}</Badge> },
    { header: "", className: "w-20", render: (s) => (
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil className="size-3.5" /></Button>
        <Button variant="ghost" size="icon" onClick={() => toggle.mutate(s.id)}><Power className="size-3.5" /></Button>
      </div>
    )},
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Nhà cung cấp</h1>
        <Button onClick={openCreate}><Plus className="size-4 mr-1" /> Thêm</Button>
      </div>

      <DataTable
        columns={columns}
        data={suppliers}
        isLoading={isLoading}
        emptyMessage="Chưa có nhà cung cấp nào"
      />

      <Dialog open={dialog.open} onOpenChange={(v) => { if (!v) setDialog({ open: false }) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{dialog.edit ? "Sửa NCC" : "Thêm NCC"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">Tên <span className="text-destructive">*</span></Label>
              <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2"><Label>Người liên hệ</Label><Input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} /></div>
            <div className="space-y-2"><Label>SĐT</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
            <div className="space-y-2"><Label>Email</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div className="space-y-2"><Label>MST</Label><Input value={taxCode} onChange={(e) => setTaxCode(e.target.value)} /></div>
            <div className="space-y-2 sm:col-span-2"><Label>Địa chỉ</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} /></div>
            <div className="space-y-2 sm:col-span-2"><Label>Ghi chú</Label><Input value={note} onChange={(e) => setNote(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog({ open: false })}>Hủy</Button>
            <Button onClick={() => save.mutate()} disabled={!name.trim() || save.isPending}>{save.isPending ? "Đang lưu..." : "Lưu"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
