import { useState, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { useSearchParams } from "react-router-dom"
import { Search, AlertTriangle, MapPin, Eye } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DataTable, type Column } from "@/components/ui/data-table"
import { Progress } from "@/components/ui/progress"
import { useInventory } from "@/hooks/use-inventory"
import type { InventoryItem } from "@/utils/types"
import { ViewInventoryModal } from "../components/view-inventory-modal"

const isLowStock = (item: InventoryItem) => item.quantity <= item.minStock

export const InventoryPage = () => {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Number(searchParams.get("page") ?? "0")
  const search = searchParams.get("q") ?? ""

  const [searchInput, setSearchInput] = useState(search)
  const [viewItem, setViewItem] = useState<InventoryItem | null>(null)

  const { data: inventoryRes, isLoading: loading } = useInventory(page, 10, search)
  const items = inventoryRes?.content ?? []
  const pagination = inventoryRes?.pagination ?? null

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const next = new URLSearchParams(searchParams)
      for (const [key, val] of Object.entries(updates)) {
        if (val) next.set(key, val)
        else next.delete(key)
      }
      setSearchParams(next)
    },
    [searchParams, setSearchParams],
  )

  const handleSearch = () => updateParams({ q: searchInput || undefined, page: undefined })
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch()
  }

  const columns: Column<InventoryItem>[] = [
    { header: t("form.sku"), render: (item) => <span className="font-mono text-xs">{item.productSku}</span> },
    { header: t("nav.products"), render: (item) => <span className="font-medium">{item.productName}</span> },
    {
      header: t("stockCheck.count"),
      className: "w-[80px] text-right",
      render: (item) => {
        const low = isLowStock(item)
        return (
          <span className={`tabular-nums ${low ? "font-semibold text-red-600 dark:text-red-400" : ""}`}>
            {(item.quantity ?? 0).toLocaleString("vi-VN")}
          </span>
        )
      },
    },
    {
      header: t("inventoryPage.ratio"),
      className: "w-[100px]",
      render: (item) => (
        <Progress
          value={Math.min(100, Math.round((item.quantity / Math.max(1, item.minStock * 2)) * 100))}
          className="h-1.5 w-16"
        />
      ),
    },
    {
      header: t("inventoryPage.min"),
      className: "w-[80px] text-right",
      render: (item) => (
        <span className="tabular-nums text-muted-foreground">{(item.minStock ?? 0).toLocaleString("vi-VN")}</span>
      ),
    },
    {
      header: t("inventoryPage.location"),
      className: "w-[100px]",
      render: (item) => (
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <MapPin className="size-3" />
          {item.location}
        </span>
      ),
    },
    {
      header: t("common.status"),
      className: "w-[90px] text-center",
      render: (item) =>
        isLowStock(item) ? (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="size-3" />
            {t("inventoryPage.outOfStock")}
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="text-green-600 border-green-300 dark:text-green-400 dark:border-green-800"
          >
            {t("badge.inStock")}
          </Badge>
        ),
    },
    {
      header: t("common.actions"),
      className: "w-[70px]",
      render: (item) => (
        <Button variant="ghost" size="icon" onClick={() => setViewItem(item)}>
          <Eye className="size-4" />
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">{t("nav.inventory")}</h1>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("inventoryPage.searchPlaceholder")}
            className="pl-8"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        {search && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchInput("")
              setSearchParams(new URLSearchParams())
            }}
          >
            {t("common.clear")}
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={items}
        isLoading={loading}
        emptyMessage={t("inventoryPage.empty")}
        page={page}
        totalPages={pagination?.totalPages ?? 0}
        totalElements={pagination?.totalElements}
        pageSize={10}
        onPageChange={(p) => updateParams({ page: String(p) })}
      />

      <ViewInventoryModal
        item={viewItem}
        open={!!viewItem}
        onOpenChange={(v) => {
          if (!v) setViewItem(null)
        }}
      />
    </div>
  )
}
