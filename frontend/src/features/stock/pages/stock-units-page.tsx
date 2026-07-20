import { useState } from "react"
import { ProductUnitListPage } from "@/features/stock/pages/product-unit-list-page"
import { LocationsMapPage } from "@/features/stock/pages/locations-map-page"
import { InventoryPage } from "@/features/inventory/pages/inventory-page"
import { StockOverviewTab } from "@/features/stock/pages/stock-overview-tab"

const TABS = [
  { key: "overview", label: "Tổng quan" },
  { key: "list", label: "Danh sách" },
  { key: "inventory", label: "Tồn kho" },
  { key: "map", label: "Bản đồ kho" },
] as const

type TabKey = (typeof TABS)[number]["key"]

export function StockUnitsPage() {
  const [tab, setTab] = useState<TabKey>("overview")

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b pb-px">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 text-sm font-medium transition-colors rounded-t-md ${tab === t.key ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === "overview" && <StockOverviewTab />}
      {tab === "list" && <ProductUnitListPage />}
      {tab === "inventory" && <InventoryPage />}
      {tab === "map" && <LocationsMapPage />}
    </div>
  )
}
