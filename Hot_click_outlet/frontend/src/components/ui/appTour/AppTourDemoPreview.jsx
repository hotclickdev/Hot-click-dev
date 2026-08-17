export function DemoPreview({ demo, color }) {
  if (!demo) return null
  return (
    <div className="rounded-xl px-3 py-2.5" style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }}>
      <p className="text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--hc-muted)' }}>
        Ejemplo — así se vería
      </p>

      {demo.type === 'kpis' && (
        <div className="grid grid-cols-3 gap-2">
          {demo.items.map((it, i) => (
            <div key={i} className="text-center">
              <div className="text-[13px] font-bold" style={{ color: 'var(--hc-text)' }}>{it.value}</div>
              <div className="text-[9px]" style={{ color: 'var(--hc-muted)' }}>{it.label}</div>
            </div>
          ))}
        </div>
      )}

      {demo.type === 'products' && (
        <div className="space-y-1.5">
          {demo.items.map((it, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span style={{ color: 'var(--hc-text)' }}>{it.nombre}</span>
              <span style={{ color: 'var(--hc-muted)' }}>{it.precio} · stock {it.stock}</span>
            </div>
          ))}
        </div>
      )}

      {demo.type === 'orders' && (
        <div className="space-y-1.5">
          {demo.items.map((it, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span style={{ color: 'var(--hc-text)' }}>{it.numero}</span>
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold" style={{ backgroundColor: `${color}1a`, color }}>{it.estado}</span>
              <span style={{ color: 'var(--hc-muted)' }}>{it.total}</span>
            </div>
          ))}
        </div>
      )}

      {demo.type === 'pos' && (
        <div>
          {demo.items.map((it, i) => (
            <div key={i} className="flex items-center justify-between text-xs py-0.5">
              <span style={{ color: 'var(--hc-text)' }}>{it.cant}× {it.nombre}</span>
              <span style={{ color: 'var(--hc-muted)' }}>{it.precio}</span>
            </div>
          ))}
          <div className="flex items-center justify-between text-xs font-bold pt-1.5 mt-1.5" style={{ borderTop: '1px dashed var(--hc-border)', color: 'var(--hc-text)' }}>
            <span>Total · {demo.metodo}</span>
            <span>{demo.total}</span>
          </div>
        </div>
      )}

      {demo.type === 'finance' && (
        <div className="space-y-1.5">
          {demo.items.map((it, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span style={{ color: 'var(--hc-muted)' }}>{it.label}</span>
              <span className="font-semibold" style={{ color: 'var(--hc-text)' }}>{it.value}</span>
            </div>
          ))}
        </div>
      )}

      {demo.type === 'offer' && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2 py-1 rounded-lg text-[11px] font-bold" style={{ backgroundColor: `${color}1a`, color }}>{demo.badge}</span>
          <span className="px-2 py-1 rounded-lg text-[11px] font-mono" style={{ backgroundColor: 'var(--hc-surface)', border: '1px dashed var(--hc-border)', color: 'var(--hc-text)' }}>{demo.cupon}</span>
        </div>
      )}

      {demo.type === 'ai' && (
        <div className="space-y-1.5">
          <div className="text-xs px-2.5 py-1.5 rounded-xl ml-auto w-fit max-w-[85%]" style={{ backgroundColor: `${color}1a`, color: 'var(--hc-text)' }}>{demo.pregunta}</div>
          <div className="text-xs px-2.5 py-1.5 rounded-xl w-fit max-w-[85%]" style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}>{demo.respuesta}</div>
        </div>
      )}

      {demo.type === 'team' && (
        <div className="space-y-1.5">
          {demo.items.map((it, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0" style={{ backgroundColor: `${color}1a`, color }}>
                {it.nombre[0]}
              </div>
              <span style={{ color: 'var(--hc-text)' }}>{it.nombre}</span>
              <span style={{ color: 'var(--hc-muted)' }}>· {it.rol}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
