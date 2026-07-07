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
import { useAuth } from "@/contexts/auth-context"
import { useNavigate } from "react-router-dom"
import { LogOut, User, ChevronLeft, ChevronRight, Menu } from "lucide-react"

interface TopbarProps {
  collapsed: boolean
  onToggle: () => void
  onMobileOpen: () => void
}

export function Topbar({ collapsed, onToggle, onMobileOpen }: TopbarProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
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
        <Button
          variant="ghost"
          size="icon"
          onClick={onMobileOpen}
          className="md:hidden"
          aria-label="Open menu"
        >
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
              <span className="text-xs text-muted-foreground font-normal">{user.role}</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate("/login")}>
            <LogOut className="size-4" />
            <span>Logout</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
