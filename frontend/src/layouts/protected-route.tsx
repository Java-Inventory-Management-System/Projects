import { Navigate, Outlet, useLocation } from "react-router-dom"
import { useAuthStore, SKIP_AUTH } from "@/store/auth-store"

export function ProtectedRoute() {
  const user = useAuthStore((s) => s.user)
  const location = useLocation()

  if (SKIP_AUTH) return <Outlet />
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}
