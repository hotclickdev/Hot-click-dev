import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import TrustGlyph from '@/components/ui/TrustGlyph'
import useCupoEmprende from './useCupoEmprende'
import { PLAN_EMPRENDEDOR } from './emprendePrecios'

const INCLUIDOS = [
  'incluye1', 'incluye2', 'incluye3', 'incluye4', 'incluye5', 'incluye6',
] as const

/** Ticket con lo incluido en el plan Emprendedor + cupo real (API) + destacados. */
export default function EmprendeQueIncluye() {
  const { t } = useTranslation()
  const { cupo, error } = useCupoEmprende()
  const lleno = cupo !== null && cupo.cuposGratisDisponibles <= 0

  return (
    <div>
      <h2 className="text-2xl sm:text-3xl font-bold mb-5" style={{ color: 'var(--hc-text)' }}>
        {t('emprende.incluyeTitle')}
      </h2>
      <div className="grid lg:grid-cols-[420px_1fr] gap-8 items-start">
        <div
          className="rotate-[0.5deg] px-8 py-7 border border-dashed"
          style={{ backgroundColor: '#fffbf5', borderColor: '#d8c7a8', fontFamily: 'var(--hc-font-mono)' }}
        >
          <p className="text-center text-[11px] mb-3" style={{ color: 'rgba(20,23,28,0.5)' }}>
            · HOTCLICK — PLAN EMPRENDEDOR ·
          </p>
          <ul className="flex flex-col gap-2.5">
            {INCLUIDOS.map((key) => (
              <li key={key} className="flex gap-2.5 text-[13px]" style={{ color: '#14171c' }}>
                <span style={{ color: 'var(--hc-primary)' }}>✓</span>
                <span>{t(`emprende.${key}`)}</span>
              </li>
            ))}
          </ul>
          <p className="text-center text-[11px] mt-4" style={{ color: 'rgba(20,23,28,0.5)' }}>
            {error
              ? t('emprende.cupoError')
              : cupo
                ? t(lleno ? 'emprende.cupoLlenoTitle' : 'emprende.cupoTitle', { quedan: cupo.cuposGratisDisponibles, limite: cupo.limite })
                : t('emprende.cupoCargando')}
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="-rotate-2 flex items-center gap-2 px-5 py-4 rounded-2xl border border-dashed" style={{ backgroundColor: '#fffbf5', borderColor: '#e8dcc8' }}>
            <TrustGlyph tipo="garantia" className="w-5 h-5 shrink-0" />
            <div>
              <p className="text-sm font-semibold" style={{ color: '#14171c' }}>{t('emprende.destacado1Titulo')}</p>
              <p className="text-xs" style={{ color: 'var(--hc-primary)', fontFamily: 'var(--hc-font-mono)' }}>
                {t('emprende.destacado1Sub', { comision: PLAN_EMPRENDEDOR.comisionPct })}
              </p>
            </div>
          </div>
          <div className="rotate-1 flex items-center gap-2 px-5 py-4 rounded-2xl border border-dashed" style={{ backgroundColor: '#fffbf5', borderColor: '#e8dcc8' }}>
            <TrustGlyph tipo="telefono" className="w-5 h-5 shrink-0" />
            <div>
              <p className="text-sm font-semibold" style={{ color: '#14171c' }}>{t('emprende.destacado2Titulo')}</p>
              <p className="text-xs" style={{ color: 'var(--hc-primary)', fontFamily: 'var(--hc-font-mono)' }}>{t('emprende.destacado2Sub')}</p>
            </div>
          </div>
          <Link
            to="/registro-empresa"
            className="-rotate-1 inline-flex items-center justify-center px-5 py-3 rounded-full text-sm font-semibold text-white min-h-[44px] transition-transform hover:scale-[1.02]"
            style={{ backgroundColor: 'var(--hc-primary)' }}
          >
            {lleno ? t('emprende.cupoCtaLleno') : t('emprende.cupoCtaDisponible')}
          </Link>
        </div>
      </div>
    </div>
  )
}
