import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import { ICONOS_CHECKOUT } from '@/pages/checkout/iconosCheckout'
import { formatPrice } from '@/utils/format'
import FilaProductoCarrito from './FilaProductoCarrito'
import SumaMismaTienda from './SumaMismaTienda'
import type { PaqueteCarrito } from './cartHelpers'
import type { ItemCarrito } from '@/types/carrito'
import type { Producto } from '@/types/producto'

type PaqueteCarritoTarjetaProps = {
  paquete: PaqueteCarrito
  numero: number
  escritorio: boolean
  sugerencia: Producto | null
  onAgregarSugerencia: (producto: Producto) => void
  onCantidad: (item: ItemCarrito, cantidad: number) => void
  onQuitar: (item: ItemCarrito) => void
  onMoverAFavoritos: (item: ItemCarrito) => void
}

/** Aviso verde cuando el paquete lleva 2 o más productos con un solo envío (Figma `37:1524`, `38:1369`). */
function AvisoUnSoloEnvio({ cantidad }: { cantidad: number }) {
  const { t } = useTranslation()
  return (
    <span className="flex w-fit items-center gap-1 rounded-full bg-[var(--hc-success-bg)] px-2 py-[3px] text-[11px] font-semibold leading-[normal] text-hc-success">
      <IconoFigma src={ICONOS_CHECKOUT.paqueteUnEnvio} size={12} />
      {t('cart.unSoloEnvio', { count: cantidad })}
    </span>
  )
}

/** Paquete del carrito (una tienda, un envío): Figma `37:1513` (móvil) y `38:1359` (escritorio). */
export default function PaqueteCarritoTarjeta({
  paquete, numero, escritorio, sugerencia, onAgregarSugerencia, onCantidad, onQuitar, onMoverAFavoritos,
}: PaqueteCarritoTarjetaProps) {
  const { t } = useTranslation()
  const productos = paquete.items.length
  const filas = paquete.items.map((item) => (
    <FilaProductoCarrito
      key={item.cartLineId || String(item.id)}
      item={item}
      escritorio={escritorio}
      onCantidad={onCantidad}
      onQuitar={onQuitar}
      onMoverAFavoritos={onMoverAFavoritos}
    />
  ))
  const titulo = t('cart.paquete', { n: numero, negocio: paquete.negocio })

  if (escritorio) {
    return (
      <section className="flex flex-col overflow-hidden rounded-[14px] border border-hc-n-200 bg-hc-n-0">
        <header className="flex items-center gap-[10px] bg-hc-n-50 px-[18px] py-3 leading-[normal]">
          <IconoFigma src={ICONOS_CHECKOUT.paqueteTienda} size={18} className="text-hc-n-900" />
          <h2 className="font-sans text-[14px] font-semibold tracking-normal text-hc-n-900">{titulo}</h2>
          {productos > 1 && <span className="ml-auto"><AvisoUnSoloEnvio cantidad={productos} /></span>}
        </header>
        {filas}
        <div className="flex items-center gap-2 border-t border-hc-n-200 px-[18px] py-3 leading-[normal]">
          <IconoFigma src={ICONOS_CHECKOUT.envioPaquete} size={16} className="text-hc-n-600" />
          <p className="flex-1 text-[13px] text-hc-n-600">{t('cart.envioNormal')}</p>
          <p className="text-[14px] font-semibold text-hc-n-900">{formatPrice(paquete.envio)}</p>
        </div>
        {sugerencia && <SumaMismaTienda producto={sugerencia} negocio={paquete.negocio} escritorio onAgregar={onAgregarSugerencia} />}
      </section>
    )
  }

  return (
    <>
      <section className="flex flex-col gap-3 rounded-[14px] border border-hc-n-200 bg-hc-n-0 p-[14px]">
        <header className="flex items-center gap-2 leading-[normal]">
          <IconoFigma src={ICONOS_CHECKOUT.paqueteTienda} size={18} className="text-hc-n-900" />
          <h2 className="min-w-0 flex-1 font-sans text-[14px] font-semibold tracking-normal text-hc-n-900">{titulo}</h2>
        </header>
        {productos > 1 && <AvisoUnSoloEnvio cantidad={productos} />}
        {filas}
        <div className="flex items-center gap-2 border-t border-hc-n-200 pt-[10px] leading-[normal]">
          <IconoFigma src={ICONOS_CHECKOUT.envioPaquete} size={16} className="text-hc-n-600" />
          <p className="flex-1 text-[12px] text-hc-n-600">{t('cart.envioNormal')}</p>
          <p className="text-[13px] font-semibold text-hc-n-900">{formatPrice(paquete.envio)}</p>
        </div>
      </section>
      {sugerencia && <SumaMismaTienda producto={sugerencia} negocio={paquete.negocio} escritorio={false} onAgregar={onAgregarSugerencia} />}
    </>
  )
}
