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
  labelKey: string
  icon: ComponentType<{ className?: string }>
  path: string
  roles: URole[]
}

export interface NavSection {
  items: NavItem[]
}

export const navSections: NavSection[] = [
  {
    items: [
      { labelKey: "nav.dashboard", icon: LayoutDashboard, path: "/", roles: ROLES.CAN_VIEW_REPORTS },
      { labelKey: "nav.products", icon: Package, path: "/products", roles: ROLES.CAN_VIEW_INVENTORY },
      { labelKey: "nav.brands", icon: Building2, path: "/brands", roles: ROLES.CAN_VIEW_INVENTORY },
      { labelKey: "nav.categories", icon: Tags, path: "/categories", roles: ROLES.CAN_VIEW_INVENTORY },
      { labelKey: "nav.suppliers", icon: Truck, path: "/suppliers", roles: ROLES.CAN_VIEW_INVENTORY },
      { labelKey: "nav.customers", icon: Contact, path: "/customers", roles: ROLES.CAN_OPERATE },
      { labelKey: "nav.inventory", icon: ScanBarcode, path: "/stock/units", roles: ROLES.CAN_OPERATE },
    ],
  },
  {
    items: [{ labelKey: "nav.purchaseOrders", icon: FileText, path: "/stock/purchase-orders", roles: ROLES.MANAGER }],
  },
  {
    items: [
      { labelKey: "nav.imports", icon: ArrowDownToLine, path: "/stock/imports", roles: ROLES.CAN_VIEW_INVENTORY },
      { labelKey: "nav.exports", icon: ArrowUpFromLine, path: "/stock/exports", roles: ROLES.CAN_OPERATE },
      { labelKey: "nav.stockChecks", icon: ClipboardCheck, path: "/stock/checks", roles: ROLES.CAN_VIEW_INVENTORY },
      { labelKey: "nav.adjustments", icon: ClipboardCheck, path: "/stock/adjustments", roles: ROLES.CAN_VIEW_INVENTORY },
      { labelKey: "nav.returns", icon: Undo2, path: "/returns", roles: ROLES.CAN_OPERATE },
      { labelKey: "nav.priceAdj", icon: ClipboardList, path: "/stock/price-adjustments", roles: ROLES.CAN_VIEW_INVENTORY },
    ],
  },
  {
    items: [
      { labelKey: "nav.users", icon: Users, path: "/users", roles: ROLES.ADMIN },
      { labelKey: "nav.audit", icon: History, path: "/audit", roles: ROLES.CAN_VIEW_REPORTS },
    ],
  },
]

export const navItems: NavItem[] = navSections.flatMap((s) => s.items)

export function filterNavItems(items: NavItem[], role: URole): NavItem[] {
  return items.filter((item) => item.roles.includes(role))
}
