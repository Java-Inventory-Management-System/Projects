import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Plus, Pencil, Power } from "lucide-react"
import { usePermission } from "@/hooks/use-permission"
import { ROLES } from "@/utils/permissions"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { DataTable } from "@/components/ui/data-table"
import { toast } from "@/utils/toast"
import type { CatalogResponse } from "@/utils/types"

interface Props {
  title: string
  emptyMessage: string
  dialogTitle: string
  queryKey: string
  getItems: () => Promise<CatalogResponse[]>
  createItem: (data: { name: string; description: string | null }) => Promise<CatalogResponse>
  updateItem: (id: number, data: { name: string; description: string | null }) => Promise<CatalogResponse>
  toggleItem: (id: number) => Promise<void>
}

export function CatalogPage({ title, emptyMessage, dialogTitle, queryKey, getItems, createItem, updateItem, toggleItem }: Props) {
  const perm = usePermission()
  const qc = useQueryClient()
  const { data: items = [], isLoading } = useQuery({
    queryKey: [queryKey],
    queryFn: () => getItems(),
  })
  const [dialog, setDialog] = useState<{ open: boolean; edit?: CatalogResponse }>({ open: false })
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")

  const openCreate = () => { setName(""); setDescription(""); setDialog({ open: true }) }
  const openEdit = (b: CatalogResponse) => { setName(b.name); setDescription(b.description ?? ""); setDialog({ open: true, edit: b }) }

  const save = useMutation({
    mutationFn: async () => {
      if (dialog.edit) return updateItem(dialog.edit.id, { name: name.trim(), description: description || null })
      return createItem({ name: name.trim(), description: description || null })
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [queryKey] }); setDialog({ open: false }); toast.success(dialog.edit ? "Cập nhật thành công" : "Tạo thành công") },
    onError: (e: Error) => toast.error(e.message),
  })

  const toggle = useMutation({
    mutationFn: (id: number) => toggleItem(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [queryKey] }),
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        <Button onClick={openCreate}><Plus className="size-4 mr-1" /> Thêm</Button>
      </div>

      <DataTable
        columns={[
          { header: "Tên", render: (b: CatalogResponse) => <span className="font-medium">{b.name}</span> },
          { header: "Mô tả", render: (b: CatalogResponse) => <span className="text-muted-foreground text-sm">{b.description ?? "—"}</span> },
          { header: "Trạng thái", className: "w-24 text-center", render: (b: CatalogResponse) => <Badge variant={b.isActive ? "default" : "secondary"}>{b.isActive ? "Hoạt động" : "Ngừng"}</Badge> },
          { header: "Thao tác", className: "w-[90px]", render: (b: CatalogResponse) => (
            <div className="flex gap-1">
              {perm.hasRole(...ROLES.MANAGER) && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(b)}><Pencil className="size-3.5" /></Button>
                  </TooltipTrigger>
                  <TooltipContent>Chỉnh sửa</TooltipContent>
                </Tooltip>
              )}
              {perm.hasRole(...ROLES.MANAGER) && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => toggle.mutate(b.id)}><Power className="size-3.5" /></Button>
                  </TooltipTrigger>
                  <TooltipContent>{b.isActive ? "Vô hiệu hoá" : "Kích hoạt"}</TooltipContent>
                </Tooltip>
              )}
            </div>
          )},
        ]}
        data={items}
        isLoading={isLoading}
        emptyMessage={emptyMessage}
        skeletonRows={3}
      />

      <Dialog open={dialog.open} onOpenChange={(v) => { if (!v) setDialog({ open: false }) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{dialog.edit ? `Sửa ${dialogTitle}` : `Thêm ${dialogTitle}`}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Tên <span className="text-destructive">*</span></Label>
              <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc">Mô tả</Label>
              <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>
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
