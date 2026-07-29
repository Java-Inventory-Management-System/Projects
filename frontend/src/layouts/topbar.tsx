import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { useAuthStore, SKIP_AUTH } from "@/store/auth-store"
import { LogOut, User, ChevronLeft, ChevronRight, Menu } from "lucide-react"
import type { URole } from "@/utils/types"

interface TopbarProps {
  collapsed: boolean
  onToggle: () => void
  onMobileOpen: () => void
}

const roleLabel: Record<URole, string> = {
  ADMIN: "Admin",
  MANAGER: "Quản lý kho",
  SALES: "Nhân viên bán hàng",
  STOCK: "Nhân viên kho",
}

export function Topbar({ collapsed, onToggle, onMobileOpen }: TopbarProps) {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  if (SKIP_AUTH) {
    return (
      <header className="flex h-14 items-center justify-between border-b bg-background px-4">
        <span className="text-sm text-muted-foreground">DEV MODE</span>
      </header>
    )
  }
  if (!user) return null

  const initials = user.displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onMobileOpen} className="md:hidden" aria-label="Open menu">
          <Menu className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="hidden md:inline-flex"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
        </Button>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2 px-2">
            <Avatar className="size-7">
              <AvatarFallback className="text-[11px] font-medium bg-primary text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="hidden text-sm font-medium sm:inline">{user.displayName}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel className="flex items-center gap-2">
            <User className="size-4 text-muted-foreground" />
            <div className="flex flex-col">
              <span className="text-sm font-medium">{user.displayName}</span>
              <span className="text-xs text-muted-foreground font-normal">{roleLabel[user.role]}</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => logout()}>
            <LogOut className="size-4" />
            <span>Logout</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
