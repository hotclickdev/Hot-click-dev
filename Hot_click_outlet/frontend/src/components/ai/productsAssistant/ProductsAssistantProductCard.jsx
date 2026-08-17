import { useState } from 'react'
import { Link } from 'react-router-dom'
import { fmt } from './productsAssistantHelpers'

export function ProductsAssistantProductCard({ producto, onAdd }) {
  const [added, setAdded] = useState(false)

  function handleAdd() {
    if (added) return
    onAdd(producto)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{
      backgroundColor: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.1)',
    }}>
      <Link to={`/productos/${producto.id}`} className="flex gap-3 p-3 hover:opacity-80 transition-opacity">
        {producto.imagenUrl ? (
          <img src={producto.imagenUrl} alt={producto.nombre}
            className="w-14 h-14 rounded-lg object-cover shrink-0" />
        ) : (
          <div className="w-14 h-14 rounded-lg shrink-0 flex items-center justify-center text-2xl opacity-25"
            style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>📦</div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold leading-snug line-clamp-2" style={{ color: '#F4F6F9' }}>
            {producto.nombre}
          </p>
          {producto.sku && (
            <p className="text-[10px] mt-0.5 font-mono" style={{ color: 'rgba(255,255,255,0.32)' }}>
              SKU {producto.sku}
            </p>
          )}
          <p className="text-sm font-bold mt-1" style={{ color: 'var(--hc-accent)' }}>
            ₡{fmt(producto.precio)}
          </p>
        </div>
      </Link>
      <div className="px-3 pb-3">
        <button type="button"
          onClick={handleAdd}
          className="w-full py-1.5 rounded-lg text-xs font-semibold transition-all"
          style={{
            backgroundColor: added ? 'rgba(34,197,94,0.18)' : 'var(--hc-accent)',
            color: added ? '#4ade80' : '#fff',
            border: added ? '1px solid rgba(34,197,94,0.35)' : '1px solid transparent',
          }}
        >
          {added ? '✓ Añadido' : 'Añadir al carrito'}
        </button>
      </div>
    </div>
  )
}
