import { useState, useEffect, useRef } from 'react'
import { executiveService } from '@/services/executiveService'
import { useAdminExecutiveActions } from './executive/useAdminExecutiveActions'
import {
  ExecutiveAiSummary,
  ExecutiveKpis,
  ExecutiveTrends,
} from './executive/ExecutiveSections'

export default function AdminExecutive() {
  const [data, setData]         = useState(null)
  const [cargando, setCargando] = useState(true)
  const [aiText, setAiText]     = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [guardado, setGuardado] = useState(false)
  const [error, setError]       = useState(null)
  const printRef = useRef(null)

  useEffect(() => {
    executiveService.getDashboard()
      .then(({ data: d }) => setData(d))
      .catch(() => setError('No se pudo cargar el dashboard'))
      .finally(() => setCargando(false))
  }, [])

  const { generarAiSummary, guardarResumen, imprimir } = useAdminExecutiveActions({
    data,
    aiText,
    printRef,
    setAiText,
    setAiLoading,
    setGuardado,
    setError,
  })

  if (cargando) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-2 rounded-full animate-spin"
        style={{ borderColor: 'var(--hc-border)', borderTopColor: 'var(--hc-accent)' }} />
    </div>
  )

  if (error && !data) return <div className="p-6 text-red-400">{error}</div>

  return (
    <div ref={printRef} className="p-6 max-w-6xl mx-auto space-y-6 print:p-4 print:space-y-4">

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
          <button type="button" onClick={generarAiSummary} disabled={aiLoading}
            className="px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 hover:opacity-80"
            style={{ backgroundColor: 'rgba(23,71,168,0.15)', color: 'var(--hc-accent)', border: '1px solid rgba(23,71,168,0.3)' }}>
            {aiLoading ? '⏳ Generando…' : '🤖 Resumen AI'}
          </button>
          <button type="button" onClick={imprimir}
            className="px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-80"
            style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)', color: 'var(--hc-muted)' }}>
            🖨 Imprimir / PDF
          </button>
        </div>
      </div>

      <div className="hidden print:block">
        <h1 className="text-2xl font-bold">Reporte Ejecutivo — {data?.empresa?.nombre}</h1>
        <p className="text-sm text-gray-500">{data?.periodo}</p>
      </div>

      <ExecutiveKpis data={data} />
      <ExecutiveTrends data={data} />

      <ExecutiveAiSummary
        aiText={aiText}
        aiLoading={aiLoading}
        guardado={guardado}
        onGuardar={guardarResumen}
      />

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

      <div className="hidden print:block text-xs text-gray-400 text-center pt-4 border-t">
        Generado por HotClick · {new Date().toLocaleDateString('es-CR')}
      </div>
    </div>
  )
}
