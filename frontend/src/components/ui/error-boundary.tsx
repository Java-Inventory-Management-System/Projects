import { Component, type ErrorInfo, type ReactNode } from "react"
import { Translation } from "react-i18next"
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
      return (
        this.props.fallback ?? (
          <Translation>
            {(t) => (
              <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 p-8">
                <p className="text-sm text-muted-foreground">{t('errorBoundary.title')}</p>
                <p className="max-w-md text-center text-xs text-muted-foreground font-mono">{this.state.error?.message}</p>
                <Button variant="outline" size="sm" onClick={() => this.setState({ hasError: false, error: null })}>
                  {t('errorBoundary.retry')}
                </Button>
              </div>
            )}
          </Translation>
        )
      )
    }
    return this.props.children
  }
}
