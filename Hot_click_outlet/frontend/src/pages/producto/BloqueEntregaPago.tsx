import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import { SHIPPING_COSTS } from '@/pages/checkout/checkoutHelpers'
import { formatPrice } from '@/utils/format'
import { ICONOS_PRODUCTO } from './iconosProducto'

/**
 * "Entrega y pago" (Figma 28:875 móvil, 29:2164 desktop): dos filas con ícono, título y detalle.
 * El monto mínimo de envío sale de la misma tabla que usa el checkout.
 */
export default function BloqueEntregaPago() {
  const { t } = useTranslation()
  const filas = [
    {
      icono: ICONOS_PRODUCTO.envio,
      titulo: t('product.envioTitulo'),
      detalle: t('product.envioDetalle', { monto: formatPrice(SHIPPING_COSTS.ENVIO_NORMAL_GAM) }),
    },
    {
      icono: ICONOS_PRODUCTO.pagoSeguro,
      titulo: t('product.pagoTitulo'),
      detalle: t('product.pagoDetalle'),
    },
  ]

  return (
    <section aria-label={t('product.entregaPagoTitulo')} className="px-4 pb-4 pt-1 lg:p-0">
      <div className="overflow-hidden rounded-[14px] border border-hc-n-200 bg-hc-n-50 lg:bg-hc-n-0">
        {filas.map((fila, i) => (
          <div
            key={fila.titulo}
            className={`flex items-center gap-3 px-[14px] py-3 lg:px-4 lg:py-[13px] ${i > 0 ? 'border-t border-hc-n-200' : ''}`}
          >
            <IconoFigma src={fila.icono} size={20} className="text-hc-blue-600" />
            <div className="flex min-w-0 flex-1 flex-col gap-px">
              <p className="text-[13px] font-semibold leading-[normal] text-hc-n-900 lg:text-[14px]">{fila.titulo}</p>
              <p className="text-[12px] leading-4 text-hc-n-600">{fila.detalle}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
