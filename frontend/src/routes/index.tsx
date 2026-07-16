/* eslint-disable react-refresh/only-export-components */
import { lazy, Suspense } from "react"
import { Navigate, createBrowserRouter } from "react-router-dom"
import type { ReactNode } from "react"
import { AppShell } from "@/layouts/app-shell"
import { ProtectedRoute } from "@/layouts/protected-route"

const LoginPage = lazy(() => import("@/features/auth/pages/login-page").then((m) => ({ default: m.LoginPage })))
const DashboardPage = lazy(() => import("@/features/dashboard/pages/dashboard-page").then((m) => ({ default: m.DashboardPage })))
const ProductsPage = lazy(() => import("@/features/products/pages/products-page").then((m) => ({ default: m.ProductsPage })))
const InventoryPage = lazy(() => import("@/features/inventory/pages/inventory-page").then((m) => ({ default: m.InventoryPage })))
const NotFoundPage = lazy(() => import("@/features/common/pages/not-found-page").then((m) => ({ default: m.NotFoundPage })))
const ImportListPage = lazy(() => import("@/features/stock/pages/import-list-page").then((m) => ({ default: m.ImportListPage })))
const ImportCreatePage = lazy(() => import("@/features/stock/pages/import-create-page").then((m) => ({ default: m.ImportCreatePage })))
const ExportListPage = lazy(() => import("@/features/stock/pages/export-list-page").then((m) => ({ default: m.ExportListPage })))
const ExportCreatePage = lazy(() => import("@/features/stock/pages/export-create-page").then((m) => ({ default: m.ExportCreatePage })))
const StockCheckListPage = lazy(() => import("@/features/stock/pages/stock-check-list-page").then((m) => ({ default: m.StockCheckListPage })))
const StockCheckCreatePage = lazy(() => import("@/features/stock/pages/stock-check-create-page").then((m) => ({ default: m.StockCheckCreatePage })))
const StockCheckDetailPage = lazy(() => import("@/features/stock/pages/stock-check-detail-page").then((m) => ({ default: m.StockCheckDetailPage })))
const ProductUnitListPage = lazy(() => import("@/features/stock/pages/product-unit-list-page").then((m) => ({ default: m.ProductUnitListPage })))
const LocationsPage = lazy(() => import("@/features/stock/pages/locations-page").then((m) => ({ default: m.LocationsPage })))
const LocationsMapPage = lazy(() => import("@/features/stock/pages/locations-map-page").then((m) => ({ default: m.LocationsMapPage })))
const UsersPage = lazy(() => import("@/features/admin/pages/users-page").then((m) => ({ default: m.UsersPage })))
const AuditPage = lazy(() => import("@/features/admin/pages/audit-page").then((m) => ({ default: m.AuditPage })))

import { useAuthStore } from "@/store/auth-store"
import type { URole } from "@/utils/types"
const ForbiddenPage = lazy(() => import("@/features/common/pages/forbidden-page").then((m) => ({ default: m.ForbiddenPage })))
function PageGuard({ roles, children }: { roles: URole[]; children: ReactNode }) {
  const hasRole = useAuthStore((s) => s.hasRole)
  if (!hasRole(roles)) return <Navigate to="/403" replace />
  return <>{children}</>
}
function RootRedirect() {
  const role = useAuthStore((s) => s.user?.role)
  if (role === "STOCK") return <Navigate to="/inventory" replace />
  return <DashboardPage />
}
const adminManagerStock = ["ADMIN", "MANAGER", "STOCK"] as URole[]
const adminManager = ["ADMIN", "MANAGER"] as URole[]

function Placeholder({ title }: { title: string }) {
  return <PlaceholderContent title={title} />
}

function PlaceholderContent({ title }: { title: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <p className="text-sm text-muted-foreground">{title} &mdash; coming soon</p>
    </div>
  )
}

function Lazy({ children }: { children: ReactNode }) {
  return <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><p className="text-sm text-muted-foreground">Loading...</p></div>}>{children}</Suspense>
}

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <Lazy><LoginPage /></Lazy>,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <Lazy><RootRedirect /></Lazy> },
          { path: "products", element: <Lazy><PageGuard roles={adminManagerStock}><ProductsPage /></PageGuard></Lazy> },
          { path: "inventory", element: <Lazy><PageGuard roles={adminManagerStock}><InventoryPage /></PageGuard></Lazy> },
          { path: "stock/imports", element: <Lazy><PageGuard roles={adminManagerStock}><ImportListPage /></PageGuard></Lazy> },
          { path: "stock/imports/new", element: <Lazy><PageGuard roles={adminManagerStock}><ImportCreatePage /></PageGuard></Lazy> },
          { path: "stock/exports", element: <Lazy><PageGuard roles={adminManagerStock}><ExportListPage /></PageGuard></Lazy> },
          { path: "stock/exports/new", element: <Lazy><PageGuard roles={adminManagerStock}><ExportCreatePage /></PageGuard></Lazy> },
          { path: "stock/checks", element: <Lazy><PageGuard roles={adminManagerStock}><StockCheckListPage /></PageGuard></Lazy> },
          { path: "stock/checks/new", element: <Lazy><PageGuard roles={adminManagerStock}><StockCheckCreatePage /></PageGuard></Lazy> },
          { path: "stock/checks/:id", element: <Lazy><PageGuard roles={adminManagerStock}><StockCheckDetailPage /></PageGuard></Lazy> },
          { path: "product-units", element: <Lazy><PageGuard roles={adminManagerStock}><ProductUnitListPage /></PageGuard></Lazy> },
          { path: "locations", element: <Lazy><PageGuard roles={adminManagerStock}><LocationsPage /></PageGuard></Lazy> },
          { path: "locations/map", element: <Lazy><PageGuard roles={adminManagerStock}><LocationsMapPage /></PageGuard></Lazy> },
          { path: "reports", element: <Placeholder title="Reports" /> },
          { path: "users", element: <Lazy><PageGuard roles={adminManager}><UsersPage /></PageGuard></Lazy> },
          { path: "audit", element: <Lazy><PageGuard roles={adminManager}><AuditPage /></PageGuard></Lazy> },
        ],
      },
    ],
  },
  {
    path: "*",
    element: <Lazy><NotFoundPage /></Lazy>,
  },
])
