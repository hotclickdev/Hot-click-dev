import { useTranslation } from 'react-i18next'
import Spinner from '@/components/ui/Spinner'
import { formatPrice } from '@/utils/format'
import Kpi from './Kpi'
import ProgressBar from './ProgressBar'
import { estiloOrigen, porcentajeDe } from './finanzasHelpers'

type BarraMontoProps = {
  etiqueta: string
  valor: number
  total: number
  colorBarra: string
  colorEtiqueta?: string
}

function BarraMonto({ etiqueta, valor, total, colorBarra, colorEtiqueta = 'var(--hc-text)' }: BarraMontoProps) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span style={{ color: colorEtiqueta }}>{etiqueta}</span>
        <span className="text-hc-muted">{formatPrice(valor)} ({porcentajeDe(valor, total)}%)</span>
      </div>
      <ProgressBar value={valor} total={total} color={colorBarra} />
    </div>
  )
}

type FinanzasResumenProps = {
  loading: boolean
  totalIngresos: number
  totalEgresos: number
  utilidadNeta: number
  porOrigen: Record<string, number>
  porMetodo: [string, number][]
  porCategoria: [string, number][]
}

export default function FinanzasResumen({
  loading,
  totalIngresos,
  totalEgresos,
  utilidadNeta,
  porOrigen,
  porMetodo,
  porCategoria,
}: FinanzasResumenProps) {
  const { t } = useTranslation()

  if (loading) {
    return (
      <div className="flex justify-center py-16"><Spinner size="lg" /></div>
    )
  }

  const maxBarra = Math.max(totalIngresos, totalEgresos)
  const origenesConVentas = Object.entries(porOrigen).filter(([, v]) => v > 0)
  const sinVentasOrigen = Object.values(porOrigen).every((v) => v === 0)
  const colorUtilidad = utilidadNeta >= 0 ? 'var(--hc-accent)' : '#f87171'
  const margen = totalIngresos > 0 ? `${((utilidadNeta / totalIngresos) * 100).toFixed(1)}%` : '—'

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label={t('adminFinanzas.kpiGrossIncome')} value={totalIngresos} color="#4ade80" />
        <Kpi label={t('adminFinanzas.kpiTotalExpenses')} value={totalEgresos} color="#f87171" negative />
        <Kpi label={t('adminFinanzas.kpiNetProfit')} value={utilidadNeta} color={colorUtilidad} />
        <div className="bg-hc-surface border border-hc-border rounded-2xl p-5">
          <p className="text-xs text-hc-muted mb-1">{t('adminFinanzas.netMargin')}</p>
          <p className="text-2xl font-bold" style={{ color: colorUtilidad }}>
            {margen}
          </p>
          <p className="text-xs text-hc-muted mt-1">{t('adminFinanzas.overGrossIncome')}</p>
        </div>
      </div>

      <div className="bg-hc-surface border border-hc-border rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-hc-text">{t('adminFinanzas.incomeVsExpenses')}</h3>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span style={{ color: '#4ade80' }}>{t('adminFinanzas.tabIngresos')}</span>
              <span style={{ color: '#4ade80' }}>{formatPrice(totalIngresos)}</span>
            </div>
            <ProgressBar value={totalIngresos} total={maxBarra} color="#4ade80" />
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span style={{ color: '#f87171' }}>{t('adminFinanzas.tabEgresos')}</span>
              <span style={{ color: '#f87171' }}>{formatPrice(totalEgresos)}</span>
            </div>
            <ProgressBar value={totalEgresos} total={maxBarra} color="#f87171" />
          </div>
          <div className="pt-2 border-t border-hc-border flex justify-between text-sm">
            <span style={{ color: 'var(--hc-muted)' }}>{t('adminFinanzas.kpiNetProfit')}</span>
            <span className="font-bold" style={{ color: colorUtilidad }}>
              {utilidadNeta >= 0 ? '+' : ''}{formatPrice(utilidadNeta)}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-hc-surface border border-hc-border rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-hc-text">{t('adminFinanzas.salesByChannel')}</h3>
          {origenesConVentas.map(([origen, valor]) => (
            <BarraMonto
              key={origen}
              etiqueta={origen}
              valor={valor}
              total={totalIngresos}
              colorBarra={estiloOrigen(origen).color}
              colorEtiqueta={estiloOrigen(origen).color}
            />
          ))}
          {sinVentasOrigen && (
            <p className="text-xs text-center py-4" style={{ color: 'var(--hc-muted)' }}>{t('adminFinanzas.noSalesPeriod')}</p>
          )}
        </div>

        <div className="bg-hc-surface border border-hc-border rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-hc-text">{t('adminFinanzas.salesByPayment')}</h3>
          {porMetodo.slice(0, 5).map(([metodo, valor]) => (
            <BarraMonto
              key={metodo}
              etiqueta={metodo}
              valor={valor}
              total={totalIngresos}
              colorBarra="#4f7cff"
            />
          ))}
          {porMetodo.length === 0 && (
            <p className="text-xs text-center py-4" style={{ color: 'var(--hc-muted)' }}>{t('adminFinanzas.noSalesPeriod')}</p>
          )}
        </div>
      </div>

      {porCategoria.length > 0 && (
        <div className="bg-hc-surface border border-hc-border rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-hc-text">{t('adminFinanzas.expensesByCategory')}</h3>
          {porCategoria.map(([cat, valor]) => (
            <BarraMonto
              key={cat}
              etiqueta={cat}
              valor={valor}
              total={totalEgresos}
              colorBarra="#f87171"
            />
          ))}
        </div>
      )}
    </>
  )
}
