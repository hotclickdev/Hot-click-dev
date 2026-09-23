import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

/** Subnav del dashboard de agentes. */
export default function AgentesTabs() {
  const { t } = useTranslation()
  const tabs = [
    { to: '/admin/agentes', label: t('agentesRegistro'), end: true },
    { to: '/admin/agentes/plan', label: t('agentesPlan77'), end: false },
    { to: '/admin/agentes/inspecciones', label: t('agentesInspeccionesI1'), end: false },
    { to: '/admin/agentes/hallazgos', label: t('agentesHallazgos'), end: false },
  ]

  return (
    <nav className="flex flex-wrap gap-1 border-b border-hc-border" aria-label={t('agentesTabsAria')}>
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className="rounded-t-lg px-3 py-2 text-sm font-medium"
          style={({ isActive }) => ({
            color: isActive ? 'var(--hc-link)' : 'var(--hc-muted)',
            borderBottom: isActive ? '2px solid var(--hc-link)' : '2px solid transparent',
            fontWeight: isActive ? 700 : 500,
          })}
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
