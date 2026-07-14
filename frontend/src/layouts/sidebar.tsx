import { NavLink } from "react-router-dom"
import { cn } from "@/utils/cn"
import { useAuthStore } from "@/store/auth-store"
import { filterNavItems, navSections } from "@/utils/navigation"

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  onNavigate?: () => void
}

export function Sidebar({ collapsed, onNavigate }: SidebarProps) {
  const user = useAuthStore((s) => s.user)
  if (!user) return null

  const visibleSections = navSections
    .map((s) => ({ ...s, items: filterNavItems(s.items, user.role) }))
    .filter((s) => s.items.length > 0)

  return (
    <aside
      data-collapsed={collapsed}
      className="bg-sidebar text-sidebar-foreground flex h-full flex-col border-r transition-[width] duration-200 ease-out"
      style={{ width: collapsed ? "var(--sidebar-w-collapsed)" : "var(--sidebar-w)" }}
    >
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <div className="flex size-7 items-center justify-center rounded bg-primary text-[10px] font-bold text-primary-foreground leading-none">
          W
        </div>
        {!collapsed && (
          <span className="text-sm font-semibold tracking-tight">Warehouse</span>
        )}
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto p-2">
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
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      )
                    }
                  >
                    <Icon className="size-4 shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
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
