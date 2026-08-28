import { useTranslation } from 'react-i18next'

/** Estado de error / catálogo vacío. */
export default function DescubriError({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation()
  return (
    <div role="status" className="text-center py-16">
      <p className="text-sm mb-4" style={{ color: 'var(--hc-muted)' }}>{t('descubri.error')}</p>
      <button type="button"
        onClick={onRetry}
        className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
        style={{ background: 'var(--hc-accent)' }}
      >
        {t('descubri.retry')}
      </button>
    </div>
  )
}
