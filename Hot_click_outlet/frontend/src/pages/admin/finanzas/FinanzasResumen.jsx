import Spinner from '@/components/ui/Spinner'
import { formatPrice } from '@/utils/format'
import Kpi from './Kpi'
import ProgressBar from './ProgressBar'
import { estiloOrigen, porcentajeDe } from './finanzasHelpers'

function BarraMonto({ etiqueta, valor, total, colorBarra, colorEtiqueta = 'var(--hc-text)' }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span style={{ color: colorEtiqueta }}>{etiqueta}</span>
        <span className="text-[#8e8e9a]">{formatPrice(valor)} ({porcentajeDe(valor, total)}%)</span>
      </div>
      <ProgressBar value={valor} total={total} color={colorBarra} />
    </div>
  )
}

export default function FinanzasResumen({
  loading,
  totalIngresos,
  totalEgresos,
  utilidadNeta,
  porOrigen,
  porMetodo,
  porCategoria,
}) {
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
        <Kpi label="Ingresos brutos" value={totalIngresos} color="#4ade80" />
        <Kpi label="Egresos totales" value={totalEgresos} color="#f87171" negative />
        <Kpi label="Utilidad neta" value={utilidadNeta} color={colorUtilidad} />
        <div className="bg-[#111114] border border-white/8 rounded-2xl p-5">
          <p className="text-xs text-[#8e8e9a] mb-1">Margen neto</p>
          <p className="text-2xl font-bold" style={{ color: colorUtilidad }}>
            {margen}
          </p>
          <p className="text-xs text-[#8e8e9a] mt-1">sobre ingresos brutos</p>
        </div>
      </div>

      <div className="bg-[#111114] border border-white/8 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-[#e8e8ed]">Ingresos vs Egresos</h3>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span style={{ color: '#4ade80' }}>Ingresos</span>
              <span style={{ color: '#4ade80' }}>{formatPrice(totalIngresos)}</span>
            </div>
            <ProgressBar value={totalIngresos} total={maxBarra} color="#4ade80" />
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span style={{ color: '#f87171' }}>Egresos</span>
              <span style={{ color: '#f87171' }}>{formatPrice(totalEgresos)}</span>
            </div>
            <ProgressBar value={totalEgresos} total={maxBarra} color="#f87171" />
          </div>
          <div className="pt-2 border-t border-white/8 flex justify-between text-sm">
            <span style={{ color: 'var(--hc-muted)' }}>Utilidad neta</span>
            <span className="font-bold" style={{ color: colorUtilidad }}>
              {utilidadNeta >= 0 ? '+' : ''}{formatPrice(utilidadNeta)}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#111114] border border-white/8 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-[#e8e8ed]">Ventas por canal</h3>
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
            <p className="text-xs text-center py-4" style={{ color: 'var(--hc-muted)' }}>Sin ventas en el período</p>
          )}
        </div>

        <div className="bg-[#111114] border border-white/8 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-[#e8e8ed]">Ventas por método de pago</h3>
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
            <p className="text-xs text-center py-4" style={{ color: 'var(--hc-muted)' }}>Sin ventas en el período</p>
          )}
        </div>
      </div>

      {porCategoria.length > 0 && (
        <div className="bg-[#111114] border border-white/8 rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-[#e8e8ed]">Egresos por categoría</h3>
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
