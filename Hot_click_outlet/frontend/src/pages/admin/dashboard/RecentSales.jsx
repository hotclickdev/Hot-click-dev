import { Link } from 'react-router-dom'
import { formatPrice } from '@/utils/format'

/** @param {{ ventas: object[] }} props */
export default function RecentSales({ ventas }) {
  if (ventas.length === 0) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-[#e8e8ed]">Ventas recientes</h2>
        <Link to="/admin/ventas" className="text-xs text-[#4f7cff] hover:underline">
          Ver todas →
        </Link>
      </div>
      <div className="bg-[#111114] border border-white/8 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="border-b border-white/8">
                {['#', 'Cliente', 'Total', 'Estado'].map((h) => (
                  <th
                    key={h}
                    className="text-left px-3 sm:px-4 py-2.5 text-xs font-medium text-[#8e8e9a] uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {ventas.slice(0, 5).map((v) => (
                <tr key={v.id} className="hover:bg-white/3 transition-colors">
                  <td className="px-3 sm:px-4 py-2.5 text-[#8e8e9a] text-xs">#{v.id}</td>
                  <td className="px-3 sm:px-4 py-2.5 text-[#e8e8ed] text-xs sm:text-sm" title={v.nombreCliente ?? v.cliente?.nombre ?? ''}>
                    <span className="truncate block max-w-[180px]">{v.nombreCliente ?? v.cliente?.nombre ?? '—'}</span>
                  </td>
                  <td className="px-3 sm:px-4 py-2.5 font-semibold text-emerald-400 text-xs sm:text-sm whitespace-nowrap">
                    {formatPrice(v.total ?? 0)}
                  </td>
                  <td className="px-3 sm:px-4 py-2.5">
                    <span
                      className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${
                        v.estado === 'COMPLETADO' || v.estado === 'ENTREGADO'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-amber-500/15 text-amber-400'
                      }`}
                    >
                      {v.estado ?? '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
