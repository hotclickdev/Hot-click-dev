import { useTranslation } from 'react-i18next'
import EstadoVacio from '@/components/comprador/estados/EstadoVacio'
import IconoFigma from '@/components/comprador/IconoFigma'
import { ICONOS_COMPRADOR } from '@/components/comprador/iconosComprador'

/** Estado de error / catálogo vacío (derivado de Figma: estado de sistema `45:2322`). */
export default function DescubriError({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation()
  return (
    <EstadoVacio
      icono={<IconoFigma src={ICONOS_COMPRADOR.falloReintentar} size={28} />}
      titulo={t('descubri.error')}
      accion={{ texto: t('descubri.retry'), onClick: onRetry }}
    />
  )
}
