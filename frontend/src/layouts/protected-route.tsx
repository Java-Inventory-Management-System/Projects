import { Navigate, Outlet, useLocation } from "react-router-dom"
import { useAuthStore } from "@/store/auth-store"
import { AUTH_ENABLED } from "@/utils/http-client"

export function ProtectedRoute() {
  const user = useAuthStore((s) => s.user)
  const location = useLocation()

  if (!AUTH_ENABLED) return <Outlet />
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}
