import { useTranslation } from 'react-i18next'

/** Encabezado de Descubrí (chips o resultados). */
export default function DescubriHeader({ subtitle }: { subtitle?: string }) {
  const { t } = useTranslation()
  return (
    <div className="mb-5">
      <h1
        className="text-xl sm:text-2xl font-bold"
        style={{ color: 'var(--hc-text)', fontFamily: 'var(--font-display)' }}
      >
        {t('descubri.title')}
      </h1>
      {subtitle && (
        <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>
          {subtitle}
        </p>
      )}
    </div>
  )
}
