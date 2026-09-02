import { useTranslation } from 'react-i18next'
import EmprendeFoto from './EmprendeFoto'
import EmprendeSeccion from './EmprendeSeccion'
import { FOTOS_FASES } from './emprendeImagenes'

const FASES = ['fase1', 'fase2', 'fase3', 'fase4', 'fase5'] as const

/** Recorrido de fases con HotClick para visitantes. */
export default function EmprendeFases() {
  const { t } = useTranslation()

  return (
    <EmprendeSeccion
      id="proceso"
      title={t('emprende.fasesTitle')}
      subtitle={t('emprende.fasesSub')}
    >
      <ol className="flex flex-col gap-4">
        {FASES.map((id, indice) => (
          <li
            key={id}
            className="grid gap-3 sm:grid-cols-[7.5rem_1fr] sm:items-center rounded-2xl border p-3 sm:p-4"
            style={{ borderColor: 'var(--hc-border)', backgroundColor: 'var(--hc-surface)' }}
          >
            <EmprendeFoto
              src={FOTOS_FASES[indice].local}
              fallback={FOTOS_FASES[indice].fallback}
              alt={t(FOTOS_FASES[indice].altKey)}
              className="w-full h-28 sm:h-24 object-cover rounded-xl"
            />
            <div className="flex gap-3 min-w-0">
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{ backgroundColor: 'var(--hc-primary)', color: '#fff' }}
              >
                {indice + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>
                  {t(`emprende.${id}Title`)}
                </span>
                <span className="block text-xs mt-1 leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
                  {t(`emprende.${id}Desc`)}
                </span>
              </span>
            </div>
          </li>
        ))}
      </ol>
    </EmprendeSeccion>
  )
}
