import { useState, useEffect, useRef } from 'react'
import api from '@/services/api'

const fmt   = (n) => new Intl.NumberFormat('es-CR').format(Math.round(n ?? 0))
const fmtPct = (n) => {
  const v = Number(n ?? 0)
  const sign = v > 0 ? '+' : ''
  const color = v > 0 ? '#34d399' : v < 0 ? '#f87171' : 'var(--hc-muted)'
  return <span style={{ color }}>{sign}{v.toFixed(1)}%</span>
}

function KpiCard({ label, value, sub, delta, color = 'var(--hc-accent)' }) {
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

function TrendBar({ data }) {
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

export default function AdminExecutive() {
  const [data, setData]         = useState(null)
  const [cargando, setCargando] = useState(true)
  const [aiText, setAiText]     = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [guardado, setGuardado] = useState(false)
  const [error, setError]       = useState(null)
  const printRef = useRef(null)

  useEffect(() => {
    api.get('/admin/executive/dashboard')
      .then(({ data: d }) => setData(d))
      .catch(() => setError('No se pudo cargar el dashboard'))
      .finally(() => setCargando(false))
  }, [])

  async function generarAiSummary() {
    setAiLoading(true); setAiText(''); setGuardado(false)
    const rawAuth = localStorage.getItem('hotclick-auth')
    const token   = rawAuth ? (JSON.parse(rawAuth)?.state?.token ?? '') : ''

    try {
      const response = await fetch('/api/admin/executive/ai-summary', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      })
      const reader  = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = '', assembled = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (line.startsWith('data:')) {
            try {
              const parsed = JSON.parse(line.slice(5).trim())
              if (parsed.text) { assembled += parsed.text; setAiText(assembled) }
            } catch {}
          }
        }
      }
    } catch (e) {
      setError('Error generando resumen AI')
    } finally {
      setAiLoading(false)
    }
  }

  async function guardarResumen() {
    const periodo = data?.periodo?.slice(0, 7) ?? new Date().toISOString().slice(0, 7)
    try {
      await api.post('/admin/executive/guardar-resumen', { periodo, resumen: aiText })
      setGuardado(true)
      setTimeout(() => setGuardado(false), 3000)
    } catch {}
  }

  function imprimir() {
    const style = document.createElement('style')
    style.id = '__executive-print-style'
    style.textContent = `
      @media print {
        body > * { display: none !important; }
        #root > * { display: none !important; }
        #root > div > aside,
        #root > div > nav,
        [data-sidebar],
        nav { display: none !important; }
        .executive-print-content { display: block !important; }
      }
    `
    document.head.appendChild(style)
    printRef.current?.classList.add('executive-print-content')
    window.print()
    setTimeout(() => {
      document.getElementById('__executive-print-style')?.remove()
      printRef.current?.classList.remove('executive-print-content')
    }, 1000)
  }

  if (cargando) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-2 rounded-full animate-spin"
        style={{ borderColor: 'var(--hc-border)', borderTopColor: 'var(--hc-accent)' }} />
    </div>
  )

  if (error && !data) return <div className="p-6 text-red-400">{error}</div>

  return (
    <div ref={printRef} className="p-6 max-w-6xl mx-auto space-y-6 print:p-4 print:space-y-4">

      {/* Header — hidden on print */}
      <div className="flex items-center justify-between flex-wrap gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--hc-text)' }}>
            Executive Dashboard
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>
            {data?.empresa?.nombre} · {data?.periodo}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={generarAiSummary} disabled={aiLoading}
            className="px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 hover:opacity-80"
            style={{ backgroundColor: 'rgba(79,124,255,0.15)', color: '#4f7cff', border: '1px solid rgba(79,124,255,0.3)' }}>
            {aiLoading ? '⏳ Generando…' : '🤖 Resumen AI'}
          </button>
          <button onClick={imprimir}
            className="px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-80"
            style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)', color: 'var(--hc-muted)' }}>
            🖨 Imprimir / PDF
          </button>
        </div>
      </div>

      {/* Print header — only visible on print */}
      <div className="hidden print:block">
        <h1 className="text-2xl font-bold">Reporte Ejecutivo — {data?.empresa?.nombre}</h1>
        <p className="text-sm text-gray-500">{data?.periodo}</p>
      </div>

      {/* KPIs */}
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

      {/* Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Revenue trend */}
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

        {/* Top categories */}
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

      {/* AI Summary */}
      {(aiText || aiLoading) && (
        <div className="rounded-2xl p-5 space-y-3"
          style={{ backgroundColor: 'rgba(79,124,255,0.06)', border: '1px solid rgba(79,124,255,0.2)' }}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-[#4f7cff]">🤖 Resumen ejecutivo AI</p>
            {aiText && !aiLoading && (
              <button onClick={guardarResumen}
                className="text-xs px-3 py-1 rounded-lg hover:opacity-80"
                style={{ backgroundColor: guardado ? 'rgba(52,211,153,0.15)' : 'rgba(79,124,255,0.15)',
                  color: guardado ? '#34d399' : '#4f7cff', border: '1px solid currentColor' }}>
                {guardado ? '✓ Guardado' : 'Guardar'}
              </button>
            )}
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--hc-text)' }}>
            {aiText}
            {aiLoading && <span className="inline-block w-1.5 h-4 ml-0.5 animate-pulse rounded-sm bg-[#4f7cff]" />}
          </p>
        </div>
      )}

      {/* Historial de reportes */}
      {data?.historialReportes?.length > 0 && (
        <div className="rounded-2xl p-5 space-y-3 print:hidden"
          style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>Reportes anteriores</p>
          <div className="flex flex-wrap gap-2">
            {data.historialReportes.map(r => (
              <span key={r.id} className="text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5"
                style={{ backgroundColor: 'var(--hc-bg)', border: '1px solid var(--hc-border)', color: 'var(--hc-muted)' }}>
                {r.periodo}
                {r.tieneAi && <span className="text-[#4f7cff]">🤖</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Print footer */}
      <div className="hidden print:block text-xs text-gray-400 text-center pt-4 border-t">
        Generado por HOTCLICK · {new Date().toLocaleDateString('es-CR')}
      </div>
    </div>
  )
}
