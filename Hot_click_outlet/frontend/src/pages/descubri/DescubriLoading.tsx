import { useTranslation } from 'react-i18next'

/** Skeleton mientras cargan categorías y productos. */
export default function DescubriLoading() {
  const { t } = useTranslation()
  return (
    <div
      className="space-y-3"
      aria-busy="true"
      aria-label={t('descubri.loading')}
    >
      <div className="h-4 w-2/3 rounded animate-pulse" style={{ background: 'var(--hc-surface-2)' }} />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-11 w-24 rounded-xl animate-pulse"
            style={{ background: 'var(--hc-surface-2)' }}
          />
        ))}
      </div>
      <div className="h-4 w-1/2 rounded animate-pulse mt-4" style={{ background: 'var(--hc-surface-2)' }} />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-11 w-28 rounded-xl animate-pulse"
            style={{ background: 'var(--hc-surface-2)' }}
          />
        ))}
      </div>
    </div>
  )
}
