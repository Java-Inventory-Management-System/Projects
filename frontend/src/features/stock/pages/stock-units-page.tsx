import { useState, lazy, Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuthStore } from "@/store/auth-store"
import { AUTH_ENABLED } from "@/utils/http-client"
import { ROLES } from "@/utils/permissions"

const StockOverviewTab = lazy(() => import("./stock-overview-tab").then((m) => ({ default: m.StockOverviewTab })))
const ProductUnitListPage = lazy(() =>
  import("./product-unit-list-page").then((m) => ({ default: m.ProductUnitListPage })),
)
const InventoryPage = lazy(() =>
  import("@/features/inventory/pages/inventory-page").then((m) => ({ default: m.InventoryPage })),
)
const LocationsMapPage = lazy(() => import("./locations-map-page").then((m) => ({ default: m.LocationsMapPage })))

const TABS = [
  { key: "overview", label: "Tổng quan", roles: ROLES.CAN_VIEW_INVENTORY },
  { key: "list", label: "Danh sách" },
  { key: "inventory", label: "Tồn kho" },
  { key: "map", label: "Bản đồ kho", roles: ROLES.CAN_VIEW_INVENTORY },
] as const

type TabKey = (typeof TABS)[number]["key"]

const TAB_FALLBACK = <Skeleton className="h-96 w-full" />

export function StockUnitsPage() {
  const user = useAuthStore((s) => s.user)

  const availableTabs = TABS.filter((t) => !AUTH_ENABLED || !t.roles || (user && t.roles.includes(user.role)))
  const [tab, setTab] = useState<TabKey>(availableTabs[0]?.key ?? "list")

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b pb-px">
        {availableTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 text-sm font-medium transition-colors rounded-t-md ${tab === t.key ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "overview" && availableTabs.some((t) => t.key === "overview") && (
        <Suspense fallback={TAB_FALLBACK}>
          <StockOverviewTab />
        </Suspense>
      )}
      {tab === "list" && (
        <Suspense fallback={TAB_FALLBACK}>
          <ProductUnitListPage />
        </Suspense>
      )}
      {tab === "inventory" && (
        <Suspense fallback={TAB_FALLBACK}>
          <InventoryPage />
        </Suspense>
      )}
      {tab === "map" && availableTabs.some((t) => t.key === "map") && (
        <Suspense fallback={TAB_FALLBACK}>
          <LocationsMapPage />
        </Suspense>
      )}
    </div>
  )
}
