import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { useInventoryByCategory } from "@/hooks/use-reports"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import type { ChartConfig } from "@/components/ui/chart"
import { DataTable } from "@/components/ui/data-table"
import { Skeleton } from "@/components/ui/skeleton"
import { downloadCsv } from "@/utils/download-csv"
import type { CategoryStock } from "@/utils/types"
import { FileDown } from "lucide-react"

export function CategoryTab() {
  const { t } = useTranslation()
  const { data, isLoading } = useInventoryByCategory()
  const [catPage, setCatPage] = useState(0)
  const catPageSize = 20
  const barData = useMemo(() => {
    if (!data) return []
    return data
      .filter((c) => c.categoryName !== null)
      .map((c) => ({ name: c.categoryName!, products: c.productCount }))
      .sort((a, b) => b.products - a.products)
  }, [data])
  const totalCatElements = data?.length ?? 0
  const totalCatPages = Math.max(1, Math.ceil(totalCatElements / catPageSize))
  const catData = useMemo(() => {
    if (!data) return []
    return data.slice(catPage * catPageSize, (catPage + 1) * catPageSize)
  }, [data, catPage])
  const config: ChartConfig = { products: { label: t('dashboard.category.productCount'), color: "hsl(var(--chart-1))" } }
  if (isLoading) return <Skeleton className="h-48 w-full" />
  return (
    <div className="space-y-3">
      {barData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">{t('dashboard.category.skuByCategory')}</CardTitle></CardHeader>
          <CardContent>
            <ChartContainer config={config} className="aspect-auto h-56">
              <BarChart data={barData} layout="vertical" margin={{ left: 0 }}>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
                <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} tickMargin={8} fontSize={10} width={90} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Bar dataKey="products" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => {
            if (!data) return
            downloadCsv(
              "ton-kho-theo-danh-muc.csv",
              [t('dashboard.category.category'), t('dashboard.category.productCount'), t('dashboard.category.totalStock'), t('dashboard.category.value')],
              data.map((c) => [
                c.categoryName ?? t('dashboard.category.uncategorized'),
                String(c.productCount),
                String(c.totalUnits),
                String(c.totalStockValue),
              ]),
            )
          }}
          disabled={!data}
        >
          <FileDown className="size-3" /> CSV
        </Button>
      </div>
      <DataTable<CategoryStock>
        columns={[
          { header: t('dashboard.category.category'), render: (c) => <span>{c.categoryName ?? t('dashboard.category.uncategorized')}</span> },
          { header: t('dashboard.category.productCount'), className: "text-right", render: (c) => <span className="tabular-nums">{c.productCount}</span> },
          { header: t('dashboard.category.totalStock'), className: "text-right", render: (c) => <span className="tabular-nums">{c.totalUnits}</span> },
          { header: t('dashboard.category.value'), className: "text-right", render: (c) => <span className="tabular-nums">{c.totalStockValue?.toLocaleString("vi-VN") ?? "0"}₫</span> },
        ]}
        data={catData}
        isLoading={false}
        totalElements={totalCatElements}
        page={catPage}
        totalPages={totalCatPages}
        onPageChange={setCatPage}
      />
    </div>
  )
}
