import { Outlet, useLocation, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useAuthStore } from "@/store/auth-store"
import { AUTH_ENABLED } from "@/utils/http-client"
import type { URole } from "@/utils/types"
import { cn } from "@/utils/cn"

export interface SectionTab {
  path: string
  labelKey: string
  roles?: URole[]
}

export function SectionTabsLayout({ tabs }: { tabs: SectionTab[] }) {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const visibleTabs = !AUTH_ENABLED
    ? tabs
    : tabs.filter((tab) => !tab.roles || (user && tab.roles.includes(user.role as URole)))

  const matched = visibleTabs.filter((tab) => pathname === tab.path || pathname.startsWith(`${tab.path}/`))
  const activePath = matched.reduce((best, tab) => (tab.path.length > best.path.length ? tab : best), matched[0])?.path

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b pb-px">
        {visibleTabs.map((tab) => (
          <button
            key={tab.path}
            type="button"
            onClick={() => navigate(tab.path)}
            aria-current={activePath === tab.path ? "page" : undefined}
            className={cn(
              "-mb-px rounded-t-md border-b-2 px-3 py-1.5 text-sm font-medium transition-colors",
              activePath === tab.path
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>
      <Outlet />
    </div>
  )
}
