import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useForm } from "react-hook-form"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { getSuppliers, createSupplier, updateSupplier, toggleSupplierActive } from "@/services/supplier-service"
import type { SupplierResponse } from "@/utils/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Plus, Pencil, Power } from "lucide-react"
import { DataTable, type Column } from "@/components/ui/data-table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { toast } from "@/utils/toast"
import { usePermission } from "@/hooks/use-permission"
import { ROLES } from "@/utils/permissions"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"

interface SupplierForm {
  name: string
  contactPerson: string
  phone: string
  email: string
  address: string
  taxCode: string
  note: string
}

const defaultForm: SupplierForm = {
  name: "",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  taxCode: "",
  note: "",
}

export function SuppliersPage() {
  const { t } = useTranslation()
  const perm = usePermission()
  const qc = useQueryClient()
  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => getSuppliers(),
  })
  const [dialog, setDialog] = useState<{ open: boolean; edit?: SupplierResponse }>({ open: false })
  const form = useForm<SupplierForm>({ defaultValues: defaultForm })

  const openCreate = () => {
    form.reset(defaultForm)
    setDialog({ open: true })
  }
  const openEdit = (s: SupplierResponse) => {
    form.reset({
      name: s.name,
      contactPerson: s.contactPerson ?? "",
      phone: s.phone ?? "",
      email: s.email ?? "",
      address: s.address ?? "",
      taxCode: s.taxCode ?? "",
      note: s.note ?? "",
    })
    setDialog({ open: true, edit: s })
  }

  const save = useMutation({
    mutationFn: async (values: SupplierForm) => {
      const data = {
        name: values.name.trim(),
        contactPerson: values.contactPerson || null,
        phone: values.phone || null,
        email: values.email || null,
        address: values.address || null,
        taxCode: values.taxCode || null,
        note: values.note || null,
      }
      if (dialog.edit) return updateSupplier(dialog.edit.id, data)
      return createSupplier(data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suppliers"] })
      setDialog({ open: false })
      toast.success(dialog.edit ? t("common.updateSuccess") : t("common.createSuccess"))
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const toggle = useMutation({
    mutationFn: (id: number) => toggleSupplierActive(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["suppliers"] }),
    onError: (e: Error) => toast.error(e.message),
  })

  const columns: Column<SupplierResponse>[] = [
    { header: t("common.name"), render: (s) => <span className="font-medium">{s.name}</span> },
    {
      header: t("supplierPage.contactPerson"),
      render: (s) => <span className="text-sm text-muted-foreground">{s.contactPerson ?? "—"}</span>,
    },
    { header: t("common.phone"), render: (s) => <span className="text-sm">{s.phone ?? "—"}</span> },
    { header: t("common.email"), render: (s) => <span className="text-sm">{s.email ?? "—"}</span> },
    { header: t("common.address"), render: (s) => <span className="text-sm">{s.address ?? "—"}</span> },
    { header: t("supplierPage.taxCode"), render: (s) => <span className="text-sm">{s.taxCode ?? "—"}</span> },
    {
      header: t("common.status"),
      className: "w-24 text-center",
      render: (s) => <Badge variant={s.isActive ? "default" : "secondary"}>{s.isActive ? t("common.active") : t("common.inactive")}</Badge>,
    },
    {
      header: t("common.actions"),
      className: "w-[90px]",
      render: (s) => (
        <div className="flex gap-1">
          {perm.hasRole(...ROLES.MANAGER) && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
                  <Pencil className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("common.edit")}</TooltipContent>
            </Tooltip>
          )}
          {perm.hasRole(...ROLES.MANAGER) && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => toggle.mutate(s.id)}>
                  <Power className={s.isActive ? "size-3.5 text-destructive" : "size-3.5 text-emerald-600"} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{s.isActive ? t("common.deactivate") : t("common.activate")}</TooltipContent>
            </Tooltip>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold tracking-tight">{t("supplierPage.heading")}</h1>
        <Button onClick={openCreate}>
          <Plus className="size-4 mr-1" /> {t("common.add")}
        </Button>
      </div>

      <DataTable columns={columns} data={suppliers} isLoading={isLoading} emptyMessage={t("supplierPage.empty")} totalElements={suppliers.length} />

      <Dialog
        open={dialog.open}
        onOpenChange={(v) => {
          if (!v) setDialog({ open: false })
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialog.edit ? t("supplierPage.editTitle") : t("supplierPage.addTitle")}</DialogTitle>
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
                <Label>{t("supplierPage.contactPerson")}</Label>
                <Input {...form.register("contactPerson")} />
              </div>
              <div className="space-y-2">
                <Label>{t("common.phone")}</Label>
                <Input {...form.register("phone")} />
              </div>
              <div className="space-y-2">
                <Label>{t("common.email")}</Label>
                <Input {...form.register("email")} />
              </div>
              <div className="space-y-2">
                <Label>{t("supplierPage.taxCode")}</Label>
                <Input {...form.register("taxCode")} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>{t("common.address")}</Label>
                <Input {...form.register("address")} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>{t("supplierPage.note")}</Label>
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
