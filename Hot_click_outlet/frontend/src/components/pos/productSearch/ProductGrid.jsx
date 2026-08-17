import { fmt } from './posProductSearchHelpers'

export function ProductGrid({ items, onAdd }) {
  if (!items.length) {
    return (
      <div className="flex flex-col items-center justify-center h-32 gap-2 opacity-40">
        <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>Sin productos en esta categoría</p>
      </div>
    )
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
      {items.map(p => {
        const stock   = p.stockActual ?? p.stock ?? 0
        const agotado = stock <= 0
        const bajo    = stock > 0 && stock <= (p.stockMinimo ?? 5)
        let borderColor = 'rgba(255,255,255,0.07)'
        if (agotado) borderColor = 'rgba(239,68,68,0.2)'
        else if (bajo) borderColor = 'rgba(251,191,36,0.25)'
        let stockCls = 'text-[10px] font-medium'
        if (agotado) stockCls += ' text-red-400'
        else if (bajo) stockCls += ' text-yellow-400'
        const stockStyle = agotado || bajo ? {} : { color: 'var(--hc-muted)' }
        return (
          <button type="button" key={p.id ?? p.idProducto}
            onClick={() => agotado || onAdd(p)}
            disabled={agotado}
            className="flex flex-col rounded-2xl overflow-hidden text-left transition-all hover:scale-[1.02] active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              backgroundColor: 'var(--hc-surface)',
              border: `1.5px solid ${borderColor}`,
            }}>
            <div className="w-full aspect-square overflow-hidden"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
              {p.imagenPrincipalUrl ? (
                <img src={p.imagenPrincipalUrl} alt={p.nombreProducto}
                  className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl opacity-30">
                  📦
                </div>
              )}
            </div>
            <div className="p-2 flex flex-col gap-0.5">
              <p className="text-xs font-medium line-clamp-2 leading-tight"
                style={{ color: 'var(--hc-text)' }}>
                {p.nombreProducto ?? p.nombre}
              </p>
              <p className="text-sm font-bold" style={{ color: 'var(--hc-accent)' }}>
                ₡{fmt(p.precioEfectivo ?? p.precioVenta ?? p.precio)}
              </p>
              <p className={stockCls} style={stockStyle}>
                {agotado ? 'Agotado' : `Stock: ${stock}`}
              </p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
