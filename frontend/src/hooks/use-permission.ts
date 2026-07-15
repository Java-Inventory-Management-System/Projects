import { useAuthStore } from "@/store/auth-store"
import { useCallback } from "react"

export function usePermission() {
  const user = useAuthStore((s) => s.user)

  const hasRole = useCallback(
    (...roles: string[]) => !!user && roles.includes(user.role),
    [user],
  )

  const canCancel = useCallback(
    () => hasRole("MANAGER", "ADMIN"),
    [hasRole],
  )

  const canApprove = useCallback(
    (status: string) => (hasRole("MANAGER", "ADMIN") && status === "PENDING_APPROVAL"),
    [hasRole],
  )

  const isAdmin = useCallback(
    () => hasRole("ADMIN"),
    [hasRole],
  )

  const canManageStock = useCallback(
    () => hasRole("ADMIN", "MANAGER", "STOCK"),
    [hasRole],
  )

  return { user, hasRole, canCancel, canApprove, isAdmin, canManageStock }
}
