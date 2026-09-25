import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import TrustGlyph from '@/components/ui/TrustGlyph'

const PUNTOS = [
  { icono: 'bolsa', key: 'paraVos1', rot: 'rotate-2' },
  { icono: 'edificio', key: 'paraVos2', rot: '-rotate-2' },
] as const

/** Bullets de encaje + salida hacia PYME si ya tiene equipo/local. */
export default function EmprendeParaVos() {
  const { t } = useTranslation()

  return (
    <div>
      <h2 className="text-2xl sm:text-3xl font-bold mb-5" style={{ color: 'var(--hc-text)' }}>
        {t('emprende.paraVosTitle')}
      </h2>
      <div className="grid sm:grid-cols-3 gap-4">
        {PUNTOS.map(({ icono, key, rot }) => (
          <div
            key={key}
            className={`${rot} flex gap-3 items-start p-5 rounded-2xl border border-dashed`}
            style={{ backgroundColor: '#fffbf5', borderColor: '#e8dcc8' }}
          >
            <TrustGlyph tipo={icono} className="w-[18px] h-[18px] shrink-0 mt-0.5" />
            <p className="text-sm" style={{ color: '#14171c' }}>{t(`emprende.${key}`)}</p>
          </div>
        ))}
        <Link
          to="#pyme"
          className="rotate-[1.5deg] flex gap-3 items-start p-5 rounded-2xl border border-dashed hover:no-underline"
          style={{ backgroundColor: '#efe5d4', borderColor: '#e8dcc8' }}
        >
          <TrustGlyph tipo="tendencia" className="w-[18px] h-[18px] shrink-0 mt-0.5 text-[rgba(20,23,28,0.75)]" />
          <p className="text-sm" style={{ color: 'rgba(20,23,28,0.75)' }}>{t('emprende.paraVosPyme')}</p>
        </Link>
      </div>
    </div>
  )
}
