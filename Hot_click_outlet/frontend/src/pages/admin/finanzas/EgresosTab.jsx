import Spinner from '@/components/ui/Spinner'
import { formatPrice } from '@/utils/format'
import KPI from './Kpi'
import { EMPTY_GASTO } from './finanzasHelpers'

export default function EgresosTab({
  loading,
  gastos,
  totalEgresos,
  onNuevo,
  onEditar,
  onEliminar,
}) {
  if (loading) {
    return (
      <div className="flex justify-center py-16"><Spinner size="lg" /></div>
    )
  }

  const kpis = (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <KPI label="Total egresos" value={totalEgresos}
        sub={`${gastos.length} gasto${gastos.length === 1 ? '' : 's'} registrado${gastos.length === 1 ? '' : 's'}`}
        color="#f87171" negative />
      <KPI label="Promedio por gasto" value={gastos.length > 0 ? Math.round(totalEgresos / gastos.length) : 0}
        sub="en el período" color="#f87171" />
    </div>
  )

  if (gastos.length === 0) {
    return (
      <>
        {kpis}
        <div className="bg-[#111114] border border-white/8 rounded-2xl p-10 text-center space-y-3">
          <p className="text-[#e8e8ed] font-medium">Sin gastos registrados</p>
          <p className="text-sm text-[#8e8e9a]">Registrá los egresos operativos para ver la utilidad neta.</p>
          <button onClick={() => onNuevo(EMPTY_GASTO)}
            className="px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
            + Primer gasto
          </button>
        </div>
      </>
    )
  }

  return (
    <>
      {kpis}
      <div className="bg-[#111114] border border-white/8 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="border-b border-white/8">
                {['Fecha', 'Concepto', 'Categoría', 'Monto', 'Acciones'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#8e8e9a]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {gastos.map((g) => (
                <tr key={g.id} className="hover:bg-white/3 transition-colors">
                  <td className="px-4 py-3 text-xs text-[#8e8e9a]">{g.fecha ?? '—'}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-[#e8e8ed]">{g.concepto}</p>
                    {g.notas && <p className="text-[10px] text-[#8e8e9a] truncate max-w-[200px]">{g.notas}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium"
                      style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--hc-muted)' }}>
                      {g.categoria ?? 'OTRO'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold text-[#f87171]">{formatPrice(g.monto)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => onEditar(g)}
                        className="px-3 py-1 text-xs rounded-lg bg-white/5 hover:bg-white/10 text-[#8e8e9a] hover:text-white transition-colors">
                        Editar
                      </button>
                      <button onClick={() => onEliminar(g)}
                        className="px-3 py-1 text-xs rounded-lg bg-red-500/8 hover:bg-red-500/15 text-red-400 transition-colors">
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid var(--hc-border)' }}>
                <td colSpan={3} className="px-4 py-3 text-xs font-semibold text-[#8e8e9a] uppercase">Total</td>
                <td className="px-4 py-3 font-bold text-[#f87171]">{formatPrice(totalEgresos)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </>
  )
}
