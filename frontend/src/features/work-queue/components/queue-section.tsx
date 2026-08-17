import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { AlertTriangle, Eye } from "lucide-react"
import type { QueueSectionDef } from "../config/queue-sections.config"
import type { WorkQueueData } from "../hooks/use-work-queue"
import { QueueItemRow } from "./queue-item-row"

interface Props {
  def: QueueSectionDef
  data: WorkQueueData
}

export function QueueSection({ def, data }: Props) {
  const { t } = useTranslation()
  if (data.count === 0) return null

  const UrgencyIcon = def.urgency === "high" ? AlertTriangle : def.kind === "watch" ? Eye : null

  return (
    <div className="rounded-lg border bg-card">
      <div
        className={`flex items-center justify-between rounded-t-lg border-b px-4 py-3 ${
          def.urgency === "high" ? "border-red-200 bg-red-50/60" : ""
        }`}
      >
        <div className="flex min-w-0 items-center gap-2">
          {UrgencyIcon && (
            <UrgencyIcon
              className={`h-4 w-4 shrink-0 ${def.urgency === "high" ? "text-red-600" : "text-muted-foreground"}`}
            />
          )}
          <h3 className="truncate text-sm font-semibold">{t(def.titleKey)}</h3>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
              def.urgency === "high" ? "bg-red-100 text-red-700" : "bg-muted text-muted-foreground"
            }`}
          >
            {data.count}
          </span>
        </div>
        <Link to={def.viewAllLink} className="shrink-0 text-xs text-muted-foreground hover:text-foreground">
          {t("common.viewAll")} →
        </Link>
      </div>
      <div className="divide-y">
        {data.items.map((it) => (
          <QueueItemRow key={`${def.key}-${it.id}`} item={it} />
        ))}
      </div>
    </div>
  )
}
