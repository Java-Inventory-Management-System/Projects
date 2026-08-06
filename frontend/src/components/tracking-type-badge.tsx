import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import { TRACKING_TYPE } from "@/utils/types"

export function TrackingTypeBadge({ type }: { type?: string | null }) {
  const { t } = useTranslation()
  if (type === TRACKING_TYPE.SERIALIZED) {
    return (
      <Badge variant="outline" className="shrink-0 border-blue-300 bg-blue-50 px-1.5 py-0 text-[10px] font-medium text-blue-600 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-400">
        {t("trackingType.serialized")}
      </Badge>
    )
  }
  if (type === TRACKING_TYPE.BULK) {
    return (
      <Badge variant="outline" className="shrink-0 border-amber-300 bg-amber-50 px-1.5 py-0 text-[10px] font-medium text-amber-600 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400">
        {t("trackingType.bulk")}
      </Badge>
    )
  }
  return <span className="text-xs text-muted-foreground">-</span>
}
