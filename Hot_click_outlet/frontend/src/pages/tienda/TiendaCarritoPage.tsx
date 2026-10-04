import { useParams } from 'react-router-dom'
import IconoFigma from '@/components/comprador/IconoFigma'
import EstadoVacio from '@/components/comprador/estados/EstadoVacio'
import { ICONOS_CHECKOUT } from '@/pages/checkout/iconosCheckout'
import useTiendaStore from '@/store/tiendaStore'
import { formatPrice } from '@/utils/format'
import { BotonTienda, CabeceraTarjeta, CantidadTienda, CLASE_TARJETA, FotoTienda, TituloTienda } from './PiezasTienda'
import type { Producto } from '@/types/producto'
import type { Id } from '@/types/api'

/**
 * Pedido aislado de la tienda (derivado de Figma: carrito `28:989` móvil y `38:1373` escritorio): filas de
 * producto con foto de 10, cantidad y papelera del Figma, resumen en tarjeta clara y botón rojo.
 * No se mezcla con el pedido del marketplace.
 */
export default function TiendaCarritoPage() {
  const { slug } = useParams()
  const { carrito, actualizarCantidad, quitarDelCarrito, totalImporte, empresa } = useTiendaStore()

  if (carrito.length === 0) {
    return (
      <div className="py-10">
        <EstadoVacio
          nivel="h1"
          icono={<IconoFigma src={ICONOS_CHECKOUT.carritoVacio} size={28} />}
          titulo="Este pedido está vacío"
          texto="Agregá productos de esta tienda. No se mezcla con el pedido del marketplace."
          accion={{ texto: 'Ver productos', to: `/tienda/${slug}` }}
        />
      </div>
    )
  }

  const unidades = carrito.reduce((s, i) => s + i.cantidad, 0)

  return (
    <div className="mx-auto flex max-w-[1232px] flex-col gap-4 px-4 py-5 lg:grid lg:grid-cols-[1fr_380px] lg:items-start lg:gap-6 lg:py-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <TituloTienda>Pedido de esta tienda</TituloTienda>
          <p className="text-[13px] leading-[18px] text-hc-n-600">
            {empresa?.nombreComercial ?? slug} · no se mezcla con el pedido del marketplace
          </p>
        </div>
        <ul className={`${CLASE_TARJETA} flex flex-col overflow-hidden`}>
          {carrito.map(({ producto, cantidad }) => (
            <LineaPedido key={producto.id} producto={producto} cantidad={cantidad} onCantidad={actualizarCantidad} onQuitar={quitarDelCarrito} />
          ))}
        </ul>
      </div>
      <section className={`${CLASE_TARJETA} flex flex-col overflow-hidden lg:sticky lg:top-20`}>
        <CabeceraTarjeta>Resumen</CabeceraTarjeta>
        <div className="flex flex-col gap-3 px-[14px] py-[14px] leading-[normal]">
          <div className="flex justify-between text-[14px] text-hc-n-600">
            <span>Subtotal ({unidades} {unidades === 1 ? 'producto' : 'productos'})</span>
            <span className="font-semibold text-hc-n-900">{formatPrice(totalImporte())}</span>
          </div>
          <p className="text-[12px] leading-4 text-hc-n-600">El costo de envío se confirma con el vendedor.</p>
          <div className="flex items-center justify-between border-t border-hc-n-200 pt-3 text-hc-n-900">
            <span className="text-[15px] font-semibold">Total</span>
            <span className="font-display text-[17px] font-bold">{formatPrice(totalImporte())}</span>
          </div>
          <BotonTienda variante="primario" to={`/tienda/${slug}/checkout`}>Continuar con la compra</BotonTienda>
          <BotonTienda variante="secundario" to={`/tienda/${slug}`}>Seguir comprando</BotonTienda>
        </div>
      </section>
    </div>
  )
}

function LineaPedido({
  producto, cantidad, onCantidad, onQuitar,
}: {
  producto: Producto
  cantidad: number
  onCantidad: (id: Id, cantidad: number) => void
  onQuitar: (id: Id) => void
}) {
  return (
    <li className="flex items-start gap-3 border-t border-hc-n-200 px-[14px] py-[14px] first:border-t-0 lg:items-center lg:gap-4 lg:px-[18px]">
      <FotoTienda src={producto.imagenUrl} tamano="size-[60px] lg:size-[72px]" />
      <div className="flex min-w-0 flex-1 flex-col items-start gap-[6px] leading-[normal]">
        <p className="w-full text-[14px] font-medium leading-[18px] text-hc-n-900 wrap-anywhere lg:text-[15px]">{producto.nombre}</p>
        <p className="text-[12px] text-hc-n-600">{formatPrice(producto.precio)} c/u</p>
        <div className="flex items-center gap-3">
          <CantidadTienda
            cantidad={cantidad}
            etiquetaMenos={`Uno menos de ${producto.nombre}`}
            etiquetaMas={`Uno más de ${producto.nombre}`}
            onCambiar={(c) => onCantidad(producto.id as Id, c)}
          />
          <button
            type="button"
            onClick={() => onQuitar(producto.id as Id)}
            aria-label={`Quitar ${producto.nombre}`}
            className="relative flex size-4 items-center justify-center text-hc-n-600 after:absolute after:-inset-3 hover:text-hc-danger"
          >
            <IconoFigma src={ICONOS_CHECKOUT.eliminar} size={16} />
          </button>
        </div>
      </div>
      <p className="shrink-0 font-display text-[15px] font-bold leading-[normal] text-hc-n-900 lg:text-[17px]">{formatPrice(producto.precio * cantidad)}</p>
    </li>
  )
}
