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
import { useAuthStore } from "@/store/auth-store"
import { AUTH_ENABLED } from "@/utils/http-client"
import { LogOut, User, ChevronLeft, ChevronRight, Menu, Sun, Moon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useTheme } from "@/hooks/use-theme"
import { Switch } from "@/components/ui/switch"

interface TopbarProps {
  collapsed: boolean
  onToggle: () => void
  onMobileOpen: () => void
}

export function Topbar({ collapsed, onToggle, onMobileOpen }: TopbarProps) {
  const { t, i18n } = useTranslation()
  const { theme, toggleTheme } = useTheme()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  const toggleLang = () => {
    const next = i18n.language === 'vi' ? 'en' : 'vi'
    i18n.changeLanguage(next)
    localStorage.setItem('lang', next)
  }

  if (!AUTH_ENABLED) {
    return (
      <header className="flex h-14 items-center justify-between border-b bg-background px-4">
        <span className="text-sm text-muted-foreground">{t('topbar.devMode')}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2">
              <Avatar className="size-7">
                <AvatarFallback className="text-[11px] font-medium bg-muted text-muted-foreground">
                  DV
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium sm:inline">{t('topbar.developer')}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex items-center gap-2">
              <User className="size-4 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="text-sm font-medium">{t('topbar.developer')}</span>
                <span className="text-xs text-muted-foreground font-normal">{t('topbar.devDescription')}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-xs text-muted-foreground">{t('topbar.theme')}</span>
              <Switch
                checked={theme === 'dark'}
                onCheckedChange={toggleTheme}
                className="h-7 w-12"
                thumbClassName="h-6 w-6 data-[state=checked]:translate-x-5"
                icon={theme === 'dark' ? <Moon className="size-4" /> : <Sun className="size-4" />}
              />
            </div>
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-xs text-muted-foreground">{t('topbar.language')}</span>
              <Switch
                checked={i18n.language === 'en'}
                onCheckedChange={toggleLang}
                className="h-7 w-12"
                thumbClassName="h-6 w-6 data-[state=checked]:translate-x-5"
                icon={i18n.language === 'en' ? <span className="text-xs leading-none">🇺🇸</span> : <span className="text-xs leading-none">🇻🇳</span>}
              />
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
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
        <Button variant="ghost" size="icon" onClick={onMobileOpen} className="md:hidden" aria-label={t('topbar.openMenu')}>
          <Menu className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="hidden md:inline-flex"
          aria-label={collapsed ? t('topbar.expandSidebar') : t('topbar.collapseSidebar')}
        >
          {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
        </Button>
      </div>

      <div className="flex items-center gap-2">
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
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex items-center gap-2">
              <User className="size-4 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="text-sm font-medium">{user.displayName}</span>
                <span className="text-xs text-muted-foreground font-normal">{t('roleLabel.' + user.role)}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-xs text-muted-foreground">{t('topbar.theme')}</span>
              <Switch
                checked={theme === 'dark'}
                onCheckedChange={toggleTheme}
                className="h-7 w-12"
                thumbClassName="h-6 w-6 data-[state=checked]:translate-x-5"
                icon={theme === 'dark' ? <Moon className="size-4" /> : <Sun className="size-4" />}
              />
            </div>
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-xs text-muted-foreground">{t('topbar.language')}</span>
              <Switch
                checked={i18n.language === 'en'}
                onCheckedChange={toggleLang}
                className="h-7 w-12"
                thumbClassName="h-6 w-6 data-[state=checked]:translate-x-5"
                icon={i18n.language === 'en' ? <span className="text-xs leading-none">🇺🇸</span> : <span className="text-xs leading-none">🇻🇳</span>}
              />
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout()}>
              <LogOut className="size-4" />
              <span>{t('common.logout')}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
