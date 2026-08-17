import { Link } from "react-router-dom"
import { ChevronRight } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import type { QueueItem } from "../config/queue-sections.config"
import { formatRelativeTime } from "@/utils/format"

interface Props {
  item: QueueItem
}

export function QueueItemRow({ item }: Props) {
  const { t } = useTranslation()
  return (
    <Link
      to={item.link}
      className="flex min-h-11 items-center justify-between gap-3 rounded-md px-3 py-2 hover:bg-muted/60"
    >
      <div className="min-w-0">
        <div className="truncate font-medium text-sm">{item.code}</div>
        <div className="truncate text-muted-foreground text-xs">{item.counterparty}</div>
      </div>
      <div className="flex shrink-0 items-center gap-2 text-muted-foreground text-xs">
        {item.status && (
          <Badge variant={item.status.variant} className="px-2 py-0 text-[11px] font-medium">
            {t(`workQueue.status.${item.status.key}`)}
          </Badge>
        )}
        {item.time && <span>{formatRelativeTime(item.time)}</span>}
        <ChevronRight className="h-3.5 w-3.5" />
      </div>
    </Link>
  )
}
