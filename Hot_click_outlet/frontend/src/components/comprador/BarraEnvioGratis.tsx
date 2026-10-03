import { useTranslation } from 'react-i18next'
import IconoFigma from './IconoFigma'
import { ICONOS_COMPRADOR } from './iconosComprador'
import { formatPrice } from '@/utils/format'
import { UMBRAL_ENVIO_GRATIS, progresoEnvioGratis } from '@/config/envioGratis'

/** Marca para partir la frase y poner el monto en negrita sin HTML en la traducción. */
const MARCA_MONTO = '@@monto@@'

type BarraEnvioGratisProps = {
  /** Subtotal del paquete (productos de la misma tienda en el carrito). */
  subtotal: number
  /** Umbral en colones; por defecto el de la config compartida. `null` = no hay envío gratis. */
  umbral?: number | null
}

/**
 * Progreso hacia envío gratis en la hoja "Agregado a tu pedido" (Figma `45:1607`). Solo se dibuja si hay un
 * umbral real configurado (`envioGratis.desdeColones`); sin él no se promete nada.
 */
export default function BarraEnvioGratis({ subtotal, umbral = UMBRAL_ENVIO_GRATIS }: BarraEnvioGratisProps) {
  const { t } = useTranslation()
  if (umbral == null || !(umbral > 0)) return null
  const { falta, porcentaje, listo } = progresoEnvioGratis(subtotal, umbral)
  const [antes, despues = ''] = t('comprador.hoja.envioGratisFalta', { monto: MARCA_MONTO }).split(MARCA_MONTO)

  return (
    <div data-testid="barra-envio-gratis" role="status" className={`flex flex-col gap-2 rounded-[12px] px-3 py-[10px] leading-[normal] ${listo ? 'bg-hc-success-bg' : 'bg-hc-n-50'}`}>
      <div className="flex items-center gap-2">
        <IconoFigma src={ICONOS_COMPRADOR.agregadoEnvio} size={16} className={listo ? 'text-hc-success' : 'text-hc-blue-600'} />
        <p className={`min-w-0 flex-1 text-[13px] ${listo ? 'font-semibold text-hc-success-text' : 'text-hc-n-900'}`}>
          {listo ? t('comprador.hoja.envioGratisListo') : <>{antes}<b className="font-display font-bold">{formatPrice(falta)}</b>{despues}</>}
        </p>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-hc-n-200" aria-hidden="true">
        <div className={`h-full rounded-full ${listo ? 'bg-hc-success' : 'bg-hc-blue-600'}`} style={{ width: `${porcentaje}%` }} />
      </div>
      {!listo && <p className="text-[11px] text-hc-n-600">{t('comprador.hoja.envioGratisDesde', { monto: formatPrice(umbral) })}</p>}
    </div>
  )
}
