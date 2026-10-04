import { useTranslation } from 'react-i18next'
import EstadoVacio from '@/components/comprador/estados/EstadoVacio'
import { IconoSinConexion } from '@/components/comprador/estados/iconosEstado'
import { estiloMarcaTienda } from './tiendaTheme'

/** Fallo de red o servidor al abrir /tienda/:slug, no es 404 (derivado de Figma: sin conexión `45:2264`). */
export default function TiendaInfoError({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="hc-tenant-theme flex min-h-screen items-center justify-center bg-hc-n-50" style={estiloMarcaTienda(null)}>
      <EstadoVacio
        nivel="h1"
        icono={<IconoSinConexion />}
        titulo={t('tienda.infoError')}
        texto={t('tienda.revisaConexion')}
        accion={{ texto: t('common.retry'), onClick: onRetry }}
        secundaria={{ texto: t('tienda.irAHotclick'), to: '/' }}
      />
    </div>
  )
}
