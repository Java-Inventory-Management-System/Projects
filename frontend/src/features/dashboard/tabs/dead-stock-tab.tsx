import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { useDeadStock, useInventoryByCategory } from "@/hooks/use-reports"
import { formatDateVN } from "@/utils/format"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import type { ChartConfig } from "@/components/ui/chart"
import { DataTable } from "@/components/ui/data-table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { DeadStockItem } from "@/utils/types"

type DeadSortKey = "daysInStock" | "costPrice"
type DeadSortDir = "asc" | "desc"

function computeDeadStockHistogram(data: DeadStockItem[] | undefined, threshold: number) {
  if (!data || data.length === 0) return []
  const p2 = Math.round(threshold * 1.33)
  const p3 = Math.round(threshold * 2)
  const buckets: Record<string, number> = { [`${threshold}-${p2}`]: 0, [`${p2}-${p3}`]: 0, [`${p3}+`]: 0 }
  for (const i of data) {
    if (i.daysInStock >= p3) buckets[`${p3}+`]++
    else if (i.daysInStock >= p2) buckets[`${p2}-${p3}`]++
    else if (i.daysInStock >= threshold) buckets[`${threshold}-${p2}`]++
  }
  return Object.entries(buckets).map(([range, count]) => ({ range, count }))
}

export function DeadStockTab() {
  const { t } = useTranslation()
  const histogramConfig: ChartConfig = {
    count: { label: t("dashboard.deadStock.productCount"), color: "hsl(var(--chart-3))" },
  }
  const [days, setDays] = useState("90")
  const [keyword, setKeyword] = useState("")
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined)
  const [sortKey, setSortKey] = useState<DeadSortKey>("costPrice")
  const [sortDir, setSortDir] = useState<DeadSortDir>("desc")
  const [dsPage, setDsPage] = useState(0)
  const dsPageSize = 20
  const { data: allCategories } = useInventoryByCategory()
  const { data, isLoading } = useDeadStock(Number(days), keyword || undefined, categoryId)
  const catOptions = useMemo(
    () => (allCategories ?? []).filter((c) => c.categoryName !== null),
    [allCategories],
  )
  const histogram = useMemo(() => computeDeadStockHistogram(data, Number(days)), [data, days])
  const sorted = useMemo(() => {
    if (!data) return []
    return [...data].sort((a, b) => {
      const cmp = sortKey === "costPrice"
        ? a.costPrice - b.costPrice
        : a.daysInStock - b.daysInStock
      return sortDir === "desc" ? -cmp : cmp
    })
  }, [data, sortKey, sortDir])
  const resetPage = () => setDsPage(0)
  const totalDsElements = sorted.length
  const totalDsPages = Math.max(1, Math.ceil(totalDsElements / dsPageSize))
  const dsData = useMemo(() => {
    return sorted.slice(dsPage * dsPageSize, (dsPage + 1) * dsPageSize)
  }, [sorted, dsPage])
  return (
    <div className="space-y-3">
      <div className="flex gap-3 items-end flex-wrap">
        <div className="space-y-1 w-28">
          <Label htmlFor="d-days">{t('dashboard.deadStock.overDays')}</Label>
          <Input id="d-days" type="number" min={1} value={days} onChange={(e) => { setDays(e.target.value); resetPage() }} />
        </div>
        <div className="space-y-1 w-48">
          <Label htmlFor="d-keyword">{t('dashboard.deadStock.search')}</Label>
          <Input id="d-keyword" placeholder={t('dashboard.deadStock.searchPlaceholder')} value={keyword} onChange={(e) => { setKeyword(e.target.value); resetPage() }} />
        </div>
        <div className="space-y-1 w-44">
          <Label htmlFor="d-cat">{t('dashboard.deadStock.category')}</Label>
          <select
            id="d-cat"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            value={categoryId ?? ""}
            onChange={(e) => { setCategoryId(e.target.value ? Number(e.target.value) : undefined); resetPage() }}
          >
            <option value="">{t('dashboard.deadStock.allCategories')}</option>
            {catOptions.map((c) => (
              <option key={c.categoryId} value={c.categoryId ?? ""}>
                {c.categoryName}
              </option>
            ))}
          </select>
        </div>
      </div>
      {histogram.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">{t('dashboard.deadStock.distribution')}</CardTitle></CardHeader>
          <CardContent>
            <ChartContainer config={histogramConfig} className="aspect-auto h-40">
              <BarChart data={histogram} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="range" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={11} allowDecimals={false} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Bar dataKey="count" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
      <DataTable<DeadStockItem>
        columns={[
          { header: t('table.sku'), render: (i) => <span className="font-mono text-xs">{i.productSku}</span> },
          { header: t('table.product'), render: (i) => <span className="text-sm">{i.productName}</span> },
          { header: t('dashboard.deadStock.serial'), render: (i) => <span className="font-mono text-xs">{i.serialNumber ?? "—"}</span> },
          { header: t('dashboard.deadStock.importDate'), render: (i) => <span className="text-sm">{formatDateVN(i.importedAt)}</span> },
          { header: t('dashboard.deadStock.days'), sortKey: "daysInStock", className: "text-right", render: (i) => <span className="tabular-nums">{i.daysInStock}</span> },
          { header: t('dashboard.deadStock.costPrice'), sortKey: "costPrice", className: "text-right", render: (i) => <span className="tabular-nums">{i.costPrice?.toLocaleString("vi-VN") ?? "0"}₫</span> },
          { header: "", render: (i) => (
            <Button variant="outline" size="sm" className="text-xs h-7 px-2" asChild>
              <a href={`/products/${i.productId}`}>{t('dashboard.deadStock.handle')}</a>
            </Button>
          )},
        ]}
        data={dsData}
        isLoading={isLoading}
        emptyMessage={t('dashboard.deadStock.empty')}
        totalElements={totalDsElements}
        page={dsPage}
        totalPages={totalDsPages}
        onPageChange={(p) => setDsPage(p)}
        sort={{ key: sortKey, dir: sortDir }}
        onSort={(key) => {
          if (sortKey === key) { setSortDir((d) => (d === "desc" ? "asc" : "desc")); resetPage() }
          else { setSortKey(key as DeadSortKey); setSortDir("desc"); resetPage() }
        }}
      />
    </div>
  )
}
