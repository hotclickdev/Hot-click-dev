import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ShoppingCartIcon, ArrowLeftIcon, MinusIcon, PlusIcon } from '@heroicons/react/24/outline'
import tiendaService from '@/services/tiendaService'
import useTiendaStore from '@/store/tiendaStore'

const fmt = (n) => new Intl.NumberFormat('es-CR').format(n)

export default function TiendaProductoPage() {
  const { slug, productoId } = useParams()
  const navigate = useNavigate()
  const { agregarAlCarrito } = useTiendaStore()

  const [producto,  setProducto]  = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [cantidad,  setCantidad]  = useState(1)
  const [agregado,  setAgregado]  = useState(false)
  const [imgActiva, setImgActiva] = useState(0)

  useEffect(() => {
    setLoading(true)
    tiendaService.getProducto(slug, productoId)
      .then(setProducto)
      .catch(() => navigate(`/tienda/${slug}`, { replace: true }))
      .finally(() => setLoading(false))
  }, [slug, productoId])  // eslint-disable-line react-hooks/exhaustive-deps

  const handleAgregar = () => {
    if (!producto) return
    agregarAlCarrito(producto, cantidad)
    setAgregado(true)
    setTimeout(() => setAgregado(false), 1500)
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10 animate-pulse">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="aspect-square rounded-2xl bg-gray-200" />
          <div className="space-y-4 pt-4">
            <div className="h-6 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
            <div className="h-8 bg-gray-200 rounded w-1/3 mt-6" />
          </div>
        </div>
      </div>
    )
  }

  if (!producto) return null

  const imagenes = [
    producto.imagenUrl,
    ...(producto.imagenesAdicionales ?? []),
  ].filter(Boolean)

  const stockDisponible = producto.stock ?? 0

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <Link
        to={`/tienda/${slug}`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Volver al catálogo
      </Link>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Imágenes */}
        <div className="space-y-3">
          <div className="aspect-square rounded-2xl overflow-hidden bg-gray-100">
            {imagenes[imgActiva]
              ? <img
                  src={imagenes[imgActiva]}
                  alt={producto.nombre}
                  className="w-full h-full object-cover"
                />
              : <div className="w-full h-full flex items-center justify-center text-6xl">📦</div>
            }
          </div>
          {imagenes.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {imagenes.map((img, i) => (
                <button type="button"
                  key={i}
                  onClick={() => setImgActiva(i)}
                  className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                    i === imgActiva ? 'border-[var(--t-primary)]' : 'border-transparent'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col gap-4">
          {producto.marcaNombre && (
            <p className="text-sm font-medium uppercase tracking-wide text-gray-400">
              {producto.marcaNombre}
            </p>
          )}
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">
            {producto.nombre}
          </h1>

          {/* Precio */}
          <div className="flex items-baseline gap-3">
            {producto.enOferta && producto.precioOferta ? (
              <>
                <span className="text-3xl font-bold" style={{ color: 'var(--t-primary)' }}>
                  ₡{fmt(producto.precioOferta)}
                </span>
                <span className="text-lg text-gray-400 line-through">₡{fmt(producto.precio)}</span>
                {producto.porcentajeDescuento && (
                  <span className="text-sm font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                    -{producto.porcentajeDescuento}%
                  </span>
                )}
              </>
            ) : (
              <span className="text-3xl font-bold" style={{ color: 'var(--t-primary)' }}>
                ₡{fmt(producto.precio)}
              </span>
            )}
          </div>

          {/* Stock */}
          <p className={`text-sm font-medium ${stockDisponible > 0 ? 'text-green-600' : 'text-red-500'}`}>
            {stockDisponible > 0 ? `${stockDisponible} disponibles` : 'Sin stock'}
          </p>

          {/* Descripción */}
          {producto.descripcion && (
            <p className="text-gray-600 text-sm leading-relaxed">{producto.descripcion}</p>
          )}

          {/* Cantidad + Agregar */}
          {stockDisponible > 0 && (
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-2 border rounded-lg p-1">
                <button type="button"
                  onClick={() => setCantidad(c => Math.max(1, c - 1))}
                  className="p-1 rounded hover:bg-gray-100"
                >
                  <MinusIcon className="h-4 w-4" />
                </button>
                <span className="w-8 text-center font-semibold">{cantidad}</span>
                <button type="button"
                  onClick={() => setCantidad(c => Math.min(stockDisponible, c + 1))}
                  className="p-1 rounded hover:bg-gray-100"
                >
                  <PlusIcon className="h-4 w-4" />
                </button>
              </div>
              <button type="button"
                onClick={handleAgregar}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold transition-colors"
                style={{ backgroundColor: agregado ? '#22c55e' : 'var(--t-secondary)' }}
              >
                <ShoppingCartIcon className="h-5 w-5" />
                {agregado ? '¡Agregado al carrito!' : 'Agregar al carrito'}
              </button>
            </div>
          )}

          {/* Ir al carrito */}
          {agregado && (
            <Link
              to={`/tienda/${slug}/carrito`}
              className="text-center text-sm font-medium underline"
              style={{ color: 'var(--t-accent)' }}
            >
              Ver carrito →
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
