import { useTranslation } from 'react-i18next'
import EstadoVacio from '@/components/comprador/estados/EstadoVacio'
import { IconoPaquete } from '@/components/comprador/estados/iconosEstado'
import { RUTA_EMPRENDE } from '@/utils/emprendimientoRutas'

/** Directorio de aliados vacío (derivado de Figma: estados vacíos `45:1692`). */
export default function EmprendimientosVacio() {
  const { t } = useTranslation()
  return (
    <EstadoVacio
      icono={<IconoPaquete />}
      titulo={t('emprendimientos.proximamente')}
      texto={t('emprendimientos.cerrandoConvenios')}
      accion={{ texto: t('emprendimientos.emprender'), to: RUTA_EMPRENDE }}
    />
  )
}
