import { useEffect, useState, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import { useAuthStore, SKIP_AUTH } from "@/store/auth-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff } from "lucide-react"

export const LoginPage = () => {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const login = useAuthStore((s) => s.login)
  const isLoading = useAuthStore((s) => s.isLoading)
  const navigate = useNavigate()

  useEffect(() => {
    if (SKIP_AUTH) navigate("/", { replace: true })
  }, [navigate])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    try {
      await login(username, password)
      navigate("/")
    } catch {
      setError("Sai tên đăng nhập hoặc mật khẩu")
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div
            role="img"
            aria-label="Warehouse logo"
            className="mx-auto mb-4 flex size-12 items-center justify-center rounded-lg bg-primary text-lg font-bold text-primary-foreground"
          >
            W
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Quản lý kho</h1>
          <p className="mt-1 text-sm text-muted-foreground">Đăng nhập để tiếp tục</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Tên đăng nhập</Label>
            <Input
              id="username"
              type="text"
              placeholder="Nhập tên đăng nhập"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mật khẩu</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Nhập mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 size-8"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </Button>
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Đang đăng nhập..." : "Đăng nhập"}
          </Button>
        </form>
      </div>
    </div>
  )
}
