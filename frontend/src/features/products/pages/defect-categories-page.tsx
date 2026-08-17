import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Plus, Pencil } from "lucide-react"
import { usePermission } from "@/hooks/use-permission"
import { ROLES } from "@/utils/permissions"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { ToggleActiveButton } from "@/components/toggle-active-button"
import { DataTable } from "@/components/ui/data-table"
import { toast } from "@/utils/toast"
import {
  getDefectCategories,
  createDefectCategory,
  updateDefectCategory,
  toggleDefectCategoryActive,
} from "@/services/defect-category-service"
import type { DefectCategory } from "@/utils/types"

const emptyForm = { code: "", name: "", description: "", isRepairable: false, isReplaceable: false }

export function DefectCategoriesPage() {
  const { t } = useTranslation()
  const perm = usePermission()
  const qc = useQueryClient()
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["defect-categories"],
    queryFn: getDefectCategories,
  })
  const [dialog, setDialog] = useState<{ open: boolean; edit?: DefectCategory }>({ open: false })
  const [form, setForm] = useState(emptyForm)

  const openCreate = () => {
    setForm(emptyForm)
    setDialog({ open: true })
  }
  const openEdit = (d: DefectCategory) => {
    setForm({ code: d.code, name: d.name, description: d.description ?? "", isRepairable: d.isRepairable, isReplaceable: d.isReplaceable })
    setDialog({ open: true, edit: d })
  }

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        description: form.description || null,
        isRepairable: form.isRepairable,
        isReplaceable: form.isReplaceable,
      }
      if (dialog.edit) {
        return updateDefectCategory(dialog.edit.id, { ...payload, code: form.code.trim().toUpperCase() })
      }
      return createDefectCategory({ ...payload, code: form.code.trim().toUpperCase() })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["defect-categories"] })
      setDialog({ open: false })
      toast.success(dialog.edit ? t("common.updateSuccess") : t("common.createSuccess"))
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const toggle = useMutation({
    mutationFn: (id: number) => toggleDefectCategoryActive(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["defect-categories"] }),
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold tracking-tight">{t("defectCategories.title")}</h1>
        {perm.hasRole(...ROLES.CAN_MANAGE_CATALOG) && (
          <Button onClick={openCreate}>
            <Plus className="size-4 mr-1" /> {t("common.add")}
          </Button>
        )}
      </div>

      <DataTable
        totalElements={items.length}
        columns={[
          { header: t("common.code"), render: (d: DefectCategory) => <code className="font-mono text-xs">{d.code}</code> },
          { header: t("common.name"), render: (d: DefectCategory) => <span className="font-medium">{d.name}</span> },
          {
            header: t("common.description"),
            render: (d: DefectCategory) => (
              <span className="text-muted-foreground text-sm">{d.description ?? "-"}</span>
            ),
          },
          {
            header: t("defectCategories.capabilities"),
            render: (d: DefectCategory) => (
              <div className="flex gap-1.5">
                {d.isRepairable && <Badge variant="outline">{t("defectCategories.repairable")}</Badge>}
                {d.isReplaceable && <Badge variant="outline">{t("defectCategories.replaceable")}</Badge>}
                {!d.isRepairable && !d.isReplaceable && (
                  <span className="text-xs text-muted-foreground">-</span>
                )}
              </div>
            ),
          },
          {
            header: t("common.status"),
            className: "w-24 text-center",
            render: (d: DefectCategory) => (
              <Badge variant={d.isActive ? "default" : "secondary"}>
                {d.isActive ? t("common.active") : t("common.inactive")}
              </Badge>
            ),
          },
          {
            header: t("common.actions"),
            className: "w-[90px]",
            render: (d: DefectCategory) => (
              <div className="flex gap-1">
                {perm.hasRole(...ROLES.CAN_MANAGE_CATALOG) && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(d)}>
                        <Pencil className="size-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t("common.edit")}</TooltipContent>
                  </Tooltip>
                )}
                {perm.hasRole(...ROLES.CAN_MANAGE_CATALOG) && (
                  <ToggleActiveButton
                    active={d.isActive}
                    name={d.name}
                    pending={toggle.isPending}
                    onToggle={() => toggle.mutate(d.id)}
                  />
                )}
              </div>
            ),
          },
        ]}
        data={items}
        isLoading={isLoading}
        emptyMessage={t("defectCategories.empty")}
        skeletonRows={3}
      />

      <Dialog
        open={dialog.open}
        onOpenChange={(v) => {
          if (!v) setDialog({ open: false })
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog.edit
                ? `${t("common.edit")} ${t("defectCategories.title")}`
                : `${t("common.add")} ${t("defectCategories.title")}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">
                {t("common.code")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="code"
                required
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="SCRATCH"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">
                {t("common.name")} <span className="text-destructive">*</span>
              </Label>
              <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc">{t("common.description")}</Label>
              <Textarea id="desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={form.isRepairable}
                  onCheckedChange={(v) => setForm({ ...form, isRepairable: v === true })}
                />
                {t("defectCategories.repairable")}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={form.isReplaceable}
                  onCheckedChange={(v) => setForm({ ...form, isReplaceable: v === true })}
                />
                {t("defectCategories.replaceable")}
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog({ open: false })}>
              {t("common.cancel")}
            </Button>
            <Button onClick={() => save.mutate()} disabled={!form.code.trim() || !form.name.trim() || save.isPending}>
              {save.isPending ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}