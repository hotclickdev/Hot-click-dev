import { Link, useParams } from 'react-router-dom'
import { TrashIcon, MinusIcon, PlusIcon, ShoppingCartIcon } from '@heroicons/react/24/outline'
import useTiendaStore from '@/store/tiendaStore'

const fmt = (n) => new Intl.NumberFormat('es-CR').format(n)

export default function TiendaCarritoPage() {
  const { slug } = useParams()
  const { carrito, actualizarCantidad, quitarDelCarrito, totalImporte } = useTiendaStore()

  if (carrito.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center text-gray-400">
        <ShoppingCartIcon className="mx-auto h-16 w-16 mb-4 opacity-30" />
        <h2 className="text-xl font-semibold text-gray-600 mb-2">Tu carrito está vacío</h2>
        <p className="text-sm mb-6">Agrega productos del catálogo para comenzar tu pedido.</p>
        <Link
          to={`/tienda/${slug}`}
          className="inline-block px-6 py-3 rounded-xl text-white font-semibold"
          style={{ backgroundColor: 'var(--t-primary)' }}
        >
          Ver productos
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <h1 className="text-xl font-bold text-gray-800">Tu carrito</h1>

      {/* Ítems */}
      <ul className="space-y-3">
        {carrito.map(({ producto, cantidad }) => (
          <li key={producto.id} className="flex gap-4 bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-gray-100">
              {producto.imagenUrl
                ? <img src={producto.imagenUrl} alt={producto.nombre} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-3xl">📦</div>
              }
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-1">
              <p className="font-medium text-gray-800 text-sm line-clamp-2">{producto.nombre}</p>
              <p className="font-bold text-sm" style={{ color: 'var(--t-primary)' }}>
                ₡{fmt(producto.precio)}
              </p>
              <div className="flex items-center gap-3 mt-auto">
                <div className="flex items-center gap-1 border rounded-lg">
                  <button type="button"
                    onClick={() => actualizarCantidad(producto.id, cantidad - 1)}
                    className="p-1 hover:bg-gray-100 rounded-l-lg"
                  >
                    <MinusIcon className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-8 text-center text-sm font-semibold">{cantidad}</span>
                  <button type="button"
                    onClick={() => actualizarCantidad(producto.id, cantidad + 1)}
                    className="p-1 hover:bg-gray-100 rounded-r-lg"
                  >
                    <PlusIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
                <button type="button"
                  onClick={() => quitarDelCarrito(producto.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors ml-auto"
                  aria-label="Eliminar"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className="shrink-0 font-bold text-sm text-gray-700 self-start">
              ₡{fmt(producto.precio * cantidad)}
            </p>
          </li>
        ))}
      </ul>

      {/* Resumen */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 space-y-3">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Subtotal ({carrito.reduce((s, i) => s + i.cantidad, 0)} ítems)</span>
          <span className="font-semibold text-gray-900">₡{fmt(totalImporte())}</span>
        </div>
        <p className="text-xs text-gray-400">El costo de envío se confirma con el vendedor.</p>
        <Link
          to={`/tienda/${slug}/checkout`}
          className="block w-full text-center py-3.5 rounded-xl text-white font-semibold transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--t-primary)' }}
        >
          Proceder al pago
        </Link>
        <Link
          to={`/tienda/${slug}`}
          className="block text-center text-sm underline text-gray-500 mt-1"
        >
          Seguir comprando
        </Link>
      </div>
    </div>
  )
}
