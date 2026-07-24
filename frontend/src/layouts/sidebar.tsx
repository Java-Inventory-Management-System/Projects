import { NavLink } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { cn } from "@/utils/cn"
import { useAuthStore } from "@/store/auth-store"
import { filterNavItems, navSections } from "@/utils/navigation"
import { ROLES } from "@/utils/permissions"
import { getImportReceipts } from "@/services/import-service"
import { getExportReceipts } from "@/services/export-service"
import { IMPORT_RECEIPT_STATUS, EXPORT_RECEIPT_STATUS } from "@/utils/types"

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  onNavigate?: () => void
}

export function Sidebar({ collapsed, onNavigate }: SidebarProps) {
  const user = useAuthStore((s) => s.user)
  const userRole = useAuthStore((s) => s.user?.role)
  if (!user) return null

  const visibleSections = navSections
    .map((s) => ({ ...s, items: filterNavItems(s.items, user.role) }))
    .filter((s) => s.items.length > 0)

  const { data: importPending } = useQuery({
    queryKey: ["import-pending-count"],
    queryFn: async () => {
      const r = await getImportReceipts(0, 1, undefined, IMPORT_RECEIPT_STATUS.PENDING_APPROVAL)
      return r.pagination.totalElements
    },
    enabled: userRole ? ROLES.CAN_VIEW_INVENTORY.includes(userRole) : false,
    staleTime: 60_000,
  })

  const { data: exportPending } = useQuery({
    queryKey: ["export-pending-count"],
    queryFn: async () => {
      const r = await getExportReceipts(0, 1, undefined, EXPORT_RECEIPT_STATUS.PENDING_APPROVAL)
      return r.pagination.totalElements
    },
    staleTime: 60_000,
  })

  const badgeCount: Record<string, number> = {}
  if (importPending && importPending > 0) badgeCount["/stock/imports"] = importPending
  if (exportPending && exportPending > 0) badgeCount["/stock/exports"] = exportPending

  return (
    <aside
      aria-label="Sidebar"
      data-collapsed={collapsed}
      className="bg-sidebar text-sidebar-foreground flex h-full flex-col border-r transition-[width] duration-200 ease-out"
      style={{ width: collapsed ? "var(--sidebar-w-collapsed)" : "var(--sidebar-w)" }}
    >
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <div className="flex size-7 items-center justify-center rounded bg-primary text-[10px] font-bold text-primary-foreground leading-none">
          W
        </div>
        {!collapsed && <span className="text-sm font-semibold tracking-tight">Warehouse</span>}
      </div>

      <nav aria-label="Main navigation" className="flex-1 space-y-2 overflow-y-auto p-2">
        {visibleSections.map((section, si) => (
          <div key={si}>
            {si > 0 && <div className="border-t border-sidebar-border mx-2" />}
            <div className={cn("space-y-1", si > 0 && "pt-2")}>
              {section.items.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === "/"}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors relative",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      )
                    }
                  >
                    <Icon className="size-4 shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="flex-1">{item.label}</span>
                        {badgeCount[item.path] && (
                          <span className="flex size-5 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground leading-none">
                            {badgeCount[item.path]}
                          </span>
                        )}
                      </>
                    )}
                    {collapsed && badgeCount[item.path] && (
                      <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-semibold text-destructive-foreground leading-none">
                        {badgeCount[item.path]}
                      </span>
                    )}
                  </NavLink>
                )
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  )
}
