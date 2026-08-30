import { TargetIcon } from './dashboardIcons'
import { useTranslation } from 'react-i18next'

export type ServerStatus = {
  up: boolean
  ms: number | null
}

type DashboardHeaderProps = {
  title: string
  welcome: string
  onOpenTour: () => void
  serverStatus: ServerStatus | null
}

export default function DashboardHeader({ title, welcome, onOpenTour, serverStatus }: DashboardHeaderProps) {
  const { t } = useTranslation()
  return (
    <div className="flex items-start justify-between gap-3 flex-wrap">
      <div>
        <h1 className="text-2xl font-bold text-[var(--hc-text)]">{title}</h1>
        <p className="text-sm text-[var(--hc-muted)] mt-1">{welcome}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {serverStatus && (
          <span className="text-xs" style={{ color: serverStatus.up ? 'var(--hc-success)' : 'var(--hc-danger)' }}>
            {serverStatus.up
              ? t('admin.dashboard.apiMs', { ms: serverStatus.ms })
              : t('admin.dashboard.apiDown')}
          </span>
        )}
      <button type="button"
        onClick={onOpenTour}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all hover:opacity-80 shrink-0"
        style={{ backgroundColor: 'rgba(23,71,168,0.1)', border: '1px solid rgba(23,71,168,0.25)', color: 'var(--hc-link)' }}
      >
        <TargetIcon /> {t('admin.dashboard.viewTutorial')}
      </button>
      </div>
    </div>
  )
}
