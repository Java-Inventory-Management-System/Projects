import {
  LayoutDashboard,
  Package,
  ScanBarcode,
  Users,
  History,
  ArrowDownToLine,
  ArrowUpFromLine,
  ClipboardCheck,
  ClipboardList,
  Building2,
  Tags,
  Truck,
  Contact,
  FileText,
  Undo2,
} from "lucide-react"
import type { ComponentType } from "react"
import type { URole } from "@/utils/types"
import { ROLES } from "@/utils/permissions"

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
      { label: "Dashboard", icon: LayoutDashboard, path: "/", roles: ROLES.CAN_VIEW_REPORTS },
      { label: "Products", icon: Package, path: "/products", roles: ROLES.CAN_VIEW_INVENTORY },
      { label: "Brands", icon: Building2, path: "/brands", roles: ROLES.CAN_VIEW_INVENTORY },
      { label: "Categories", icon: Tags, path: "/categories", roles: ROLES.CAN_VIEW_INVENTORY },
      { label: "Suppliers", icon: Truck, path: "/suppliers", roles: ROLES.CAN_VIEW_INVENTORY },
      { label: "Customers", icon: Contact, path: "/customers", roles: ROLES.CAN_OPERATE },
      { label: "Inventory", icon: ScanBarcode, path: "/stock/units", roles: ROLES.CAN_OPERATE },
    ],
  },
  {
    items: [{ label: "Purchase Orders", icon: FileText, path: "/stock/purchase-orders", roles: ROLES.MANAGER }],
  },
  {
    items: [
      { label: "Imports", icon: ArrowDownToLine, path: "/stock/imports", roles: ROLES.CAN_VIEW_INVENTORY },
      { label: "Exports", icon: ArrowUpFromLine, path: "/stock/exports", roles: ROLES.CAN_OPERATE },
      { label: "Stock Checks", icon: ClipboardCheck, path: "/stock/checks", roles: ROLES.CAN_VIEW_INVENTORY },
      { label: "Adjustments", icon: ClipboardCheck, path: "/stock/adjustments", roles: ROLES.CAN_VIEW_INVENTORY },

      { label: "Returns", icon: Undo2, path: "/returns", roles: ROLES.CAN_OPERATE },
      { label: "Price Adj.", icon: ClipboardList, path: "/stock/price-adjustments", roles: ROLES.CAN_VIEW_INVENTORY },
    ],
  },
  {
    items: [
      { label: "Users", icon: Users, path: "/users", roles: ROLES.ADMIN },
      { label: "Audit", icon: History, path: "/audit", roles: ROLES.CAN_VIEW_REPORTS },
    ],
  },
]

export const navItems: NavItem[] = navSections.flatMap((s) => s.items)

export function filterNavItems(items: NavItem[], role: URole): NavItem[] {
  return items.filter((item) => item.roles.includes(role))
}
