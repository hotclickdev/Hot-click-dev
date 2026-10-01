import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import { fotoProducto } from '@/components/comprador/productCardHelpers'
import { ICONOS_CHECKOUT } from '@/pages/checkout/iconosCheckout'
import { formatPrice } from '@/utils/format'
import type { Producto } from '@/types/producto'

type SumaMismaTiendaProps = {
  producto: Producto
  negocio: string
  escritorio: boolean
  onAgregar: (producto: Producto) => void
}

/** "Sumá otro producto de la misma tienda": Figma `37:1595` (móvil) y `38:1439` (escritorio). */
export default function SumaMismaTienda({ producto, negocio, escritorio, onAgregar }: SumaMismaTiendaProps) {
  const { t } = useTranslation()
  const foto = fotoProducto(producto)
  const contenedor = escritorio ? 'gap-3 px-[18px] py-3' : 'gap-[10px] rounded-[14px] p-3'
  const tamanoFoto = escritorio ? 'size-11' : 'size-12'
  return (
    <div className={`flex items-center bg-hc-blue-50 ${contenedor}`}>
      {foto ? (
        <img src={foto} alt="" className={`shrink-0 rounded-lg object-cover ${tamanoFoto}`} />
      ) : (
        <span aria-hidden="true" className={`shrink-0 rounded-lg bg-hc-n-200 ${tamanoFoto}`} />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className={`flex items-center gap-1 font-semibold text-hc-blue-600 ${escritorio ? 'text-[13px] leading-[normal]' : 'text-[12px] leading-4'}`}>
          <IconoFigma src={ICONOS_CHECKOUT.sumarDestello} size={13} />
          <span className="min-w-0 flex-1">{t('cart.sumarOtro', { negocio })}</span>
        </p>
        <p className="text-[12px] leading-[normal] text-hc-n-600">{`${producto.nombre} · ${formatPrice(producto.precio)}`}</p>
      </div>
      <button
        type="button"
        onClick={() => onAgregar(producto)}
        className="flex shrink-0 items-center gap-1 rounded-[10px] bg-hc-red-500 py-2 pl-[10px] pr-3 text-[12px] font-semibold leading-[normal] text-hc-n-0"
      >
        <IconoFigma src={ICONOS_CHECKOUT.sumarMas} size={13} className="text-hc-n-0" />
        {t('cart.agregar')}
      </button>
    </div>
  )
}
