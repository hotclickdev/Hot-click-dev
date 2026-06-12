import { useState, useEffect } from 'react'
import api from '@/services/api'

const fmt = (n) => new Intl.NumberFormat('es-CR').format(Math.round(n ?? 0))

const ALERTA_STYLE = {
  LIMITE:      { bg: 'rgba(239,68,68,0.1)',    color: '#f87171',  icon: '🚨' },
  ADVERTENCIA: { bg: 'rgba(251,191,36,0.1)',   color: '#fbbf24',  icon: '⚠️' },
  INFO:        { bg: 'rgba(99,102,241,0.1)',   color: '#818cf8',  icon: '💡' },
}

function Toggle({ activo, onChange, disabled }) {
  return (
    <button type="button" onClick={onChange} disabled={disabled}
      className="relative inline-flex w-10 h-5 rounded-full transition-colors duration-200 disabled:opacity-40"
      style={{ backgroundColor: activo ? '#34d399' : 'rgba(255,255,255,0.15)' }}>
      <span className="inline-block w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 mt-0.5"
        style={{ transform: activo ? 'translateX(22px)' : 'translateX(2px)' }} />
    </button>
  )
}

function PctBar({ pct, limite }) {
  const color = pct >= 90 ? '#f87171' : pct >= 70 ? '#fbbf24' : '#34d399'
  if (limite === 0) return <span className="text-xs" style={{ color: 'var(--hc-muted)' }}>N/A</span>
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-mono" style={{ color }}>{pct}%</span>
    </div>
  )
}

export default function AdminAiControl() {
  const now = new Date()
  const [data, setData]         = useState(null)
  const [cargando, setCargando] = useState(true)
  const [tab, setTab]           = useState('control')
  const [toggling, setToggling] = useState(null)
  const [error, setError]       = useState(null)
  const [periodoAnio, setPeriodoAnio] = useState(now.getFullYear())
  const [periodoMes,  setPeriodoMes]  = useState(now.getMonth() + 1)

  async function cargar(anio, mes) {
    setCargando(true); setError(null)
    try {
      const { data: d } = await api.get('/security/ai/dashboard', { params: { anio, mes } })
      setData(d)
    } catch { setError('No se pudo cargar el panel de control de IA') }
    finally { setCargando(false) }
  }

  useEffect(() => { cargar(periodoAnio, periodoMes) }, [periodoAnio, periodoMes])

  async function toggleFlag(empresaId, flag, activo) {
    const key = `${empresaId}-${flag}`
    setToggling(key)
    try {
      const ep = activo
        ? `/admin/flags/${empresaId}/${flag}/off`
        : `/admin/flags/${empresaId}/${flag}/on`
      await api.post(ep)
      // Update local state
      setData(prev => ({
        ...prev,
        empresas: prev.empresas.map(e => {
          if (e.id !== empresaId) return e
          if (flag === 'chat_publico')        return { ...e, chatActivo: !activo }
          if (flag === 'copilot_emprendedor') return { ...e, copilotActivo: !activo }
          return e
        }),
      }))
    } catch { setError('Error al cambiar el flag') }
    finally { setToggling(null) }
  }

  async function toggleTodos(flag, activar) {
    if (!data?.empresas) return
    for (const e of data.empresas) {
      const ep = activar
        ? `/admin/flags/${e.id}/${flag}/on`
        : `/admin/flags/${e.id}/${flag}/off`
      await api.post(ep).catch(() => {})
    }
    await cargar()
  }

  if (cargando) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-2 rounded-full animate-spin"
        style={{ borderColor: 'var(--hc-border)', borderTopColor: 'var(--hc-accent)' }} />
    </div>
  )

  const { empresas = [], alertas = [], costoTotal = 0, totalLlamadas = 0, mes = '' } = data ?? {}

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--hc-text)' }}>Control de IA</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>
            Gestión de features de IA por cuenta · Consumo del período
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <select value={periodoMes} onChange={e => setPeriodoMes(Number(e.target.value))}
            className="px-3 py-1.5 rounded-lg text-sm outline-none"
            style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}>
            {['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
              .map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <select value={periodoAnio} onChange={e => setPeriodoAnio(Number(e.target.value))}
            className="px-3 py-1.5 rounded-lg text-sm outline-none"
            style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}>
            {[now.getFullYear(), now.getFullYear()-1, now.getFullYear()-2].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#f87171' }}>
          {error}
        </div>
      )}

      {/* KPIs globales */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Cuentas activas',      value: empresas.length,                   color: 'var(--hc-text)' },
          { label: 'Llamadas totales/mes',  value: fmt(totalLlamadas),                color: 'var(--hc-accent)' },
          { label: 'Costo estimado USD',    value: `$${costoTotal.toFixed(4)}`,       color: '#34d399' },
          { label: 'Alertas activas',       value: alertas.length,                   color: alertas.length > 0 ? '#f87171' : '#34d399' },
        ].map(k => (
          <div key={k.label} className="rounded-2xl p-4"
            style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
            <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>{k.label}</p>
            <p className="text-xl font-bold mt-1" style={{ color: k.color }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Alertas */}
      {alertas.length > 0 && (
        <div className="space-y-2">
          {alertas.map((a, i) => {
            const s = ALERTA_STYLE[a.tipo] ?? ALERTA_STYLE.INFO
            return (
              <div key={i} className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm"
                style={{ backgroundColor: s.bg, border: `1px solid ${s.color}30` }}>
                <span>{s.icon}</span>
                <div>
                  <span className="font-semibold" style={{ color: s.color }}>{a.nombre}: </span>
                  <span style={{ color: 'var(--hc-text)' }}>{a.mensaje}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ backgroundColor: 'var(--hc-bg)' }}>
        {[
          { id: 'control', label: '⚙️ Control por cuenta' },
          { id: 'consumo', label: '📊 Consumo IA' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              backgroundColor: tab === t.id ? 'var(--hc-surface)' : 'transparent',
              color: tab === t.id ? 'var(--hc-text)' : 'var(--hc-muted)',
              border: tab === t.id ? '1px solid var(--hc-border)' : '1px solid transparent',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab Control ── */}
      {tab === 'control' && (
        <div className="space-y-4">
          {/* Acciones globales */}
          <div className="flex flex-wrap gap-3">
            <div className="rounded-2xl px-4 py-3 flex items-center gap-4"
              style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
              <div>
                <p className="text-xs font-semibold" style={{ color: 'var(--hc-text)' }}>
                  Chat público — todos
                </p>
                <p className="text-[10px]" style={{ color: 'var(--hc-muted)' }}>Widget de búsqueda en el storefront</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => toggleTodos('chat_publico', true)}
                  className="text-xs px-2 py-1 rounded-lg hover:opacity-80"
                  style={{ backgroundColor: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)' }}>
                  Activar todos
                </button>
                <button onClick={() => toggleTodos('chat_publico', false)}
                  className="text-xs px-2 py-1 rounded-lg hover:opacity-80"
                  style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>
                  Desactivar todos
                </button>
              </div>
            </div>

            <div className="rounded-2xl px-4 py-3 flex items-center gap-4"
              style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
              <div>
                <p className="text-xs font-semibold" style={{ color: 'var(--hc-text)' }}>
                  Copilot — todos
                </p>
                <p className="text-[10px]" style={{ color: 'var(--hc-muted)' }}>Chat AI en panel admin del emprendedor</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => toggleTodos('copilot_emprendedor', true)}
                  className="text-xs px-2 py-1 rounded-lg hover:opacity-80"
                  style={{ backgroundColor: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)' }}>
                  Activar todos
                </button>
                <button onClick={() => toggleTodos('copilot_emprendedor', false)}
                  className="text-xs px-2 py-1 rounded-lg hover:opacity-80"
                  style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>
                  Desactivar todos
                </button>
              </div>
            </div>
          </div>

          {/* Tabla por empresa */}
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--hc-border)' }}>
            <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr style={{ backgroundColor: 'var(--hc-surface)', borderBottom: '1px solid var(--hc-border)' }}>
                  {['Cuenta', 'Plan', 'Chat público', 'Copilot admin'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium"
                      style={{ color: 'var(--hc-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {empresas.map(e => (
                  <tr key={e.id} style={{ backgroundColor: 'var(--hc-surface)', borderTop: '1px solid var(--hc-border)' }}>
                    <td className="px-4 py-3 font-medium text-sm" style={{ color: 'var(--hc-text)' }}>
                      {e.nombre}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: 'rgba(23,71,168,0.1)', color: 'var(--hc-accent)' }}>
                        {e.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Toggle
                          activo={e.chatActivo}
                          disabled={toggling === `${e.id}-chat_publico`}
                          onChange={() => toggleFlag(e.id, 'chat_publico', e.chatActivo)}
                        />
                        <span className="text-xs" style={{ color: 'var(--hc-muted)' }}>
                          {e.chatActivo ? 'Activo' : 'Oculto'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Toggle
                          activo={e.copilotActivo}
                          disabled={toggling === `${e.id}-copilot_emprendedor`}
                          onChange={() => toggleFlag(e.id, 'copilot_emprendedor', e.copilotActivo)}
                        />
                        <span className="text-xs" style={{ color: 'var(--hc-muted)' }}>
                          {e.copilotActivo ? 'Activo' : 'Oculto'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab Consumo ── */}
      {tab === 'consumo' && (
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--hc-border)' }}>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr style={{ backgroundColor: 'var(--hc-surface)', borderBottom: '1px solid var(--hc-border)' }}>
                {['Cuenta','Plan','Llamadas','Uso vs límite','Tokens entrada','Tokens salida','Costo USD'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium"
                    style={{ color: 'var(--hc-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {empresas.map(e => (
                <tr key={e.id} style={{ backgroundColor: 'var(--hc-surface)', borderTop: '1px solid var(--hc-border)' }}
                  className="hover:brightness-110 transition-all">
                  <td className="px-4 py-3 font-medium text-sm" style={{ color: 'var(--hc-text)' }}>
                    {e.nombre}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: 'rgba(23,71,168,0.1)', color: 'var(--hc-accent)' }}>
                      {e.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold" style={{ color: 'var(--hc-text)' }}>
                    {e.llamadas}
                    {e.limite > 0 && (
                      <span className="text-xs font-normal ml-1" style={{ color: 'var(--hc-muted)' }}>
                        / {e.limite}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <PctBar pct={e.pct} limite={e.limite} />
                  </td>
                  <td className="px-4 py-3 text-xs font-mono" style={{ color: 'var(--hc-muted)' }}>
                    {fmt(e.tokensEntrada)}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono" style={{ color: 'var(--hc-muted)' }}>
                    {fmt(e.tokensSalida)}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono" style={{ color: e.costoUsd > 0.01 ? '#fbbf24' : 'var(--hc-muted)' }}>
                    ${e.costoUsd.toFixed(4)}
                  </td>
                </tr>
              ))}
              {/* Total row */}
              <tr style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderTop: '2px solid var(--hc-border)' }}>
                <td colSpan={6} className="px-4 py-3 text-xs font-semibold text-right"
                  style={{ color: 'var(--hc-muted)' }}>
                  TOTAL DEL MES
                </td>
                <td className="px-4 py-3 text-sm font-bold" style={{ color: '#fbbf24' }}>
                  ${costoTotal.toFixed(4)} USD
                </td>
              </tr>
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Recomendaciones */}
      <div className="rounded-2xl p-5 space-y-3"
        style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
        <p className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>
          💡 Recomendaciones
        </p>
        <ul className="space-y-2 text-xs" style={{ color: 'var(--hc-muted)' }}>
          <li>• Desactivar el chat público en cuentas GRATUITAS reduce el riesgo de abuso sin costo.</li>
          <li>• Cuentas PRO con 0 llamadas al copilot pueden recibir un email de onboarding para activar la feature.</li>
          <li>• Cuentas cerca del límite (≥80%) son candidatas a upgrade a ENTERPRISE.</li>
          <li>• El costo estimado usa Haiku 4.5: $0.80/M tokens entrada + $4.00/M tokens salida.</li>
        </ul>
      </div>
    </div>
  )
}
