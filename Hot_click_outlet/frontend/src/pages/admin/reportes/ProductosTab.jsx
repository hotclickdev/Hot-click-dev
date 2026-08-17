import Spinner from '@/components/ui/Spinner'
import { formatPrice } from '@/utils/format'
import StatCard from './StatCard'
import ReportesKpis from './ReportesKpis'
import { fmt, SUCCESS, WARNING, DANGER, INFO, cardStyle } from './reportesHelpers'

export default function ProductosTab({ loading, topProductos }) {
  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg"/></div>
  if (topProductos.length === 0) {
    return (
      <div className="rounded-2xl p-10 text-center" style={cardStyle}>
        <p style={{ color: 'var(--hc-muted)' }}>Sin datos de productos para este período.</p>
        <p className="text-xs mt-1" style={{ color: 'var(--hc-muted)' }}>Los ítems aparecen cuando los pedidos tienen líneas detalladas.</p>
      </div>
    )
  }

  return (
    <>
      <ReportesKpis cols={3}>
        <StatCard label="Productos únicos" value={topProductos.length}/>
        <StatCard label="Unidades vendidas" value={fmt(topProductos.reduce((s,p) => s + p.cantidad, 0))} color={SUCCESS}/>
        <StatCard label="Ingreso total" value={formatPrice(topProductos.reduce((s,p) => s + p.ingreso, 0))} color={INFO}/>
      </ReportesKpis>
      <div className="rounded-2xl overflow-hidden" style={cardStyle}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--hc-border)' }}>
                {['#','Producto','Unidades','Ingreso','Utilidad','Margen'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--hc-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topProductos.map((p, i) => (
                <tr key={p.id} className="transition-colors hover:bg-[var(--hc-surface-2)]" style={{ borderTop: '1px solid var(--hc-border)' }}>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--hc-muted)' }}>{i + 1}</td>
                  <td className="px-4 py-3 font-medium max-w-[200px] truncate" style={{ color: 'var(--hc-text)' }}>{p.nombre}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--hc-text)' }}>{p.cantidad}</td>
                  <td className="px-4 py-3 font-semibold" style={{ color: SUCCESS }}>{formatPrice(p.ingreso)}</td>
                  <td className="px-4 py-3 font-semibold" style={{ color: INFO }}>{formatPrice(p.utilidad)}</td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-sm" style={{ color: colorMargenProducto(p.margen) }}>
                      {p.margen}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

function colorMargenProducto(margen) {
  const n = Number.parseFloat(margen)
  if (n >= 30) return SUCCESS
  if (n >= 10) return WARNING
  return DANGER
}
