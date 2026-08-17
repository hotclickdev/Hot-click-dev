/**
 * Selector de método de pago (SINPE / efectivo).
 */
export default function PosPaymentMetodo({ metodo, setMetodo }) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--hc-muted)' }}>
        Pago
      </p>
      <div className="grid grid-cols-2 gap-2">
        {[
          { value: 'SINPE',    label: 'SINPE Móvil', sub: 'Sin comisión' },
          { value: 'EFECTIVO', label: 'Efectivo',    sub: 'Contra entrega' },
        ].map(opt => (
          <button type="button"
            key={opt.value}
            onClick={() => setMetodo(opt.value)}
            className="p-2.5 rounded-xl text-left text-xs transition-all"
            style={metodo === opt.value
              ? { background: 'color-mix(in srgb, var(--hc-accent) 12%, transparent)', border: '1.5px solid var(--hc-accent)', color: 'var(--hc-text)' }
              : { background: 'var(--hc-surface-2)', border: '1.5px solid var(--hc-border)', color: 'var(--hc-muted)' }
            }
          >
            <p className="font-semibold">{opt.label}</p>
            <p className="text-[10px] mt-0.5">{opt.sub}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
