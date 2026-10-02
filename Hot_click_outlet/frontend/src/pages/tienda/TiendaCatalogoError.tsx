import { useTranslation } from 'react-i18next'

/** Error de carga del catálogo público. */
export default function TiendaCatalogoError({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="text-center py-16 px-4">
      <p className="text-[var(--t-text)] font-semibold">{t('tienda.catalogoError')}</p>
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
  )
}
