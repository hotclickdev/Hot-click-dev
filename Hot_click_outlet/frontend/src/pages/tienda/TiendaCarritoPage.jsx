import { Link, useParams } from 'react-router-dom'
import { TrashIcon, MinusIcon, PlusIcon } from '@heroicons/react/24/outline'
import useTiendaStore from '@/store/tiendaStore'
import { formatPrice } from '@/utils/format'
import { CLASE_TARJETA_TIENDA } from './tiendaTheme'
import TiendaPlaceholder from './TiendaPlaceholder'

export default function TiendaCarritoPage() {
  const { slug } = useParams()
  const { carrito, actualizarCantidad, quitarDelCarrito, totalImporte } = useTiendaStore()

  if (carrito.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center text-[var(--t-muted)]">
        <TiendaPlaceholder className="mx-auto h-16 w-16 mb-4 opacity-40" />
        <h2 className="text-xl font-semibold text-[var(--t-text)] mb-2">Este pedido está vacío</h2>
        <p className="text-sm mb-6">Agregá productos de esta tienda. No se mezcla con el pedido del marketplace.</p>
        <Link
          to={`/tienda/${slug}`}
          className="inline-flex items-center justify-center px-6 py-3 min-h-[44px] rounded-xl text-white font-semibold"
          style={{ backgroundColor: 'var(--t-primary)' }}
        >
          Ver productos
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <h1 className="text-xl font-bold text-[var(--t-text)]">Pedido de esta tienda</h1>
      <ul className="space-y-3">
        {carrito.map(({ producto, cantidad }) => (
          <LineaPedido
            key={producto.id}
            producto={producto}
            cantidad={cantidad}
            onCantidad={actualizarCantidad}
            onQuitar={quitarDelCarrito}
          />
        ))}
      </ul>
      <div className={`${CLASE_TARJETA_TIENDA} p-5 space-y-3`}>
        <div className="flex justify-between text-sm text-[var(--t-muted)]">
          <span>Subtotal ({carrito.reduce((s, i) => s + i.cantidad, 0)} ítems)</span>
          <span className="font-semibold text-[var(--t-text)]">{formatPrice(totalImporte())}</span>
        </div>
        <p className="text-xs text-[var(--t-muted)]">El costo de envío se confirma con el vendedor.</p>
        <Link
          to={`/tienda/${slug}/checkout`}
          className="block w-full text-center py-3.5 min-h-[44px] rounded-xl text-white font-semibold hover:opacity-90"
          style={{ backgroundColor: 'var(--t-primary)' }}
        >
          Proceder al pago
        </Link>
        <Link to={`/tienda/${slug}`} className="block text-center text-sm underline text-[var(--t-muted)] mt-1">
          Seguir comprando
        </Link>
      </div>
    </div>
  )
}

function LineaPedido({ producto, cantidad, onCantidad, onQuitar }) {
  return (
    <li className={`${CLASE_TARJETA_TIENDA} flex gap-4 p-4`}>
      <div className="w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-[var(--t-hover)]">
        {producto.imagenUrl
          ? <img src={producto.imagenUrl} alt="" className="w-full h-full object-cover" />
          : (
            <div className="w-full h-full flex items-center justify-center text-[var(--t-muted)]">
              <TiendaPlaceholder className="w-8 h-8" />
            </div>
            )}
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <p className="font-medium text-[var(--t-text)] text-sm line-clamp-2">{producto.nombre}</p>
        <p className="font-bold text-sm" style={{ color: 'var(--t-primary)' }}>{formatPrice(producto.precio)}</p>
        <div className="flex items-center gap-3 mt-auto">
          <div className="flex items-center gap-1 border border-[var(--t-border)] rounded-lg">
            <button type="button" onClick={() => onCantidad(producto.id, cantidad - 1)} className="min-h-[44px] min-w-[44px] hover:bg-[var(--t-hover)] rounded-l-lg" aria-label="Menos">
              <MinusIcon className="h-3.5 w-3.5 mx-auto" />
            </button>
            <span className="w-8 text-center text-sm font-semibold">{cantidad}</span>
            <button type="button" onClick={() => onCantidad(producto.id, cantidad + 1)} className="min-h-[44px] min-w-[44px] hover:bg-[var(--t-hover)] rounded-r-lg" aria-label="Más">
              <PlusIcon className="h-3.5 w-3.5 mx-auto" />
            </button>
          </div>
          <button type="button" onClick={() => onQuitar(producto.id)} className="text-[var(--t-muted)] hover:text-[var(--hc-danger)] ml-auto min-h-[44px] min-w-[44px]" aria-label="Eliminar">
            <TrashIcon className="h-4 w-4 mx-auto" />
          </button>
        </div>
      </div>
      <p className="shrink-0 font-bold text-sm text-[var(--t-text)] self-start">{formatPrice(producto.precio * cantidad)}</p>
    </li>
  )
}
