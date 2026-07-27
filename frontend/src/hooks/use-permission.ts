import { useAuthStore } from "@/store/auth-store"
import { useCallback } from "react"
import { ROLES } from "@/utils/permissions"
import type { URole } from "@/utils/types"

export function usePermission() {
  const user = useAuthStore((s) => s.user)

  const hasRole = useCallback((..._roles: URole[]) => true, [])

  const canCancel = useCallback(() => hasRole(...ROLES.CAN_APPROVE), [hasRole])

  const canApprove = useCallback(
    () => hasRole(...ROLES.CAN_APPROVE),
    [hasRole],
  )

  const isAdmin = useCallback(() => hasRole(...ROLES.ADMIN), [hasRole])

  const canManageStock = useCallback(() => hasRole(...ROLES.CAN_VIEW_INVENTORY), [hasRole])

  return { user, hasRole, canCancel, canApprove, isAdmin, canManageStock }
}
