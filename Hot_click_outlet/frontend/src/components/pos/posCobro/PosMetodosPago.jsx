import { METODOS } from './posCobroHelpers'

export default function PosMetodosPago({ metodoPago, setMetodoPago }) {
  return (
    <div>
      <p className="text-xs font-medium mb-2" style={{ color: 'var(--hc-muted)' }}>Método de pago</p>
      <div className="grid grid-cols-3 gap-2">
        {METODOS.map(m => (
          <button type="button" key={m.id} onClick={() => setMetodoPago(m.id)}
            title={m.desc}
            className="flex flex-col items-start px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={(() => {
              const borderColor = metodoPago === m.id ? 'var(--hc-accent)' : 'rgba(255,255,255,0.08)'
              return {
                backgroundColor: metodoPago === m.id ? 'var(--hc-accent)' : 'rgba(255,255,255,0.05)',
                color: metodoPago === m.id ? '#fff' : 'var(--hc-muted)',
                border: `1px solid ${borderColor}`,
              }
            })()}>
            <span>{m.label}</span>
            {m.desc && (
              <span className="text-[10px] mt-0.5 opacity-60">{m.desc}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
