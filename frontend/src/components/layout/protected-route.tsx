import { Navigate, Outlet, useLocation } from "react-router-dom"
import { useAuth } from "@/contexts/auth-context"
import type { URole } from "@/lib/navigation"

interface ProtectedRouteProps {
  roles?: URole[]
}

export function ProtectedRoute({ roles }: ProtectedRouteProps) {
  const { isAuthenticated, user, hasRole } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (roles && user && !hasRole(roles)) {
    return <Navigate to="/403" replace />
  }

  return <Outlet />
}
