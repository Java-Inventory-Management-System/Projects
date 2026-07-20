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
      { label: "Dashboard", icon: LayoutDashboard, path: "/", roles: ["ADMIN", "MANAGER", "SALES"] },
      { label: "Products", icon: Package, path: "/products", roles: ["ADMIN", "MANAGER", "SALES", "STOCK"] },
      { label: "Thương hiệu", icon: Building2, path: "/brands", roles: ["ADMIN", "MANAGER"] },
      { label: "Danh mục", icon: Tags, path: "/categories", roles: ["ADMIN", "MANAGER"] },
      { label: "NCC", icon: Truck, path: "/suppliers", roles: ["ADMIN", "MANAGER"] },
      { label: "Khách hàng", icon: Contact, path: "/customers", roles: ["ADMIN", "MANAGER", "STOCK"] },
      { label: "Kho hàng", icon: ScanBarcode, path: "/stock/units", roles: ["ADMIN", "MANAGER", "STOCK"] },
    ],
  },
  {
    items: [
      { label: "Đơn đặt hàng", icon: FileText, path: "/stock/purchase-orders", roles: ["ADMIN", "MANAGER"] },

    ],
  },
  {
    items: [
      { label: "Nhập kho", icon: ArrowDownToLine, path: "/stock/imports", roles: ["STOCK", "MANAGER", "ADMIN"] },
      { label: "Xuất kho", icon: ArrowUpFromLine, path: "/stock/exports", roles: ["STOCK", "MANAGER", "ADMIN"] },
      { label: "Kiểm kho", icon: ClipboardCheck, path: "/stock/checks", roles: ["STOCK", "MANAGER", "ADMIN"] },
      { label: "Điều chỉnh tồn", icon: ClipboardCheck, path: "/stock/adjustments", roles: ["STOCK", "MANAGER", "ADMIN"] },
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
