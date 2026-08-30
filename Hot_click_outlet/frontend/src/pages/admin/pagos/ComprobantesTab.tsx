import { formatPrice } from '@/utils/format'
import DataCell from './DataCell'
import Pagination from './Pagination'
import Select from './Select'
import { ESTADOS_COMPROBANTE, claseEstadoComprobante, type ComprobanteAdmin } from './pagosHelpers'
import type { Id } from '@/types/api'
import type { TFunction } from 'i18next'

function TarjetaComprobante({
  c,
  compAction,
  onAprobar,
  onAbrirRechazo,
  onAmpliar,
}: {
  c: ComprobanteAdmin
  compAction: Id | null
  onAprobar: (id: Id) => void
  onAbrirRechazo: (id: Id) => void
  onAmpliar: (url: string) => void
}) {
  return (
    <div
      className="rounded-2xl p-5 space-y-4"
      style={{ background: 'var(--hc-surface)', border: `1px solid ${c.estado === 'PENDIENTE' ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.08)'}` }}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm font-semibold text-hc-link">{c.numeroPedido}</span>
            <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${claseEstadoComprobante(c.estado ?? '')}`}>{c.estado}</span>
            {c.monto && (
              <span className="text-sm font-bold text-emerald-400">{formatPrice(c.monto)}</span>
            )}
          </div>
          <p className="text-xs text-hc-muted">Subido: {c.fechaSubida}</p>
          {c.fechaResolucion && (
            <p className="text-xs text-hc-muted">Resuelto: {c.fechaResolucion} por {c.adminEmail}</p>
          )}
        </div>

        {c.estado === 'PENDIENTE' && (
          <div className="flex gap-2 shrink-0">
            <button type="button"
              onClick={() => onAprobar(c.id as Id)}
              disabled={compAction === c.id}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25"
            >
              {compAction === c.id ? '…' : 'Aprobar'}
            </button>
            <button type="button"
              onClick={() => onAbrirRechazo(c.id as Id)}
              disabled={compAction === c.id}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25"
            >
              Rechazar
            </button>
          </div>
        )}
        {c.notasAdmin && (
          <p className="w-full text-xs text-red-300/80 bg-red-500/8 border border-red-500/20 rounded-lg px-3 py-1.5">
            Motivo rechazo: {c.notasAdmin}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        {c.nombreRemitente && <DataCell label="Nombre" value={c.nombreRemitente} />}
        {c.cedulaRemitente && <DataCell label="Cédula" value={c.cedulaRemitente} />}
        {c.telefonoRemitente && <DataCell label="Teléfono" value={c.telefonoRemitente} />}
        {c.correoRemitente && <DataCell label="Correo" value={c.correoRemitente} />}
      </div>

      {c.urlComprobante && (
        <div>
          <p className="text-xs text-hc-muted mb-2">Comprobante:</p>
          <button type="button"
            onClick={() => onAmpliar(c.urlComprobante as string)}
            className="block rounded-xl overflow-hidden border border-hc-border hover:border-hc-primary/50 transition-colors group max-w-xs"
          >
            <img
              src={c.urlComprobante}
              alt="Comprobante SINPE"
              className="w-full max-h-48 object-contain bg-black/30 group-hover:opacity-90 transition-opacity"
              loading="lazy"
            />
            <p className="text-[10px] text-center text-hc-muted py-1.5">Clic para ampliar</p>
          </button>
        </div>
      )}
    </div>
  )
}

function ListaComprobantes({
  t,
  loading,
  comprobantes,
  compAction,
  onAprobar,
  onAbrirRechazo,
  onAmpliar,
  page,
  totalPages,
  onPage,
}: {
  t: TFunction
  loading: boolean
  comprobantes: ComprobanteAdmin[]
  compAction: Id | null
  onAprobar: (id: Id) => void
  onAbrirRechazo: (id: Id) => void
  onAmpliar: (url: string) => void
  page: number
  totalPages: number
  onPage: (p: number) => void
}) {
  if (loading) {
    return (
      <div className="text-center py-16 text-hc-muted">{t('common.loading')}</div>
    )
  }
  if (comprobantes.length === 0) {
    return (
      <div className="text-center py-16 text-hc-muted">No hay comprobantes en este estado</div>
    )
  }
  return (
    <div className="space-y-4">
      {comprobantes.map((c) => (
        <TarjetaComprobante
          key={c.id}
          c={c}
          compAction={compAction}
          onAprobar={onAprobar}
          onAbrirRechazo={onAbrirRechazo}
          onAmpliar={onAmpliar}
        />
      ))}
      <Pagination page={page} totalPages={totalPages} onPage={onPage} />
    </div>
  )
}

export default function ComprobantesTab({
  t,
  filtComp,
  onFiltComp,
  onRetry,
  loading,
  comprobantes,
  compAction,
  onAprobar,
  onAbrirRechazo,
  onAmpliar,
  page,
  totalPages,
  onPage,
}: {
  t: TFunction
  filtComp: string
  onFiltComp: (v: string) => void
  onRetry: () => void
  loading: boolean
  comprobantes: ComprobanteAdmin[]
  compAction: Id | null
  onAprobar: (id: Id) => void
  onAbrirRechazo: (id: Id) => void
  onAmpliar: (url: string | null) => void
  page: number
  totalPages: number
  onPage: (p: number) => void
}) {
  return (
    <>
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <Select
          value={filtComp}
          onChange={onFiltComp}
          options={ESTADOS_COMPROBANTE.map((e) => ({ value: e, label: e || 'Todos los estados' }))}
        />
        <button type="button"
          onClick={onRetry}
          className="px-4 py-2 rounded-lg bg-hc-surface-2 hover:bg-hc-surface-2 text-hc-muted hover:text-hc-text text-sm transition-colors"
        >
          Actualizar
        </button>
        {filtComp === 'PENDIENTE' && comprobantes.length > 0 && (
          <span className="ml-auto px-2.5 py-1 rounded-full text-[11px] font-semibold bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">
            {comprobantes.length} pendiente{comprobantes.length === 1 ? '' : 's'} de verificar
          </span>
        )}
      </div>

      <ListaComprobantes
        t={t}
        loading={loading}
        comprobantes={comprobantes}
        compAction={compAction}
        onAprobar={onAprobar}
        onAbrirRechazo={onAbrirRechazo}
        onAmpliar={onAmpliar}
        page={page}
        totalPages={totalPages}
        onPage={onPage}
      />
    </>
  )
}
