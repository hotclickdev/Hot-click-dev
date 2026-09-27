import { useTranslation } from 'react-i18next'
import type { PaqueteCompra } from '@/pages/checkout/paquetesCompra'
import { formatPrice } from '@/utils/format'

type PaqueteResumenProps = {
  paquete: PaqueteCompra
  envio: number
  /** Etiqueta corta de la entrega elegida; el resumen del pago móvil (`29:1344`) la muestra. */
  entrega?: string
}

/** Fila de un paquete en los resúmenes: nombre y subtotal; origen, cantidad y envío. */
export default function PaqueteResumen({ paquete, envio, entrega }: PaqueteResumenProps) {
  const { t } = useTranslation()
  const detalle = [paquete.provincia, t('compra.resumen.cantidad', { count: paquete.cantidadProductos }), entrega].filter(Boolean)
  return (
    <div className="flex flex-col gap-px">
      <div className="flex items-center justify-between gap-[8px] text-[13px] font-semibold text-hc-n-900">
        <p className="min-w-0 truncate">{paquete.nombre}</p>
        <p>{formatPrice(paquete.subtotal)}</p>
      </div>
      <div className="flex items-center justify-between gap-[8px] text-[12px] text-hc-n-500">
        <p className="min-w-0">{detalle.join(' · ')}</p>
        <p className="shrink-0">{t('compra.resumen.envioMonto', { monto: formatPrice(envio) })}</p>
      </div>
    </div>
  )
}
