import { ESTADO_LABEL } from './suscripcionHelpers'

export function EstadoBadge({ estado }) {
  const { label, color } = ESTADO_LABEL[estado] ?? { label: estado, color: '#9ca3af' }
  return (
    <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
      style={{ backgroundColor: `${color}22`, color }}>
      {label}
    </span>
  )
}

export function KpiCard({ label, value, sub }) {
  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
      <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>{label}</p>
      <p className="text-xl font-bold mt-1" style={{ color: 'var(--hc-text)' }}>{value}</p>
      {sub && <p className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>{sub}</p>}
    </div>
  )
}
