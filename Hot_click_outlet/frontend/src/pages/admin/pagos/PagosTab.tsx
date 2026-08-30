import { formatPrice } from '@/utils/format'
import Pagination from './Pagination'
import Select from './Select'
import { BADGE, ESTADOS_PAGO, PROVEEDORES, type PagoAdmin } from './pagosHelpers'
import type { Id } from '@/types/api'
import type { TFunction } from 'i18next'

function TablaPagos({ pagos, actionLoading, onConfirmar, onRechazar, page, totalPages, onPage }: {
  pagos: PagoAdmin[]
  actionLoading: Id | null
  onConfirmar: (id: Id) => void
  onRechazar: (id: Id) => void
  page: number
  totalPages: number
  onPage: (p: number) => void
}) {
  return (
    <div className="bg-hc-surface border border-hc-border rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]">
          <thead>
            <tr className="border-b border-hc-border bg-hc-surface-2">
              {['Pedido', 'Proveedor', 'Estado', 'Monto', 'Usuario', 'Token', 'Fecha', 'Acciones'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-hc-muted font-medium text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pagos.map((p) => (
              <tr key={p.id} className="border-b border-white/5 hover:bg-hc-surface-2 transition-colors">
                <td className="px-4 py-3 font-mono text-hc-text text-xs">{p.numeroPedido}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${
                    p.proveedor === 'SINPE'
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : 'bg-[var(--hc-blue-500)]/15 text-[var(--hc-blue-400)] border-[var(--hc-blue-500)]/30'
                  }`}>{p.proveedor}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${BADGE[p.estadoPago as string] ?? ''}`}>
                    {p.estadoPago}
                  </span>
                </td>
                <td className="px-4 py-3 text-hc-link font-semibold">{formatPrice(p.monto)}</td>
                <td className="px-4 py-3 text-hc-muted text-xs" title={p.correoUsuario}><span className="truncate block max-w-[220px]">{p.correoUsuario}</span></td>
                <td className="px-4 py-3 font-mono text-hc-muted text-[10px]"
                  title={p.merchantToken}>{p.merchantToken?.slice(0, 16)}…</td>
                <td className="px-4 py-3 text-hc-muted text-xs whitespace-nowrap">{p.fechaCreacion}</td>
                <td className="px-4 py-3">
                  {p.proveedor === 'SINPE' && p.estadoPago === 'PENDIENTE' && (
                    <div className="flex gap-1.5">
                      <button type="button"
                        onClick={() => onConfirmar(p.id as Id)}
                        disabled={actionLoading === p.id}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors disabled:opacity-50 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25"
                      >
                        {actionLoading === p.id ? '…' : 'Confirmar'}
                      </button>
                      <button type="button"
                        onClick={() => onRechazar(p.id as Id)}
                        disabled={actionLoading === p.id}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors disabled:opacity-50 bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25"
                      >
                        Rechazar
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} onPage={onPage} />
    </div>
  )
}

export default function PagosTab({
  t,
  filtProv,
  filtEstado,
  onFiltProv,
  onFiltEstado,
  onRetry,
  loading,
  pagos,
  actionLoading,
  onConfirmar,
  onRechazar,
  page,
  totalPages,
  onPage,
}: {
  t: TFunction
  filtProv: string
  filtEstado: string
  onFiltProv: (v: string) => void
  onFiltEstado: (v: string) => void
  onRetry: () => void
  loading: boolean
  pagos: PagoAdmin[]
  actionLoading: Id | null
  onConfirmar: (id: Id) => void
  onRechazar: (id: Id) => void
  page: number
  totalPages: number
  onPage: (p: number) => void
}) {
  return (
    <>
      <div className="flex flex-wrap gap-3 mb-4">
        <Select value={filtProv} onChange={onFiltProv}
          options={PROVEEDORES.map((p) => ({ value: p, label: p || t('admin.pagos.provider') }))} />
        <Select value={filtEstado} onChange={onFiltEstado}
          options={ESTADOS_PAGO.map((e) => ({ value: e, label: e || t('admin.pagos.status') }))} />
        <button type="button" onClick={onRetry}
          className="px-4 py-2 rounded-lg bg-hc-surface-2 hover:bg-hc-surface-2 text-hc-muted hover:text-hc-text text-sm transition-colors">
          {t('common.retry')}
        </button>
      </div>

      <PagosLista
        t={t}
        loading={loading}
        pagos={pagos}
        actionLoading={actionLoading}
        onConfirmar={onConfirmar}
        onRechazar={onRechazar}
        page={page}
        totalPages={totalPages}
        onPage={onPage}
      />
    </>
  )
}

function PagosLista({ t, loading, pagos, actionLoading, onConfirmar, onRechazar, page, totalPages, onPage }: {
  t: TFunction
  loading: boolean
  pagos: PagoAdmin[]
  actionLoading: Id | null
  onConfirmar: (id: Id) => void
  onRechazar: (id: Id) => void
  page: number
  totalPages: number
  onPage: (p: number) => void
}) {
  if (loading) {
    return (
      <div className="text-center py-16 text-hc-muted">{t('common.loading')}</div>
    )
  }
  if (pagos.length === 0) {
    return (
      <div className="text-center py-16 text-hc-muted">{t('common.noData')}</div>
    )
  }
  return (
    <TablaPagos
      pagos={pagos}
      actionLoading={actionLoading}
      onConfirmar={onConfirmar}
      onRechazar={onRechazar}
      page={page}
      totalPages={totalPages}
      onPage={onPage}
    />
  )
}
