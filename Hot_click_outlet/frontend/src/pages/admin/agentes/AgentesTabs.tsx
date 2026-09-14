import { NavLink } from 'react-router-dom'

const TABS = [
  { to: '/admin/agentes', label: 'Registro', end: true },
  { to: '/admin/agentes/plan', label: 'Plan 7/7', end: false },
  { to: '/admin/agentes/inspecciones', label: 'Inspecciones I1', end: false },
  { to: '/admin/agentes/hallazgos', label: 'Hallazgos', end: false },
] as const

/** Subnav del dashboard de agentes. */
export default function AgentesTabs() {
  return (
    <nav className="flex flex-wrap gap-1 border-b border-hc-border" aria-label="Secciones de agentes">
      {TABS.map((tab) => (
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
