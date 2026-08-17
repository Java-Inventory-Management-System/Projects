import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Power } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export function ToggleActiveButton({
  active,
  name,
  pending,
  onToggle,
  confirmTitle,
  confirmDescription,
}: {
  active: boolean
  name: string
  pending?: boolean
  onToggle: () => void
  confirmTitle?: string
  confirmDescription?: string
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const title = confirmTitle ?? (active ? t("common.deactivateTitle") : t("common.activateTitle"))
  const description =
    confirmDescription ?? (active ? t("common.deactivateConfirm", { name }) : t("common.activateConfirm", { name }))

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" disabled={pending} onClick={() => setOpen(true)}>
            <Power className={active ? "size-3.5 text-destructive" : "size-3.5 text-emerald-600"} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{active ? t("common.deactivate") : t("common.activate")}</TooltipContent>
      </Tooltip>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className={active ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : undefined}
              disabled={pending}
              onClick={onToggle}
            >
              {active ? t("common.deactivate") : t("common.activate")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
