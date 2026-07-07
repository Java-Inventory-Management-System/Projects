import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react"
import type { URole } from "@/lib/navigation"

export interface User {
  id: string
  username: string
  role: URole
  displayName: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  hasRole: (roles: URole[]) => boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

const MOCK_USERS: User[] = [
  { id: "1", username: "admin", role: "ADMIN", displayName: "Admin" },
  { id: "2", username: "manager", role: "MANAGER", displayName: "Manager" },
  { id: "3", username: "sales", role: "SALES", displayName: "Sales" },
  { id: "4", username: "stock", role: "STOCK", displayName: "Stock" },
]

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const login = useCallback(async (username: string, password: string) => {
    setIsLoading(true)
    try {
      await new Promise((r) => setTimeout(r, 600))
      const found = MOCK_USERS.find((u) => u.username === username)
      if (!found) throw new Error("Invalid credentials")
      setUser(found)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    setUser(null)
  }, [])

  const hasRole = useCallback(
    (roles: URole[]) => {
      if (!user) return false
      return roles.includes(user.role)
    },
    [user],
  )

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: user !== null,
      login,
      logout,
      hasRole,
    }),
    [user, isLoading, login, logout, hasRole],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
