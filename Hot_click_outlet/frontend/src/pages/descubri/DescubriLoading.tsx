import { useTranslation } from 'react-i18next'

/** Skeleton de carta mientras cargan productos del mazo (derivado de Figma `27:939`: carta de 16 y botones redondos). */
export default function DescubriLoading() {
  const { t } = useTranslation()
  return (
    <div className="mx-auto flex max-w-[310px] flex-col items-center gap-6" aria-busy="true" aria-label={t('descubri.loading')}>
      <div className="h-3 w-40 animate-pulse rounded-full bg-hc-n-100" />
      <div className="relative h-[460px] w-full animate-pulse overflow-hidden rounded-2xl border border-hc-n-200 bg-hc-n-100">
        <div className="absolute inset-x-4 bottom-4 flex flex-col gap-2">
          <div className="h-4 w-2/3 rounded-full bg-hc-n-200" />
          <div className="h-3 w-1/3 rounded-full bg-hc-n-200" />
        </div>
      </div>
      <div className="flex items-center justify-center gap-6">
        <div className="size-[60px] animate-pulse rounded-full bg-hc-n-100" />
        <div className="size-11 animate-pulse rounded-full bg-hc-n-100" />
        <div className="size-[60px] animate-pulse rounded-full bg-hc-n-100" />
      </div>
    </div>
  )
}
