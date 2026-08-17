import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import { TRACKING_TYPE } from "@/utils/types"

export function TrackingTypeBadge({ type }: { type?: string | null }) {
  const { t } = useTranslation()
  if (type === TRACKING_TYPE.SERIALIZED || type === TRACKING_TYPE.BULK) {
    return (
      <Badge variant="outline" className="shrink-0 px-1.5 py-0 text-xs font-medium text-muted-foreground">
        {type === TRACKING_TYPE.SERIALIZED ? t("trackingType.serialized") : t("trackingType.bulk")}
      </Badge>
    )
  }
  return <span className="text-xs text-muted-foreground">-</span>
}
