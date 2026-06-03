import { useState, useEffect } from 'react'
import api from '@/services/api'

const fmt = (n) => new Intl.NumberFormat('es-CR').format(Math.round(n ?? 0))

function BarChart({ data, valueKey, label, color = 'var(--hc-accent)', maxVal }) {
  const max = maxVal ?? Math.max(...data.map(d => Number(d[valueKey] ?? 0)), 1)
  return (
    <div className="space-y-1.5">
      {data.map((d, i) => {
        const val = Number(d[valueKey] ?? 0)
        const pct = max > 0 ? (val / max) * 100 : 0
        return (
          <div key={i} className="flex items-center gap-2">
            <span className="text-[10px] font-mono shrink-0 w-16 text-right" style={{ color: 'var(--hc-muted)' }}>
              {d.periodo ?? d.semana}
            </span>
            <div className="flex-1 relative h-5 rounded overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
              <div className="h-full rounded transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: color, opacity: d._forecast ? 0.65 : 1 }} />
            </div>
            <span className="text-xs font-semibold w-20 text-right shrink-0" style={{ color: 'var(--hc-text)' }}>
              {label === 'unidades' ? val : `₡${fmt(val)}`}
            </span>
            {d.confianza && (
              <span className="text-[10px] w-10 shrink-0" style={{ color: 'var(--hc-muted)' }}>
                {Number(d.confianza).toFixed(0)}%
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function AdminForecast() {
  const [data, setData]           = useState(null)
  const [cargando, setCargando]   = useState(true)
  const [generando, setGenerando] = useState(false)
  const [error, setError]         = useState(null)
  const [tab, setTab]             = useState('ingresos') // ingresos | unidades

  async function cargar() {
    setCargando(true); setError(null)
    try {
      const { data: d } = await api.get('/admin/forecast/dashboard')
      setData(d)
    } catch { setError('No se pudo cargar el pronóstico') }
    finally { setCargando(false) }
  }

  useEffect(() => { cargar() }, [])

  async function generar() {
    setGenerando(true)
    try {
      await api.post('/admin/forecast/generar')
      await cargar()
    } catch { setError('Error al generar pronóstico') }
    finally { setGenerando(false) }
  }

  // Merge history + forecast for unified chart
  const chartData = (() => {
    if (!data) return []
    const hist = (data.historial ?? []).map(h => ({
      periodo: h.periodo,
      ingresos: Number(h.ingresos ?? 0),
      unidades: Number(h.unidades ?? 0),
      _forecast: false,
    }))
    const fore = (data.pronostico ?? []).map(f => ({
      periodo: f.periodo + ' ▸',
      ingresos: Number(f.ingresos ?? 0),
      unidades: Number(f.unidades ?? 0),
      confianza: f.confianza,
      _forecast: true,
    }))
    return [...hist.slice(-8), ...fore]
  })()

  const maxVal = Math.max(...chartData.map(d => Number(d[tab] ?? 0)), 1)

  // KPIs from forecast
  const totalForecastIngresos = (data?.pronostico ?? []).reduce((s, f) => s + Number(f.ingresos ?? 0), 0)
  const totalForecastUnidades = (data?.pronostico ?? []).reduce((s, f) => s + Number(f.unidades ?? 0), 0)
  const avgConfianza = data?.pronostico?.length
    ? data.pronostico.reduce((s, f) => s + Number(f.confianza ?? 0), 0) / data.pronostico.length
    : 0

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--hc-text)' }}>
            AI Demand Forecasting
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>
            Pronóstico semanal con Holt-Winters · Actualización automática diaria a las 4:30 AM
          </p>
        </div>
        <button onClick={generar} disabled={generando || cargando}
          className="px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 hover:opacity-80"
          style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
          {generando ? 'Calculando…' : '▶ Generar ahora'}
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#f87171' }}>
          {error}
        </div>
      )}

      {cargando ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 rounded-full animate-spin"
            style={{ borderColor: 'var(--hc-border)', borderTopColor: 'var(--hc-accent)' }} />
        </div>
      ) : !data || (!data.historial?.length && !data.pronostico?.length) ? (
        <div className="text-center py-16 space-y-3" style={{ color: 'var(--hc-muted)' }}>
          <div className="text-4xl">📈</div>
          <p className="font-medium">Sin datos suficientes para el pronóstico</p>
          <p className="text-sm">Necesitas al menos 4 semanas de historial de ventas para generar el pronóstico.</p>
          <button onClick={generar}
            className="px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-80"
            style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
            Intentar generar
          </button>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Ingresos próximas 4 semanas', value: `₡${fmt(totalForecastIngresos)}`, color: 'var(--hc-accent)' },
              { label: 'Unidades pronosticadas', value: fmt(totalForecastUnidades), color: 'var(--hc-text)' },
              { label: 'Confianza del modelo', value: `${avgConfianza.toFixed(0)}%`,
                color: avgConfianza >= 70 ? '#34d399' : avgConfianza >= 40 ? '#fbbf24' : '#f87171' },
            ].map(k => (
              <div key={k.label} className="rounded-2xl p-5"
                style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
                <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>{k.label}</p>
                <p className="text-2xl font-bold mt-1" style={{ color: k.color }}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div className="rounded-2xl p-5 space-y-4"
            style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>
                  Historial + pronóstico semanal
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>
                  Semanas con ▸ son pronóstico · % = confianza del modelo
                </p>
              </div>
              <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: 'var(--hc-bg)' }}>
                {['ingresos', 'unidades'].map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{
                      backgroundColor: tab === t ? 'var(--hc-surface)' : 'transparent',
                      color: tab === t ? 'var(--hc-text)' : 'var(--hc-muted)',
                      border: tab === t ? '1px solid var(--hc-border)' : '1px solid transparent',
                    }}>
                    {t === 'ingresos' ? '₡ Ingresos' : '📦 Unidades'}
                  </button>
                ))}
              </div>
            </div>

            <BarChart
              data={chartData}
              valueKey={tab}
              label={tab}
              maxVal={maxVal}
              color={tab === 'ingresos' ? 'var(--hc-accent)' : '#34d399'}
            />

            <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--hc-muted)' }}>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm inline-block opacity-100"
                  style={{ backgroundColor: tab === 'ingresos' ? 'var(--hc-accent)' : '#34d399' }} />
                Historial real
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm inline-block opacity-65"
                  style={{ backgroundColor: tab === 'ingresos' ? 'var(--hc-accent)' : '#34d399' }} />
                Pronóstico
              </span>
            </div>
          </div>

          {/* Forecast table */}
          {data.pronostico?.length > 0 && (
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--hc-border)' }}>
              <div className="px-4 py-3" style={{ backgroundColor: 'var(--hc-surface)', borderBottom: '1px solid var(--hc-border)' }}>
                <p className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>Detalle del pronóstico</p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: 'var(--hc-surface)', borderBottom: '1px solid var(--hc-border)' }}>
                    {['Semana', 'Unidades estimadas', 'Ingresos estimados', 'Confianza'].map(h => (
                      <th key={h} className="px-4 py-2 text-left text-xs font-medium" style={{ color: 'var(--hc-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.pronostico.map((f, i) => (
                    <tr key={i} style={{ backgroundColor: 'var(--hc-surface)', borderTop: '1px solid var(--hc-border)' }}>
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--hc-muted)' }}>{f.periodo}</td>
                      <td className="px-4 py-3 font-semibold" style={{ color: 'var(--hc-text)' }}>{fmt(f.unidades)}</td>
                      <td className="px-4 py-3 font-semibold" style={{ color: 'var(--hc-accent)' }}>₡{fmt(f.ingresos)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                            <div className="h-full rounded-full"
                              style={{
                                width: `${f.confianza}%`,
                                backgroundColor: f.confianza >= 70 ? '#34d399' : f.confianza >= 40 ? '#fbbf24' : '#f87171',
                              }} />
                          </div>
                          <span className="text-xs" style={{ color: 'var(--hc-muted)' }}>{Number(f.confianza).toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data.generado && (
            <p className="text-xs text-center" style={{ color: 'var(--hc-muted)' }}>
              Último pronóstico generado: {data.generado.slice(0, 16).replace('T', ' ')}
            </p>
          )}
        </>
      )}
    </div>
  )
}
