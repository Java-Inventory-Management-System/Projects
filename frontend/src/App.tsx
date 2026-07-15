import { RouterProvider } from "react-router-dom"
import { router } from "@/routes"
import { Toaster } from "@/components/ui/sonner"
import { ErrorBoundary } from "@/components/ui/error-boundary"

function App() {
  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
      <Toaster />
    </ErrorBoundary>
  )
}

export default App
