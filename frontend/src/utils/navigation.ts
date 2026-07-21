import {
  LayoutDashboard,
  Package,
  ScanBarcode,
  Users,
  History,
  ArrowDownToLine,
  ArrowUpFromLine,
  ClipboardCheck,
  Building2,
  Tags,
  Truck,
  Contact,
  FileText,
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
      { label: "Dashboard", icon: LayoutDashboard, path: "/", roles: ["ADMIN", "MANAGER"] },
      { label: "Products", icon: Package, path: "/products", roles: ["ADMIN", "MANAGER", "STOCK"] },
      { label: "Brands", icon: Building2, path: "/brands", roles: ["ADMIN", "MANAGER"] },
      { label: "Categories", icon: Tags, path: "/categories", roles: ["ADMIN", "MANAGER"] },
      { label: "Suppliers", icon: Truck, path: "/suppliers", roles: ["ADMIN", "MANAGER"] },
      { label: "Customers", icon: Contact, path: "/customers", roles: ["ADMIN", "MANAGER", "STOCK"] },
      { label: "Inventory", icon: ScanBarcode, path: "/stock/units", roles: ["ADMIN", "MANAGER", "STOCK"] },
    ],
  },
  {
    items: [
      { label: "Purchase Orders", icon: FileText, path: "/stock/purchase-orders", roles: ["MANAGER"] },

    ],
  },
  {
    items: [
      { label: "Imports", icon: ArrowDownToLine, path: "/stock/imports", roles: ["STOCK", "MANAGER", "ADMIN"] },
      { label: "Exports", icon: ArrowUpFromLine, path: "/stock/exports", roles: ["STOCK", "MANAGER", "ADMIN"] },
      { label: "Stock Checks", icon: ClipboardCheck, path: "/stock/checks", roles: ["STOCK", "MANAGER", "ADMIN"] },
      { label: "Adjustments", icon: ClipboardCheck, path: "/stock/adjustments", roles: ["STOCK", "MANAGER", "ADMIN"] },
    ],
  },
  {
    items: [
      { label: "Users", icon: Users, path: "/users", roles: ["ADMIN"] },
      { label: "Audit", icon: History, path: "/audit", roles: ["ADMIN", "MANAGER"] },
    ],
  },
]

export const navItems: NavItem[] = navSections.flatMap((s) => s.items)

export function filterNavItems(items: NavItem[], role: URole): NavItem[] {
  return items.filter((item) => item.roles.includes(role))
}
