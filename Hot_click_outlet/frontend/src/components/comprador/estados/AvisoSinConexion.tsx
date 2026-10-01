import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ICONOS_ESTADOS } from './iconosEstados'
import { useConexionComprador } from './useConexionComprador'
import { esRutaPanel } from './falloServidorHelpers'

/**
 * Franja "Sin conexión · mostrando lo guardado" (Figma `45:2265`): n/900, 16 px de lado,
 * 10 px arriba y abajo, ícono de 16 y texto SemiBold 13. Va arriba de toda la página del comprador;
 * los paneles (admin, POS) tienen su propio banner de cola offline.
 */
export default function AvisoSinConexion() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const { enLinea } = useConexionComprador()
  if (enLinea || esRutaPanel(pathname)) return null
  return (
    <div role="status" className="flex items-center gap-2 bg-hc-n-900 px-4 py-[10px]">
      <img src={ICONOS_ESTADOS.offlineAviso} alt="" width={16} height={16} className="block size-4 shrink-0" />
      <p className="flex-1 text-[13px] font-semibold leading-[normal] text-hc-n-0">{t('estadosComprador.sinConexionAviso')}</p>
    </div>
  )
}
