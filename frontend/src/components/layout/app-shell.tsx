import { useState } from "react"
import { Outlet } from "react-router-dom"
import { Sidebar } from "./sidebar"
import { Topbar } from "./topbar"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Sidebar as MobileSidebar } from "./sidebar"

export function AppShell() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-screen">
      <div
        style={{
          "--sidebar-w": "240px",
          "--sidebar-w-collapsed": "56px",
        } as React.CSSProperties}
      >
        <div className="hidden md:flex fixed inset-y-0 left-0 z-30">
          <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
        </div>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-[240px] p-0">
            <MobileSidebar collapsed={false} onToggle={() => setMobileOpen(false)} onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>

      <div
        className="flex flex-1 flex-col transition-[margin] duration-200 ease-out"
        style={{ marginLeft: collapsed ? "var(--sidebar-w-collapsed)" : "var(--sidebar-w)" }}
      >
        <Topbar
          collapsed={collapsed}
          onToggle={() => setCollapsed((c) => !c)}
          onMobileOpen={() => setMobileOpen(true)}
        />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
