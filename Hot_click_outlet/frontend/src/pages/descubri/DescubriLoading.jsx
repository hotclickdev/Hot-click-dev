import { useTranslation } from 'react-i18next'

/** Skeleton del mazo mientras carga el catálogo. */
export default function DescubriLoading() {
  const { t } = useTranslation()
  return (
    <div
      className="rounded-2xl animate-pulse h-[min(58vh,500px)] min-h-[360px]"
      style={{ background: 'var(--hc-surface-2)' }}
      aria-busy="true"
      aria-label={t('descubri.loading')}
    />
  )
}
