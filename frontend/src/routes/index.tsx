/* eslint-disable react-refresh/only-export-components */
import { lazy, Suspense } from "react"
import { Navigate, createBrowserRouter, useParams } from "react-router-dom"
import type { ComponentType, ReactNode } from "react"
import { AppShell } from "@/layouts/app-shell"
import { ProtectedRoute } from "@/layouts/protected-route"
import { ErrorBoundary } from "@/components/ui/error-boundary"
import { PageSkeleton } from "@/components/ui/page-skeleton"
import { SectionTabsLayout } from "@/features/stock/components/section-tabs-layout"
import { useAuthStore } from "@/store/auth-store"
import { AUTH_ENABLED } from "@/utils/http-client"
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
const DefectCategoriesPage = lazyPage(() => import("@/features/products/pages/defect-categories-page"), "DefectCategoriesPage")
const SuppliersPage = lazyPage(() => import("@/features/products/pages/suppliers-page"), "SuppliersPage")
const CustomersPage = lazyPage(() => import("@/features/products/pages/customers-page"), "CustomersPage")
const NotFoundPage = lazyPage(() => import("@/features/common/pages/not-found-page"), "NotFoundPage")
const ForbiddenPage = lazyPage(() => import("@/features/common/pages/forbidden-page"), "ForbiddenPage")
const ImportListPage = lazyPage(() => import("@/features/stock/pages/import-list-page"), "ImportListPage")
const ImportCreatePage = lazyPage(() => import("@/features/stock/pages/import-create-page"), "ImportCreatePage")
const ExportListPage = lazyPage(() => import("@/features/stock/pages/export-list-page"), "ExportListPage")
const ExportProposalPage = lazyPage(() => import("@/features/stock/pages/export-proposal-page"), "ExportProposalPage")
const ExportFulfillPage = lazyPage(() => import("@/features/stock/pages/export-fulfill-page"), "ExportFulfillPage")
const StockCheckListPage = lazyPage(() => import("@/features/stock/pages/stock-check-list-page"), "StockCheckListPage")
const StockCheckCreatePage = lazyPage(
  () => import("@/features/stock/pages/stock-check-create-page"),
  "StockCheckCreatePage",
)
const StockCheckDetailPage = lazyPage(
  () => import("@/features/stock/pages/stock-check-detail-page"),
  "StockCheckDetailPage",
)
const StockAdjustmentListPage = lazyPage(
  () => import("@/features/stock/pages/stock-adjustment-list-page"),
  "StockAdjustmentListPage",
)
const StockAdjustmentCreatePage = lazyPage(
  () => import("@/features/stock/pages/stock-adjustment-create-page"),
  "StockAdjustmentCreatePage",
)
const StockAdjustmentDetailPage = lazyPage(
  () => import("@/features/stock/pages/stock-adjustment-detail-page"),
  "StockAdjustmentDetailPage",
)
const ImportDetailPage = lazyPage(() => import("@/features/stock/pages/import-detail-page"), "ImportDetailPage")
const ExportDetailPage = lazyPage(() => import("@/features/stock/pages/export-detail-page"), "ExportDetailPage")
const PriceAdjustmentListPage = lazyPage(
  () => import("@/features/stock/pages/price-adjustment-list-page"),
  "PriceAdjustmentListPage",
)
const PriceAdjustmentCreatePage = lazyPage(
  () => import("@/features/stock/pages/price-adjustment-create-page"),
  "PriceAdjustmentCreatePage",
)
const PriceAdjustmentDetailPage = lazyPage(
  () => import("@/features/stock/pages/price-adjustment-detail-page"),
  "PriceAdjustmentDetailPage",
)
const POListPage = lazyPage(() => import("@/features/stock/pages/po-list-page"), "POListPage")
const ReturnListPage = lazyPage(() => import("@/features/stock/pages/return-list-page"), "ReturnListPage")
const ReturnCreatePage = lazyPage(() => import("@/features/stock/pages/return-create-page"), "ReturnCreatePage")
const ReturnDetailPage = lazyPage(() => import("@/features/stock/pages/return-detail-page"), "ReturnDetailPage")
const QcProcessingPage = lazyPage(() => import("@/features/stock/pages/qc-processing-page"), "QcProcessingPage")
const POCreatePage = lazyPage(() => import("@/features/stock/pages/po-create-page"), "POCreatePage")
const POEditPage = lazyPage(() => import("@/features/stock/pages/po-edit-page"), "POEditPage")
const PODetailPage = lazyPage(() => import("@/features/stock/pages/po-detail-page"), "PODetailPage")
const StockUnitsPage = lazyPage(() => import("@/features/stock/pages/stock-units-page"), "StockUnitsPage")
const SealBoxPage = lazyPage(() => import("@/features/stock/pages/seal-box-page"), "SealBoxPage")
const ProductUnitDetailPage = lazyPage(() => import("@/features/stock/pages/product-unit-detail-page"), "ProductUnitDetailPage")
const UsersPage = lazyPage(() => import("@/features/admin/pages/users-page"), "UsersPage")
const AuditPage = lazyPage(() => import("@/features/admin/pages/audit-page"), "AuditPage")
function PageGuard({ roles, children }: { roles?: URole[]; children: ReactNode }) {
  const user = useAuthStore((s) => s.user)
  if (!AUTH_ENABLED) return <>{children}</>
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role as URole)) return <Navigate to="/403" replace />
  return <>{children}</>
}

function RedirectTo({ to }: { to: string }) {
  const { id } = useParams()
  return <Navigate to={id ? `${to}/${id}` : to} replace />
}

function Lazy({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ErrorBoundary>{children}</ErrorBoundary>
    </Suspense>
  )
}

export const router = createBrowserRouter([
  {
    path: "/login",
    element: (
      <Lazy>
        <LoginPage />
      </Lazy>
    ),
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          {
            index: true,
            element: (
              <Lazy>
                <DashboardPage />
              </Lazy>
            ),
          },
          {
            path: "products",
            element: (
              <Lazy>
                <PageGuard roles={ROLES.CAN_OPERATE}>
                  <ProductsPage />
                </PageGuard>
              </Lazy>
            ),
          },
          {
            path: "products/new",
            element: (
              <Lazy>
                <PageGuard roles={ROLES.CAN_MANAGE_CATALOG}>
                  <ProductCreatePage />
                </PageGuard>
              </Lazy>
            ),
          },
          {
            path: "products/:id",
            element: (
              <Lazy>
                <PageGuard roles={ROLES.CAN_MANAGE_CATALOG}>
                  <ProductEditPage />
                </PageGuard>
              </Lazy>
            ),
          },
          {
            path: "catalog-settings",
            element: (
              <Lazy>
                <PageGuard roles={ROLES.CAN_MANAGE_CATALOG}>
                  <SectionTabsLayout
                    tabs={[
                      { path: "/catalog-settings/brands", labelKey: "nav.brands" },
                      { path: "/catalog-settings/categories", labelKey: "nav.categories" },
                      { path: "/catalog-settings/defect-categories", labelKey: "nav.defectCategories" },
                      { path: "/catalog-settings/suppliers", labelKey: "nav.suppliers" },
                    ]}
                  />
                </PageGuard>
              </Lazy>
            ),
            children: [
              { index: true, element: <Navigate to="brands" replace /> },
              {
                path: "brands",
                element: (
                  <Lazy>
                    <BrandsPage />
                  </Lazy>
                ),
              },
              {
                path: "categories",
                element: (
                  <Lazy>
                    <CategoriesPage />
                  </Lazy>
                ),
              },
              {
                path: "defect-categories",
                element: (
                  <Lazy>
                    <DefectCategoriesPage />
                  </Lazy>
                ),
              },
              {
                path: "suppliers",
                element: (
                  <Lazy>
                    <SuppliersPage />
                  </Lazy>
                ),
              },
            ],
          },
          { path: "brands", element: <RedirectTo to="/catalog-settings/brands" /> },
          { path: "categories", element: <RedirectTo to="/catalog-settings/categories" /> },
          { path: "defect-categories", element: <RedirectTo to="/catalog-settings/defect-categories" /> },
          { path: "suppliers", element: <RedirectTo to="/catalog-settings/suppliers" /> },
          {
            path: "customers",
            element: (
              <Lazy>
                <PageGuard roles={ROLES.CAN_OPERATE}>
                  <CustomersPage />
                </PageGuard>
              </Lazy>
            ),
          },
          { path: "inventory", element: <Navigate to="/stock/units" replace /> },
          {
            path: "stock/imports",
            element: (
              <Lazy>
                <PageGuard roles={ROLES.CAN_VIEW_INVENTORY}>
                    <SectionTabsLayout
                      tabs={[
                        { path: "/stock/imports/purchase-orders", labelKey: "nav.purchaseOrders", roles: ROLES.MANAGER },
                        { path: "/stock/imports", labelKey: "nav.imports" },
                      ]}
                    />
                </PageGuard>
              </Lazy>
            ),
            children: [
              {
                index: true,
                element: (
                  <Lazy>
                    <ImportListPage />
                  </Lazy>
                ),
              },
              {
                path: "purchase-orders",
                element: (
                  <Lazy>
                    <PageGuard roles={ROLES.MANAGER}>
                      <POListPage />
                    </PageGuard>
                  </Lazy>
                ),
              },
              {
                path: "purchase-orders/new",
                element: (
                  <Lazy>
                    <PageGuard roles={ROLES.MANAGER}>
                      <POCreatePage />
                    </PageGuard>
                  </Lazy>
                ),
              },
              {
                path: "purchase-orders/:id/edit",
                element: (
                  <Lazy>
                    <PageGuard roles={ROLES.MANAGER}>
                      <POEditPage />
                    </PageGuard>
                  </Lazy>
                ),
              },
              {
                path: "purchase-orders/:id",
                element: (
                  <Lazy>
                    <PageGuard roles={ROLES.MANAGER}>
                      <PODetailPage />
                    </PageGuard>
                  </Lazy>
                ),
              },
              {
                path: "new",
                element: (
                  <Lazy>
                    <PageGuard roles={ROLES.MANAGER}>
                      <ImportCreatePage />
                    </PageGuard>
                  </Lazy>
                ),
              },
              {
                path: ":id",
                element: (
                  <Lazy>
                    <PageGuard roles={ROLES.CAN_VIEW_INVENTORY}>
                      <ImportDetailPage />
                    </PageGuard>
                  </Lazy>
                ),
              },
            ],
          },
          {
            path: "stock/exports",
            element: (
              <Lazy>
                <PageGuard roles={ROLES.CAN_OPERATE}>
                  <ExportListPage />
                </PageGuard>
              </Lazy>
            ),
          },
          {
            path: "stock/exports/new",
            element: (
              <Lazy>
                <PageGuard roles={ROLES.CAN_CREATE_TRANSACTION}>
                  <ExportProposalPage />
                </PageGuard>
              </Lazy>
            ),
          },
          {
            path: "stock/exports/:id/fulfill",
            element: (
              <Lazy>
                <PageGuard roles={ROLES.CAN_OPERATE_STOCK}>
                  <ExportFulfillPage />
                </PageGuard>
              </Lazy>
            ),
          },
          {
            path: "stock/ops",
            element: (
              <Lazy>
                <PageGuard roles={ROLES.CAN_VIEW_INVENTORY}>
                  <SectionTabsLayout
                    tabs={[
                      { path: "/stock/ops/checks", labelKey: "nav.stockChecks" },
                      { path: "/stock/ops/adjustments", labelKey: "nav.adjustments" },
                      { path: "/stock/ops/price-adjustments", labelKey: "nav.priceAdj" },
                    ]}
                  />
                </PageGuard>
              </Lazy>
            ),
            children: [
              { index: true, element: <Navigate to="checks" replace /> },
              {
                path: "checks",
                element: (
                  <Lazy>
                    <StockCheckListPage />
                  </Lazy>
                ),
              },
              {
                path: "checks/new",
                element: (
                  <Lazy>
                    <PageGuard roles={ROLES.CAN_OPERATE_STOCK}>
                      <StockCheckCreatePage />
                    </PageGuard>
                  </Lazy>
                ),
              },
              {
                path: "checks/:id",
                element: (
                  <Lazy>
                    <StockCheckDetailPage />
                  </Lazy>
                ),
              },
              {
                path: "adjustments",
                element: (
                  <Lazy>
                    <StockAdjustmentListPage />
                  </Lazy>
                ),
              },
              {
                path: "adjustments/new",
                element: (
                  <Lazy>
                    <PageGuard roles={ROLES.CAN_OPERATE_STOCK}>
                      <StockAdjustmentCreatePage />
                    </PageGuard>
                  </Lazy>
                ),
              },
              {
                path: "adjustments/:id",
                element: (
                  <Lazy>
                    <StockAdjustmentDetailPage />
                  </Lazy>
                ),
              },
              {
                path: "price-adjustments",
                element: (
                  <Lazy>
                    <PriceAdjustmentListPage />
                  </Lazy>
                ),
              },
              {
                path: "price-adjustments/new",
                element: (
                  <Lazy>
                    <PageGuard roles={ROLES.CAN_CREATE_PRICE_ADJUSTMENT}>
                      <PriceAdjustmentCreatePage />
                    </PageGuard>
                  </Lazy>
                ),
              },
              {
                path: "price-adjustments/:id",
                element: (
                  <Lazy>
                    <PriceAdjustmentDetailPage />
                  </Lazy>
                ),
              },
            ],
          },
          {
            path: "stock/exports/:id",
            element: (
              <Lazy>
                <PageGuard roles={ROLES.CAN_OPERATE}>
                  <ExportDetailPage />
                </PageGuard>
              </Lazy>
            ),
          },
          {
            path: "stock/price-adjustments",
            element: <RedirectTo to="/stock/ops/price-adjustments" />,
          },
          {
            path: "stock/price-adjustments/new",
            element: <RedirectTo to="/stock/ops/price-adjustments/new" />,
          },
          {
            path: "stock/price-adjustments/:id",
            element: <RedirectTo to="/stock/ops/price-adjustments" />,
          },
          { path: "stock/purchase-orders", element: <RedirectTo to="/stock/imports/purchase-orders" /> },
          { path: "stock/purchase-orders/new", element: <RedirectTo to="/stock/imports/purchase-orders/new" /> },
          { path: "stock/purchase-orders/:id", element: <RedirectTo to="/stock/imports/purchase-orders" /> },
          { path: "reports", element: <Navigate to="/" replace /> },
          {
            path: "returns-qc",
            element: (
              <Lazy>
                <PageGuard roles={ROLES.CAN_OPERATE}>
                  <SectionTabsLayout
                    tabs={[
                      { path: "/returns-qc/returns", labelKey: "nav.returns" },
                      { path: "/returns-qc/qc", labelKey: "nav.qcProcessing" },
                    ]}
                  />
                </PageGuard>
              </Lazy>
            ),
            children: [
              { index: true, element: <Navigate to="returns" replace /> },
              {
                path: "returns",
                element: (
                  <Lazy>
                    <ReturnListPage />
                  </Lazy>
                ),
              },
              {
                path: "returns/new",
                element: (
                  <Lazy>
                    <PageGuard roles={ROLES.CAN_CREATE_TRANSACTION}>
                      <ReturnCreatePage />
                    </PageGuard>
                  </Lazy>
                ),
              },
              {
                path: "returns/:id",
                element: (
                  <Lazy>
                    <ReturnDetailPage />
                  </Lazy>
                ),
              },
              {
                path: "qc",
                element: (
                  <Lazy>
                    <PageGuard roles={ROLES.CAN_VIEW_QC}>
                      <QcProcessingPage />
                    </PageGuard>
                  </Lazy>
                ),
              },
            ],
          },
          { path: "stock/checks", element: <RedirectTo to="/stock/ops/checks" /> },
          { path: "stock/checks/new", element: <RedirectTo to="/stock/ops/checks/new" /> },
          { path: "stock/checks/:id", element: <RedirectTo to="/stock/ops/checks" /> },
          { path: "stock/adjustments", element: <RedirectTo to="/stock/ops/adjustments" /> },
          { path: "stock/adjustments/new", element: <RedirectTo to="/stock/ops/adjustments/new" /> },
          { path: "stock/adjustments/:id", element: <RedirectTo to="/stock/ops/adjustments" /> },
          { path: "returns", element: <RedirectTo to="/returns-qc/returns" /> },
          { path: "returns/new", element: <RedirectTo to="/returns-qc/returns/new" /> },
          { path: "returns/:id", element: <RedirectTo to="/returns-qc/returns" /> },
          { path: "qc-processing", element: <RedirectTo to="/returns-qc/qc" /> },
          {
            path: "stock/units",
            element: (
              <Lazy>
                <PageGuard roles={ROLES.CAN_OPERATE}>
                  <StockUnitsPage />
                </PageGuard>
              </Lazy>
            ),
            children: [
              {
                path: "box/new",
                element: (
                  <Lazy>
                <PageGuard roles={ROLES.CAN_OPERATE_STOCK}>
                      <SealBoxPage />
                    </PageGuard>
                  </Lazy>
                ),
              },
              {
                path: ":id",
                element: (
                  <Lazy>
                    <PageGuard roles={ROLES.CAN_OPERATE}>
                      <ProductUnitDetailPage />
                    </PageGuard>
                  </Lazy>
                ),
              },
            ],
          },
          { path: "product-units", element: <Navigate to="/stock/units" replace /> },
          { path: "locations", element: <Navigate to="/stock/units" replace /> },
          {
            path: "users",
            element: (
              <Lazy>
                <PageGuard roles={ROLES.ADMIN}>
                  <UsersPage />
                </PageGuard>
              </Lazy>
            ),
          },
          {
            path: "audit",
            element: (
              <Lazy>
                <PageGuard roles={ROLES.CAN_VIEW_REPORTS}>
                  <AuditPage />
                </PageGuard>
              </Lazy>
            ),
          },
        ],
      },
    ],
  },
  {
    path: "/403",
    element: (
      <Lazy>
        <ForbiddenPage />
      </Lazy>
    ),
  },
  {
    path: "*",
    element: (
      <Lazy>
        <NotFoundPage />
      </Lazy>
    ),
  },
])
