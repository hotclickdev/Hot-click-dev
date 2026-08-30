import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Spinner from '@/components/ui/Spinner'
import { formatPrice, formatDate } from '@/utils/format'
import type { Id } from '@/types/api'
import Kpi from './Kpi'
import {
  clienteDePedido,
  envioDePedido,
  estiloOrigen,
  fechaDePedido,
  subtotalDePedido,
  totalDePedido,
  type PedidoFinanzas,
} from './finanzasHelpers'
import TextoFlecha from '@/components/ui/TextoFlecha'

type TablaIngresosProps = {
  filteredP: PedidoFinanzas[]
  totalProductos: number
  totalEnvio: number
  totalIngresos: number
  onSelectPedido: (id: Id) => void
}

function TablaIngresos({ filteredP, totalProductos, totalEnvio, totalIngresos, onSelectPedido }: TablaIngresosProps) {
  const { t } = useTranslation()
  const headers = [
    t('adminFinanzas.colId'),
    t('adminFinanzas.colClient'),
    t('adminFinanzas.colDate'),
    t('adminFinanzas.colOrigin'),
    t('adminFinanzas.colMethod'),
    t('adminFinanzas.colProducts'),
    t('adminFinanzas.colShippingShort'),
    t('adminFinanzas.colTotalShort'),
    '',
  ]
  return (
    <div className="bg-hc-surface border border-hc-border rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="border-b border-hc-border">
              {headers.map((h, i) => (
                <th key={`${h}-${i}`} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-hc-muted">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredP.map((p) => {
              const envio = envioDePedido(p)
              const productos = subtotalDePedido(p)
              return (
                <tr key={p.id}
                  className="hover:bg-hc-surface-2 transition-colors cursor-pointer"
                  title={t('adminFinanzas.viewSaleDetail')}
                  onClick={() => onSelectPedido(p.id as Id)}>
                  <td className="px-4 py-3 font-mono text-xs text-hc-muted">#{p.id}</td>
                  <td className="px-4 py-3 text-hc-text truncate max-w-[120px]">{clienteDePedido(p)}</td>
                  <td className="px-4 py-3 text-xs text-hc-muted">
                    {formatDate((fechaDePedido(p) ?? '') as string)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                      style={estiloOrigen(p.origen)}>{p.origen ?? 'ONLINE'}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-hc-muted">{p.metodoPago ?? '—'}</td>
                  <td className="px-4 py-3 font-semibold text-hc-success">{formatPrice(productos)}</td>
                  <td className="px-4 py-3">
                    {envio > 0
                      ? <span className="font-semibold text-amber-400">{formatPrice(envio)}</span>
                      : <span className="text-hc-muted/40 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 font-bold text-hc-link">
                    {formatPrice(totalDePedido(p))}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] text-hc-muted/60 hover:text-hc-link transition-colors whitespace-nowrap">
                      <TextoFlecha>{t('adminFinanzas.view')}</TextoFlecha>
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '2px solid var(--hc-border)' }}>
              <td colSpan={5} className="px-4 py-3 text-xs font-semibold text-hc-muted uppercase">
                {t('adminFinanzas.periodTotals')}
              </td>
              <td className="px-4 py-3 font-bold text-hc-success">{formatPrice(totalProductos)}</td>
              <td className="px-4 py-3 font-bold text-amber-400">{formatPrice(totalEnvio)}</td>
              <td className="px-4 py-3 font-bold text-hc-link">{formatPrice(totalIngresos)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

type IngresosTabProps = TablaIngresosProps & {
  loading: boolean
}

export default function IngresosTab({
  loading,
  filteredP,
  totalProductos,
  totalEnvio,
  totalIngresos,
  onSelectPedido,
}: IngresosTabProps) {
  const { t } = useTranslation()

  if (loading) {
    return (
      <div className="flex justify-center py-16"><Spinner size="lg" /></div>
    )
  }

  const kpis = (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Kpi label={t('adminFinanzas.kpiProductsSold')} value={totalProductos}
        sub={t('adminFinanzas.delivered', { count: filteredP.length })} color="#4ade80" />
      <Kpi label={t('adminFinanzas.kpiShipping')} value={totalEnvio}
        sub={t('adminFinanzas.withShipping', { count: filteredP.filter((p) => envioDePedido(p) > 0).length })} color="#f59e0b" />
      <Kpi label={t('adminFinanzas.kpiTotal')} value={totalIngresos}
        sub={t('adminFinanzas.productsPlusShipping')} color="#4f7cff" />
    </div>
  )

  if (filteredP.length === 0) {
    return (
      <>
        {kpis}
        <div className="bg-hc-surface border border-hc-border rounded-2xl p-10 text-center space-y-2">
          <p className="text-hc-text font-medium">{t('adminFinanzas.noSalesPeriod')}</p>
          <p className="text-sm text-hc-muted">{t('adminFinanzas.noSalesHint')}</p>
          <Link to="/admin/pedidos" className="inline-block text-xs text-hc-link hover:underline mt-1">
            <TextoFlecha>{t('adminFinanzas.viewOrders')}</TextoFlecha>
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
