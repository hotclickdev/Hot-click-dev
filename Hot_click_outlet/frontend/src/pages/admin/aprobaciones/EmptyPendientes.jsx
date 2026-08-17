export default function EmptyPendientes({ mensaje }) {
  return (
    <div className="py-12 text-center rounded-xl" style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
      <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: 'rgba(34,197,94,0.1)' }}>
        <svg className="w-6 h-6" style={{ color: '#22c55e' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <p className="font-semibold" style={{ color: 'var(--hc-text)' }}>Sin pendientes</p>
      <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>{mensaje}</p>
    </div>
  )
}
