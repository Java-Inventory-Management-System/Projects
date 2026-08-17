import { useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Loader2 } from "lucide-react"
import { usePriceAdjustmentHistory } from "@/hooks/use-price-adjustments"
import type { PriceAdjustment } from "@/utils/types"
import { Badge } from "@/components/ui/badge"

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"

export function PriceHistoryPanel({ productId, productName }: { productId: number | null; productName?: string | null }) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { data, isLoading } = usePriceAdjustmentHistory(productId)

  const rows = useMemo(() => {
    if (!data) return []
    const approved = data
      .filter((a) => a.status === "APPROVED")
      .sort((a, b) => (b.approvedAt ?? "").localeCompare(a.approvedAt ?? ""))
    const pending = data
      .filter((a) => a.status === "PENDING")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return [...approved, ...pending]
  }, [data])

  if (productId == null) return null

  const approvedCount = rows.filter((r) => r.status === "APPROVED").length
  const isOldestApproved = (adj: PriceAdjustment, index: number) => adj.status === "APPROVED" && index === approvedCount - 1

  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b px-4 py-3">
        <h3 className="text-sm font-semibold">{t("priceHistory.title")}</h3>
        {productName && <p className="text-xs text-muted-foreground mt-0.5 truncate">{productName}</p>}
      </div>
      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> {t("priceHistory.loading")}
          </div>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("priceHistory.empty")}</p>
        ) : (
          <ol className="relative border-l border-border ml-2 space-y-5">
            {rows.map((adj, i) => {
              const isCurrent = adj.status === "APPROVED" && i === 0
              const from = adj.status === "APPROVED" && isOldestApproved(adj, i) && adj.receiptDate
                ? adj.receiptDate
                : adj.approvedAt
              const to = adj.status === "APPROVED" ? (isCurrent ? t("priceHistory.now") : fmt(rows[i - 1].approvedAt)) : null
              return (
                <li key={adj.id} className="relative pl-5">
                  <span
                    className={`absolute -left-[5px] top-1.5 size-2.5 rounded-full border ${
                      isCurrent
                        ? "bg-primary border-primary"
                        : adj.status === "APPROVED"
                          ? "bg-muted-foreground/60 border-muted-foreground/60"
                          : "bg-background border-muted-foreground/50"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => navigate(`/stock/ops/price-adjustments/${adj.id}`)}
                    className="w-full text-left group"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold tabular-nums">
                        {(adj.oldPrice ?? 0).toLocaleString("vi-VN")}₫ → {(adj.newPrice ?? 0).toLocaleString("vi-VN")}₫
                      </span>
                      {isCurrent ? (
                        <Badge className="text-xs">{t("priceHistory.current")}</Badge>
                      ) : adj.status === "APPROVED" ? (
                        <Badge variant="secondary" className="text-xs">{t("priceHistory.approved")}</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">{t("priceHistory.pending")}</Badge>
                      )}
                    </div>
                    {adj.status === "APPROVED" && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t("priceHistory.effective", { from: fmt(from), to })}
                      </p>
                    )}
                    {adj.status === "PENDING" && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t("priceHistory.requestedAt", { date: fmt(adj.createdAt) })}
                      </p>
                    )}
                    {adj.receiptCode && (
                      <p className="text-xs text-muted-foreground/70 mt-0.5">
                        {t("priceHistory.receipt", { code: adj.receiptCode, date: fmt(adj.receiptDate) })}
                      </p>
                    )}
                    {adj.reason && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {t("priceHistory.reason", { reason: adj.reason })}
                      </p>
                    )}
                    {adj.createdByName && (
                      <p className="text-xs text-muted-foreground/70 mt-0.5">{adj.createdByName}</p>
                    )}
                  </button>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </div>
  )
}
