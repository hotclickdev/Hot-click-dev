import { useState } from 'react'
import { Link } from 'react-router-dom'

const fmt = (n) => new Intl.NumberFormat('es-CR').format(n ?? 0)

/**
 * Tarjeta de producto para resultados de HotClick AI.
 * @param {object}   producto    - Producto a mostrar (id, nombre, sku, precio, imagenUrl)
 * @param {number}   similarity  - 0-100. Si se provee muestra "94% similar" badge
 * @param {function} onAdd       - Callback al añadir al carrito
 */
export default function AIProductCard({ producto, similarity, onAdd }) {
  const [added, setAdded] = useState(false)

  function handleAdd(e) {
    e.preventDefault()
    if (added) return
    onAdd?.(producto)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: '#ffffff',
        border: '1px solid #e0e0e0',
        animation: 'ai-msg-in 0.28s ease both',
      }}
    >
      <Link to={`/productos/${producto.id}`} className="flex gap-3 p-3 hover:opacity-80 transition-opacity">
        {producto.imagenUrl
          ? <img src={producto.imagenUrl} alt={producto.nombre} className="w-14 h-14 rounded-lg object-cover shrink-0" loading="lazy" />
          : <div className="w-14 h-14 rounded-lg shrink-0 flex items-center justify-center text-xl opacity-20"
              style={{ background: 'rgba(0,0,0,0.06)' }}>📦</div>
        }
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold line-clamp-2 leading-snug" style={{ color: '#14171C' }}>
            {producto.nombre}
          </p>
          {producto.sku && (
            <p className="text-[10px] font-mono mt-0.5" style={{ color: '#4D5560' }}>
              SKU {producto.sku}
            </p>
          )}
          {similarity != null && (
            <span
              className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full mt-1"
              style={{ background: 'rgba(34,197,94,0.15)', color: '#178A50' }}
            >
              {similarity}% similar
            </span>
          )}
          <p className="text-sm font-bold mt-1" style={{ color: 'var(--hc-accent)' }}>
            ₡{fmt(producto.precio)}
          </p>
        </div>
      </Link>
      <div className="px-3 pb-3">
        <button
          onClick={handleAdd}
          className="w-full py-1.5 rounded-lg text-xs font-bold transition-all"
          style={{
            background: added ? 'rgba(34,197,94,0.12)' : 'var(--hc-accent)',
            color: added ? '#4ade80' : '#fff',
            border: added ? '1px solid rgba(34,197,94,0.3)' : 'none',
          }}
        >
          {added ? '✓ Añadido' : 'Añadir al carrito'}
        </button>
      </div>
    </div>
  )
}
