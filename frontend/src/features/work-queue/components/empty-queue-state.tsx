import { CheckCircle2 } from "lucide-react"
import { useTranslation } from "react-i18next"

export function EmptyQueueState() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-card py-16 text-center">
      <CheckCircle2 className="h-10 w-10 text-muted-foreground/50" />
      <p className="font-medium text-sm">{t("workQueue.allDone")}</p>
      <p className="text-muted-foreground text-xs">{t("workQueue.allDoneDesc")}</p>
    </div>
  )
}
