import { fmt } from './posPaymentConstants'

/**
 * Resumen de ítems y total del checkout embebido.
 */
export default function PosPaymentCartSummary({ items, totalFinal }) {
  return (
    <div className="rounded-xl p-3 space-y-1.5"
      style={{ background: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }}>
      <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--hc-muted)' }}>
        Tu pedido
      </p>
      {items.slice(0, 3).map(i => (
        <div key={i.id} className="flex justify-between text-xs" style={{ color: 'var(--hc-text)' }}>
          <span className="truncate mr-2">{i.nombre ?? i.name} ×{i.cantidad}</span>
          <span className="shrink-0 font-semibold">₡{fmt((i.precioVenta ?? i.precio) * i.cantidad)}</span>
        </div>
      ))}
      {items.length > 3 && (
        <p className="text-[11px]" style={{ color: 'var(--hc-muted)' }}>
          +{items.length - 3} producto(s) más
        </p>
      )}
      <div className="flex justify-between pt-1 text-xs font-bold" style={{ borderTop: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}>
        <span>Total</span>
        <span style={{ color: 'var(--hc-accent)' }}>₡{fmt(totalFinal)}</span>
      </div>
    </div>
  )
}
