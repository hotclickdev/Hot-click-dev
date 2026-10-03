import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import useTiendaStore from '@/store/tiendaStore'
import tiendaService from '@/services/tiendaService'
import { formatPrice } from '@/utils/format'
import TiendaPlaceholder from './TiendaPlaceholder'
import TiendaBuyActions from './TiendaBuyActions'
import { BotonTienda } from './PiezasTienda'
import type { Producto } from '@/types/producto'

/** Productos con 3 o menos se anuncian como "Quedan N" en ámbar (mismo umbral que la ficha del marketplace). */
const STOCK_BAJO = 3

/**
 * Ficha del producto dentro de la tienda pública (derivado de Figma `28:839` móvil y `29:2072` escritorio):
 * foto cuadrada, etiqueta de marca, título y precio en Sora, punto de stock y barra de compra fija en móvil.
 * Comprar ahora y Agregar al pedido funcionan igual que antes (pedido aislado de la tienda).
 */
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
      <div className="mx-auto max-w-[1232px] lg:px-4 lg:py-8" aria-busy="true">
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-10">
          <div className="aspect-square animate-pulse bg-hc-n-100 lg:rounded-[16px]" />
          <div className="space-y-3 px-4 lg:px-0 lg:pt-4">
            <div className="h-7 w-3/4 animate-pulse rounded-md bg-hc-n-200" />
            <div className="h-8 w-1/3 animate-pulse rounded-md bg-hc-n-200" />
            <div className="h-4 w-1/2 animate-pulse rounded-md bg-hc-n-100" />
          </div>
        </div>
      </div>
    )
  }

  if (!producto) return null

  const imagenes = [producto.imagenUrl, ...(((producto as Producto & { imagenesAdicionales?: string[] }).imagenesAdicionales) ?? [])].filter(Boolean) as string[]
  const stockDisponible = producto.stock ?? 0
  const precioUnitario = producto.enOferta && producto.precioOferta ? producto.precioOferta : producto.precio

  return (
    <div className="mx-auto max-w-[1232px] bg-hc-n-0 pb-32 lg:bg-transparent lg:px-4 lg:py-8 lg:pb-12">
      <div className="grid lg:grid-cols-2 lg:gap-10">
        <GaleriaProducto imagenes={imagenes} imgActiva={imgActiva} onElegir={setImgActiva} nombre={producto.nombre} />
        <div className="flex flex-col gap-[10px] px-4 pb-4 pt-[18px] leading-[normal] lg:gap-4 lg:p-0 lg:pt-2">
          {producto.marcaNombre && (
            <span className="inline-flex w-fit rounded-full bg-hc-n-100 px-2 py-[3px] text-[11px] font-semibold leading-[13px] text-hc-n-600 wrap-anywhere">
              {producto.marcaNombre}
            </span>
          )}
          <h1 className="font-display text-[22px] font-bold leading-7 tracking-normal text-hc-n-900 wrap-anywhere lg:text-[32px] lg:leading-[38px]">
            {producto.nombre}
          </h1>
          <PrecioProducto producto={producto} />
          <Stock stock={stockDisponible} />
          {producto.descripcion && (
            <p className="text-[14px] leading-[21px] text-hc-n-600 wrap-anywhere lg:text-[15px] lg:leading-[23px]">{producto.descripcion}</p>
          )}
          <div className="hidden lg:block">
            <TiendaBuyActions
              variante="inline"
              slug={slug as string}
              stockDisponible={stockDisponible}
              cantidad={cantidad}
              onCantidad={setCantidad}
              total={formatPrice(precioUnitario * cantidad)}
              agregado={agregado}
              onAgregar={handleAgregar}
              onComprarAhora={handleComprarAhora}
            />
          </div>
          {stockDisponible <= 0 && (
            <div className="mt-2">
              <BotonTienda variante="secundario" to={`/tienda/${slug}`}>Ver otros productos de la tienda</BotonTienda>
            </div>
          )}
        </div>
      </div>
      <div className="lg:hidden">
        <TiendaBuyActions
          variante="barra"
          slug={slug as string}
          stockDisponible={stockDisponible}
          cantidad={cantidad}
          onCantidad={setCantidad}
          total={formatPrice(precioUnitario * cantidad)}
          agregado={agregado}
          onAgregar={handleAgregar}
          onComprarAhora={handleComprarAhora}
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
    <div className="flex flex-col gap-3">
      <div className="aspect-square w-full overflow-hidden bg-hc-n-100 lg:rounded-[16px] lg:border lg:border-hc-n-200">
        {imagenes[imgActiva]
          ? <img src={imagenes[imgActiva]} alt={nombre} className="size-full object-cover" />
          : (
            <div className="flex size-full items-center justify-center">
              <TiendaPlaceholder className="size-16" />
            </div>
            )}
      </div>
      {imagenes.length > 1 && (
        <div className="flex gap-2 overflow-x-auto px-4 lg:px-0">
          {imagenes.map((img, i) => (
            <button
              type="button"
              key={img}
              onClick={() => onElegir(i)}
              aria-label={`Foto ${i + 1} de ${imagenes.length}`}
              aria-current={i === imgActiva ? 'true' : undefined}
              className={`size-16 shrink-0 overflow-hidden rounded-[10px] ${
                i === imgActiva ? 'border-2 border-hc-blue-600' : 'border border-hc-n-200'
              }`}
            >
              <img src={img} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Stock({ stock }: { stock: number }) {
  const clase = stock <= 0 ? 'text-hc-danger' : stock <= STOCK_BAJO ? 'text-hc-warning' : 'text-hc-success-text'
  const texto = stock <= 0 ? 'Agotado' : stock <= STOCK_BAJO ? `Quedan ${stock}` : `${stock} disponibles`
  return (
    <p className={`flex items-center gap-[6px] text-[13px] font-medium lg:text-[14px] ${clase}`}>
      <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-current" />
      {texto}
    </p>
  )
}

function PrecioProducto({ producto }: { producto: Producto }) {
  const oferta = Boolean(producto.enOferta && producto.precioOferta)
  return (
    <div className="flex flex-wrap items-baseline gap-x-[10px] gap-y-1">
      <p className="font-display text-[26px] font-extrabold leading-[33px] text-hc-n-900 lg:text-[34px] lg:leading-[43px]">
        {formatPrice(oferta ? (producto.precioOferta as number) : producto.precio)}
      </p>
      {oferta && (
        <s className="text-[13px] text-hc-n-600 lg:text-[15px]">
          <span className="sr-only">Precio anterior </span>
          {formatPrice(producto.precio)}
        </s>
      )}
      {oferta && producto.porcentajeDescuento ? (
        <span className="rounded-full bg-hc-red-50 px-2 py-[3px] text-[11px] font-semibold leading-[13px] text-hc-red-600">
          -{producto.porcentajeDescuento}%
        </span>
      ) : null}
    </div>
  )
}
