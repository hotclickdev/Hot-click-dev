import { useState } from 'react'
import { Link } from 'react-router-dom'
import { fmt, type ProductoSugerido } from './cartAssistantHelpers'

export function CartAssistantProductCard({ producto, onAdd }: {
  producto: ProductoSugerido
  onAdd: (producto: ProductoSugerido) => void
}) {
  const [added, setAdded] = useState(false)
  function handleAdd() {
    if (added) return
    onAdd(producto)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }
  return (
    <div className="rounded-xl overflow-hidden" style={{
      background: 'var(--hc-surface)',
      border: '1px solid var(--hc-border)',
    }}>
      <Link to={`/productos/${producto.id}`} className="flex gap-3 p-3 hover:bg-white/3 transition-colors">
        {producto.imagenUrl
          ? <img src={producto.imagenUrl} alt={producto.nombre} className="w-14 h-14 rounded-lg object-cover shrink-0" />
          : <div className="w-14 h-14 rounded-lg shrink-0 flex items-center justify-center opacity-40"
              style={{ background: 'var(--hc-surface-2)' }}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.6} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              </svg>
            </div>
        }
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold line-clamp-2 leading-snug" style={{ color: 'var(--hc-text)' }}>{producto.nombre}</p>
          {producto.sku && <p className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--hc-muted)' }}>SKU {producto.sku}</p>}
          <p className="text-sm font-bold mt-1" style={{ color: 'var(--hc-accent)' }}>₡{fmt(producto.precio)}</p>
        </div>
      </Link>
      <div className="px-3 pb-3">
        <button
          type="button"
          onClick={handleAdd}
          className={added
            ? 'hc-btn w-full min-h-9 text-xs bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
            : 'hc-btn hc-btn-primary w-full min-h-9 text-xs'}
        >
          {added ? 'Agregado' : 'Agregar al pedido'}
        </button>
      </div>
    </div>
  )
}
