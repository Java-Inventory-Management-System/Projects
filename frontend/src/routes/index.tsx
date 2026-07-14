import { Navigate, createBrowserRouter } from "react-router-dom"
import type { ReactNode } from "react"
import { AppShell } from "@/layouts/app-shell"
import { ProtectedRoute } from "@/layouts/protected-route"
import { useAuthStore } from "@/store/auth-store"
import { LoginPage } from "@/features/auth/pages/login-page"
import { DashboardPage } from "@/features/dashboard/pages/dashboard-page"
import { ProductsPage } from "@/features/products/pages/products-page"
import { InventoryPage } from "@/features/inventory/pages/inventory-page"
import { ForbiddenPage } from "@/features/common/pages/forbidden-page"
import { NotFoundPage } from "@/features/common/pages/not-found-page"
import type { URole } from "@/utils/navigation"

function PageGuard({ roles, children }: { roles: URole[]; children: ReactNode }) {
  const hasRole = useAuthStore((s) => s.hasRole)
  if (!hasRole(roles)) return <Navigate to="/403" replace />
  return <>{children}</>
}

function Placeholder({ title, roles }: { title: string; roles?: URole[] }) {
  if (roles) {
    return <PageGuard roles={roles}><PlaceholderContent title={title} /></PageGuard>
  }
  return <PlaceholderContent title={title} />
}

function PlaceholderContent({ title }: { title: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <p className="text-sm text-muted-foreground">{title} — coming soon</p>
    </div>
  )
}

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/403",
    element: <ForbiddenPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: "products", element: <PageGuard roles={["ADMIN", "MANAGER", "SALES", "STOCK"]}><ProductsPage /></PageGuard> },
          { path: "inventory", element: <PageGuard roles={["ADMIN", "MANAGER", "STOCK"]}><InventoryPage /></PageGuard> },
          { path: "reports", element: <Placeholder title="Reports" roles={["ADMIN", "MANAGER"]} /> },
          { path: "users", element: <Placeholder title="Users" roles={["ADMIN"]} /> },
          { path: "audit", element: <Placeholder title="Audit" roles={["ADMIN"]} /> },
        ],
      },
    ],
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
])
