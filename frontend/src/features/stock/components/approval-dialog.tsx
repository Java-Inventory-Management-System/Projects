import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { toast } from "@/utils/toast"

interface ApproveAction {
  label: string
  confirmLabel: string
  variant?: "default" | "destructive"
  service: (id: number, note?: string) => Promise<unknown>
}

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  id: number
  title: string
  actions: [ApproveAction, ApproveAction]
  invalidateKeys?: string[][]
}

export function ApprovalDialog({ open, onOpenChange, id, title, actions, invalidateKeys }: Props) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [note, setNote] = useState("")
  const [activeIdx, setActiveIdx] = useState<number | null>(null)

  const mutation = useMutation({
    mutationFn: ({ idx }: { idx: number }) => actions[idx].service(id, note || undefined),
    onSuccess: () => {
      if (invalidateKeys) invalidateKeys.forEach((k) => qc.invalidateQueries({ queryKey: k }))
      toast.success(t("approvalDialog.success"))
      onOpenChange(false)
      setNote("")
    },
    onError: (err: Error) => toast.error(err.message || t("approvalDialog.failure")),
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          onOpenChange(false)
          setNote("")
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">{t('form.noteOptional')}</label>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('form.enterNote')} rows={3} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          {actions.map((a, i) => (
            <Button
              key={i}
              variant={a.variant ?? "default"}
              onClick={() => {
                setActiveIdx(i)
                mutation.mutate({ idx: i })
              }}
              disabled={mutation.isPending}
            >
              {mutation.isPending && activeIdx === i ? t('common.processing') : a.confirmLabel}
            </Button>
          ))}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
