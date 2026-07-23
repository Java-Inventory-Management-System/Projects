import { useAuthStore } from "@/store/auth-store"
import { useCallback } from "react"
import { ROLES } from "@/utils/permissions"
import type { URole } from "@/utils/types"

export function usePermission() {
  const user = useAuthStore((s) => s.user)

  const hasRole = useCallback((...roles: URole[]) => !!user && roles.includes(user.role), [user])

  const canCancel = useCallback(() => hasRole(...ROLES.MANAGER_ADMIN), [hasRole])

  const canApprove = useCallback(
    () => hasRole(...ROLES.MANAGER_ADMIN),
    [hasRole],
  )

  const isAdmin = useCallback(() => hasRole(...ROLES.ADMIN), [hasRole])

  const canManageStock = useCallback(() => hasRole(...ROLES.ALL_STOCK), [hasRole])

  return { user, hasRole, canCancel, canApprove, isAdmin, canManageStock }
}
