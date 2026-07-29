import { useState, useCallback } from "react"
import { useSearchParams } from "react-router-dom"
import { useForm, Controller } from "react-hook-form"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useDebounce } from "@/hooks/use-debounce"
import {
  getUsers,
  createUser,
  updateUserInfo,
  updateUserRole,
  updateUserStatus,
  resetPassword,
} from "@/services/user-service"
import type { UserResponse, URole } from "@/utils/types"
import { USER_STATUS } from "@/utils/types"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/utils/toast"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"

const roleOptions: { value: URole; label: string }[] = [
  { value: "ADMIN", label: "Admin" },
  { value: "MANAGER", label: "Manager" },
  { value: "STOCK", label: "Stock" },
  { value: "SALES", label: "Sales" },
]

const statusLabel: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  [USER_STATUS.NEW]: { label: "Mới", variant: "outline" },
  [USER_STATUS.ACTIVE]: { label: "Hoạt động", variant: "default" },
  [USER_STATUS.INACTIVE]: { label: "Ngưng", variant: "secondary" },
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString("vi-VN")
}

export const UsersPage = () => {
  const qc = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Number(searchParams.get("page") ?? "0")
  const [pageSize, setPageSize] = useState(20)
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | undefined>(undefined)
  const sortStr = sort ? `${sort.key},${sort.dir}` : undefined

  const handleSort = useCallback((key: string) => {
    setSort((prev) => {
      if (prev?.key !== key) return { key, dir: "asc" }
      if (prev.dir === "asc") return { key, dir: "desc" }
      return undefined
    })
  }, [])

  const search = searchParams.get("search") ?? ""
  const debouncedSearch = useDebounce(search, 300)

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        for (const [key, val] of Object.entries(updates)) {
          if (val) next.set(key, val)
          else next.delete(key)
        }
        return next
      }, { replace: true })
    },
    [setSearchParams],
  )

  const { data: usersRes, isLoading, error: fetchError } = useQuery({
    queryKey: ["users", debouncedSearch || "paged", debouncedSearch ? 0 : page, pageSize, sortStr],
    queryFn: () => debouncedSearch ? getUsers(0, 10000, sortStr) : getUsers(page, pageSize, sortStr),
  })

  const filtered = debouncedSearch
    ? (usersRes?.content ?? []).filter((u) => {
        const kw = debouncedSearch.toLowerCase()
        return u.fullName.toLowerCase().includes(kw) || u.username.toLowerCase().includes(kw) || u.email.toLowerCase().includes(kw)
      })
    : (usersRes?.content ?? [])
  const totalEl = debouncedSearch ? filtered.length : usersRes?.pagination?.totalElements
  const totalPg = !debouncedSearch ? usersRes?.pagination?.totalPages : undefined

  const invalidate = () => qc.invalidateQueries({ queryKey: ["users"] })

  const [createOpen, setCreateOpen] = useState(false)
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const createForm = useForm({ defaultValues: { fullName: "", email: "", roleName: "STOCK", status: USER_STATUS.ACTIVE } })

  const [editOpen, setEditOpen] = useState(false)
  const [editUser, setEditUser] = useState<UserResponse | null>(null)
  const editForm = useForm({ defaultValues: { fullName: "", phoneNumber: "", gender: "" } })
  const [roleOpen, setRoleOpen] = useState(false)
  const [roleUserId, setRoleUserId] = useState<number | null>(null)
  const [roleVal, setRoleVal] = useState<string>("")

  const createMut = useMutation({ mutationFn: createUser, onSuccess: invalidate })
  const updateMut = useMutation({ mutationFn: ({ id, data }: { id: number; data: import("@/services/user-service").UpdateInfoRequest }) => updateUserInfo(id, data), onSuccess: invalidate })
  const roleMut = useMutation({ mutationFn: ({ id, role }: { id: number; role: string }) => updateUserRole(id, role), onSuccess: invalidate })
  const toggleStatusMut = useMutation({ mutationFn: (args: [number, boolean]) => updateUserStatus(args[0], args[1]), onSuccess: invalidate })
  const resetPwdMut = useMutation({ mutationFn: resetPassword })

  const handleCreate = createForm.handleSubmit(async (values) => {
    if (!values.fullName.trim() || !values.email.trim()) {
      toast.error("Vui lòng nhập họ tên và email")
      return
    }
    try {
      const res = await createMut.mutateAsync(values)
      setTempPassword(res.tempPassword)
      toast.success("Tạo người dùng thành công")
    } catch (err) {
      toast.error((err as Error).message || "Có lỗi xảy ra")
    }
  })

  const openEdit = (u: UserResponse) => {
    setEditUser(u)
    editForm.reset({ fullName: u.fullName, phoneNumber: u.phoneNumber ?? "", gender: u.gender != null ? String(u.gender) : "" })
    setEditOpen(true)
  }

  const handleEdit = editForm.handleSubmit(async (values) => {
    if (!editUser) return
    try {
      await updateMut.mutateAsync({ id: editUser.id, data: { fullName: values.fullName, phoneNumber: values.phoneNumber || null, gender: values.gender ? Number(values.gender) : null } })
      toast.success("Cập nhật thông tin thành công")
      setEditOpen(false)
    } catch (err) {
      toast.error((err as Error).message || "Có lỗi xảy ra")
    }
  })

  const handleRoleChange = async () => {
    if (!roleUserId || !roleVal) return
    try {
      await roleMut.mutateAsync({ id: roleUserId, role: roleVal })
      toast.success("Đã thay đổi vai trò")
      setRoleOpen(false)
    } catch (err) {
      toast.error((err as Error).message || "Có lỗi xảy ra")
    }
  }

  const handleToggleStatus = async (u: UserResponse) => {
    try {
      await toggleStatusMut.mutateAsync([u.id, u.isDeleted])
      toast.success(u.isDeleted ? "Đã kích hoạt người dùng" : "Đã vô hiệu hóa người dùng")
    } catch (err) {
      toast.error((err as Error).message || "Có lỗi xảy ra")
    }
  }

  const handleResetPassword = async (id: number) => {
    try {
      const pwd = await resetPwdMut.mutateAsync(id)
      toast.success(`Mật khẩu mới: ${pwd}`)
    } catch (err) {
      toast.error((err as Error).message || "Có lỗi xảy ra")
    }
  }

  const columns: Column<UserResponse>[] = [
    { header: "Username", sortKey: "username", render: (u) => <span className="font-mono text-xs">{u.username}</span> },
    { header: "Họ tên", sortKey: "fullName", render: (u) => <span className="font-medium">{u.fullName}</span> },
    { header: "Email", sortKey: "email", render: (u) => <span className="text-muted-foreground">{u.email}</span> },
    {
      header: "Vai trò",
      render: (u) => (
        <Badge variant="outline" className="text-xs">
          {u.role}
        </Badge>
      ),
    },
    {
      header: "Trạng thái",
      render: (u) => {
        const st = statusLabel[u.status] ?? { label: u.status, variant: "secondary" as const }
        return <Badge variant={st.variant}>{st.label}</Badge>
      },
    },
    {
      header: "Ngày tạo",
      sortKey: "createdAt",
      render: (u) => <span className="text-xs text-muted-foreground">{fmt(u.createdAt)}</span>,
    },
    {
      header: "Thao tác",
      className: "w-[140px]",
      render: (u) => (
        <div className="flex gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => openEdit(u)}>
                <UserCog className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Sửa thông tin</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setRoleUserId(u.id)
                  setRoleVal(u.role)
                  setRoleOpen(true)
                }}
              >
                <Shield className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Đổi vai trò</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => handleResetPassword(u.id)}>
                <KeyRound className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reset mật khẩu</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => handleToggleStatus(u)}>
                {u.isDeleted ? (
                  <CheckCircle className="size-4 text-green-600" />
                ) : (
                  <Ban className="size-4 text-destructive" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{u.isDeleted ? "Kích hoạt" : "Vô hiệu hoá"}</TooltipContent>
          </Tooltip>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold tracking-tight">Quản lý người dùng</h1>
        <Button
          onClick={() => {
            createForm.reset()
            setTempPassword(null)
            setCreateOpen(true)
          }}
        >
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
            onChange={(e) => updateParams({ search: e.target.value || undefined, page: undefined })}
          />
        </div>
      </div>

      {fetchError ? (
        <div className="rounded-lg border p-8 text-center">
          <p className="text-sm text-destructive mb-2">{fetchError instanceof Error ? fetchError.message : "Không thể tải danh sách"}</p>
          <Button variant="outline" size="sm" onClick={invalidate}>
            <RefreshCw className="size-3 mr-1" /> Thử lại
          </Button>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          isLoading={isLoading}
          emptyMessage={debouncedSearch ? "Không tìm thấy người dùng nào" : "Chưa có người dùng nào"}
          sort={sort}
          onSort={handleSort}
          totalElements={totalEl}
          page={!debouncedSearch ? page : undefined}
          totalPages={totalPg}
          pageSize={!debouncedSearch ? pageSize : undefined}
          onPageChange={!debouncedSearch ? (p) => updateParams({ page: String(p) }) : undefined}
          onPageSizeChange={
            !debouncedSearch
              ? (s) => {
                  setPageSize(s)
                  updateParams({ page: undefined })
                }
              : undefined
          }
        />
      )}

      <Dialog
        open={createOpen}
        onOpenChange={(v) => {
          setCreateOpen(v)
          if (!v) setTempPassword(null)
        }}
      >
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
                <p className="mt-2 text-xs text-muted-foreground">
                  Người dùng sẽ được yêu cầu đổi mật khẩu khi đăng nhập lần đầu.
                </p>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => {
                    setCreateOpen(false)
                    setTempPassword(null)
                  }}
                >
                  Đóng
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <>
              <div className="grid gap-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Họ tên</Label>
                  <Input id="fullName" placeholder="Nguyễn Văn A" {...createForm.register("fullName")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="a@example.com" {...createForm.register("email")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Vai trò</Label>
                  <Controller
                    name="roleName"
                    control={createForm.control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="role">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {roleOptions.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>
                  Hủy
                </Button>
                <Button onClick={handleCreate} disabled={createMut.isPending}>
                  {createMut.isPending ? "Đang tạo..." : "Tạo"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sửa thông tin người dùng</DialogTitle>
            <DialogDescription>
              {editUser?.username} — {editUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="editName">Họ tên</Label>
              <Input id="editName" {...editForm.register("fullName")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editPhone">Số điện thoại</Label>
              <Input id="editPhone" placeholder="Không bắt buộc" {...editForm.register("phoneNumber")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editGender">Giới tính</Label>
              <Controller
                name="gender"
                control={editForm.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="editGender">
                      <SelectValue placeholder="Chọn..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Nam</SelectItem>
                      <SelectItem value="1">Nữ</SelectItem>
                      <SelectItem value="2">Khác</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleEdit} disabled={updateMut.isPending}>
              {updateMut.isPending ? "Đang lưu..." : "Lưu"}
            </Button>
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
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleRoleChange}>Lưu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
