import { useState } from 'react'
import { useAiControl } from './aiControl/useAiControl'
import { fmt, ALERTA_STYLE, MESES, DASHBOARD_VACIO, type TabAiControl } from './aiControl/aiControlHelpers'
import AiControlControlTab from './aiControl/AiControlControlTab'
import AiControlConsumoTab from './aiControl/AiControlConsumoTab'
import TrustGlyph from '@/components/ui/TrustGlyph'

export default function AdminAiControl() {
  const [tab, setTab] = useState<TabAiControl>('control')
  const {
    now,
    data,
    cargando,
    toggling,
    error,
    periodoAnio,
    setPeriodoAnio,
    periodoMes,
    setPeriodoMes,
    toggleFlag,
    toggleTodos,
  } = useAiControl()

  if (cargando) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-2 rounded-full animate-spin"
        style={{ borderColor: 'var(--hc-border)', borderTopColor: 'var(--hc-accent)' }} />
    </div>
  )

  const { empresas = [], alertas = [], costoTotal = 0, totalLlamadas = 0 } = data ?? DASHBOARD_VACIO

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
          <select value={periodoMes} onChange={(e) => setPeriodoMes(Number(e.target.value))}
            className="px-3 py-1.5 rounded-lg text-sm outline-none"
            style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}>
            {MESES.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
          <select value={periodoAnio} onChange={(e) => setPeriodoAnio(Number(e.target.value))}
            className="px-3 py-1.5 rounded-lg text-sm outline-none"
            style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}>
            {[now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl text-sm" style={{ backgroundColor: 'var(--hc-danger-bg)', color: 'var(--hc-danger)' }}>
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Cuentas activas', value: empresas.length, color: 'var(--hc-text)' },
          { label: 'Llamadas totales/mes', value: fmt(totalLlamadas), color: 'var(--hc-accent)' },
          { label: 'Costo estimado USD', value: `$${costoTotal.toFixed(4)}`, color: 'var(--hc-success)' },
          { label: 'Alertas activas', value: alertas.length, color: alertas.length > 0 ? 'var(--hc-danger)' : 'var(--hc-success)' },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl p-4"
            style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
            <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>{k.label}</p>
            <p className="text-xl font-bold mt-1" style={{ color: k.color }}>{k.value}</p>
          </div>
        ))}
      </div>

      {alertas.length > 0 && (
        <div className="space-y-2">
          {alertas.map((a, i) => {
            const s = ALERTA_STYLE[a.tipo ?? ''] ?? ALERTA_STYLE.INFO
            return (
              <div key={i} className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm"
                style={{ backgroundColor: s.bg, border: `1px solid ${s.color}30` }}>
                <span style={{ color: s.color }}>
                  <TrustGlyph tipo={s.icono} className="w-4 h-4" />
                </span>
                <div>
                  <span className="font-semibold" style={{ color: s.color }}>{a.nombre}: </span>
                  <span style={{ color: 'var(--hc-text)' }}>{a.mensaje}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ backgroundColor: 'var(--hc-bg)' }}>
        {([
          { id: 'control', label: 'Control por cuenta' },
          { id: 'consumo', label: 'Consumo IA' },
        ] as const).map((t) => (
          <button type="button" key={t.id} onClick={() => setTab(t.id)}
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

      {tab === 'control' && (
        <AiControlControlTab
          empresas={empresas}
          toggling={toggling}
          onToggleFlag={toggleFlag}
          onToggleTodos={toggleTodos}
        />
      )}

      {tab === 'consumo' && (
        <AiControlConsumoTab empresas={empresas} costoTotal={costoTotal} />
      )}

      <div className="rounded-2xl p-5 space-y-3"
        style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
        <p className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--hc-text)' }}>
          <TrustGlyph tipo="idea" className="w-4 h-4" />
          Recomendaciones
        </p>
        <ul className="space-y-2 text-xs" style={{ color: 'var(--hc-muted)' }}>
          <li>• Desactivar el chat público en cuentas EMPRENDEDOR reduce el riesgo de abuso sin costo.</li>
          <li>• Cuentas PYME con 0 llamadas al copilot pueden recibir un email de onboarding para activar la feature.</li>
          <li>• Cuentas cerca del límite (≥80%) son candidatas a upgrade a NEGOCIO PLUS.</li>
          <li>• El costo estimado usa Haiku 4.5: $0.80/M tokens entrada + $4.00/M tokens salida.</li>
        </ul>
      </div>
    </div>
  )
}
