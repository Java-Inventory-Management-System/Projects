import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useForm } from "react-hook-form"
import { useSearchParams } from "react-router-dom"
import { useDebounce } from "@/hooks/use-debounce"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { getCustomers, createCustomer, updateCustomer, toggleCustomerActive } from "@/services/customer-service"
import type { CustomerResponse } from "@/utils/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Plus, Pencil, Search } from "lucide-react"
import { DataTable, type Column } from "@/components/ui/data-table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { toast } from "@/utils/toast"
import { usePermission } from "@/hooks/use-permission"
import { ROLES } from "@/utils/permissions"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { ToggleActiveButton } from "@/components/toggle-active-button"

interface CustomerForm {
  name: string
  phone: string
  email: string
  address: string
  note: string
}

const defaultForm: CustomerForm = {
  name: "",
  phone: "",
  email: "",
  address: "",
  note: "",
}

export function CustomersPage() {
  const { t } = useTranslation()
  const perm = usePermission()
  const qc = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Number(searchParams.get("page") ?? "0")
  const [search, setSearch] = useState("")
  const debounced = useDebounce(search, 300)
  const { data, isLoading } = useQuery({
    queryKey: ["customers", page, debounced],
    queryFn: () => getCustomers(page, 20, debounced || undefined),
  })
  const [dialog, setDialog] = useState<{ open: boolean; edit?: CustomerResponse }>({ open: false })
  const form = useForm<CustomerForm>({ defaultValues: defaultForm })

  const openCreate = () => {
    form.reset(defaultForm)
    setDialog({ open: true })
  }
  const openEdit = (c: CustomerResponse) => {
    form.reset({
      name: c.name,
      phone: c.phone ?? "",
      email: c.email ?? "",
      address: c.address ?? "",
      note: c.note ?? "",
    })
    setDialog({ open: true, edit: c })
  }

  const save = useMutation({
    mutationFn: async (values: CustomerForm) => {
      const data = {
        name: values.name.trim(),
        phone: values.phone || null,
        email: values.email || null,
        address: values.address || null,
        note: values.note || null,
      }
      if (dialog.edit) return updateCustomer(dialog.edit.id, data)
      return createCustomer(data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] })
      setDialog({ open: false })
      toast.success(dialog.edit ? t("common.updateSuccess") : t("common.createSuccess"))
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const toggle = useMutation({
    mutationFn: (id: number) => toggleCustomerActive(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
    onError: (e: Error) => toast.error(e.message),
  })

  const customers = data?.content ?? []
  const totalPages = data?.pagination?.totalPages ?? 0

  const columns: Column<CustomerResponse>[] = [
    { header: t("common.name"), render: (c) => <span className="font-medium">{c.name}</span> },
    { header: t("common.phone"), render: (c) => <span className="text-sm">{c.phone ?? "—"}</span> },
    { header: t("common.email"), render: (c) => <span className="text-sm">{c.email ?? "—"}</span> },
    { header: t("common.address"), render: (c) => <span className="text-sm">{c.address ?? "—"}</span> },
    {
      header: t("customerPage.note"),
      render: (c) => <span className="text-sm text-muted-foreground">{c.note ?? "—"}</span>,
    },
    {
      header: t("common.status"),
      className: "w-24 text-center",
      render: (c) => (
        <Badge variant={c.isActive ? "default" : "secondary"}>
          {c.isActive ? t("common.active") : t("common.inactive")}
        </Badge>
      ),
    },
    {
      header: t("common.actions"),
      className: "w-[90px]",
      render: (c) => (
        <div className="flex gap-1">
          {perm.hasRole(...ROLES.CAN_MANAGE_CATALOG) && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                  <Pencil className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("common.edit")}</TooltipContent>
            </Tooltip>
          )}
          {perm.hasRole(...ROLES.CAN_MANAGE_CATALOG) && (
            <ToggleActiveButton
              active={c.isActive}
              name={c.name}
              pending={toggle.isPending}
              onToggle={() => toggle.mutate(c.id)}
              confirmTitle={c.isActive && c.exportCount ? t("customerPage.deactivateHistoryTitle") : undefined}
              confirmDescription={
                c.isActive && c.exportCount
                  ? t("customerPage.deactivateHistoryConfirm", { name: c.name, count: c.exportCount })
                  : undefined
              }
            />
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold tracking-tight">{t("customerPage.heading")}</h1>
        {perm.hasRole(...ROLES.CAN_OPERATE) && (
          <Button onClick={openCreate}>
            <Plus className="size-4 mr-1" /> {t("common.add")}
          </Button>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-8"
          placeholder={t("customerPage.searchPlaceholder")}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setSearchParams(
              (prev) => {
                prev.delete("page")
                return prev
              },
              { replace: true },
            )
          }}
        />
      </div>

      <DataTable
        columns={columns}
        data={customers}
        isLoading={isLoading}
        emptyMessage={t("customerPage.empty")}
        page={page}
        totalPages={totalPages}
        totalElements={data?.pagination?.totalElements}
        pageSize={20}
        onPageChange={(p) =>
          setSearchParams(
            (prev) => {
              prev.set("page", String(p))
              return prev
            },
            { replace: true },
          )
        }
      />

      <Dialog
        open={dialog.open}
        onOpenChange={(v) => {
          if (!v) setDialog({ open: false })
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialog.edit ? t("customerPage.editTitle") : t("customerPage.addTitle")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit((values) => save.mutate(values))}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="name">
                  {t("common.name")} <span className="text-destructive">*</span>
                </Label>
                <Input id="name" required {...form.register("name")} />
              </div>
              <div className="space-y-2">
                <Label>{t("common.phone")}</Label>
                <Input {...form.register("phone")} />
              </div>
              <div className="space-y-2">
                <Label>{t("common.email")}</Label>
                <Input {...form.register("email")} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>{t("common.address")}</Label>
                <Input {...form.register("address")} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>{t("customerPage.note")}</Label>
                <Input {...form.register("note")} />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setDialog({ open: false })}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={!form.watch("name").trim() || save.isPending}>
                {save.isPending ? t("common.saving") : t("common.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
