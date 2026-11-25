import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { botService } from './botService'
import { formatearFecha, TAMANO_LEADS } from './botHelpers'
import type { EstadoLead, Lead, TipoLead } from './botTypes'
import { BOTON_SECUNDARIO, CONTROL, TARJETA, useConsultaBot } from './useBot'

const TIPOS: TipoLead[] = ['COMPRADOR', 'NEGOCIO']
const ESTADOS: EstadoLead[] = ['NUEVO', 'CONTACTADO', 'CONVERTIDO', 'DESCARTADO']

/** Leads que captó el bot (AG-27). El contacto completo solo se ve al abrir el detalle. */
export default function LeadsTab() {
  const { t } = useTranslation()
  const [tipo, setTipo] = useState<TipoLead | ''>('')
  const [estado, setEstado] = useState<EstadoLead | ''>('')
  const [page, setPage] = useState(0)
  const [abierto, setAbierto] = useState<number | null>(null)
  const lista = useConsultaBot(['leads', tipo, estado, page], () =>
    botService.leads({ tipo, estado, page, size: TAMANO_LEADS }))
  const detalle = useConsultaBot(['lead', abierto], () => botService.lead(abierto as number), abierto != null)
  const items = lista.data ?? []
  const hayMas = items.length === TAMANO_LEADS

  return (
    <div className="grid max-w-4xl gap-4">
      <div className="flex flex-wrap items-end gap-3" role="group" aria-label={t('bot.leads.filtros')}>
        <label className="flex flex-col text-xs font-medium text-hc-muted">
          {t('bot.leads.tipo')}
          <select className={`${CONTROL} !w-auto`} value={tipo} onChange={(e) => { setTipo(e.target.value as TipoLead | ''); setPage(0) }}>
            <option value="">{t('bot.leads.todos')}</option>
            {TIPOS.map((x) => <option key={x} value={x}>{t(`bot.leads.tipos.${x}`)}</option>)}
          </select>
        </label>
        <label className="flex flex-col text-xs font-medium text-hc-muted">
          {t('bot.leads.estado')}
          <select className={`${CONTROL} !w-auto`} value={estado} onChange={(e) => { setEstado(e.target.value as EstadoLead | ''); setPage(0) }}>
            <option value="">{t('bot.leads.todos')}</option>
            {ESTADOS.map((x) => <option key={x} value={x}>{t(`bot.leads.estados.${x}`)}</option>)}
          </select>
        </label>
      </div>

      {lista.isLoading && <p role="status" className="text-sm text-hc-muted">{t('bot.cargando')}</p>}
      {lista.isError && <p role="alert" className="text-sm text-[var(--hc-danger)]">{t('bot.errorCargar')}</p>}
      {!lista.isLoading && !lista.isError && items.length === 0 && (
        <div className={`${TARJETA} text-center`}>
          <p className="font-bold text-hc-text">{t('bot.leads.vacioTitulo')}</p>
          <p className="mt-1 text-sm text-hc-muted">{t('bot.leads.vacioMensaje')}</p>
        </div>
      )}

      <ul aria-label={t('bot.leads.lista')} className="grid gap-2">
        {items.map((l: Lead) => (
          <li key={l.id} className={TARJETA}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold text-hc-text">
                  {l.nombre || t('bot.leads.sinNombre')}
                  <span className="ml-2 font-mono text-sm font-normal text-hc-muted">{l.contactoEnmascarado}</span>
                </p>
                <p className="mt-1 text-sm text-hc-muted">{l.interes || l.tipoNegocio || ''}</p>
                <p className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-[var(--hc-blue-100)] px-2 py-0.5 text-[var(--hc-blue-600)]">{t(`bot.leads.tipos.${l.tipo}`)}</span>
                  <span className="rounded-full border border-hc-border px-2 py-0.5 text-hc-text">{t(`bot.leads.estados.${l.estado}`)}</span>
                  <time dateTime={l.creadoEn} className="text-hc-muted">{formatearFecha(l.creadoEn)}</time>
                </p>
              </div>
              <button
                type="button" className={BOTON_SECUNDARIO} aria-expanded={abierto === l.id}
                onClick={() => setAbierto(abierto === l.id ? null : l.id)}
              >
                {abierto === l.id ? t('bot.leads.ocultar') : t('bot.leads.verContacto')}
              </button>
            </div>
            {abierto === l.id && (
              <p role="status" className="mt-3 rounded-[12px] bg-[var(--hc-info-bg)] p-3 text-sm text-hc-text">
                {detalle.isLoading ? t('bot.cargando') : detalle.data?.contacto ?? t('bot.leads.sinContacto')}
              </p>
            )}
          </li>
        ))}
      </ul>

      {(page > 0 || hayMas) && (
        <nav className="flex items-center gap-3" aria-label={t('bot.leads.paginacion')}>
          <button type="button" className={BOTON_SECUNDARIO} disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>{t('bot.anterior')}</button>
          <span className="text-sm text-hc-muted">{t('bot.leads.pagina', { n: page + 1 })}</span>
          <button type="button" className={BOTON_SECUNDARIO} disabled={!hayMas} onClick={() => setPage((p) => p + 1)}>{t('bot.siguiente')}</button>
        </nav>
      )}
    </div>
  )
}
