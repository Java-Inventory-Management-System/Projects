import {
  LayoutDashboard,
  Package,
  ScanBarcode,
  Users,
  History,
  ArrowDownToLine,
  ArrowUpFromLine,
  ClipboardCheck,
  Contact,
  Undo2,
  SlidersHorizontal,
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
      { labelKey: "nav.dashboard", icon: LayoutDashboard, path: "/", roles: ROLES.CAN_OPERATE },
      { labelKey: "nav.products", icon: Package, path: "/products", roles: ROLES.CAN_VIEW_PRODUCTS },
      { labelKey: "nav.customers", icon: Contact, path: "/customers", roles: ROLES.CAN_OPERATE },
      { labelKey: "nav.inventory", icon: ScanBarcode, path: "/stock/units", roles: ROLES.CAN_OPERATE },
    ],
  },
  {
    items: [
      { labelKey: "nav.imports", icon: ArrowDownToLine, path: "/stock/imports", roles: ROLES.CAN_VIEW_INVENTORY },
      { labelKey: "nav.exports", icon: ArrowUpFromLine, path: "/stock/exports", roles: ROLES.CAN_OPERATE },
      { labelKey: "nav.stockOps", icon: ClipboardCheck, path: "/stock/ops", roles: ROLES.CAN_VIEW_INVENTORY },
      { labelKey: "nav.returnsQc", icon: Undo2, path: "/returns-qc", roles: ROLES.CAN_OPERATE },
    ],
  },
  {
    items: [
      {
        labelKey: "nav.catalogSettings",
        icon: SlidersHorizontal,
        path: "/catalog-settings",
        roles: ROLES.CAN_MANAGE_CATALOG,
      },
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
