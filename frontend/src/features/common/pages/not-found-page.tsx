import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { useTranslation } from "react-i18next"

export const NotFoundPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="text-center max-w-sm">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-muted text-lg font-bold text-muted-foreground">
          404
        </div>
        <h1 className="text-xl font-semibold tracking-tight">{t('common.pageNotFound')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('common.pageNotFoundDesc')}</p>
        <Button className="mt-6" onClick={() => navigate("/")}>
          {t('common.backToDashboard')}
        </Button>
      </div>
    </div>
  )
}
