import {
  LayoutDashboard,
  Package,
  Warehouse,
  BarChart3,
  Users,
  History,
  ArrowDownToLine,
  ArrowUpFromLine,
} from "lucide-react"
import type { ComponentType } from "react"
import type { URole } from "@/utils/types"

export interface NavItem {
  label: string
  icon: ComponentType<{ className?: string }>
  path: string
  roles: URole[]
}

export interface NavSection {
  label?: string
  items: NavItem[]
}

export const navSections: NavSection[] = [
  {
    items: [
      { label: "Dashboard", icon: LayoutDashboard, path: "/", roles: ["ADMIN", "MANAGER", "SALES"] },
      { label: "Products", icon: Package, path: "/products", roles: ["ADMIN", "MANAGER", "SALES", "STOCK"] },
      { label: "Inventory", icon: Warehouse, path: "/inventory", roles: ["ADMIN", "MANAGER", "STOCK"] },
    ],
  },
  {
    items: [
      { label: "Reports", icon: BarChart3, path: "/reports", roles: ["ADMIN", "MANAGER"] },
    ],
  },
  {
    items: [
      { label: "Nhập kho", icon: ArrowDownToLine, path: "/stock/imports", roles: ["STOCK", "MANAGER", "ADMIN"] },
      { label: "Xuất kho", icon: ArrowUpFromLine, path: "/stock/exports", roles: ["STOCK", "MANAGER", "ADMIN"] },
    ],
  },
  {
    items: [
      { label: "Users", icon: Users, path: "/users", roles: ["ADMIN"] },
      { label: "Audit", icon: History, path: "/audit", roles: ["ADMIN"] },
    ],
  },
]

export const navItems: NavItem[] = navSections.flatMap((s) => s.items)

export function filterNavItems(items: NavItem[], role: URole): NavItem[] {
  return items.filter((item) => item.roles.includes(role))
}
