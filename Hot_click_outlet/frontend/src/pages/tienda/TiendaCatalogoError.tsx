import { useTranslation } from 'react-i18next'
import EstadoVacio from '@/components/comprador/estados/EstadoVacio'
import { IconoSinConexion } from '@/components/comprador/estados/iconosEstado'

/** Error de carga del catálogo público (derivado de Figma: sin conexión `45:2264`). */
export default function TiendaCatalogoError({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation()
  return (
    <EstadoVacio
      icono={<IconoSinConexion />}
      titulo={t('tienda.catalogoError')}
      texto={t('tienda.revisaConexion')}
      accion={{ texto: t('common.retry'), onClick: onRetry }}
    />
  )
}
