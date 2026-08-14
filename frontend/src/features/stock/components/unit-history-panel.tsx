import { useTranslation } from "react-i18next"
import { Loader2 } from "lucide-react"
import { useProductUnitHistory } from "@/hooks/use-product-unit-history"
import type { ProductUnit, ProductUnitHistoryEvent } from "@/utils/types"

const fmtFull = (d: string | null) =>
  d ? new Date(d).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-"

const SOURCE_TYPE_KEYS: Record<string, string> = {
  IMPORT_RECEIPT: "unitHistory.sourceType.importReceipt",
  EXPORT_RECEIPT: "unitHistory.sourceType.exportReceipt",
  STOCK_ADJUSTMENT: "unitHistory.sourceType.stockAdjustment",
  STOCK_CHECK: "unitHistory.sourceType.stockCheck",
  RETURN_RECEIPT: "unitHistory.sourceType.returnReceipt",
  RELOCATE: "unitHistory.sourceType.relocate",
  QC_PROCESSING: "unitHistory.sourceType.qcProcessing",
  EXTERNAL_SYSTEM: "unitHistory.sourceType.externalSystem",
}

function statusKey(status: string | null): string | null {
  if (!status) return null
  return status.toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}

function EventRow({ e, isImport }: { e: ProductUnitHistoryEvent; isImport: boolean }) {
  const { t } = useTranslation()
  const from = statusKey(e.fromStatus)
  const to = statusKey(e.toStatus)
  const toLabel = to ? t(`unitStatus.${to}`) : e.toStatus
  const fromLabel = from ? t(`unitStatus.${from}`) : null
  return (
    <li className="relative pl-5">
      <span
        className={`absolute -left-[5px] top-1.5 size-2.5 rounded-full border ${
          isImport ? "bg-primary border-primary" : "bg-muted-foreground/60 border-muted-foreground/60"
        }`}
      />
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium">{t(SOURCE_TYPE_KEYS[e.sourceType] ?? e.sourceType)}</span>
        {e.sourceCode && <code className="text-[11px] text-muted-foreground">{e.sourceCode}</code>}
      </div>
      <p className="text-xs text-muted-foreground">
        {t("unitHistory.statusChange", {
          status: fromLabel ? `${fromLabel} → ${toLabel}` : toLabel,
        })}
      </p>
      <p className="text-xs text-muted-foreground">
        {e.changedByName && `${t("unitHistory.by", { name: e.changedByName })} · `}
        {fmtFull(e.createdAt)}
      </p>
    </li>
  )
}

export function UnitHistoryPanel({ unit }: { unit: ProductUnit | null }) {
  const { t } = useTranslation()
  const { data: history, isLoading } = useProductUnitHistory(unit ? unit.id : null)

  if (!unit) return null

  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b px-4 py-3">
        <h3 className="text-sm font-semibold">{t("unitHistory.title")}</h3>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">
          <span className="font-mono">{unit.serialNumber}</span>
          {unit.productName && ` · ${unit.productName}`}
        </p>
      </div>
      <div className="p-4 max-h-[70vh] overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> {t("unitHistory.loading")}
          </div>
        ) : !history || (history.events.length === 0 && !history.importInfo) ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("unitHistory.empty")}</p>
        ) : (
          <ol className="relative border-l border-border ml-2 space-y-4">
            {history.events.map((e) => (
              <EventRow key={e.id} e={e} isImport={e.sourceType === "IMPORT_RECEIPT"} />
            ))}
            {history.importInfo && !history.events.some((e) => e.sourceType === "IMPORT_RECEIPT") && (
              <li className="relative pl-5">
                <span className="absolute -left-[5px] top-1.5 size-2.5 rounded-full bg-primary border border-primary" />
                <p className="text-sm font-medium">{t("unitHistory.sourceType.importReceipt")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("unitHistory.importedFrom", { code: history.importInfo.receiptCode ?? "-" })}
                </p>
                <p className="text-xs text-muted-foreground">{fmtFull(history.importInfo.importedAt)}</p>
              </li>
            )}
          </ol>
        )}
      </div>
    </div>
  )
}
