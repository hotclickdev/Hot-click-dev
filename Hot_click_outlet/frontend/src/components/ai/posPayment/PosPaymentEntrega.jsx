/**
 * Selector de método de entrega (retiro / encomienda).
 */
export default function PosPaymentEntrega({ entrega, setEntrega }) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--hc-muted)' }}>
        Entrega
      </p>
      <div className="grid grid-cols-2 gap-2">
        {[
          { value: 'RETIRO_EN_TIENDA',  label: 'Retiro gratis',    sub: 'Coordinamos punto' },
          { value: 'ENCOMIENDA_PROPIA', label: 'Encomienda',       sub: '+₡2,500' },
        ].map(opt => (
          <button type="button"
            key={opt.value}
            onClick={() => setEntrega(opt.value)}
            className="p-2.5 rounded-xl text-left text-xs transition-all"
            style={entrega === opt.value
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
