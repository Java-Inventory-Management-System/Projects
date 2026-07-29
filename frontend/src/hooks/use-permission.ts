import { useAuthStore } from "@/store/auth-store"
import { AUTH_ENABLED } from "@/utils/http-client"
import { useCallback } from "react"
import { ROLES } from "@/utils/permissions"
import type { URole } from "@/utils/types"

export function usePermission() {
  const user = useAuthStore((s) => s.user)

  const hasRole = useCallback((...roles: URole[]) => {
    if (!AUTH_ENABLED) return true
    if (!user) return false
    return roles.includes(user.role)
  }, [user])

  const canCancel = useCallback(() => hasRole(...ROLES.CAN_APPROVE), [hasRole])

  const canApprove = useCallback(
    (adj?: { createdBy?: number | null; status?: string }) => {
      if (!AUTH_ENABLED) return adj ? adj.status === "PENDING" : true
      const hasApproveRole = hasRole(...ROLES.CAN_APPROVE)
      if (!adj) return hasApproveRole
      return hasApproveRole && adj.status === "PENDING" && adj.createdBy !== user?.id
    },
    [hasRole, user],
  )

  const isAdmin = useCallback(() => hasRole(...ROLES.ADMIN), [hasRole])

  const canManageStock = useCallback(() => hasRole(...ROLES.CAN_VIEW_INVENTORY), [hasRole])

  return { user, hasRole, canCancel, canApprove, isAdmin, canManageStock }
}
