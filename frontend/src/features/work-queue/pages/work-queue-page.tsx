import { useTranslation } from "react-i18next"
import { usePermission } from "@/hooks/use-permission"
import { useWorkQueue } from "../hooks/use-work-queue"
import { QueueSection } from "../components/queue-section"
import { EmptyQueueState } from "../components/empty-queue-state"

export function WorkQueueTab() {
  const { t } = useTranslation()
  const { user } = usePermission()
  const { isLoading, dataUpdatedAt, sections, getSection } = useWorkQueue()

  const updatedAt = dataUpdatedAt > 0 ? new Date(dataUpdatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : null

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {user && (
          <p className="text-muted-foreground text-sm">
            {t("workQueue.greeting", { name: user.displayName, role: user.role })}
          </p>
        )}
        {updatedAt && <p className="text-xs text-muted-foreground">{t("workQueue.updatedAt", { time: updatedAt })}</p>}
      </div>
      <div className={sections.length < 3 ? "grid gap-4" : "grid gap-4 lg:grid-cols-2"}>
        {sections.map((def) => (
          <QueueSection key={def.key} def={def} data={getSection(def.key)} />
        ))}
      </div>
      {!isLoading && sections.every((def) => getSection(def.key).count === 0) && <EmptyQueueState />}
    </div>
  )
}
