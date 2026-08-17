import { motion } from 'framer-motion'
import { PERIODS, SEVERITY_COLOR } from './securityHelpers'

export function SeverityBadge({ severity }) {
  const c = SEVERITY_COLOR[severity] || SEVERITY_COLOR.LOW
  return (
    <span className="px-2 py-0.5 rounded-md text-xs font-semibold"
      style={{ backgroundColor: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
      {severity}
    </span>
  )
}

export function KpiCard({ label, value, sub, accent }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-5 flex flex-col gap-1"
      style={{ backgroundColor: 'var(--hc-card)', border: '1px solid var(--hc-border)' }}>
      <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--hc-muted)' }}>{label}</p>
      <p className="text-3xl font-bold tabular-nums" style={{ color: accent || 'var(--hc-text)' }}>{value ?? '—'}</p>
      {sub && <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>{sub}</p>}
    </motion.div>
  )
}

export function Card({ children, className = '' }) {
  return (
    <div className={`rounded-2xl ${className}`}
      style={{ backgroundColor: 'var(--hc-card)', border: '1px solid var(--hc-border)' }}>
      {children}
    </div>
  )
}

export function TabBtn({ active, onClick, children, badge }) {
  return (
    <button type="button" onClick={onClick}
      className="px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5"
      style={{ backgroundColor: active ? 'var(--hc-accent)' : 'transparent', color: active ? '#fff' : 'var(--hc-muted)' }}>
      {children}
      {badge > 0 && (
        <span className="px-1.5 py-0.5 rounded-full text-xs font-bold"
          style={{ backgroundColor: '#ef4444', color: '#fff' }}>{badge}</span>
      )}
    </button>
  )
}

export function PeriodSelector({ value, onChange }) {
  return (
    <div className="flex gap-2">
      {PERIODS.map(p => (
        <button type="button" key={p.value} onClick={() => onChange(p.value)}
          className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
          style={{
            backgroundColor: value === p.value ? 'var(--hc-accent)' : 'var(--hc-card)',
            color: value === p.value ? '#fff' : 'var(--hc-muted)',
            border: '1px solid var(--hc-border)',
          }}>
          {p.label}
        </button>
      ))}
    </div>
  )
}
