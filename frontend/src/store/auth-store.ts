import { create } from "zustand"
import type { URole } from "@/utils/types"
import { login as loginApi, logout as logoutApi } from "@/services/auth-service"
import { clearToken } from "@/utils/http-client"
import { jwtDecode } from "@/utils/jwt"

interface User {
  id: string
  username: string
  role: URole
  displayName: string
}

interface JwtPayload {
  id: number
  username: string
  fullName: string
  role: string
}

interface AuthState {
  user: User | null
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  hasRole: (roles: URole[]) => boolean
}

function mapUser(raw: { id: number; username: string; fullName: string; role: string }): User {
  return { id: String(raw.id), username: raw.username, role: raw.role as URole, displayName: raw.fullName || raw.username }
}

function restoreUser(): User | null {
  try {
    const token = localStorage.getItem("accessToken")
    if (!token) return null
    const payload = jwtDecode<JwtPayload>(token)
    if (!payload?.id) return null
    const now = Date.now() / 1000
    const exp = JSON.parse(atob(token.split(".")[1])).exp
    if (exp && exp < now) return null
    return mapUser(payload)
  } catch {
    clearToken()
    return null
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: restoreUser(),
  isLoading: false,

  login: async (username: string, password: string) => {
    set({ isLoading: true })
    try {
      const jwt = await loginApi({ username, password })
      const payload = jwtDecode<JwtPayload>(jwt.accessToken)
      set({ user: mapUser(payload) })
    } finally {
      set({ isLoading: false })
    }
  },

  logout: async () => {
    try {
      await logoutApi()
    } catch {
      clearToken()
    }
    set({ user: null })
    window.location.href = "/login"
  },

  hasRole: (roles: URole[]) => {
    const user = get().user
    if (!user) return false
    return roles.includes(user.role)
  },
}))
