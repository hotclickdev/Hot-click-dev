import { Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import AgentesTabs from './agentes/AgentesTabs'
import { useAgentesDashboard } from './agentes/useAgentesDashboard'

/**
 * Shell de /admin/agentes — registro I1 dentro del admin HotClick.
 */
export default function AdminAgentes() {
  const { t } = useTranslation()
  const dash = useAgentesDashboard()

  if (dash.loading && dash.data.catalogo.agents.length === 0) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-hc-muted">
        {t('agentesCargando')}
      </div>
    )
  }

  if (dash.error && dash.data.catalogo.agents.length === 0) {
    return (
      <div className="mx-auto max-w-2xl p-8 text-center">
        <p className="text-[var(--hc-danger)]">{dash.error}</p>
        <button
          type="button"
          onClick={dash.recargar}
          className="mt-4 rounded-lg bg-[var(--hc-primary)] px-4 py-2 text-sm text-white hover:bg-[var(--hc-primary-hover)]"
        >
          {t('agentesReintentar')}
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold text-hc-text">{t('agentesTitulo')}</h1>
        <p className="mt-1 text-sm text-hc-muted">{t('agentesSubtitulo')}</p>
      </header>
      <AgentesTabs />
      <Outlet context={dash} />
    </div>
  )
}
