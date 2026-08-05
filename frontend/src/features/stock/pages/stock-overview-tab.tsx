import { useTranslation } from "react-i18next"
import { useInventorySummary, useLowStock } from "@/hooks/use-reports"
import { useImportReceipts } from "@/hooks/use-import-receipts"
import { useExportReceipts } from "@/hooks/use-export-receipts"
import { useLocationMap } from "@/hooks/use-location-map"
import { Package, AlertTriangle, ArrowDownToLine, ArrowUpFromLine, MapPin, TrendingUp } from "lucide-react"

export function StockOverviewTab() {
  const { t } = useTranslation()
  const { data: summary } = useInventorySummary()
  const { data: lowStockRes } = useLowStock(0, 5)
  const { data: recentImportsRes } = useImportReceipts(0, 5)
  const { data: recentExportsRes } = useExportReceipts(0, 5)
  const { data: locationMap } = useLocationMap()

  const totalBins =
    (locationMap?.zones ?? []).reduce(
      (s, z) => s + (z.shelves ?? []).reduce((s2, sh) => s2 + (sh.bins?.length ?? 0), 0),
      0,
    ) ?? 0
  const lowStockItems = lowStockRes?.content ?? []
  const recentImports = recentImportsRes?.content ?? []
  const recentExports = recentExportsRes?.content ?? []

  const exportReasonLabel: Record<string, string> = {
    SALE: t("common.sale"),
    INTERNAL: t("common.internal"),
    RETURN_SUPPLIER: t("common.returnSupplier"),
    DISPOSE: t("common.dispose"),
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <div className="rounded-lg border bg-card p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Package className="size-3.5" />
            <span className="text-[11px] font-medium">{t("overview.products")}</span>
          </div>
          <p className="text-lg font-semibold tabular-nums">{summary?.totalProducts ?? "—"}</p>
        </div>
        <div className="rounded-lg border bg-card p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <TrendingUp className="size-3.5" />
            <span className="text-[11px] font-medium">{t("overview.totalStock")}</span>
          </div>
          <p className="text-lg font-semibold tabular-nums">{summary?.totalUnits ?? "—"}</p>
        </div>
        <div className="rounded-lg border bg-card p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="size-3.5" />
            <span className="text-[11px] font-medium">{t("overview.locations")}</span>
          </div>
          <p className="text-lg font-semibold tabular-nums">{totalBins}</p>
        </div>
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-card p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
            <AlertTriangle className="size-3.5" />
            <span className="text-[11px] font-medium">{t("overview.lowStock")}</span>
          </div>
          <p className="text-lg font-semibold tabular-nums text-red-600 dark:text-red-400">
            {summary?.lowStockCount ?? "—"}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border p-3 space-y-2">
          <h3 className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground">
            <AlertTriangle className="size-3.5 text-red-500" />
            {t("overview.lowStockHeading")}
          </h3>
          {lowStockItems.length === 0 ? (
            <p className="text-[11px] text-muted-foreground py-2">{t("overview.noLowStock")}</p>
          ) : (
            <div className="space-y-1">
              {lowStockItems.map((item) => (
                <div key={item.productId} className="flex items-center justify-between text-[11px] py-0.5">
                  <div className="truncate min-w-0 flex-1">
                    <p className="truncate font-medium">{item.productName}</p>
                    <p className="text-muted-foreground truncate">{item.productSku}</p>
                  </div>
                  <span className="text-[10px] shrink-0 ml-2 font-mono tabular-nums text-destructive">
                    {item.quantity}/{item.minStock}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border p-3 space-y-2">
          <h3 className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground">
            <ArrowDownToLine className="size-3.5 text-green-600" />
            {t("overview.recentImports")}
          </h3>
          {recentImports.length === 0 ? (
            <p className="text-[11px] text-muted-foreground py-2">{t("overview.noImports")}</p>
          ) : (
            <div className="space-y-1">
              {recentImports.map((receipt) => (
                <div key={receipt.id} className="text-[11px] py-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-muted-foreground">{receipt.receiptCode}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(receipt.createdAt).toLocaleDateString("vi-VN")}
                    </span>
                  </div>
                  <p className="truncate text-muted-foreground">{receipt.supplierName}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {t("overview.items", { count: receipt.items.length })} &middot;{" "}
                    {t("overview.qty", { count: receipt.items.reduce((s, i) => s + i.quantity, 0) })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border p-3 space-y-2">
          <h3 className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground">
            <ArrowUpFromLine className="size-3.5 text-orange-600" />
            {t("overview.recentExports")}
          </h3>
          {recentExports.length === 0 ? (
            <p className="text-[11px] text-muted-foreground py-2">{t("overview.noExports")}</p>
          ) : (
            <div className="space-y-1">
              {recentExports.map((receipt) => (
                <div key={receipt.id} className="text-[11px] py-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-muted-foreground">{receipt.receiptCode}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(receipt.createdAt).toLocaleDateString("vi-VN")}
                    </span>
                  </div>
                  <p className="truncate text-muted-foreground">
                    {receipt.customerName ?? exportReasonLabel[receipt.reason] ?? receipt.reason}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {t("overview.items", { count: receipt.items.length })} &middot;{" "}
                    {t("overview.qty", { count: receipt.items.reduce((s, i) => s + i.quantity, 0) })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
