import { estiloMarcaTienda } from './tiendaTheme'
import { useTranslation } from 'react-i18next'

/** Fallo de red o servidor al abrir /tienda/:slug (no es 404). */
export default function TiendaInfoError({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="hc-tenant-theme min-h-screen flex items-center justify-center px-4" style={estiloMarcaTienda(null)}>
      <div className="text-center max-w-md">
        <p className="font-semibold text-[var(--t-text)]">{t('tienda.infoError')}</p>
        <p className="text-sm mt-2 text-[var(--t-muted)]">{t('tienda.revisaConexion')}</p>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center justify-center mt-6 px-5 min-h-11 rounded-lg text-white text-sm font-semibold"
          style={{ backgroundColor: 'var(--t-primary)' }}
        >
          {t('common.retry')}
        </button>
      </div>
    </div>
  )
}
