import { lazy, Suspense } from "react"
import { useTranslation } from "react-i18next"
import { useSearchParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { PageSkeleton } from "@/components/ui/page-skeleton"
import { ROLES } from "@/utils/permissions"
import { usePermission } from "@/hooks/use-permission"

const SummaryTab = lazy(() =>
  import("@/features/dashboard/components/summary-tab").then((m) => ({ default: m.SummaryTab })),
)
const CategoryTab = lazy(() =>
  import("@/features/dashboard/tabs/category-tab").then((m) => ({ default: m.CategoryTab })),
)
const LowStockTab = lazy(() =>
  import("@/features/dashboard/tabs/low-stock-tab").then((m) => ({ default: m.LowStockTab })),
)
const StockValueTab = lazy(() =>
  import("@/features/dashboard/tabs/stock-value-tab").then((m) => ({ default: m.StockValueTab })),
)
const ActivityTab = lazy(() =>
  import("@/features/dashboard/tabs/activity-tab").then((m) => ({ default: m.ActivityTab })),
)
const DeadStockTab = lazy(() =>
  import("@/features/dashboard/tabs/dead-stock-tab").then((m) => ({ default: m.DeadStockTab })),
)
const StockCheckTab = lazy(() =>
  import("@/features/dashboard/tabs/stock-check-tab").then((m) => ({ default: m.StockCheckTab })),
)

const ALL_TABS = [
  { key: "summary", labelKey: "dashboard.tab.overview", roles: ROLES.CAN_OPERATE },
  { key: "category", labelKey: "dashboard.tab.byCategory", roles: ROLES.CAN_VIEW_REPORTS },
  { key: "low-stock", labelKey: "dashboard.tab.lowStock", roles: ROLES.CAN_VIEW_REPORTS },
  { key: "stock-value", labelKey: "dashboard.tab.stockValue", roles: ROLES.CAN_VIEW_REPORTS },
  { key: "activity", labelKey: "dashboard.tab.activity", roles: ROLES.CAN_VIEW_REPORTS },
  { key: "dead-stock", labelKey: "dashboard.tab.deadStock", roles: ROLES.CAN_VIEW_REPORTS },
  { key: "stock-check", labelKey: "dashboard.tab.stockCheck", roles: ROLES.CAN_VIEW_REPORTS },
] as const

type TabKey = (typeof ALL_TABS)[number]["key"]

type TabProps = { onNavigate?: (tab: TabKey) => void }

const TAB_COMPONENTS: Record<TabKey, React.LazyExoticComponent<(p: TabProps) => React.JSX.Element>> = {
  summary: SummaryTab,
  category: CategoryTab,
  "low-stock": LowStockTab,
  "stock-value": StockValueTab,
  activity: ActivityTab,
  "dead-stock": DeadStockTab,
  "stock-check": StockCheckTab,
}

export const DashboardPage = () => {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const perm = usePermission()
  const visibleTabs = ALL_TABS.filter((tabDef) => perm.hasRole(...tabDef.roles))
  const tab = (searchParams.get("tab") as TabKey | null) ?? "summary"
  const safeTab = visibleTabs.some((t) => t.key === tab) ? tab : (visibleTabs[0]?.key ?? "summary")
  const TabComponent = TAB_COMPONENTS[safeTab]
  const selectTab = (key: TabKey) => setSearchParams((prev) => {
    const next = new URLSearchParams(prev)
    next.set("tab", key)
    return next
  })

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight">{t('dashboard.title')}</h1>
      <div className="flex flex-wrap gap-1 border-b pb-px">
        {visibleTabs.map((tabDef) => (
          <Button
            key={tabDef.key}
            variant="ghost"
            onClick={() => selectTab(tabDef.key)}
            className={
              "rounded-t-md px-3 py-1.5 h-auto text-sm font-medium hover:bg-transparent " +
              (safeTab === tabDef.key
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground")
            }
          >
            {t(tabDef.labelKey)}
          </Button>
        ))}
      </div>
      <Suspense fallback={<PageSkeleton />}>
        <TabComponent onNavigate={selectTab} />
      </Suspense>
    </div>
  )
}
