import { useTranslation } from 'react-i18next'

/** Skeleton de carta mientras cargan productos del mazo. */
export default function DescubriLoading() {
  const { t } = useTranslation()
  return (
    <div
      className="max-w-md mx-auto"
      aria-busy="true"
      aria-label={t('descubri.loading')}
    >
      <div className="h-3 w-24 rounded mb-4 animate-pulse" style={{ background: 'var(--hc-surface-2)' }} />
      <div
        className="relative w-full h-[min(68vh,480px)] rounded-3xl overflow-hidden animate-pulse mb-6"
        style={{ background: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }}
      >
        <div className="absolute bottom-0 inset-x-0 p-4 space-y-2">
          <div className="h-3 w-1/3 rounded" style={{ background: 'var(--hc-surface-3, var(--hc-border))' }} />
          <div className="h-4 w-2/3 rounded" style={{ background: 'var(--hc-surface-3, var(--hc-border))' }} />
          <div className="h-5 w-1/4 rounded" style={{ background: 'var(--hc-surface-3, var(--hc-border))' }} />
        </div>
      </div>
      <div className="flex justify-center gap-8">
        <div className="size-[60px] rounded-full animate-pulse" style={{ background: 'var(--hc-surface-2)' }} />
        <div className="size-[60px] rounded-full animate-pulse" style={{ background: 'var(--hc-surface-2)' }} />
      </div>
    </div>
  )
}
