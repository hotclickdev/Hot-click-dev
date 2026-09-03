import { Link } from 'react-router-dom'
import type { ModeracionResumen } from '@/services/moderacionService'
import { colasDesdeResumen, RESUMEN_VACIO } from './bandejaModeracionHelpers'

export default function BandejaModeracion({
  resumen,
  loading,
}: {
  resumen: ModeracionResumen | null
  loading: boolean
}) {
  const data = resumen ?? RESUMEN_VACIO
  const colas = colasDesdeResumen(data)

  return (
    <section className="rounded-[14px] border border-hc-border bg-hc-surface p-4 space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-bold text-hc-text">Bandeja de moderación</h2>
        <p className="text-xs text-hc-muted">
          {loading ? 'Cargando…' : data.total > 0 ? `${data.total} pendientes` : 'Todo al día'}
        </p>
      </div>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {colas.map((cola) => (
          <li key={cola.id}>
            <Link
              to={cola.to}
              className="flex items-start justify-between gap-3 rounded-xl border border-hc-border px-3 py-2.5 min-h-11 hover:bg-hc-surface-2"
            >
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold text-hc-text">{cola.label}</span>
                <span className="block text-[11px] text-hc-muted truncate">{cola.cuerpo}</span>
              </span>
              <span
                className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${
                  cola.count > 0 ? 'bg-[var(--hc-warning-bg)] text-hc-warning' : 'bg-hc-surface-2 text-hc-muted'
                }`}
              >
                {cola.count}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
