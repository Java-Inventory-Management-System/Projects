import { useState, useEffect, useCallback } from "react"
import { useDebounce } from "@/hooks/use-debounce"
import { getUsers, createUser, updateUserInfo, updateUserRole, updateUserStatus, resetPassword } from "@/services/user-service"
import type { UserResponse, ResponsePage, URole } from "@/utils/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Search, Plus, RefreshCw, Shield, UserCog, KeyRound, Ban, CheckCircle } from "lucide-react"
import { DataTable, type Column } from "@/components/ui/data-table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PaginationBar } from "@/components/ui/pagination-bar"
import { toast } from "@/utils/toast"

const roleOptions: { value: URole; label: string }[] = [
  { value: "ADMIN", label: "Admin" },
  { value: "MANAGER", label: "Manager" },
  { value: "STOCK", label: "Stock" },
  { value: "SALES", label: "Sales" },
]

const statusLabel: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  NEW: { label: "Mới", variant: "outline" },
  ACTIVE: { label: "Hoạt động", variant: "default" },
  INACTIVE: { label: "Ngưng", variant: "secondary" },
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString("vi-VN")
}

export const UsersPage = () => {
  const [page, setPage] = useState(0)
  const [data, setData] = useState<ResponsePage<UserResponse> | null>(null)
  const [allData, setAllData] = useState<UserResponse[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounce(search, 300)

  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({ fullName: "", email: "", roleName: "STOCK", status: "ACTIVE" })
  const [creating, setCreating] = useState(false)
  const [tempPassword, setTempPassword] = useState<string | null>(null)

  const [editOpen, setEditOpen] = useState(false)
  const [editUser, setEditUser] = useState<UserResponse | null>(null)
  const [editForm, setEditForm] = useState({ fullName: "", phoneNumber: "", gender: "" })
  const [editing, setEditing] = useState(false)

  const [roleOpen, setRoleOpen] = useState(false)
  const [roleUserId, setRoleUserId] = useState<number | null>(null)
  const [roleVal, setRoleVal] = useState<string>("")

  const fetch = useCallback(() => {
    setLoading(true)
    setError(null)
    if (debouncedSearch) {
      getUsers(0, 10000)
        .then((res) => { setAllData(res.content); setData(null) })
        .catch((err) => setError((err as Error).message || "Không thể tải danh sách"))
        .finally(() => setLoading(false))
    } else {
      getUsers(page, 20)
        .then((res) => { setData(res); setAllData(null) })
        .catch((err) => setError((err as Error).message || "Không thể tải danh sách"))
        .finally(() => setLoading(false))
    }
  }, [page, debouncedSearch])

  useEffect(() => { fetch() }, [fetch])

  const filtered = (allData ?? data?.content ?? []).filter((u) => {
    if (!debouncedSearch) return true
    const kw = debouncedSearch.toLowerCase()
    return u.fullName.toLowerCase().includes(kw) || u.username.toLowerCase().includes(kw) || u.email.toLowerCase().includes(kw)
  })

  const handleCreate = async () => {
    if (!createForm.fullName.trim() || !createForm.email.trim()) {
      toast.error("Vui lòng nhập họ tên và email")
      return
    }
    setCreating(true)
    try {
      const res = await createUser(createForm)
      setTempPassword(res.tempPassword)
      toast.success("Tạo người dùng thành công")
      setCreateForm({ fullName: "", email: "", roleName: "STOCK", status: "ACTIVE" })
      fetch()
    } catch (err) {
      toast.error((err as Error).message || "Có lỗi xảy ra")
    } finally {
      setCreating(false)
    }
  }

  const openEdit = (u: UserResponse) => {
    setEditUser(u)
    setEditForm({ fullName: u.fullName, phoneNumber: u.phoneNumber ?? "", gender: u.gender != null ? String(u.gender) : "" })
    setEditOpen(true)
  }

  const handleEdit = async () => {
    if (!editUser) return
    setEditing(true)
    try {
      await updateUserInfo(editUser.id, {
        fullName: editForm.fullName,
        phoneNumber: editForm.phoneNumber || null,
        gender: editForm.gender ? Number(editForm.gender) : null,
      })
      toast.success("Cập nhật thông tin thành công")
      setEditOpen(false)
      fetch()
    } catch (err) {
      toast.error((err as Error).message || "Có lỗi xảy ra")
    } finally {
      setEditing(false)
    }
  }

  const handleRoleChange = async () => {
    if (!roleUserId || !roleVal) return
    try {
      await updateUserRole(roleUserId, roleVal)
      toast.success("Đã thay đổi vai trò")
      setRoleOpen(false)
      fetch()
    } catch (err) {
      toast.error((err as Error).message || "Có lỗi xảy ra")
    }
  }

  const handleToggleStatus = async (u: UserResponse) => {
    try {
      await updateUserStatus(u.id, u.isDeleted)
      toast.success(u.isDeleted ? "Đã kích hoạt người dùng" : "Đã vô hiệu hóa người dùng")
      fetch()
    } catch (err) {
      toast.error((err as Error).message || "Có lỗi xảy ra")
    }
  }

  const handleResetPassword = async (id: number) => {
    try {
      const pwd = await resetPassword(id)
      toast.success(`Mật khẩu mới: ${pwd}`)
    } catch (err) {
      toast.error((err as Error).message || "Có lỗi xảy ra")
    }
  }

  const s = data?.pagination

  const columns: Column<UserResponse>[] = [
    { header: "Username", render: (u) => <span className="font-mono text-xs">{u.username}</span> },
    { header: "Họ tên", render: (u) => <span className="font-medium">{u.fullName}</span> },
    { header: "Email", render: (u) => <span className="text-muted-foreground">{u.email}</span> },
    { header: "Vai trò", render: (u) => <Badge variant="outline" className="text-xs">{u.role}</Badge> },
    {
      header: "Trạng thái",
      render: (u) => {
        const st = statusLabel[u.status] ?? { label: u.status, variant: "secondary" as const }
        return <Badge variant={st.variant}>{st.label}</Badge>
      },
    },
    { header: "Ngày tạo", render: (u) => <span className="text-xs text-muted-foreground">{fmt(u.createdAt)}</span> },
    {
      header: "Thao tác",
      className: "w-[140px]",
      render: (u) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => openEdit(u)} title="Sửa thông tin"><UserCog className="size-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => { setRoleUserId(u.id); setRoleVal(u.role); setRoleOpen(true) }} title="Đổi vai trò"><Shield className="size-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => handleResetPassword(u.id)} title="Reset mật khẩu"><KeyRound className="size-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => handleToggleStatus(u)} title={u.isDeleted ? "Kích hoạt" : "Vô hiệu hóa"}>
            {u.isDeleted ? <CheckCircle className="size-4 text-green-600" /> : <Ban className="size-4 text-destructive" />}
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Quản lý người dùng</h1>
        <Button onClick={() => { setCreateOpen(true); setTempPassword(null) }}>
          <Plus className="size-4 mr-1" /> Thêm người dùng
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tên, username, email..."
            className="pl-8"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
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
          emptyMessage={debouncedSearch ? "Không tìm thấy người dùng nào" : "Chưa có người dùng nào"}
        />
      )}

      {!debouncedSearch && s && s.totalPages > 1 && (
        <PaginationBar page={page} totalPages={s.totalPages} onChange={(p) => setPage(p)} />
      )}

      <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) setTempPassword(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm người dùng mới</DialogTitle>
            {!tempPassword && <DialogDescription>Username và mật khẩu tạm sẽ được tạo tự động.</DialogDescription>}
          </DialogHeader>
          {tempPassword ? (
            <div className="space-y-4 py-4">
              <div className="rounded-md border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20 px-4 py-3 text-sm text-green-800 dark:text-green-200">
                <p className="font-medium">Tạo người dùng thành công!</p>
                <p className="mt-2 text-xs">Chuyển mật khẩu này cho người dùng:</p>
                <p className="mt-1 font-mono text-lg font-bold tracking-wider select-all">{tempPassword}</p>
                <p className="mt-2 text-xs text-muted-foreground">Người dùng sẽ được yêu cầu đổi mật khẩu khi đăng nhập lần đầu.</p>
              </div>
              <DialogFooter>
                <Button onClick={() => { setCreateOpen(false); setTempPassword(null) }}>Đóng</Button>
              </DialogFooter>
            </div>
          ) : (
            <>
              <div className="grid gap-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Họ tên</Label>
                  <Input id="fullName" placeholder="Nguyễn Văn A" value={createForm.fullName} onChange={(e) => setCreateForm((f) => ({ ...f, fullName: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="a@example.com" value={createForm.email} onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Vai trò</Label>
                  <Select value={createForm.roleName} onValueChange={(v) => setCreateForm((f) => ({ ...f, roleName: v }))}>
                    <SelectTrigger id="role"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {roleOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Hủy</Button>
                <Button onClick={handleCreate} disabled={creating}>{creating ? "Đang tạo..." : "Tạo"}</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sửa thông tin người dùng</DialogTitle>
            <DialogDescription>{editUser?.username} — {editUser?.email}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="editName">Họ tên</Label>
              <Input id="editName" value={editForm.fullName} onChange={(e) => setEditForm((f) => ({ ...f, fullName: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editPhone">Số điện thoại</Label>
              <Input id="editPhone" placeholder="Không bắt buộc" value={editForm.phoneNumber} onChange={(e) => setEditForm((f) => ({ ...f, phoneNumber: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editGender">Giới tính</Label>
              <Select value={editForm.gender} onValueChange={(v) => setEditForm((f) => ({ ...f, gender: v }))}>
                <SelectTrigger id="editGender"><SelectValue placeholder="Chọn..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Nam</SelectItem>
                  <SelectItem value="1">Nữ</SelectItem>
                  <SelectItem value="2">Khác</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Hủy</Button>
            <Button onClick={handleEdit} disabled={editing}>{editing ? "Đang lưu..." : "Lưu"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={roleOpen} onOpenChange={setRoleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đổi vai trò</DialogTitle>
            <DialogDescription>Chọn vai trò mới cho người dùng.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={roleVal} onValueChange={setRoleVal}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {roleOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleOpen(false)}>Hủy</Button>
            <Button onClick={handleRoleChange}>Lưu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
