export default function OrdersEmptyState({ filter, onVerTodos, onCrear }) {
  if (filter !== 'Todos') {
    return (
      <div className="space-y-2">
        <p className="text-[var(--hc-muted)] text-sm">Sin pedidos con estado <strong className="text-[var(--hc-text)]">{filter}</strong></p>
        <button onClick={onVerTodos} className="text-xs text-[var(--hc-accent)] hover:underline">Ver todos los pedidos →</button>
      </div>
    )
  }
  return (
    <div className="space-y-3">
      <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center" style={{ backgroundColor: 'rgba(23,71,168,0.08)', border: '1px solid rgba(23,71,168,0.15)' }}>
        <svg className="w-7 h-7" style={{ color: 'var(--hc-accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>
      </div>
      <p className="font-semibold text-[var(--hc-text)]">Sin pedidos todavía</p>
      <p className="text-sm text-[var(--hc-muted)] max-w-xs mx-auto">Los pedidos de tus clientes aparecen aquí. También podés registrar uno manual.</p>
      <button
        onClick={onCrear}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold mt-1 transition-opacity hover:opacity-80"
        style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}
      >
        + Registrar pedido manual
      </button>
    </div>
  )
}
