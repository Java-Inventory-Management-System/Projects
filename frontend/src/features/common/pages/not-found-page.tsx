import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"

export const NotFoundPage = () => {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="text-center max-w-sm">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-muted text-lg font-bold text-muted-foreground">
          404
        </div>
        <h1 className="text-xl font-semibold tracking-tight">Page Not Found</h1>
        <p className="mt-1 text-sm text-muted-foreground">The page you're looking for doesn't exist.</p>
        <Button className="mt-6" onClick={() => navigate("/")}>
          Back to Dashboard
        </Button>
      </div>
    </div>
  )
}
