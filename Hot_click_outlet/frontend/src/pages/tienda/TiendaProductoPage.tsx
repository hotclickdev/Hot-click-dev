import { useState, useEffect, type Dispatch, type SetStateAction } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeftIcon, MinusIcon, PlusIcon } from '@heroicons/react/24/outline'
import tiendaService from '@/services/tiendaService'
import useTiendaStore from '@/store/tiendaStore'
import { formatPrice } from '@/utils/format'
import TiendaPlaceholder from './TiendaPlaceholder'
import TiendaBuyActions from './TiendaBuyActions'
import type { Producto } from '@/types/producto'

export default function TiendaProductoPage() {
  const { slug, productoId } = useParams()
  const navigate = useNavigate()
  const { agregarAlCarrito } = useTiendaStore()
  const [producto, setProducto] = useState<Producto | null>(null)
  const [loading, setLoading] = useState(true)
  const [cantidad, setCantidad] = useState(1)
  const [agregado, setAgregado] = useState(false)
  const [imgActiva, setImgActiva] = useState(0)

  useEffect(() => {
    setLoading(true)
    tiendaService.getProducto(slug as string, productoId as string)
      .then((p) => setProducto(p ?? null))
      .catch(() => navigate(`/tienda/${slug}`, { replace: true }))
      .finally(() => setLoading(false))
  }, [slug, productoId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAgregar = () => {
    if (!producto) return
    agregarAlCarrito(producto, cantidad)
    setAgregado(true)
    setTimeout(() => setAgregado(false), 1500)
  }

  const handleComprarAhora = () => {
    if (!producto) return
    if (!agregado) agregarAlCarrito(producto, cantidad)
    navigate(`/tienda/${slug}/checkout`)
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10 animate-pulse">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="aspect-square rounded-2xl bg-[var(--t-hover)]" />
          <div className="space-y-4 pt-4">
            <div className="h-6 bg-[var(--t-hover)] rounded w-3/4" />
            <div className="h-4 bg-[var(--t-hover)] rounded w-1/2" />
            <div className="h-8 bg-[var(--t-hover)] rounded w-1/3 mt-6" />
          </div>
        </div>
      </div>
    )
  }

  if (!producto) return null

  const imagenes = [producto.imagenUrl, ...(((producto as Producto & { imagenesAdicionales?: string[] }).imagenesAdicionales) ?? [])].filter(Boolean) as string[]
  const stockDisponible = producto.stock ?? 0

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <Link
        to={`/tienda/${slug}`}
        className="inline-flex items-center gap-1 text-sm text-[var(--t-muted)] hover:text-[var(--t-text)] mb-6 min-h-[44px]"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Volver al catálogo
      </Link>

      <div className="grid md:grid-cols-2 gap-8">
        <GaleriaProducto imagenes={imagenes} imgActiva={imgActiva} onElegir={setImgActiva} nombre={producto.nombre} />
        <InfoProducto
          producto={producto}
          stockDisponible={stockDisponible}
          cantidad={cantidad}
          setCantidad={setCantidad}
          agregado={agregado}
          onAgregar={handleAgregar}
          onComprarAhora={handleComprarAhora}
          slug={slug}
        />
      </div>
    </div>
  )
}

function GaleriaProducto({
  imagenes, imgActiva, onElegir, nombre,
}: {
  imagenes: string[]
  imgActiva: number
  onElegir: (i: number) => void
  nombre: string
}) {
  return (
    <div className="space-y-3">
      <div className="aspect-square rounded-2xl overflow-hidden bg-[var(--t-hover)]">
        {imagenes[imgActiva]
          ? <img src={imagenes[imgActiva]} alt={nombre} className="w-full h-full object-cover" />
          : (
            <div className="w-full h-full flex items-center justify-center text-[var(--t-muted)]">
              <TiendaPlaceholder className="w-16 h-16" />
            </div>
            )}
      </div>
      {imagenes.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {imagenes.map((img, i) => (
            <button
              type="button"
              key={img}
              onClick={() => onElegir(i)}
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
  )
}

function InfoProducto({
  producto, stockDisponible, cantidad, setCantidad, agregado, onAgregar, onComprarAhora, slug,
}: {
  producto: Producto
  stockDisponible: number
  cantidad: number
  setCantidad: Dispatch<SetStateAction<number>>
  agregado: boolean
  onAgregar: () => void
  onComprarAhora: () => void
  slug: string | undefined
}) {
  return (
    <div className="flex flex-col gap-4">
      {producto.marcaNombre && (
        <p className="text-sm font-medium uppercase tracking-wide text-[var(--t-muted)]">{producto.marcaNombre}</p>
      )}
      <h1 className="text-2xl font-bold text-[var(--t-text)] leading-tight">{producto.nombre}</h1>
      <PrecioProducto producto={producto} />
      <p className={`text-sm font-medium ${stockDisponible > 0 ? 'text-[var(--hc-success)]' : 'text-[var(--hc-danger)]'}`}>
        {stockDisponible > 0 ? `${stockDisponible} disponibles` : 'Sin stock'}
      </p>
      {producto.descripcion && (
        <p className="text-[var(--t-muted)] text-sm leading-relaxed">{producto.descripcion}</p>
      )}
      {stockDisponible > 0 && (
        <div className="flex items-center gap-2 border border-[var(--t-border)] rounded-lg p-1 w-fit">
          <button type="button" onClick={() => setCantidad((c) => Math.max(1, c - 1))} className="min-h-[44px] min-w-[44px] rounded hover:bg-[var(--t-hover)]" aria-label="Menos">
            <MinusIcon className="h-4 w-4 mx-auto" />
          </button>
          <span className="w-8 text-center font-semibold">{cantidad}</span>
          <button type="button" onClick={() => setCantidad((c) => Math.min(stockDisponible, c + 1))} className="min-h-[44px] min-w-[44px] rounded hover:bg-[var(--t-hover)]" aria-label="Más">
            <PlusIcon className="h-4 w-4 mx-auto" />
          </button>
        </div>
      )}
      <TiendaBuyActions
        stockDisponible={stockDisponible}
        agregado={agregado}
        onAgregar={onAgregar}
        onComprarAhora={onComprarAhora}
      />
      {agregado && (
        <Link to={`/tienda/${slug}/carrito`} className="text-center text-sm font-medium underline" style={{ color: 'var(--t-accent)' }}>
          Ver pedido de esta tienda
        </Link>
      )}
    </div>
  )
}

function PrecioProducto({ producto }: { producto: Producto }) {
  if (producto.enOferta && producto.precioOferta) {
    return (
      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-bold" style={{ color: 'var(--t-primary)' }}>{formatPrice(producto.precioOferta)}</span>
        <span className="text-lg text-[var(--t-muted)] line-through">{formatPrice(producto.precio)}</span>
        {producto.porcentajeDescuento && (
          <span className="text-sm font-semibold text-[var(--hc-success)] bg-[var(--hc-success-bg)] px-2 py-0.5 rounded-full">
            -{producto.porcentajeDescuento}%
          </span>
        )}
      </div>
    )
  }
  return (
    <span className="text-3xl font-bold" style={{ color: 'var(--t-primary)' }}>{formatPrice(producto.precio)}</span>
  )
}
