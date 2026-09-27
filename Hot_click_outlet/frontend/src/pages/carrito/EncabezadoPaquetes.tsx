import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import AvisoVariosEmprendimientos from '@/components/comprador/AvisoVariosEmprendimientos'
import { ICONOS_COMPRA } from '@/pages/checkout/iconosCompra'

/** «Tu pedido llega en N paquetes»: móvil `37:1503`, desktop `38:1350`. */
export default function EncabezadoPaquetes({ cantidadPaquetes }: { cantidadPaquetes: number }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-[4px] lg:gap-[16px]">
      <h2 className="flex items-center gap-[8px] font-display text-[16px] font-bold text-hc-n-900 lg:gap-[10px] lg:text-[18px]">
        <span className="flex text-hc-blue-600 lg:hidden"><IconoFigma src={ICONOS_COMPRA.paquetes} size={20} /></span>
        <span className="hidden text-hc-blue-600 lg:flex"><IconoFigma src={ICONOS_COMPRA.paquetesDesktop} size={22} /></span>
        {t('compra.carrito.llegaEn', { count: cantidadPaquetes })}
      </h2>
      <p className="text-[12px] leading-[16px] text-hc-n-600 lg:hidden">{t('compra.carrito.cadaTiendaMovil')}</p>
      <AvisoVariosEmprendimientos cantidadNegocios={cantidadPaquetes} className="mt-[6px] lg:mt-0" />
      <p className="hidden text-[13px] text-hc-n-600 lg:block">{t('compra.carrito.cadaTiendaDesktop')}</p>
    </div>
  )
}
