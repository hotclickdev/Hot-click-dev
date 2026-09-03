import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

/** Título del hub público Emprender + CTA al formulario de alta. */
export default function EmprendeHero({ yaEsDuenio }: { yaEsDuenio: boolean }) {
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
      <p className="text-base max-w-xl leading-relaxed mb-5" style={{ color: 'var(--hc-muted)' }}>
        {yaEsDuenio ? t('emprende.subOwner') : t('emprende.sub')}
      </p>
      {!yaEsDuenio && (
        <Link
          to="/registro-empresa"
          className="inline-flex items-center justify-center px-5 py-3 rounded-xl text-sm font-semibold min-h-[44px]"
          style={{ backgroundColor: 'var(--hc-primary)', color: '#fff' }}
        >
          {t('emprende.ctaCrear')}
        </Link>
      )}
    </header>
  )
}
