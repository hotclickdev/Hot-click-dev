import Spinner from '@/components/ui/Spinner'
import Badge from '@/components/ui/Badge'
import StatCard from './StatCard'
import ReportesKpis from './ReportesKpis'
import { SUCCESS, WARNING, DANGER, cardStyle } from './reportesHelpers'

export default function InventarioTab({ loading, productos, stockRiesgo }) {
  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg"/></div>

  return (
    <>
      <ReportesKpis cols={3}>
        <StatCard label="Total productos" value={productos.length}/>
        <StatCard label="Stock en riesgo" value={stockRiesgo.length} color={DANGER}
          sub="stockActual ≤ stockMínimo"/>
        <StatCard label="Agotados" value={stockRiesgo.filter(p => (p.stockActual ?? p.stock ?? 0) <= 0).length} color={DANGER}/>
      </ReportesKpis>

      {stockRiesgo.length === 0 ? (
        <div className="rounded-2xl p-10 text-center" style={cardStyle}>
          <p className="font-medium" style={{ color: SUCCESS }}>¡Todo el inventario está en niveles seguros!</p>
          <p className="text-xs mt-1" style={{ color: 'var(--hc-muted)' }}>Ningún producto está por debajo de su stock mínimo.</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={cardStyle}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--hc-border)' }}>
                  {['Producto','SKU','Stock actual','Stock mínimo','Diferencia','Estado'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--hc-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stockRiesgo.map(p => {
                  const actual = p.stockActual ?? p.stock ?? 0
                  const minimo = p.stockMinimo ?? 5
                  const diff   = actual - minimo
                  return (
                    <tr key={p.id} className="transition-colors hover:bg-[var(--hc-surface-2)]" style={{ borderTop: '1px solid var(--hc-border)' }}>
                      <td className="px-4 py-3">
                        <p className="font-medium max-w-[200px] truncate" style={{ color: 'var(--hc-text)' }}>{p.nombreProducto ?? p.nombre}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--hc-muted)' }}>{p.sku ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className="font-bold" style={{ color: actual <= 0 ? DANGER : WARNING }}>{actual}</span>
                      </td>
                      <td className="px-4 py-3" style={{ color: 'var(--hc-muted)' }}>{minimo}</td>
                      <td className="px-4 py-3 font-semibold" style={{ color: DANGER }}>{diff}</td>
                      <td className="px-4 py-3">
                        <Badge variant={actual <= 0 ? 'danger' : 'warning'}>
                          {actual <= 0 ? 'Agotado' : 'Stock bajo'}
                        </Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
