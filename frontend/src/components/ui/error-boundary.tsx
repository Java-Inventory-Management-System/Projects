import { Component, type ErrorInfo, type ReactNode } from "react"
import { Button } from "@/components/ui/button"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 p-8">
          <p className="text-sm text-muted-foreground">Đã xảy ra lỗi</p>
          <p className="max-w-md text-center text-xs text-muted-foreground font-mono">
            {this.state.error?.message}
          </p>
          <Button variant="outline" size="sm" onClick={() => this.setState({ hasError: false, error: null })}>
            Thử lại
          </Button>
        </div>
      )
    }
    return this.props.children
  }
}
