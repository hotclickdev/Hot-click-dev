import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import { ICONOS_COMPRA } from '@/pages/checkout/iconosCompra'
import { costoEnvio, opcionesEntrega, type PaqueteCompra } from '@/pages/checkout/paquetesCompra'
import { useTextosEntrega } from '@/pages/checkout/useTextosEntrega'
import { formatPrice } from '@/utils/format'
import type { ItemCarrito } from '@/types/carrito'
import ItemPaquete from './ItemPaquete'

type PaqueteCarritoProps = {
  paquete: PaqueteCompra<ItemCarrito>
  metodoEnvio: string
  onCambiarCantidad: (item: ItemCarrito, cantidad: number) => void
  onEliminar: (item: ItemCarrito) => void
  onMoverAFavoritos: (item: ItemCarrito) => void
  /** Franja «Sumá otro producto» que en desktop va dentro del paquete. */
  sugerenciaDesktop?: ReactNode
}

function ChipUnSoloEnvio({ cantidad, className }: { cantidad: number; className: string }) {
  const { t } = useTranslation()
  return (
    <span className={`items-center gap-[4px] rounded-full bg-hc-green-50 px-[8px] py-[3px] text-[11px] font-semibold text-hc-green-600 ${className}`}>
      <IconoFigma src={ICONOS_COMPRA.check} size={12} />
      {t('compra.carrito.unSoloEnvio', { count: cantidad })}
    </span>
  )
}

/** Paquete de un negocio en el carrito: móvil `37:1513`, desktop `38:1359`. */
export default function PaqueteCarrito({
  paquete, metodoEnvio, onCambiarCantidad, onEliminar, onMoverAFavoritos, sugerenciaDesktop,
}: PaqueteCarritoProps) {
  const { t } = useTranslation()
  const textos = useTextosEntrega()
  const opcion = opcionesEntrega(paquete).find((o) => o.metodo === metodoEnvio)
  const variosProductos = paquete.cantidadProductos > 1

  return (
    <section className="flex w-full flex-col gap-[12px] overflow-hidden rounded-[14px] border border-hc-n-200 bg-hc-n-0 p-[14px] lg:gap-0 lg:p-0">
      <header className="flex items-center gap-[8px] lg:gap-[10px] lg:bg-hc-n-50 lg:px-[18px] lg:py-[12px]">
        <IconoFigma src={ICONOS_COMPRA.tienda} size={18} className="text-hc-n-900" />
        <div className="flex min-w-0 flex-1 flex-col lg:flex-row lg:items-center lg:gap-[10px]">
          <h2 className="text-[14px] font-semibold text-hc-n-900">
            {t('compra.carrito.paqueteTitulo', { numero: paquete.numero, tienda: paquete.nombre })}
          </h2>
          {paquete.provincia ? (
            <p className="flex items-center gap-[4px] text-[12px] text-hc-n-500">
              <IconoFigma src={ICONOS_COMPRA.origen} size={12} />
              {t('compra.carrito.saleDe', { provincia: paquete.provincia })}
            </p>
          ) : null}
        </div>
        {variosProductos ? <ChipUnSoloEnvio cantidad={paquete.cantidadProductos} className="hidden lg:flex" /> : null}
      </header>
      {variosProductos ? <ChipUnSoloEnvio cantidad={paquete.cantidadProductos} className="flex self-start lg:hidden" /> : null}
      <div className="flex flex-col gap-[12px] lg:gap-0">
        {paquete.items.map((item) => (
          <ItemPaquete
            key={item.cartLineId || String(item.id)}
            item={item}
            onCambiarCantidad={onCambiarCantidad}
            onEliminar={onEliminar}
            onMoverAFavoritos={onMoverAFavoritos}
          />
        ))}
      </div>
      <div className="flex items-center gap-[8px] border-t border-hc-n-200 pt-[10px] lg:px-[18px] lg:py-[12px]">
        <IconoFigma src={ICONOS_COMPRA.envio} size={16} className="text-hc-n-600" />
        <p className="min-w-0 flex-1 text-[12px] text-hc-n-600 lg:text-[13px]">
          {opcion ? `${textos.titulo(opcion.metodo)} · ${textos.detalle(opcion)}` : ''}
        </p>
        <p className="text-[13px] font-semibold text-hc-n-900 lg:text-[14px]">{formatPrice(costoEnvio(metodoEnvio))}</p>
      </div>
      {sugerenciaDesktop}
    </section>
  )
}
