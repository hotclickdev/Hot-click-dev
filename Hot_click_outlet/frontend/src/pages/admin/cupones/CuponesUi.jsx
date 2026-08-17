export function StatCard({ label, value, color = 'var(--hc-accent)' }) {
  return (
    <div className="rounded-2xl p-5 flex flex-col gap-1"
      style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
      <span className="text-2xl font-black" style={{ color }}>{value}</span>
      <span className="text-xs" style={{ color: 'var(--hc-muted)' }}>{label}</span>
    </div>
  )
}

export function Badge({ used, usosActuales, maxUsos }) {
  const bloqueado = used || usosActuales >= maxUsos
  if (bloqueado) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
        style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171' }}>
        Bloqueado
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: 'rgba(16,185,129,0.12)', color: '#34d399' }}>
      Disponible
    </span>
  )
}

export function UsageBar({ usosActuales = 0, maxUsos = 1 }) {
  const pct = maxUsos > 0 ? Math.min(100, Math.round(usosActuales / maxUsos * 100)) : 100
  const color = pct >= 100 ? '#f87171' : pct >= 60 ? '#fbbf24' : '#34d399'
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--hc-border)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-mono" style={{ color: 'var(--hc-muted)' }}>
        {usosActuales}/{maxUsos}
      </span>
    </div>
  )
}
