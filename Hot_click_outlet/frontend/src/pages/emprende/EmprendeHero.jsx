import { useTranslation } from 'react-i18next'

/** Título del hub público Emprender. */
export default function EmprendeHero({ yaEsDuenio }) {
  const { t } = useTranslation()

  return (
    <header className="mb-10">
      <p
        className="text-xs font-bold tracking-[0.14em] uppercase mb-3"
        style={{ color: 'var(--hc-primary)' }}
      >
        {t('emprende.badge')}
      </p>
      <h1 className="text-3xl sm:text-4xl font-bold mb-3" style={{ color: 'var(--hc-text)' }}>
        {yaEsDuenio ? t('emprende.titleOwner') : t('emprende.title')}
      </h1>
      <p className="text-base max-w-xl leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
        {yaEsDuenio ? t('emprende.subOwner') : t('emprende.sub')}
      </p>
    </header>
  )
}
