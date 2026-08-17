import { Link } from 'react-router-dom'
import Spinner from '@/components/ui/Spinner'
import { formatPrice, formatDate } from '@/utils/format'
import KPI from './Kpi'
import {
  clienteDePedido,
  envioDePedido,
  estiloOrigen,
  fechaDePedido,
  subtotalDePedido,
  totalDePedido,
} from './finanzasHelpers'

function TablaIngresos({ filteredP, totalProductos, totalEnvio, totalIngresos, onSelectPedido }) {
  return (
    <div className="bg-[#111114] border border-white/8 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="border-b border-white/8">
              {['#', 'Cliente', 'Fecha', 'Origen', 'Método', 'Productos', 'Envío', 'Total', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#8e8e9a]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredP.map((p) => {
              const envio = envioDePedido(p)
              const productos = subtotalDePedido(p)
              return (
                <tr key={p.id}
                  className="hover:bg-white/5 transition-colors cursor-pointer"
                  title="Ver detalle de venta"
                  onClick={() => onSelectPedido(p.id)}>
                  <td className="px-4 py-3 font-mono text-xs text-[#8e8e9a]">#{p.id}</td>
                  <td className="px-4 py-3 text-[#e8e8ed] truncate max-w-[120px]">{clienteDePedido(p)}</td>
                  <td className="px-4 py-3 text-xs text-[#8e8e9a]">
                    {formatDate(fechaDePedido(p))}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                      style={estiloOrigen(p.origen)}>{p.origen ?? 'ONLINE'}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#8e8e9a]">{p.metodoPago ?? '—'}</td>
                  <td className="px-4 py-3 font-semibold text-[#4ade80]">{formatPrice(productos)}</td>
                  <td className="px-4 py-3">
                    {envio > 0
                      ? <span className="font-semibold text-amber-400">{formatPrice(envio)}</span>
                      : <span className="text-[#8e8e9a]/40 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 font-bold text-[#4f7cff]">
                    {formatPrice(totalDePedido(p))}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] text-[#8e8e9a]/60 hover:text-[#4f7cff] transition-colors whitespace-nowrap">Ver →</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '2px solid var(--hc-border)' }}>
              <td colSpan={5} className="px-4 py-3 text-xs font-semibold text-[#8e8e9a] uppercase">
                Totales del período
              </td>
              <td className="px-4 py-3 font-bold text-[#4ade80]">{formatPrice(totalProductos)}</td>
              <td className="px-4 py-3 font-bold text-amber-400">{formatPrice(totalEnvio)}</td>
              <td className="px-4 py-3 font-bold text-[#4f7cff]">{formatPrice(totalIngresos)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

export default function IngresosTab({
  loading,
  filteredP,
  totalProductos,
  totalEnvio,
  totalIngresos,
  onSelectPedido,
}) {
  if (loading) {
    return (
      <div className="flex justify-center py-16"><Spinner size="lg" /></div>
    )
  }

  const kpis = (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <KPI label="Productos vendidos" value={totalProductos}
        sub={`${filteredP.length} pedidos entregados`} color="#4ade80" />
      <KPI label="Costos de envío (moto)" value={totalEnvio}
        sub={`${filteredP.filter((p) => envioDePedido(p) > 0).length} con envío`} color="#f59e0b" />
      <KPI label="Total cobrado" value={totalIngresos}
        sub="Productos + envío" color="#4f7cff" />
    </div>
  )

  if (filteredP.length === 0) {
    return (
      <>
        {kpis}
        <div className="bg-[#111114] border border-white/8 rounded-2xl p-10 text-center space-y-2">
          <p className="text-[#e8e8ed] font-medium">Sin ventas en este período</p>
          <p className="text-sm text-[#8e8e9a]">
            Las ventas aparecen aquí al marcar pedidos como <strong className="text-[#4ade80]">Entregado</strong>.
          </p>
          <Link to="/admin/pedidos" className="inline-block text-xs text-[#4f7cff] hover:underline mt-1">
            Ver pedidos →
          </Link>
        </div>
      </>
    )
  }

  return (
    <>
      {kpis}
      <TablaIngresos
        filteredP={filteredP}
        totalProductos={totalProductos}
        totalEnvio={totalEnvio}
        totalIngresos={totalIngresos}
        onSelectPedido={onSelectPedido}
      />
    </>
  )
}
