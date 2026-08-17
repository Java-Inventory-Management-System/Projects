import { useTranslation } from "react-i18next"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

export function UnsavedChangesDialog({
  open,
  onStay,
  onLeave,
}: {
  open: boolean
  onStay: () => void
  onLeave: () => void
}) {
  const { t } = useTranslation()
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onStay()
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("dialog.unsavedTitle")}</DialogTitle>
          <DialogDescription>{t("dialog.unsavedDesc")}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onStay}>
            {t("dialog.stay")}
          </Button>
          <Button variant="destructive" onClick={onLeave}>
            {t("dialog.leave")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}