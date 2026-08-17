import Spinner from '@/components/ui/Spinner'
import { formatPrice, formatDate } from '@/utils/format'
import StatCard from './StatCard'
import ReportesKpis from './ReportesKpis'
import { SUCCESS, INFO, cardStyle } from './reportesHelpers'

export default function PosTab({ loading, posFiltradas, posTx, posTotal, posTicket }) {
  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg"/></div>

  return (
    <>
      <ReportesKpis cols={3}>
        <StatCard label="Ventas POS" value={posTx}/>
        <StatCard label="Total facturado" value={formatPrice(posTotal)} color={SUCCESS}/>
        <StatCard label="Ticket promedio" value={formatPrice(posTicket)} color={INFO}/>
      </ReportesKpis>

      {posFiltradas.length === 0 ? (
        <div className="rounded-2xl p-10 text-center" style={cardStyle}>
          <p style={{ color: 'var(--hc-muted)' }}>Sin ventas POS para este período.</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={cardStyle}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--hc-border)' }}>
                  {['Ticket','Fecha','Cliente','Ítems','Método','Total'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--hc-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {posFiltradas.slice(0, 100).map(v => (
                  <tr key={v.id} className="transition-colors hover:bg-[var(--hc-surface-2)]" style={{ borderTop: '1px solid var(--hc-border)' }}>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--hc-muted)' }}>{v.numeroPedido}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--hc-muted)' }}>{formatDate(v.fechaPedido)}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--hc-text)' }}>
                      {v.usuarioFinal?.id === 999 ? 'Mostrador' : v.usuarioFinal?.nombre ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--hc-muted)' }}>{(v.items ?? []).length}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--hc-muted)' }}>{v.metodoPago ?? '—'}</td>
                    <td className="px-4 py-3 font-semibold" style={{ color: SUCCESS }}>{formatPrice(v.totalPedido)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
