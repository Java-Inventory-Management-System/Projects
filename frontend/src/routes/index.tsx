/* eslint-disable react-refresh/only-export-components */
import { lazy, Suspense } from "react"
import { Navigate, createBrowserRouter } from "react-router-dom"
import type { ReactNode } from "react"
import { AppShell } from "@/layouts/app-shell"
import { ProtectedRoute } from "@/layouts/protected-route"
import { ErrorBoundary } from "@/components/ui/error-boundary"
import { PageSkeleton } from "@/components/ui/page-skeleton"
import { useAuthStore } from "@/store/auth-store"
import type { URole } from "@/utils/types"
import { ROLES } from "@/utils/permissions"

const LoginPage = lazy(() => import("@/features/auth/pages/login-page").then((m) => ({ default: m.LoginPage })))
const DashboardPage = lazy(() => import("@/features/dashboard/pages/dashboard-page").then((m) => ({ default: m.DashboardPage })))
const ProductsPage = lazy(() => import("@/features/products/pages/products-page").then((m) => ({ default: m.ProductsPage })))
const ProductCreatePage = lazy(() => import("@/features/products/pages/product-create-page").then((m) => ({ default: m.ProductCreatePage })))
const ProductEditPage = lazy(() => import("@/features/products/pages/product-edit-page").then((m) => ({ default: m.ProductEditPage })))
const BrandsPage = lazy(() => import("@/features/products/pages/brands-page").then((m) => ({ default: m.BrandsPage })))
const CategoriesPage = lazy(() => import("@/features/products/pages/categories-page").then((m) => ({ default: m.CategoriesPage })))
const SuppliersPage = lazy(() => import("@/features/products/pages/suppliers-page").then((m) => ({ default: m.SuppliersPage })))
const CustomersPage = lazy(() => import("@/features/products/pages/customers-page").then((m) => ({ default: m.CustomersPage })))
const NotFoundPage = lazy(() => import("@/features/common/pages/not-found-page").then((m) => ({ default: m.NotFoundPage })))
const ForbiddenPage = lazy(() => import("@/features/common/pages/forbidden-page").then((m) => ({ default: m.ForbiddenPage })))
const ImportListPage = lazy(() => import("@/features/stock/pages/import-list-page").then((m) => ({ default: m.ImportListPage })))
const ImportCreatePage = lazy(() => import("@/features/stock/pages/import-create-page").then((m) => ({ default: m.ImportCreatePage })))
const ExportListPage = lazy(() => import("@/features/stock/pages/export-list-page").then((m) => ({ default: m.ExportListPage })))
const ExportCreatePage = lazy(() => import("@/features/stock/pages/export-create-page").then((m) => ({ default: m.ExportCreatePage })))
const StockCheckListPage = lazy(() => import("@/features/stock/pages/stock-check-list-page").then((m) => ({ default: m.StockCheckListPage })))
const StockCheckCreatePage = lazy(() => import("@/features/stock/pages/stock-check-create-page").then((m) => ({ default: m.StockCheckCreatePage })))
const StockCheckDetailPage = lazy(() => import("@/features/stock/pages/stock-check-detail-page").then((m) => ({ default: m.StockCheckDetailPage })))
const StockAdjustmentListPage = lazy(() => import("@/features/stock/pages/stock-adjustment-list-page").then((m) => ({ default: m.StockAdjustmentListPage })))
const StockAdjustmentCreatePage = lazy(() => import("@/features/stock/pages/stock-adjustment-create-page").then((m) => ({ default: m.StockAdjustmentCreatePage })))
const StockAdjustmentDetailPage = lazy(() => import("@/features/stock/pages/stock-adjustment-detail-page").then((m) => ({ default: m.StockAdjustmentDetailPage })))
const ImportDetailPage = lazy(() => import("@/features/stock/pages/import-detail-page").then((m) => ({ default: m.ImportDetailPage })))
const ExportDetailPage = lazy(() => import("@/features/stock/pages/export-detail-page").then((m) => ({ default: m.ExportDetailPage })))
const PriceAdjustmentListPage = lazy(() => import("@/features/stock/pages/price-adjustment-list-page").then((m) => ({ default: m.PriceAdjustmentListPage })))
const PriceAdjustmentCreatePage = lazy(() => import("@/features/stock/pages/price-adjustment-create-page").then((m) => ({ default: m.PriceAdjustmentCreatePage })))
const PriceAdjustmentDetailPage = lazy(() => import("@/features/stock/pages/price-adjustment-detail-page").then((m) => ({ default: m.PriceAdjustmentDetailPage })))
const POListPage = lazy(() => import("@/features/stock/pages/po-list-page").then((m) => ({ default: m.POListPage })))
const POCreatePage = lazy(() => import("@/features/stock/pages/po-create-page").then((m) => ({ default: m.POCreatePage })))
const PODetailPage = lazy(() => import("@/features/stock/pages/po-detail-page").then((m) => ({ default: m.PODetailPage })))
const StockUnitsPage = lazy(() => import("@/features/stock/pages/stock-units-page").then((m) => ({ default: m.StockUnitsPage })))
const UsersPage = lazy(() => import("@/features/admin/pages/users-page").then((m) => ({ default: m.UsersPage })))
const AuditPage = lazy(() => import("@/features/admin/pages/audit-page").then((m) => ({ default: m.AuditPage })))
function PageGuard({ roles, children }: { roles: URole[]; children: ReactNode }) {
  const hasRole = useAuthStore((s) => s.hasRole)
  if (!hasRole(roles)) return <Navigate to="/403" replace />
  return <>{children}</>
}
function RootRedirect() {
  const role = useAuthStore((s) => s.user?.role)
  if (role === "STOCK") return <Navigate to="/stock/units" replace />
  return <DashboardPage />
}

function Lazy({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageSkeleton />}><ErrorBoundary>{children}</ErrorBoundary></Suspense>
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
          { path: "products", element: <Lazy><PageGuard roles={ROLES.ALL_STOCK}><ProductsPage /></PageGuard></Lazy> },
          { path: "products/new", element: <Lazy><PageGuard roles={ROLES.MANAGER}><ProductCreatePage /></PageGuard></Lazy> },
          { path: "products/:id", element: <Lazy><PageGuard roles={ROLES.MANAGER}><ProductEditPage /></PageGuard></Lazy> },
          { path: "brands", element: <Lazy><PageGuard roles={ROLES.ALL_STOCK}><BrandsPage /></PageGuard></Lazy> },
          { path: "categories", element: <Lazy><PageGuard roles={ROLES.ALL_STOCK}><CategoriesPage /></PageGuard></Lazy> },
          { path: "suppliers", element: <Lazy><PageGuard roles={ROLES.ALL_STOCK}><SuppliersPage /></PageGuard></Lazy> },
          { path: "customers", element: <Lazy><PageGuard roles={ROLES.ALL_STOCK}><CustomersPage /></PageGuard></Lazy> },
          { path: "inventory", element: <Navigate to="/stock/units" replace /> },
          { path: "stock/imports", element: <Lazy><PageGuard roles={ROLES.ALL_STOCK}><ImportListPage /></PageGuard></Lazy> },
          { path: "stock/imports/new", element: <Lazy><PageGuard roles={ROLES.ALL_STOCK}><ImportCreatePage /></PageGuard></Lazy> },
          { path: "stock/exports", element: <Lazy><PageGuard roles={ROLES.ALL_STOCK}><ExportListPage /></PageGuard></Lazy> },
          { path: "stock/exports/new", element: <Lazy><PageGuard roles={ROLES.MANAGER_STOCK}><ExportCreatePage /></PageGuard></Lazy> },
          { path: "stock/checks", element: <Lazy><PageGuard roles={ROLES.ALL_STOCK}><StockCheckListPage /></PageGuard></Lazy> },
          { path: "stock/checks/new", element: <Lazy><PageGuard roles={ROLES.MANAGER_STOCK}><StockCheckCreatePage /></PageGuard></Lazy> },
          { path: "stock/checks/:id", element: <Lazy><PageGuard roles={ROLES.ALL_STOCK}><StockCheckDetailPage /></PageGuard></Lazy> },
          { path: "stock/adjustments", element: <Lazy><PageGuard roles={ROLES.ALL_STOCK}><StockAdjustmentListPage /></PageGuard></Lazy> },
          { path: "stock/adjustments/new", element: <Lazy><PageGuard roles={ROLES.MANAGER_STOCK}><StockAdjustmentCreatePage /></PageGuard></Lazy> },
          { path: "stock/adjustments/:id", element: <Lazy><PageGuard roles={ROLES.ALL_STOCK}><StockAdjustmentDetailPage /></PageGuard></Lazy> },
          { path: "stock/imports/:id", element: <Lazy><PageGuard roles={ROLES.ALL_STOCK}><ImportDetailPage /></PageGuard></Lazy> },
          { path: "stock/exports/:id", element: <Lazy><PageGuard roles={ROLES.ALL_STOCK}><ExportDetailPage /></PageGuard></Lazy> },
          { path: "stock/price-adjustments", element: <Lazy><PageGuard roles={ROLES.ALL_STOCK}><PriceAdjustmentListPage /></PageGuard></Lazy> },
          { path: "stock/price-adjustments/new", element: <Lazy><PageGuard roles={ROLES.MANAGER_STOCK}><PriceAdjustmentCreatePage /></PageGuard></Lazy> },
          { path: "stock/price-adjustments/:id", element: <Lazy><PageGuard roles={ROLES.ALL_STOCK}><PriceAdjustmentDetailPage /></PageGuard></Lazy> },
          { path: "stock/purchase-orders", element: <Lazy><PageGuard roles={ROLES.MANAGER}><POListPage /></PageGuard></Lazy> },
          { path: "stock/purchase-orders/new", element: <Lazy><PageGuard roles={ROLES.MANAGER}><POCreatePage /></PageGuard></Lazy> },
          { path: "stock/purchase-orders/:id", element: <Lazy><PageGuard roles={ROLES.MANAGER}><PODetailPage /></PageGuard></Lazy> },
          { path: "reports", element: <Navigate to="/" replace /> },
          { path: "stock/units", element: <Lazy><PageGuard roles={ROLES.ALL_STOCK}><StockUnitsPage /></PageGuard></Lazy> },
          { path: "product-units", element: <Navigate to="/stock/units" replace /> },
          { path: "locations", element: <Navigate to="/stock/units" replace /> },
          { path: "users", element: <Lazy><PageGuard roles={ROLES.ADMIN}><UsersPage /></PageGuard></Lazy> },
          { path: "audit", element: <Lazy><PageGuard roles={ROLES.MANAGER_ADMIN}><AuditPage /></PageGuard></Lazy> },
        ],
      },
    ],
  },
  {
    path: "/403",
    element: <Lazy><ForbiddenPage /></Lazy>,
  },
  {
    path: "*",
    element: <Lazy><NotFoundPage /></Lazy>,
  },
])
