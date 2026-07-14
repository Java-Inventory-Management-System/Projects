import {
  LayoutDashboard,
  Package,
  Warehouse,
  BarChart3,
  Users,
  History,
} from "lucide-react"
import type { ComponentType } from "react"

export type URole = "ADMIN" | "MANAGER" | "SALES" | "STOCK"

export interface NavItem {
  label: string
  icon: ComponentType<{ className?: string }>
  path: string
  roles: URole[]
}

export const navItems: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/", roles: ["ADMIN", "MANAGER", "SALES", "STOCK"] },
  { label: "Products", icon: Package, path: "/products", roles: ["ADMIN", "MANAGER", "SALES", "STOCK"] },
  { label: "Inventory", icon: Warehouse, path: "/inventory", roles: ["ADMIN", "MANAGER", "STOCK"] },
  { label: "Reports", icon: BarChart3, path: "/reports", roles: ["ADMIN", "MANAGER"] },
  { label: "Users", icon: Users, path: "/users", roles: ["ADMIN"] },
  { label: "Audit", icon: History, path: "/audit", roles: ["ADMIN"] },
]

export function filterNavItems(items: NavItem[], role: URole): NavItem[] {
  return items.filter((item) => item.roles.includes(role))
}
