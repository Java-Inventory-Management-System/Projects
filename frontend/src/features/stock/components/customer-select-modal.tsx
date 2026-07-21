import { useEffect, useState, useRef } from "react"
import { Search, Plus, CheckCircle, UserPlus, ArrowLeft, Phone, Mail, MapPin } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { createCustomer } from "@/services/customer-service"
import { useCustomers } from "@/hooks/use-customers"

import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/utils/toast"

interface CustomerSelectModalProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSelect: (customerId: number, customerName: string) => void
  selectedCustomerId?: number | null
}

export const CustomerSelectModal = ({ open, onOpenChange, onSelect, selectedCustomerId }: CustomerSelectModalProps) => {
  const [view, setView] = useState<"select" | "create">("select")
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [page, setPage] = useState(0)
  const [selectedId, setSelectedId] = useState<number | null>(selectedCustomerId ?? null)
  const searchTimer = useRef<ReturnType<typeof setTimeout>>()

  const [newName, setNewName] = useState("")
  const [newPhone, setNewPhone] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [newAddress, setNewAddress] = useState("")
  const [creating, setCreating] = useState(false)

  const { data, isLoading: loading } = useCustomers(page, 10, debouncedSearch || undefined)

  useEffect(() => {
    if (open) {
      setView("select")
      setSearch("")
      setDebouncedSearch("")
      setPage(0)
      setSelectedId(selectedCustomerId ?? null)
      setNewName("")
      setNewPhone("")
      setNewEmail("")
      setNewAddress("")
    }
  }, [open, selectedCustomerId])

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => setDebouncedSearch(search), 300)
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [search])

  const handleSelect = () => {
    if (!selectedId) return
    const customer = data?.content.find((c) => c.id === selectedId)
    if (customer) {
      onSelect(customer.id, customer.name)
      onOpenChange(false)
    }
  }

  const handleCreateCustomer = async () => {
    if (!newName.trim()) { toast.error("Vui lòng nhập tên khách hàng"); return }
    setCreating(true)
    try {
      const created = await createCustomer({
        name: newName.trim(),
        phone: newPhone.trim() || null,
        email: newEmail.trim() || null,
        address: newAddress.trim() || null,
        note: null,
      })
      toast.success(`Đã thêm KH "${created.name}"`)
      onSelect(created.id, created.name)
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể tạo KH")
    } finally {
      setCreating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && view === "select") {
      e.preventDefault()
      handleSelect()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(95vw,56rem)]" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle>
            {view === "create" ? (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="-ml-2 size-8" onClick={() => setView("select")}>
                  <ArrowLeft className="size-4" />
                </Button>
                Thêm khách hàng mới
              </div>
            ) : (
              "Chọn khách hàng"
            )}
          </DialogTitle>
        </DialogHeader>

        {view === "select" ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Tìm tên, SĐT, email..."
                  className="pl-8"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(0) }}
                  autoFocus
                />
              </div>
              <Button variant="outline" onClick={() => setView("create")} className="gap-1 shrink-0">
                <UserPlus className="size-4" />
                Thêm mới
              </Button>
            </div>

            <div className="rounded-lg border divide-y max-h-[50vh] overflow-y-auto">
              {loading ? (
                <div className="divide-y">
                  {[1,2,3].map((i) => (
                    <div key={i} className="flex items-start gap-3 px-4 py-3">
                      <Skeleton className="size-5 rounded-full shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : !data || data.content.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-12">
                  {debouncedSearch ? "Không tìm thấy khách hàng nào." : "Chưa có khách hàng nào."}
                </p>
              ) : (
                data.content.map((c) => {
                  const isSelected = selectedId === c.id
                  return (
                    <button
                      key={c.id}
                      type="button"
                      className={`w-full text-left px-4 py-3 transition-colors hover:bg-accent flex items-start gap-3 ${
                        isSelected ? "bg-accent" : ""
                      }`}
                      onClick={() => setSelectedId(c.id)}
                      onDoubleClick={() => { setSelectedId(c.id); handleSelect() }}
                    >
                      <div className="mt-0.5 size-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors"
                        style={isSelected ? { borderColor: "hsl(var(--primary))" } : undefined}>
                        {isSelected && <CheckCircle className="size-4 text-primary" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{c.name}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                          {c.phone && <span className="inline-flex items-center gap-1"><Phone className="size-3" />{c.phone}</span>}
                          {c.email && <span className="inline-flex items-center gap-1"><Mail className="size-3" />{c.email}</span>}
                          {c.address && <span className="inline-flex items-center gap-1"><MapPin className="size-3" />{c.address}</span>}
                        </div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>

            {data && data.pagination.totalPages > 1 && (
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setPage(Math.max(0, page - 1))}
                      className={page === 0 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  {(() => {
                    const t = data.pagination.totalPages, c = page
                    const items: (number | "ellipsis")[] = []
                    if (t <= 7) { for (let i = 0; i < t; i++) items.push(i) }
                    else {
                      items.push(0)
                      if (c > 3) items.push("ellipsis")
                      for (let i = Math.max(1, c - 2); i <= Math.min(t - 2, c + 2); i++) items.push(i)
                      if (c < t - 4) items.push("ellipsis")
                      items.push(t - 1)
                    }
                    return items.map((p, i) =>
                      p === "ellipsis" ? (
                        <PaginationItem key={`e${i}`}>
                          <span className="px-2 text-muted-foreground">...</span>
                        </PaginationItem>
                      ) : (
                        <PaginationItem key={p}>
                          <PaginationLink isActive={p === c} onClick={() => setPage(p)} className="cursor-pointer">
                            {p + 1}
                          </PaginationLink>
                        </PaginationItem>
                      )
                    )
                  })()}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setPage(Math.min(data.pagination.totalPages - 1, page + 1))}
                      className={page >= data.pagination.totalPages - 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
              <Button onClick={handleSelect} disabled={!selectedId}>Chọn</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-name">Tên khách hàng <span className="text-destructive">*</span></Label>
              <Input
                id="new-name"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nhập tên..."
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-phone">Số điện thoại</Label>
              <Input
                id="new-phone"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value.replace(/[^0-9]/g, "").slice(0, 11))}
                placeholder="090xxxxxxx"
                inputMode="numeric"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-email">Email</Label>
              <Input
                id="new-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="khachhang@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-address">Địa chỉ</Label>
              <Input
                id="new-address"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                placeholder="Số nhà, đường, phường..."
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setView("select")}>Quay lại</Button>
              <Button onClick={handleCreateCustomer} disabled={creating}>
                {creating ? <><Loader2 className="size-4 mr-1 animate-spin" /> Đang tạo...</> : <><Plus className="size-4 mr-1" /> Thêm khách hàng</>}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
