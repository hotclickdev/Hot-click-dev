import { useTranslation } from 'react-i18next'

/** Encabezado del hub de /emprende para el dueño ya logueado (la landing de visitante es `planes/PlanLanding`). */
export default function EmprendeHero() {
  const { t } = useTranslation()
  return (
    <header className="mb-8">
      <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-hc-blue-600">{t('emprende.badge')}</p>
      <h1 className="mt-2 font-[family-name:var(--hc-font-display)] text-[28px] font-bold leading-[34px] text-hc-n-900 lg:text-[32px] lg:leading-[40px]">
        {t('emprende.titleOwner')}
      </h1>
      <p className="mt-2 max-w-xl text-[15px] leading-[22px] text-hc-n-600">{t('emprende.subOwner')}</p>
    </header>
  )
}
