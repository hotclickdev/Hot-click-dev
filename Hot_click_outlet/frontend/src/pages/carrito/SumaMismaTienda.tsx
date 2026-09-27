import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import { fotoProducto } from '@/components/comprador/productCardHelpers'
import { ICONOS_COMPRA } from '@/pages/checkout/iconosCompra'
import { formatPrice } from '@/utils/format'
import type { Producto } from '@/types/producto'

type SumaMismaTiendaProps = {
  producto: Producto
  tienda: string
  onAgregar: (producto: Producto) => void
  /** `movil`: tarjeta suelta (`37:1595`); `desktop`: franja dentro del paquete (`38:1439`). */
  variante: 'movil' | 'desktop'
  className?: string
}

const ESTILO = {
  movil: { caja: 'gap-[10px] rounded-[14px] p-[12px]', foto: 'size-[48px]', titulo: 'text-[12px] leading-[16px]' },
  desktop: { caja: 'gap-[12px] px-[18px] py-[12px]', foto: 'size-[44px]', titulo: 'text-[13px] leading-normal' },
} as const

export default function SumaMismaTienda({ producto, tienda, onAgregar, variante, className = '' }: SumaMismaTiendaProps) {
  const { t } = useTranslation()
  const estilo = ESTILO[variante]
  const foto = fotoProducto(producto)
  return (
    <div className={`items-center bg-hc-blue-50 ${estilo.caja} ${className}`}>
      <div className={`${estilo.foto} shrink-0 overflow-hidden rounded-[8px] bg-hc-n-100`}>
        {foto ? <img src={foto} alt="" className="size-full object-cover" /> : null}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
        <p className={`flex items-center gap-[4px] font-semibold text-hc-blue-600 ${estilo.titulo}`}>
          <IconoFigma src={ICONOS_COMPRA.destello} size={13} />
          <span className="min-w-0 flex-1">{t('compra.carrito.sumaTitulo', { tienda })}</span>
        </p>
        <p className="text-[12px] text-hc-n-600">
          {producto.nombre} · {formatPrice(producto.precio)}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onAgregar(producto)}
        className="flex shrink-0 items-center gap-[4px] rounded-[10px] bg-hc-red-500 py-[8px] pl-[10px] pr-[12px] text-[12px] font-semibold text-hc-n-0"
      >
        <IconoFigma src={ICONOS_COMPRA.agregar} size={13} />
        {t('compra.carrito.agregar')}
      </button>
    </div>
  )
}
