import { useTranslation } from 'react-i18next'
import Spinner from '@/components/ui/Spinner'
import Badge from '@/components/ui/Badge'
import { formatPrice, formatDate } from '@/utils/format'
import StatCard from './StatCard'
import ReportesKpis from './ReportesKpis'
import {
  ESTADOS_COMPLETADOS,
  SUCCESS,
  WARNING,
  INFO,
  TABLE_SIZE,
  inputCls,
  inputStyle,
  cardStyle,
} from './reportesHelpers'

export default function VentasTab({
  search, onSearch,
  metodoPago, onMetodoPago,
  estado, onEstado,
  ventas, filtered,
  totalIngresos, totalEnvios, totalProductos, ticketPromedio, completadas,
  loading, tablePage, onTablePage,
}) {
  const { t } = useTranslation()
  const metodos = [...new Set(ventas.map(v => v.metodoPago).filter(Boolean))]
  const estados = [...new Set(ventas.map(v => v.estado).filter(Boolean))]
  const totalPages = Math.ceil(filtered.length / TABLE_SIZE)
  const paginated  = filtered.slice(tablePage * TABLE_SIZE, (tablePage + 1) * TABLE_SIZE)

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="flex flex-col gap-1 col-span-2">
          <label className="text-xs" style={{ color: 'var(--hc-muted)' }}>Buscar</label>
          <input type="text" placeholder="Cliente, ID…" value={search}
            onChange={e => onSearch(e.target.value)}
            className={inputCls} style={inputStyle}/>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs" style={{ color: 'var(--hc-muted)' }}>{t('admin.reportes.type')}</label>
          <select value={metodoPago} onChange={e => onMetodoPago(e.target.value)}
            className={inputCls} style={inputStyle}>
            <option value="">Todos</option>
            {metodos.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs" style={{ color: 'var(--hc-muted)' }}>{t('admin.orders.status')}</label>
          <select value={estado} onChange={e => onEstado(e.target.value)}
            className={inputCls} style={inputStyle}>
            <option value="">Todos</option>
            {estados.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <ReportesKpis>
        <StatCard label="Ventas en período" value={filtered.length}/>
        <StatCard label="Ingresos (completadas)" value={formatPrice(totalIngresos)} color={SUCCESS}
          sub={totalEnvios > 0 ? `Productos: ${formatPrice(totalProductos)}` : undefined}/>
        <StatCard label="Completadas" value={completadas.length} color={INFO}/>
        <StatCard label="Ticket promedio" value={formatPrice(ticketPromedio)} color={INFO}/>
      </ReportesKpis>

      {loading ? <div className="flex justify-center py-16"><Spinner size="lg"/></div> : (
        <div className="rounded-2xl overflow-hidden" style={cardStyle}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--hc-border)' }}>
                  {['#','Cliente','Productos','Envío','Total','Método','Fecha','Estado'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--hc-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0
                  ? <tr><td colSpan={8} className="px-4 py-12 text-center" style={{ color: 'var(--hc-muted)' }}>{t('common.noData')}</td></tr>
                  : paginated.map(v => {
                    const envio = v.costoEnvio ?? 0
                    const prods = (v.total ?? 0) - envio
                    return (
                      <tr key={v.id} className="transition-colors hover:bg-[var(--hc-surface-2)]" style={{ borderTop: '1px solid var(--hc-border)' }}>
                        <td className="px-4 py-3 text-xs font-mono" style={{ color: 'var(--hc-muted)' }}>#{v.id}</td>
                        <td className="px-4 py-3 max-w-[140px] truncate" style={{ color: 'var(--hc-text)' }}>{v.nombreCliente ?? v.usuarioFinal?.nombre ?? '—'}</td>
                        <td className="px-4 py-3 font-semibold" style={{ color: 'var(--hc-text)' }}>{formatPrice(prods)}</td>
                        <td className="px-4 py-3 text-xs">{envio > 0 ? <span style={{ color: WARNING }}>{formatPrice(envio)}</span> : <span style={{ color: 'var(--hc-muted)' }}>—</span>}</td>
                        <td className="px-4 py-3 font-semibold" style={{ color: SUCCESS }}>{formatPrice(v.total ?? 0)}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--hc-muted)' }}>{v.metodoPago ?? '—'}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--hc-muted)' }}>{formatDate(v.fechaCreacion ?? v.fechaPedido)}</td>
                        <td className="px-4 py-3">
                          <Badge variant={ESTADOS_COMPLETADOS.has(v.estado) ? 'success' : 'warning'}>
                            {v.estado ?? '—'}
                          </Badge>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
          {filtered.length > TABLE_SIZE && (
            <div className="px-4 py-3 flex items-center justify-between text-xs" style={{ borderTop: '1px solid var(--hc-border)', color: 'var(--hc-muted)' }}>
              <span>{filtered.length} resultados</span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => onTablePage(p => Math.max(0, p-1))} disabled={tablePage === 0}
                  className="px-2 py-1 rounded-lg disabled:opacity-30" style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }}>←</button>
                <span>{tablePage + 1} / {totalPages}</span>
                <button type="button" onClick={() => onTablePage(p => Math.min(totalPages-1, p+1))} disabled={tablePage >= totalPages-1}
                  className="px-2 py-1 rounded-lg disabled:opacity-30" style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }}>→</button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
