import { Link } from 'react-router-dom'
import { CLASE_TARJETA_TIENDA } from './tiendaTheme'
import TiendaPlaceholder from './TiendaPlaceholder'
import { esProductoCotizable, textoPrecioProducto } from '@/utils/precioProducto'
import type { Producto } from '@/types/producto'

/** Tarjeta de catálogo de la tienda del vendedor. */
export default function TiendaProductoCard({
  slug, producto, agregado, onAgregar,
}: {
  slug: string
  producto: Producto
  agregado: boolean
  onAgregar: (producto: Producto) => void
}) {
  return (
    <article className={`${CLASE_TARJETA_TIENDA} overflow-hidden flex flex-col group`}>
      <Link to={`/tienda/${slug}/producto/${producto.id}`} className="block overflow-hidden aspect-square bg-[var(--t-hover)]">
        {producto.imagenUrl
          ? (
            <img
              src={producto.imagenUrl}
              alt={producto.nombre}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            )
          : (
            <div className="w-full h-full flex items-center justify-center text-[var(--t-muted)]">
              <TiendaPlaceholder className="w-12 h-12" />
            </div>
            )}
      </Link>
      <div className="p-3 flex flex-col flex-1 gap-2">
        <Link to={`/tienda/${slug}/producto/${producto.id}`}>
          <h3 className="text-sm font-medium text-[var(--t-text)] line-clamp-2 leading-snug hover:underline">
            {producto.nombre}
          </h3>
        </Link>
        <p className="text-base font-bold mt-auto" style={{ color: 'var(--t-primary)' }}>
          {textoPrecioProducto(producto)}
        </p>
        {esProductoCotizable(producto) ? (
          <Link
            to={`/tienda/${slug}/producto/${producto.id}`}
            className="w-full py-2 min-h-[44px] rounded-lg text-white text-xs font-semibold text-center"
            style={{ backgroundColor: 'var(--t-primary)' }}
          >
            Personalizar
          </Link>
        ) : (
        <button
          type="button"
          onClick={() => onAgregar(producto)}
          className="w-full py-2 min-h-[44px] rounded-lg text-white text-xs font-semibold transition-opacity"
          style={{ backgroundColor: agregado ? 'var(--hc-success)' : 'var(--t-primary)' }}
        >
          {agregado ? 'Agregado al pedido' : 'Agregar al pedido'}
        </button>
        )}
      </div>
    </article>
  )
}
