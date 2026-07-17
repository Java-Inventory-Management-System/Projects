import { useState } from "react"
import { useDebounce } from "@/hooks/use-debounce"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { getCustomers, createCustomer, updateCustomer, toggleCustomerActive } from "@/features/products/services/customer-service"
import type { CustomerResponse } from "@/utils/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Plus, Pencil, Power, Search } from "lucide-react"
import { DataTable, type Column } from "@/components/ui/data-table"
import { PaginationBar } from "@/components/ui/pagination-bar"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "@/utils/toast"

export function CustomersPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState("")
  const debounced = useDebounce(search, 300)
  const { data, isLoading } = useQuery({
    queryKey: ["customers", page, debounced],
    queryFn: () => getCustomers(page, 20, debounced || undefined),
  })
  const [dialog, setDialog] = useState<{ open: boolean; edit?: CustomerResponse }>({ open: false })
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [address, setAddress] = useState("")
  const [note, setNote] = useState("")

  const openCreate = () => { setName(""); setPhone(""); setEmail(""); setAddress(""); setNote(""); setDialog({ open: true }) }
  const openEdit = (c: CustomerResponse) => {
    setName(c.name); setPhone(c.phone ?? ""); setEmail(c.email ?? ""); setAddress(c.address ?? ""); setNote(c.note ?? "")
    setDialog({ open: true, edit: c })
  }

  const save = useMutation({
    mutationFn: async () => {
      const data = { name: name.trim(), phone: phone || null, email: email || null, address: address || null, note: note || null }
      if (dialog.edit) return updateCustomer(dialog.edit.id, data)
      return createCustomer(data)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["customers"] }); setDialog({ open: false }); toast.success(dialog.edit ? "Cập nhật thành công" : "Tạo thành công") },
    onError: (e: Error) => toast.error(e.message),
  })

  const toggle = useMutation({
    mutationFn: (id: number) => toggleCustomerActive(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
    onError: (e: Error) => toast.error(e.message),
  })

  const customers = data?.content ?? []
  const totalPages = data?.pagination.totalPages ?? 0

  const columns: Column<CustomerResponse>[] = [
    { header: "Tên", render: (c) => <span className="font-medium">{c.name}</span> },
    { header: "SĐT", render: (c) => <span className="text-sm">{c.phone ?? "—"}</span> },
    { header: "Email", render: (c) => <span className="text-sm">{c.email ?? "—"}</span> },
    { header: "Địa chỉ", render: (c) => <span className="text-sm">{c.address ?? "—"}</span> },
    { header: "Ghi chú", render: (c) => <span className="text-sm text-muted-foreground">{c.note ?? "—"}</span> },
    { header: "Trạng thái", className: "w-24 text-center", render: (c) => <Badge variant={c.isActive ? "default" : "secondary"}>{c.isActive ? "Hoạt động" : "Ngừng"}</Badge> },
    { header: "", className: "w-20", render: (c) => (
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="size-3.5" /></Button>
        <Button variant="ghost" size="icon" onClick={() => toggle.mutate(c.id)}><Power className="size-3.5" /></Button>
      </div>
    )},
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Khách hàng</h1>
        <Button onClick={openCreate}><Plus className="size-4 mr-1" /> Thêm</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-8" placeholder="Tìm tên hoặc SĐT..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0) }} />
      </div>

      <DataTable
        columns={columns}
        data={customers}
        isLoading={isLoading}
        emptyMessage="Chưa có khách hàng nào"
      />

      {totalPages > 1 && (
        <PaginationBar page={page} totalPages={totalPages} onChange={(p) => setPage(p)} />
      )}

      <Dialog open={dialog.open} onOpenChange={(v) => { if (!v) setDialog({ open: false }) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{dialog.edit ? "Sửa khách hàng" : "Thêm khách hàng"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">Tên <span className="text-destructive">*</span></Label>
              <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2"><Label>SĐT</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
            <div className="space-y-2"><Label>Email</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} /></div>
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
