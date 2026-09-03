import { Link } from 'react-router-dom'
import { useState } from 'react'
import {
  etiquetaPrecioChat,
  requiereFichaEncargo,
  type ProductoSugerido,
} from './productsAssistantHelpers'

export function ProductsAssistantProductCard({ producto, onAdd }: {
  producto: ProductoSugerido
  onAdd: (producto: ProductoSugerido) => void
}) {
  const [added, setAdded] = useState(false)
  const encargo = requiereFichaEncargo(producto)
  const precioTxt = etiquetaPrecioChat(producto)

  function handleAdd() {
    if (added || encargo) return
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
          <div className="w-14 h-14 rounded-lg shrink-0 flex items-center justify-center opacity-40"
            style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.6} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            </svg>
          </div>
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
            {precioTxt}
          </p>
        </div>
      </Link>
      <div className="px-3 pb-3">
        {encargo ? (
          <Link
            to={`/productos/${producto.id}`}
            className="hc-btn hc-btn-primary w-full min-h-9 text-xs inline-flex items-center justify-center"
          >
            Pedir cotización
          </Link>
        ) : (
          <button
            type="button"
            onClick={handleAdd}
            className={added
              ? 'hc-btn w-full min-h-9 text-xs bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
              : 'hc-btn hc-btn-primary w-full min-h-9 text-xs'}
          >
            {added ? 'Agregado' : 'Agregar al pedido'}
          </button>
        )}
      </div>
    </div>
  )
}
