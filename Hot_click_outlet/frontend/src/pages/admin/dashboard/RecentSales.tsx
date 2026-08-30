import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { formatPrice } from '@/utils/format'
import TextoFlecha from '@/components/ui/TextoFlecha'
import type { VentaDashboard } from './dashboardHelpers'

type RecentSalesProps = {
  ventas: VentaDashboard[]
}

export default function RecentSales({ ventas }: RecentSalesProps) {
  const { t } = useTranslation()
  if (ventas.length === 0) return null

  const headers = [
    t('admin.dashboard.colId'),
    t('admin.dashboard.colClient'),
    t('admin.dashboard.colTotal'),
    t('admin.dashboard.colStatus'),
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-[var(--hc-text)]">{t('admin.dashboard.recentSales')}</h2>
        <Link to="/admin/ventas" className="text-xs text-[var(--hc-link)] hover:underline">
          <TextoFlecha>{t('admin.dashboard.viewAll')}</TextoFlecha>
        </Link>
      </div>
      <div className="bg-[var(--hc-surface)] border border-[var(--hc-border)] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="border-b border-[var(--hc-border)]">
                {headers.map((h) => (
                  <th
                    key={h}
                    className="text-left px-3 sm:px-4 py-2.5 text-xs font-medium text-[var(--hc-muted)] uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--hc-border)]">
              {ventas.slice(0, 5).map((v) => (
                <tr key={v.id} className="hover:bg-[var(--hc-surface-2)] transition-colors">
                  <td className="px-3 sm:px-4 py-2.5 text-[var(--hc-muted)] text-xs">#{v.id}</td>
                  <td className="px-3 sm:px-4 py-2.5 text-[var(--hc-text)] text-xs sm:text-sm" title={v.nombreCliente ?? v.cliente?.nombre ?? ''}>
                    <span className="truncate block max-w-[180px]">{v.nombreCliente ?? v.cliente?.nombre ?? '—'}</span>
                  </td>
                  <td className="px-3 sm:px-4 py-2.5 font-semibold text-emerald-700 text-xs sm:text-sm whitespace-nowrap">
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
