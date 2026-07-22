/* eslint-disable react-refresh/only-export-components */
import { lazy, Suspense } from "react"
import { Navigate, createBrowserRouter } from "react-router-dom"
import type { ComponentType, ReactNode } from "react"
import { AppShell } from "@/layouts/app-shell"
import { ProtectedRoute } from "@/layouts/protected-route"
import { ErrorBoundary } from "@/components/ui/error-boundary"
import { PageSkeleton } from "@/components/ui/page-skeleton"
import { useAuthStore } from "@/store/auth-store"
import type { URole } from "@/utils/types"
import { ROLES } from "@/utils/permissions"

function lazyPage<T extends ComponentType>(importFn: () => Promise<Record<string, T>>, name: string) {
  return lazy(() => importFn().then((m) => ({ default: m[name] })))
}

const LoginPage = lazyPage(() => import("@/features/auth/pages/login-page"), "LoginPage")
const DashboardPage = lazyPage(() => import("@/features/dashboard/pages/dashboard-page"), "DashboardPage")
const ProductsPage = lazyPage(() => import("@/features/products/pages/products-page"), "ProductsPage")
const ProductCreatePage = lazyPage(() => import("@/features/products/pages/product-create-page"), "ProductCreatePage")
const ProductEditPage = lazyPage(() => import("@/features/products/pages/product-edit-page"), "ProductEditPage")
const BrandsPage = lazyPage(() => import("@/features/products/pages/brands-page"), "BrandsPage")
const CategoriesPage = lazyPage(() => import("@/features/products/pages/categories-page"), "CategoriesPage")
const SuppliersPage = lazyPage(() => import("@/features/products/pages/suppliers-page"), "SuppliersPage")
const CustomersPage = lazyPage(() => import("@/features/products/pages/customers-page"), "CustomersPage")
const NotFoundPage = lazyPage(() => import("@/features/common/pages/not-found-page"), "NotFoundPage")
const ForbiddenPage = lazyPage(() => import("@/features/common/pages/forbidden-page"), "ForbiddenPage")
const ImportListPage = lazyPage(() => import("@/features/stock/pages/import-list-page"), "ImportListPage")
const ImportCreatePage = lazyPage(() => import("@/features/stock/pages/import-create-page"), "ImportCreatePage")
const ExportListPage = lazyPage(() => import("@/features/stock/pages/export-list-page"), "ExportListPage")
const ExportCreatePage = lazyPage(() => import("@/features/stock/pages/export-create-page"), "ExportCreatePage")
const StockCheckListPage = lazyPage(() => import("@/features/stock/pages/stock-check-list-page"), "StockCheckListPage")
const StockCheckCreatePage = lazyPage(() => import("@/features/stock/pages/stock-check-create-page"), "StockCheckCreatePage")
const StockCheckDetailPage = lazyPage(() => import("@/features/stock/pages/stock-check-detail-page"), "StockCheckDetailPage")
const StockAdjustmentListPage = lazyPage(() => import("@/features/stock/pages/stock-adjustment-list-page"), "StockAdjustmentListPage")
const StockAdjustmentCreatePage = lazyPage(() => import("@/features/stock/pages/stock-adjustment-create-page"), "StockAdjustmentCreatePage")
const StockAdjustmentDetailPage = lazyPage(() => import("@/features/stock/pages/stock-adjustment-detail-page"), "StockAdjustmentDetailPage")
const ImportDetailPage = lazyPage(() => import("@/features/stock/pages/import-detail-page"), "ImportDetailPage")
const ExportDetailPage = lazyPage(() => import("@/features/stock/pages/export-detail-page"), "ExportDetailPage")
const PriceAdjustmentListPage = lazyPage(() => import("@/features/stock/pages/price-adjustment-list-page"), "PriceAdjustmentListPage")
const PriceAdjustmentCreatePage = lazyPage(() => import("@/features/stock/pages/price-adjustment-create-page"), "PriceAdjustmentCreatePage")
const PriceAdjustmentDetailPage = lazyPage(() => import("@/features/stock/pages/price-adjustment-detail-page"), "PriceAdjustmentDetailPage")
const POListPage = lazyPage(() => import("@/features/stock/pages/po-list-page"), "POListPage")
const POCreatePage = lazyPage(() => import("@/features/stock/pages/po-create-page"), "POCreatePage")
const PODetailPage = lazyPage(() => import("@/features/stock/pages/po-detail-page"), "PODetailPage")
const StockUnitsPage = lazyPage(() => import("@/features/stock/pages/stock-units-page"), "StockUnitsPage")
const UsersPage = lazyPage(() => import("@/features/admin/pages/users-page"), "UsersPage")
const AuditPage = lazyPage(() => import("@/features/admin/pages/audit-page"), "AuditPage")
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
