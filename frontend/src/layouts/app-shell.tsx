import { Outlet } from "react-router-dom"
import { Sidebar } from "./sidebar"
import { Topbar } from "./topbar"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Sidebar as MobileSidebar } from "./sidebar"
import { useUIStore } from "@/store/ui-store"

export function AppShell() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed)
  const mobileOpen = useUIStore((s) => s.mobileOpen)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const setMobileOpen = useUIStore((s) => s.setMobileOpen)

  return (
    <div
      className="flex min-h-screen"
      style={
        {
          "--sidebar-w": "240px",
          "--sidebar-w-collapsed": "56px",
        } as React.CSSProperties
      }
    >
      <div
        className="hidden shrink-0 md:block transition-[width] duration-200 ease-out"
        style={{ width: collapsed ? "var(--sidebar-w-collapsed)" : "var(--sidebar-w)" }}
      >
        <div
          className="fixed inset-y-0 left-0 z-30"
          style={{ width: collapsed ? "var(--sidebar-w-collapsed)" : "var(--sidebar-w)" }}
        >
          <Sidebar collapsed={collapsed} onToggle={toggleSidebar} />
        </div>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[240px] p-0">
          <MobileSidebar
            collapsed={false}
            onToggle={() => setMobileOpen(false)}
            onNavigate={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar collapsed={collapsed} onToggle={toggleSidebar} onMobileOpen={() => setMobileOpen(true)} />
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
