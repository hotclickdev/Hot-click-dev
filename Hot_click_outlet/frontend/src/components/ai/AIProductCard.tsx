import { useState, type MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { HotClickMark } from '@/components/ui/BrandLogo'
import { getOptimizedUrl } from '@/utils/imageUtils'
import type { Producto } from '@/types/producto'

const fmt = (n?: number | null) => new Intl.NumberFormat('es-CR').format(n ?? 0)

type ProductoTarjetaAi = Producto & {
  ratingPromedio?: number | string | null
  totalResenas?: number | null
}

export default function AIProductCard({
  producto,
  onAdd,
}: {
  producto: ProductoTarjetaAi
  similarity?: number | null
  onAdd?: (producto: Producto) => void
  whatsappNumber?: string
}) {
  const [added, setAdded] = useState(false)

  function handleAdd(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault()
    if (added) return
    onAdd?.(producto)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  const precioFinal = producto.precioOferta ?? producto.precio
  const enOferta = producto.precioOferta != null && producto.precioOferta < producto.precio
  const imgSrc = producto.imagenUrl
    ? getOptimizedUrl(producto.imagenUrl, { width: 320, quality: 80 })
    : null

  const availableBtnStyle = producto.stock === 0
    ? { background: '#F3F4F6', color: '#9CA3AF', border: '1px solid #E5E7EB', cursor: 'not-allowed' as const }
    : { background: '#E73B33', color: '#fff', border: 'none' }
  const btnStyle = added
    ? { background: 'rgba(34,197,94,0.10)', color: '#178A50', border: '1px solid rgba(34,197,94,0.25)' }
    : availableBtnStyle
  const addLabel = added ? 'Agregado' : (producto.stock === 0 ? 'Sin stock' : 'Agregar')

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
      <Link to={`/productos/${producto.id}`} className="block group">
        <div className="aspect-square w-full overflow-hidden" style={{ background: '#F3F4F6' }}>
          {imgSrc
            ? (
              <img
                src={imgSrc}
                alt={producto.nombre}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                loading="lazy"
              />
              )
            : (
              <div className="w-full h-full flex items-center justify-center">
                <HotClickMark size={48} />
              </div>
              )}
        </div>
        <div className="p-3 flex flex-col gap-1">
          <p className="text-sm font-bold leading-snug line-clamp-2" style={{ color: '#111827' }}>
            {producto.nombre}
          </p>
          <div className="flex items-baseline gap-1.5">
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

      <div className="px-3 pb-3">
        <button type="button"
          onClick={handleAdd}
          disabled={producto.stock === 0}
          className="w-full py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95"
          style={btnStyle}
        >
          {addLabel}
        </button>
      </div>
    </div>
  )
}
