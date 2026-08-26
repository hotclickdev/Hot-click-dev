import { fmt, fmtPct } from './executiveFormatters'
import TrustGlyph from '@/components/ui/TrustGlyph'

export function KpiCard({ label, value, sub, delta, color = 'var(--hc-accent)' }) {
  return (
    <div className="rounded-2xl p-5 space-y-1"
      style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
      <p className="text-xs font-medium" style={{ color: 'var(--hc-muted)' }}>{label}</p>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
      <div className="flex items-center gap-2 text-xs">
        {delta != null && fmtPct(delta)}
        {sub && <span style={{ color: 'var(--hc-muted)' }}>{sub}</span>}
      </div>
    </div>
  )
}

export function TrendBar({ data }) {
  const max = Math.max(...data.map(d => Number(d.ingresos ?? 0)), 1)
  return (
    <div className="space-y-1">
      {data.map((d, i) => {
        const val = Number(d.ingresos ?? 0)
        const pct = (val / max) * 100
        return (
          <div key={i} className="flex items-center gap-2">
            <span className="text-[10px] font-mono shrink-0 w-14 text-right" style={{ color: 'var(--hc-muted)' }}>
              {d.mes}
            </span>
            <div className="flex-1 h-4 rounded overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
              <div className="h-full rounded transition-all"
                style={{ width: `${pct}%`, backgroundColor: 'var(--hc-accent)', opacity: 0.85 }} />
            </div>
            <span className="text-xs text-right shrink-0 w-24" style={{ color: 'var(--hc-text)' }}>
              ₡{fmt(val)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export function ExecutiveKpis({ data }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <KpiCard label="MRR" value={`₡${fmt(data?.mrr)}`} color="var(--hc-accent)"
        delta={data?.deltaIngresos} sub="vs mes ant." />
      <KpiCard label="ARR proyectado" value={`₡${fmt(data?.arr)}`} color="var(--hc-text)" />
      <KpiCard label="Pedidos del mes" value={fmt(data?.pedidosMes)}
        delta={data?.deltaPedidos} sub="vs mes ant." color="var(--hc-text)" />
      <KpiCard label="Ticket promedio" value={`₡${fmt(data?.aov)}`} color="var(--hc-text)" />
      <KpiCard label="Margen bruto" value={`₡${fmt(data?.margenBruto)}`} color="#34d399" />
      <KpiCard label="Plan SaaS" value={data?.empresa?.plan ?? '—'} color="#fbbf24" />
    </div>
  )
}

export function ExecutiveTrends({ data }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="rounded-2xl p-5 space-y-4"
        style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
        <p className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>
          Tendencia de ingresos (12 meses)
        </p>
        {data?.tendencia?.length > 0 ? (
          <TrendBar data={data.tendencia} />
        ) : (
          <p className="text-xs text-center py-4" style={{ color: 'var(--hc-muted)' }}>Sin datos de tendencia</p>
        )}
      </div>

      <div className="rounded-2xl p-5 space-y-4"
        style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
        <p className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>
          Top categorías (últimos 3 meses)
        </p>
        {data?.topCategorias?.length > 0 ? (
          <div className="space-y-2">
            {data.topCategorias.map((c, i) => {
              const maxCat = Math.max(...data.topCategorias.map(x => Number(x.ingresos ?? 0)), 1)
              const pct = (Number(c.ingresos ?? 0) / maxCat) * 100
              return (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs shrink-0 w-5 font-bold" style={{ color: 'var(--hc-muted)' }}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate" style={{ color: 'var(--hc-text)' }}>{c.categoria}</p>
                    <div className="h-1.5 rounded-full mt-0.5" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: `hsl(${220 + i * 30}, 80%, 65%)` }} />
                    </div>
                  </div>
                  <span className="text-xs shrink-0 w-24 text-right" style={{ color: 'var(--hc-muted)' }}>
                    ₡{fmt(c.ingresos)}
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-xs text-center py-4" style={{ color: 'var(--hc-muted)' }}>Sin datos de categorías</p>
        )}
      </div>
    </div>
  )
}

export function ExecutiveAiSummary({ aiText, aiLoading, guardado, onGuardar }) {
  if (!aiText && !aiLoading) return null
  return (
    <div className="rounded-2xl p-5 space-y-3"
      style={{ backgroundColor: 'rgba(23,71,168,0.06)', border: '1px solid rgba(23,71,168,0.2)' }}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[#4f7cff] inline-flex items-center gap-1.5">
          <TrustGlyph tipo="sparkle" className="w-4 h-4" />
          Resumen ejecutivo AI
        </p>
        {aiText && !aiLoading && (
          <button type="button" onClick={onGuardar}
            className="text-xs px-3 py-1 rounded-lg hover:opacity-80"
            style={{ backgroundColor: guardado ? 'rgba(52,211,153,0.15)' : 'rgba(23,71,168,0.15)',
              color: guardado ? '#34d399' : 'var(--hc-accent)', border: '1px solid currentColor' }}>
            {guardado ? 'Guardado' : 'Guardar'}
          </button>
        )}
      </div>
      <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--hc-text)' }}>
        {aiText}
        {aiLoading && <span className="inline-block w-1.5 h-4 ml-0.5 animate-pulse rounded-sm bg-[#4f7cff]" />}
      </p>
    </div>
  )
}
