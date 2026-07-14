import { create } from "zustand"
import type { URole } from "@/utils/navigation"

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

const MOCK_USERS: User[] = [
  { id: "1", username: "admin", role: "ADMIN", displayName: "Admin" },
  { id: "2", username: "manager", role: "MANAGER", displayName: "Quản lý kho" },
  { id: "3", username: "sales", role: "SALES", displayName: "Nhân viên bán hàng" },
  { id: "4", username: "stock", role: "STOCK", displayName: "Nhân viên kho" },
]

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: false,

  login: async (username: string, _password: string) => {
    set({ isLoading: true })
    try {
      await new Promise((r) => setTimeout(r, 600))
      const found = MOCK_USERS.find((u) => u.username === username)
      if (!found) throw new Error("Invalid credentials")
      set({ user: found })
    } finally {
      set({ isLoading: false })
    }
  },

  logout: () => set({ user: null }),

  hasRole: (roles: URole[]) => {
    const user = get().user
    if (!user) return false
    return roles.includes(user.role)
  },
}))
