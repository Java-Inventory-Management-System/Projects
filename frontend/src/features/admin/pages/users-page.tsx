import { useState, useCallback } from "react"
import { useTranslation } from "react-i18next"
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

const roleOptions: URole[] = ["ADMIN", "MANAGER", "STOCK", "SALES"]

const statusLabel: Record<string, { labelKey: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  [USER_STATUS.NEW]: { labelKey: "usersPage.statusNew", variant: "outline" },
  [USER_STATUS.ACTIVE]: { labelKey: "usersPage.statusActive", variant: "default" },
  [USER_STATUS.INACTIVE]: { labelKey: "usersPage.statusInactive", variant: "secondary" },
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString("vi-VN")
}

export const UsersPage = () => {
  const { t } = useTranslation()
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
    placeholderData: (prev) => prev,
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
      toast.error(t('usersPage.validateNameEmail'))
      return
    }
    try {
      const res = await createMut.mutateAsync(values)
      setTempPassword(res.tempPassword)
      toast.success(t('usersPage.createSuccessToast'))
    } catch (err) {
      toast.error((err as Error).message || t('usersPage.errorOccurred'))
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
      toast.success(t('usersPage.updateSuccessToast'))
      setEditOpen(false)
    } catch (err) {
      toast.error((err as Error).message || t('usersPage.errorOccurred'))
    }
  })

  const handleRoleChange = async () => {
    if (!roleUserId || !roleVal) return
    try {
      await roleMut.mutateAsync({ id: roleUserId, role: roleVal })
      toast.success(t('usersPage.roleChangeSuccess'))
      setRoleOpen(false)
    } catch (err) {
      toast.error((err as Error).message || t('usersPage.errorOccurred'))
    }
  }

  const handleToggleStatus = async (u: UserResponse) => {
    try {
      await toggleStatusMut.mutateAsync([u.id, u.isDeleted])
      toast.success(u.isDeleted ? t('usersPage.activateSuccess') : t('usersPage.deactivateSuccess'))
    } catch (err) {
      toast.error((err as Error).message || t('usersPage.errorOccurred'))
    }
  }

  const handleResetPassword = async (id: number) => {
    try {
      const pwd = await resetPwdMut.mutateAsync(id)
      toast.success(t('usersPage.resetPwdSuccess', { password: pwd }))
    } catch (err) {
      toast.error((err as Error).message || t('usersPage.errorOccurred'))
    }
  }

  const columns: Column<UserResponse>[] = [
    { header: "Username", sortKey: "username", render: (u) => <span className="font-mono text-xs">{u.username}</span> },
    { header: t('usersPage.colFullName'), sortKey: "fullName", render: (u) => <span className="font-medium">{u.fullName}</span> },
    { header: t('usersPage.colEmail'), sortKey: "email", render: (u) => <span className="text-muted-foreground">{u.email}</span> },
    {
      header: t('usersPage.colRole'),
      render: (u) => (
        <Badge variant="outline" className="text-xs">
          {t('roleLabel.' + u.role)}
        </Badge>
      ),
    },
    {
      header: t('usersPage.colStatus'),
      render: (u) => {
        const st = statusLabel[u.status] ?? { labelKey: undefined, variant: "secondary" as const }
        return <Badge variant={st.variant}>{st.labelKey ? t(st.labelKey) : u.status}</Badge>
      },
    },
    {
      header: t('usersPage.colCreatedAt'),
      sortKey: "createdAt",
      render: (u) => <span className="text-xs text-muted-foreground">{fmt(u.createdAt)}</span>,
    },
    {
      header: t('usersPage.colActions'),
      className: "w-[140px]",
      render: (u) => (
        <div className="flex gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => openEdit(u)}>
                <UserCog className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('usersPage.editTooltip')}</TooltipContent>
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
            <TooltipContent>{t('usersPage.changeRoleTooltip')}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => handleResetPassword(u.id)}>
                <KeyRound className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('usersPage.resetPwdTooltip')}</TooltipContent>
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
            <TooltipContent>{u.isDeleted ? t('usersPage.activateTooltip') : t('usersPage.deactivateTooltip')}</TooltipContent>
          </Tooltip>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold tracking-tight">{t('usersPage.title')}</h1>
        <Button
          onClick={() => {
            createForm.reset()
            setTempPassword(null)
            setCreateOpen(true)
          }}
        >
          <Plus className="size-4 mr-1" /> {t('usersPage.addUser')}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder={t('usersPage.searchPlaceholder')}
            className="pl-8"
            value={search}
            onChange={(e) => updateParams({ search: e.target.value || undefined, page: undefined })}
          />
        </div>
      </div>

      {fetchError ? (
        <div className="rounded-lg border p-8 text-center">
          <p className="text-sm text-destructive mb-2">{fetchError instanceof Error ? fetchError.message : t('usersPage.loadError')}</p>
          <Button variant="outline" size="sm" onClick={invalidate}>
            <RefreshCw className="size-3 mr-1" /> {t('usersPage.retry')}
          </Button>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          isLoading={isLoading}
          emptyMessage={debouncedSearch ? t('usersPage.emptySearch') : t('usersPage.empty')}
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
            <DialogTitle>{t('usersPage.createDialogTitle')}</DialogTitle>
            {!tempPassword && <DialogDescription>{t('usersPage.createDialogDesc')}</DialogDescription>}
          </DialogHeader>
          {tempPassword ? (
            <div className="space-y-4 py-4">
              <div className="rounded-md border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20 px-4 py-3 text-sm text-green-800 dark:text-green-200">
                <p className="font-medium">{t('usersPage.createSuccess')}</p>
                <p className="mt-2 text-xs">{t('usersPage.passwordNote')}</p>
                <p className="mt-1 font-mono text-lg font-bold tracking-wider select-all">{tempPassword}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {t('usersPage.passwordHint')}
                </p>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => {
                    setCreateOpen(false)
                    setTempPassword(null)
                  }}
                >
                  {t('usersPage.close')}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <>
              <div className="grid gap-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="fullName">{t('usersPage.fullName')}</Label>
                  <Input id="fullName" placeholder={t('usersPage.fullNamePlaceholder')} {...createForm.register("fullName")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">{t('usersPage.email')}</Label>
                  <Input id="email" type="email" placeholder={t('form.emailPlaceholder')} {...createForm.register("email")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">{t('usersPage.role')}</Label>
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
                            <SelectItem key={o} value={o}>
                              {t('roleLabel.' + o)}
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
                  {t('usersPage.cancel')}
                </Button>
                <Button onClick={handleCreate} disabled={createMut.isPending}>
                  {createMut.isPending ? t('usersPage.creating') : t('usersPage.create')}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('usersPage.editDialogTitle')}</DialogTitle>
            <DialogDescription>
              {editUser?.username} — {editUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="editName">{t('usersPage.fullName')}</Label>
              <Input id="editName" {...editForm.register("fullName")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editPhone">{t('usersPage.phoneNumber')}</Label>
              <Input id="editPhone" placeholder={t('usersPage.phoneOptional')} {...editForm.register("phoneNumber")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editGender">{t('usersPage.gender')}</Label>
              <Controller
                name="gender"
                control={editForm.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="editGender">
                      <SelectValue placeholder={t('usersPage.genderPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">{t('usersPage.male')}</SelectItem>
                      <SelectItem value="1">{t('usersPage.female')}</SelectItem>
                      <SelectItem value="2">{t('usersPage.other')}</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              {t('usersPage.cancel')}
            </Button>
            <Button onClick={handleEdit} disabled={updateMut.isPending}>
              {updateMut.isPending ? t('usersPage.saving') : t('usersPage.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={roleOpen} onOpenChange={setRoleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('usersPage.roleDialogTitle')}</DialogTitle>
            <DialogDescription>{t('usersPage.roleDialogDesc')}</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={roleVal} onValueChange={setRoleVal}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((o) => (
                  <SelectItem key={o} value={o}>
                    {t('roleLabel.' + o)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleOpen(false)}>
              {t('usersPage.cancel')}
            </Button>
            <Button onClick={handleRoleChange}>{t('usersPage.roleSave')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
