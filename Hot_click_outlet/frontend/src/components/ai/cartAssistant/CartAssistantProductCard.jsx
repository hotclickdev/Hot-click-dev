import { useState } from 'react'
import { Link } from 'react-router-dom'
import { fmt } from './cartAssistantHelpers'

export function CartAssistantProductCard({ producto, onAdd }) {
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
          : <div className="w-14 h-14 rounded-lg shrink-0 flex items-center justify-center text-2xl opacity-30"
              style={{ background: 'var(--hc-surface-2)' }}>📦</div>
        }
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold line-clamp-2 leading-snug" style={{ color: 'var(--hc-text)' }}>{producto.nombre}</p>
          {producto.sku && <p className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--hc-muted)' }}>SKU {producto.sku}</p>}
          <p className="text-sm font-bold mt-1" style={{ color: 'var(--hc-accent)' }}>₡{fmt(producto.precio)}</p>
        </div>
      </Link>
      <div className="px-3 pb-3">
        <button onClick={handleAdd}
          className="w-full py-1.5 rounded-lg text-xs font-bold transition-all"
          style={{
            background: added ? 'rgba(34,197,94,0.12)' : 'var(--hc-accent)',
            color: added ? '#4ade80' : '#fff',
            border: added ? '1px solid rgba(34,197,94,0.3)' : 'none',
          }}>
          {added ? '✓ Añadido' : 'Añadir al carrito'}
        </button>
      </div>
    </div>
  )
}
