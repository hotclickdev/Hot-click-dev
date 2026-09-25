import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

/** CTA de cierre de la landing — un solo mensaje, un solo botón. */
export default function EmprendeCtaFinal() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center gap-5 py-6 text-center">
      <h2 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--hc-text)' }}>
        {t('emprende.ctaFinalTitle')}
      </h2>
      <Link
        to="/registro-empresa"
        className="inline-flex items-center justify-center px-7 py-3.5 rounded-full text-sm font-semibold min-h-[44px] transition-transform hover:scale-[1.03] active:scale-[0.98]"
        style={{ backgroundColor: 'var(--hc-primary)', color: '#fff' }}
      >
        {t('emprende.ctaCrear')}
      </Link>
    </div>
  )
}
