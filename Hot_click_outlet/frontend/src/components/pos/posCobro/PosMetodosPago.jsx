import { METODOS } from './posCobroHelpers'

export default function PosMetodosPago({ metodoPago, setMetodoPago }) {
  return (
    <div>
      <p className="text-xs font-medium mb-2" style={{ color: 'var(--hc-muted)' }}>Método de pago</p>
      <div className="grid grid-cols-2 gap-2">
        {METODOS.map(m => (
          <button type="button" key={m.id} onClick={() => !m.disabled && setMetodoPago(m.id)}
            disabled={m.disabled}
            title={m.disabled ? 'Próximamente' : m.desc}
            className="flex flex-col items-start px-3 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={(() => {
              const disabledColor = m.disabled ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)'
              const borderColor = metodoPago === m.id ? 'var(--hc-accent)' : disabledColor
              return {
                backgroundColor: metodoPago === m.id ? 'var(--hc-accent)' : 'rgba(255,255,255,0.05)',
                color: metodoPago === m.id ? '#fff' : 'var(--hc-muted)',
                border: `1px solid ${borderColor}`,
              }
            })()}>
            <span className="flex items-center gap-1.5">{m.icon} {m.label}</span>
            {m.desc && (
              <span className="text-[10px] mt-0.5 opacity-60">{m.desc}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
