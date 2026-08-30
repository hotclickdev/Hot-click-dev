import { useTranslation } from 'react-i18next'
import Spinner from '@/components/ui/Spinner'
import { formatPrice } from '@/utils/format'
import Kpi from './Kpi'
import { EMPTY_GASTO, type GastoAdmin, type GastoForm } from './finanzasHelpers'
import TextoMas from '@/components/ui/TextoMas'

type EgresosTabProps = {
  loading: boolean
  gastos: GastoAdmin[]
  totalEgresos: number
  onNuevo: (gasto: GastoForm) => void
  onEditar: (gasto: GastoForm) => void
  onEliminar: (gasto: GastoAdmin) => void
}

export default function EgresosTab({
  loading,
  gastos,
  totalEgresos,
  onNuevo,
  onEditar,
  onEliminar,
}: EgresosTabProps) {
  const { t } = useTranslation()

  if (loading) {
    return (
      <div className="flex justify-center py-16"><Spinner size="lg" /></div>
    )
  }

  const headers = [
    t('adminFinanzas.colDate'),
    t('adminFinanzas.colConcept'),
    t('adminFinanzas.colCategory'),
    t('adminFinanzas.colAmount'),
    t('adminFinanzas.colActions'),
  ]

  const kpis = (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Kpi label={t('adminFinanzas.kpiTotalExpenses')} value={totalEgresos}
        sub={t('adminFinanzas.expensesCount', { count: gastos.length })}
        color="#f87171" negative />
      <Kpi label={t('adminFinanzas.kpiAvgExpense')} value={gastos.length > 0 ? Math.round(totalEgresos / gastos.length) : 0}
        sub={t('adminFinanzas.inPeriod')} color="#f87171" />
    </div>
  )

  if (gastos.length === 0) {
    return (
      <>
        {kpis}
        <div className="bg-hc-surface border border-hc-border rounded-2xl p-10 text-center space-y-3">
          <p className="text-hc-text font-medium">{t('adminFinanzas.noExpenses')}</p>
          <p className="text-sm text-hc-muted">{t('adminFinanzas.noExpensesHint')}</p>
          <button type="button" onClick={() => onNuevo(EMPTY_GASTO)}
            className="px-4 py-2 rounded-xl text-sm font-semibold inline-flex items-center"
            style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
            <TextoMas>{t('adminFinanzas.firstExpense')}</TextoMas>
          </button>
        </div>
      </>
    )
  }

  return (
    <>
      {kpis}
      <div className="bg-hc-surface border border-hc-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="border-b border-hc-border">
                {headers.map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-hc-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {gastos.map((g) => (
                <tr key={g.id} className="hover:bg-hc-surface-2 transition-colors">
                  <td className="px-4 py-3 text-xs text-hc-muted">{g.fecha ?? '—'}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-hc-text">{g.concepto}</p>
                    {g.notas && <p className="text-[10px] text-hc-muted truncate max-w-[200px]">{g.notas}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium"
                      style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--hc-muted)' }}>
                      {g.categoria ?? 'OTRO'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold text-hc-danger">{formatPrice(g.monto)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button type="button" onClick={() => onEditar(g)}
                        className="px-3 py-1 text-xs rounded-lg bg-hc-surface-2 hover:bg-hc-surface-2 text-hc-muted hover:text-hc-text transition-colors">
                        {t('adminFinanzas.edit')}
                      </button>
                      <button type="button" onClick={() => onEliminar(g)}
                        className="px-3 py-1 text-xs rounded-lg bg-red-500/8 hover:bg-red-500/15 text-red-400 transition-colors">
                        {t('adminFinanzas.delete')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid var(--hc-border)' }}>
                <td colSpan={3} className="px-4 py-3 text-xs font-semibold text-hc-muted uppercase">{t('adminFinanzas.total')}</td>
                <td className="px-4 py-3 font-bold text-hc-danger">{formatPrice(totalEgresos)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </>
  )
}
