import { useTranslation } from 'react-i18next'
import { formatearMomento, nombreAsignado } from './bandejaHelpers'
import type { ConversacionBandeja, MiembroBandeja } from './bandejaTypes'
import { InsigniaCanal, InsigniaCupoAgotado, InsigniaModo } from './InsigniasConversacion'

type Props = Readonly<{
  items: ConversacionBandeja[]
  seleccionId: string | null
  equipo: MiembroBandeja[]
  cargando: boolean
  hayMas: boolean
  hayAnterior: boolean
  onSeleccionar: (id: string) => void
  onPagina: (delta: 1 | -1) => void
}>

/** Lista de conversaciones: cada fila es un botón con nombre accesible completo. */
export default function ListaConversaciones({
  items, seleccionId, equipo, cargando, hayMas, hayAnterior, onSeleccionar, onPagina,
}: Props) {
  const { t } = useTranslation()
  const etiquetas = { yo: t('bandeja.asignadoAMi'), otra: t('bandeja.asignadoAOtra') }

  if (cargando && items.length === 0) {
    return <p role="status" className="p-4 text-sm text-hc-muted">{t('bandeja.cargando')}</p>
  }
  if (items.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-base font-bold text-hc-text">{t('bandeja.vacioTitulo')}</p>
        <p className="mt-1 text-sm text-hc-muted">{t('bandeja.vacioMensaje')}</p>
      </div>
    )
  }

  return (
    <div>
      <ul aria-label={t('bandeja.listaAria')} className="divide-y divide-[var(--hc-border)]">
        {items.map((c) => {
          const asignado = nombreAsignado(c, equipo, etiquetas)
          const activo = c.id === seleccionId
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onSeleccionar(c.id)}
                aria-current={activo ? 'true' : undefined}
                className={`flex min-h-[72px] w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-[var(--hc-n-100)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--hc-blue-600)] ${activo ? 'bg-[var(--hc-info-bg)]' : ''}`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="flex flex-wrap items-center gap-2">
                    <InsigniaCanal canal={c.canal} />
                    <span className="font-mono text-sm font-bold text-hc-text">{c.contacto}</span>
                  </span>
                  <time dateTime={c.ultimoMensajeEn ?? undefined} className="shrink-0 text-xs text-hc-muted">
                    {formatearMomento(c.ultimoMensajeEn)}
                  </time>
                </span>
                <span className="line-clamp-2 text-sm text-hc-muted">{c.ultimoMensaje || t('bandeja.sinMensajes')}</span>
                <span className="flex flex-wrap items-center gap-2">
                  <InsigniaModo modo={c.modo} />
                  {c.notaEncuesta != null && (
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${c.notaEncuesta <= 2 ? 'bg-[var(--hc-danger-bg)] text-[var(--hc-red-700)]' : 'bg-[var(--hc-success-bg)] text-[var(--hc-success-text)]'}`}>
                      {t('bandeja.nota', { n: c.notaEncuesta })}
                    </span>
                  )}
                  {c.cupoAgotado && <InsigniaCupoAgotado />}
                  <span className="text-xs text-hc-muted">
                    {asignado ? t('bandeja.atiende', { nombre: asignado }) : t('bandeja.sinAsignar')}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      {(hayMas || hayAnterior) && (
        <nav aria-label={t('bandeja.paginacionAria')} className="flex justify-between gap-2 border-t border-hc-border p-3">
          <button
            type="button" disabled={!hayAnterior} onClick={() => onPagina(-1)}
            className="min-h-11 rounded-[10px] border border-hc-border bg-hc-surface px-4 text-sm font-medium text-hc-text disabled:opacity-50"
          >
            {t('bandeja.anterior')}
          </button>
          <button
            type="button" disabled={!hayMas} onClick={() => onPagina(1)}
            className="min-h-11 rounded-[10px] border border-hc-border bg-hc-surface px-4 text-sm font-medium text-hc-text disabled:opacity-50"
          >
            {t('bandeja.siguiente')}
          </button>
        </nav>
      )}
    </div>
  )
}
