import { useState } from 'react'
import { Link } from 'react-router-dom'
import { HotClickMark } from '@/components/ui/BrandLogo'

const fmt = (n) => new Intl.NumberFormat('es-CR').format(n ?? 0)

function StarRating({ rating, total }) {
  const value = Number.parseFloat(rating) || 0
  if (value === 0 && !total) return null
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(i => {
          const filled = value >= i
          const half   = !filled && value >= i - 0.5
          return (
            <svg key={i} className="w-3 h-3" viewBox="0 0 20 20" fill="none">
              {half ? (
                <>
                  <defs>
                    <linearGradient id={`hg-${i}`} x1="0" x2="1" y1="0" y2="0">
                      <stop offset="50%" stopColor="#E73B33" />
                      <stop offset="50%" stopColor="#D1D5DB" />
                    </linearGradient>
                  </defs>
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" fill={`url(#hg-${i})`} />
                </>
              ) : (
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" fill={filled ? '#E73B33' : '#D1D5DB'} />
              )}
            </svg>
          )
        })}
      </div>
      {total > 0 && (
        <span className="text-[10px]" style={{ color: '#6B7280' }}>
          ({new Intl.NumberFormat('es-CR').format(total)})
        </span>
      )}
    </div>
  )
}

export default function AIProductCard({ producto, similarity, onAdd }) {
  const [added, setAdded] = useState(false)

  function handleAdd(e) {
    e.preventDefault()
    if (added) return
    onAdd?.(producto)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  const precioFinal = producto.precioOferta ?? producto.precio
  const enOferta    = producto.precioOferta != null && producto.precioOferta < producto.precio

  const lowStockStyle = producto.stock <= 5
    ? { background: 'rgba(245,158,11,0.10)', color: '#B45309' }
    : { background: 'rgba(34,197,94,0.10)', color: '#178A50' }
  const stockBadgeStyle = producto.stock === 0
    ? { background: 'rgba(239,68,68,0.10)', color: '#DC2626' }
    : lowStockStyle
  const stockText = producto.stock === 0 ? 'Sin stock' : (producto.stock <= 5 ? `Últimas ${producto.stock}` : 'Disponible')

  const availableBtnStyle = producto.stock === 0
    ? { background: '#F3F4F6', color: '#9CA3AF', border: '1px solid #E5E7EB', cursor: 'not-allowed' }
    : { background: '#E73B33', color: '#fff', border: 'none' }
  const btnStyle = added
    ? { background: 'rgba(34,197,94,0.10)', color: '#178A50', border: '1px solid rgba(34,197,94,0.25)' }
    : availableBtnStyle
  const addLabel = added ? 'Agregado al carrito' : (producto.stock === 0 ? 'Sin stock' : 'Agregar al carrito')

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: '#ffffff',
        border: '1px solid #E5E7EB',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        animation: 'ai-msg-in 0.28s ease both',
      }}
    >
      {/* Imagen + contenido */}
      <Link to={`/productos/${producto.id}`} className="flex gap-3 p-3 group">
        {/* Imagen cuadrada grande */}
        <div className="w-20 h-20 rounded-xl shrink-0 overflow-hidden" style={{ background: '#F3F4F6' }}>
          {producto.imagenUrl
            ? <img
                src={producto.imagenUrl}
                alt={producto.nombre}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                loading="lazy"
              />
            : <div className="w-full h-full flex items-center justify-center">
                <HotClickMark size={32} />
              </div>
          }
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          {/* Nombre en bold como título */}
          <p className="text-sm font-bold leading-snug line-clamp-2" style={{ color: '#111827' }}>
            {producto.nombre}
          </p>

          {/* Rating con estrellas */}
          <StarRating rating={producto.ratingPromedio} total={producto.totalResenas} />

          {/* Badges: similitud + stock */}
          <div className="flex flex-wrap items-center gap-1">
            {similarity != null && (
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: 'rgba(231,59,51,0.10)', color: '#E73B33' }}
              >
                {similarity}% similar
              </span>
            )}
            {producto.stock != null && (
              <span
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                style={stockBadgeStyle}
              >
                {stockText}
              </span>
            )}
          </div>

          {/* Precio */}
          <div className="flex items-baseline gap-1.5 mt-auto">
            <span className="text-base font-black" style={{ color: '#E73B33' }}>
              ₡{fmt(precioFinal)}
            </span>
            {enOferta && (
              <span className="text-xs line-through" style={{ color: '#9CA3AF' }}>
                ₡{fmt(producto.precio)}
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* Acciones */}
      <div className="px-3 pb-3 flex gap-2">
        <button
          onClick={handleAdd}
          disabled={producto.stock === 0}
          className="flex-1 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
          style={btnStyle}
        >
          {addLabel}
        </button>

        <Link
          to={`/productos/${producto.id}`}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:opacity-70 active:scale-95 shrink-0"
          style={{ background: '#F3F4F6', color: '#6B7280' }}
          title="Ver producto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
        </Link>
      </div>
    </div>
  )
}
