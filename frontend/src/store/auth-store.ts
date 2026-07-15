import { create } from "zustand"
import type { URole } from "@/utils/types"
import { login as loginApi } from "@/services/auth-service"
import { getUserById } from "@/services/user-service"
import { clearToken } from "@/utils/http-client"

interface User {
  id: string
  username: string
  role: URole
  displayName: string
}

interface AuthState {
  user: User | null
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  hasRole: (roles: URole[]) => boolean
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: false,

  login: async (username: string, password: string) => {
    set({ isLoading: true })
    try {
      const jwt = await loginApi({ username, password })
      const userRes = await getUserById(jwt.userId)
      set({
        user: {
          id: String(userRes.id),
          username: userRes.username,
          role: userRes.role as URole,
          displayName: userRes.fullName || userRes.username,
        },
      })
    } finally {
      set({ isLoading: false })
    }
  },

  logout: () => {
    clearToken()
    set({ user: null })
    window.location.href = "/login"
  },

  hasRole: (roles: URole[]) => {
    const user = get().user
    if (!user) return false
    return roles.includes(user.role)
  },
}))
