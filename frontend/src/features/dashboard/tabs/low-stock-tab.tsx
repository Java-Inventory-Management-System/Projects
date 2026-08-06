import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useLowStock } from "@/hooks/use-reports"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { Skeleton } from "@/components/ui/skeleton"
import { downloadCsv } from "@/utils/download-csv"
import type { LowStockItem } from "@/utils/types"
import { FileDown } from "lucide-react"

export function LowStockTab() {
  const { t } = useTranslation()
  const [lowPage, setLowPage] = useState(0)
  const lowPageSize = 20
  const { data, isLoading } = useLowStock(lowPage, lowPageSize)
  if (isLoading) return <Skeleton className="h-48 w-full" />
  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => {
            if (!data) return
            downloadCsv(
              "sap-het-hang.csv",
              [t('table.sku'), t('table.product'), t('dashboard.lowStock.stock'), t('dashboard.lowStock.minStock')],
              data.content.map((i) => [
                i.productSku ?? "",
                i.productName,
                String(i.quantity),
                String(i.minStock ?? ""),
              ]),
            )
          }}
          disabled={!data}
        >
          <FileDown className="size-3" /> CSV
        </Button>
      </div>
      <DataTable<LowStockItem>
        columns={[
          { header: t('table.sku'), render: (i) => <span className="font-mono text-xs">{i.productSku}</span> },
          { header: t('table.product'), render: (i) => <span className="text-sm">{i.productName}</span> },
          { header: t('dashboard.lowStock.stock'), className: "text-right", render: (i) => {
            const deficit = i.quantity - (i.minStock ?? 0)
            return <span className={`tabular-nums ${deficit <= 0 ? "text-destructive font-semibold" : ""}`}>{i.quantity}</span>
          }},
          { header: t('dashboard.lowStock.minStock'), className: "text-right", render: (i) => <span className="tabular-nums">{i.minStock}</span> },
          { header: t('dashboard.lowStock.deficit'), className: "text-right", render: (i) => {
            const deficit = i.quantity - (i.minStock ?? 0)
            return <span className={`tabular-nums ${deficit < 0 ? "text-destructive" : "text-muted-foreground"}`}>{deficit > 0 ? "+" : ""}{deficit}</span>
          }},
          { header: "", render: (i) => (
            <Button variant="outline" size="sm" className="text-xs h-7 px-2" asChild>
              <a href={`/stock/imports/create?ref=low-stock&productId=${i.productId}`}>{t('dashboard.lowStock.import')}</a>
            </Button>
          )},
        ]}
        data={data?.content ?? []}
        isLoading={false}
        emptyMessage={t('dashboard.lowStock.empty')}
        totalElements={data?.pagination?.totalElements}
        page={data?.pagination?.number ?? 0}
        totalPages={data?.pagination?.totalPages ?? 1}
        onPageChange={setLowPage}
      />
    </div>
  )
}
