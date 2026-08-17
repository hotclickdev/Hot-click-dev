import { formatPrice } from '@/utils/format'
import Pagination from './Pagination'
import Select from './Select'
import { BADGE, ESTADOS_PAGO, PROVEEDORES } from './pagosHelpers'

function TablaPagos({ pagos, actionLoading, onConfirmar, onRechazar, page, totalPages, onPage }) {
  return (
    <div className="bg-[#111114] border border-white/8 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]">
          <thead>
            <tr className="border-b border-white/8 bg-white/3">
              {['Pedido', 'Proveedor', 'Estado', 'Monto', 'Usuario', 'Token', 'Fecha', 'Acciones'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[#8e8e9a] font-medium text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pagos.map((p) => (
              <tr key={p.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                <td className="px-4 py-3 font-mono text-[#e8e8ed] text-xs">{p.numeroPedido}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${
                    p.proveedor === 'SINPE'
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : 'bg-[var(--hc-blue-500)]/15 text-[var(--hc-blue-400)] border-[var(--hc-blue-500)]/30'
                  }`}>{p.proveedor}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${BADGE[p.estadoPago] ?? ''}`}>
                    {p.estadoPago}
                  </span>
                </td>
                <td className="px-4 py-3 text-[#4f7cff] font-semibold">{formatPrice(p.monto)}</td>
                <td className="px-4 py-3 text-[#8e8e9a] text-xs" title={p.correoUsuario}><span className="truncate block max-w-[220px]">{p.correoUsuario}</span></td>
                <td className="px-4 py-3 font-mono text-[#8e8e9a] text-[10px]"
                  title={p.merchantToken}>{p.merchantToken?.slice(0, 16)}…</td>
                <td className="px-4 py-3 text-[#8e8e9a] text-xs whitespace-nowrap">{p.fechaCreacion}</td>
                <td className="px-4 py-3">
                  {p.proveedor === 'SINPE' && p.estadoPago === 'PENDIENTE' && (
                    <div className="flex gap-1.5">
                      <button type="button"
                        onClick={() => onConfirmar(p.id)}
                        disabled={actionLoading === p.id}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors disabled:opacity-50 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25"
                      >
                        {actionLoading === p.id ? '…' : 'Confirmar'}
                      </button>
                      <button type="button"
                        onClick={() => onRechazar(p.id)}
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
}) {
  return (
    <>
      <div className="flex flex-wrap gap-3 mb-4">
        <Select value={filtProv} onChange={onFiltProv}
          options={PROVEEDORES.map((p) => ({ value: p, label: p || t('admin.pagos.provider') }))} />
        <Select value={filtEstado} onChange={onFiltEstado}
          options={ESTADOS_PAGO.map((e) => ({ value: e, label: e || t('admin.pagos.status') }))} />
        <button type="button" onClick={onRetry}
          className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/8 text-[#8e8e9a] hover:text-[#e8e8ed] text-sm transition-colors">
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

function PagosLista({ t, loading, pagos, actionLoading, onConfirmar, onRechazar, page, totalPages, onPage }) {
  if (loading) {
    return (
      <div className="text-center py-16 text-[#8e8e9a]">{t('common.loading')}</div>
    )
  }
  if (pagos.length === 0) {
    return (
      <div className="text-center py-16 text-[#8e8e9a]">{t('common.noData')}</div>
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
