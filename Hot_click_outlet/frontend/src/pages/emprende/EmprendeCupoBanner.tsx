import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import useCupoEmprende from './useCupoEmprende'

type Props = {
  compact?: boolean
}

/** Aviso de cupos gratis (70) o membresía de pago. */
export default function EmprendeCupoBanner({ compact = false }: Props) {
  const { t } = useTranslation()
  const { cupo, error } = useCupoEmprende()
  const lleno = cupo !== null && cupo.cuposGratisDisponibles <= 0

  return (
    <aside
      className={`rounded-2xl border px-4 py-4 ${compact ? 'mb-6' : 'mb-8'}`}
      style={{
        borderColor: lleno ? 'var(--hc-primary)' : 'var(--hc-border)',
        backgroundColor: 'var(--hc-surface)',
      }}
      aria-live="polite"
    >
      <p className="text-xs font-bold tracking-[0.12em] uppercase mb-1" style={{ color: 'var(--hc-primary)' }}>
        {t('emprende.cupoBadge')}
      </p>
      <p className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>
        {tituloBanner(t, cupo, error, lleno)}
      </p>
      <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
        {lleno ? t('emprende.cupoLlenoHint') : t('emprende.cupoHint')}
      </p>
      {lleno && !compact ? (
        <Link
          to="#pyme"
          className="inline-flex mt-3 text-sm font-semibold min-h-[44px] items-center"
          style={{ color: 'var(--hc-primary)' }}
        >
          {t('emprende.cupoVerPlanes')}
        </Link>
      ) : null}
    </aside>
  )
}

function tituloBanner(
  t: (key: string, opts?: Record<string, unknown>) => string,
  cupo: { usados: number; limite: number; cuposGratisDisponibles: number } | null,
  error: boolean,
  lleno: boolean,
): string {
  if (error) return t('emprende.cupoError')
  if (!cupo) return t('emprende.cupoCargando')
  if (lleno) return t('emprende.cupoLlenoTitle')
  return t('emprende.cupoTitle', { quedan: cupo.cuposGratisDisponibles, limite: cupo.limite })
}
