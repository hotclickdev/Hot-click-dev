import { useState, useEffect, useCallback, type ReactNode } from 'react'
import Spinner from '@/components/ui/Spinner'
import { finanzasReporteService } from '@/services/finanzasReporteService'
import { formatPrice } from '@/utils/format'
import { useToast } from '@/components/ui/Toast'
import TextoCamino from '@/components/ui/TextoCamino'

type KpisFinanzas = {
  margenPct?: number
  ventasTotales?: number
  cantidadVentas?: number
  gananciaNeta?: number
  subtotalProductos?: number
  cmv?: number
  costoEnvio?: number
  ivaRecaudado?: number
  ivaEstimado?: number
  comprasRecibidas?: number
}

const toISO = (d: Date) => d.toISOString().slice(0, 10)
const QUICK_DAYS = [7, 30, 90, -1]
const QUICK_LABEL: Record<string, string> = { 7: '7 días', 30: '30 días', 90: '90 días', '-1': 'Todo' }

function statusHttp(err: unknown): number | undefined {
  if (typeof err !== 'object' || err === null || !('response' in err)) return undefined
  const status = (err as { response?: { status?: unknown } }).response?.status
  return typeof status === 'number' ? status : undefined
}

function KPI({ label, value, sub, color, icon }: { label: string; value: string; sub?: string; color: string; icon?: ReactNode }) {
  return (
    <div className="bg-[#111114] border border-white/8 rounded-2xl p-6 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#8e8e9a]">{label}</p>
        {icon}
      </div>
      <p className="text-3xl font-bold" style={{ color }}>{value}</p>
      {sub && <p className="text-xs text-[#8e8e9a]">{sub}</p>}
    </div>
  )
}

export default function AdminReporteContador() {
  const { showToast } = useToast()

  const [quick, setQuick] = useState(30)
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [kpis, setKpis]   = useState<KpisFinanzas | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(false)
  const [denied, setDenied]     = useState(false)
  const [exporting, setExporting] = useState(false)

  const applyQuick = (days: number) => {
    setQuick(days)
    if (days === -1) { setDesde(''); setHasta(''); return }
    const end = new Date(), start = new Date()
    start.setDate(start.getDate() - days)
    setDesde(toISO(start)); setHasta(toISO(end))
  }

  useEffect(() => { applyQuick(30) }, [])

  const cargarKpis = useCallback(() => {
    setLoading(true)
    setError(false)
    setDenied(false)
    finanzasReporteService.getKpis(desde || undefined, hasta || undefined)
      .then((raw: unknown) => setKpis(raw as KpisFinanzas))
      .catch((err: unknown) => {
        if (statusHttp(err) === 403) setDenied(true)
        else setError(true)
      })
      .finally(() => setLoading(false))
  }, [desde, hasta])

  useEffect(() => { cargarKpis() }, [cargarKpis])

  const handleExport = async () => {
    setExporting(true)
    try {
      await finanzasReporteService.descargarCsv(desde || undefined, hasta || undefined)
      showToast('Reporte descargado', 'success')
    } catch (err: unknown) {
      if (statusHttp(err) === 403) showToast('Tu plan no incluye este reporte. Mejora tu plan para exportarlo.', 'error')
      else showToast('Error al generar el reporte', 'error')
    } finally {
      setExporting(false)
    }
  }

  const margen = kpis?.margenPct ?? 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#e8e8ed]">Analítica financiera</h1>
          <p className="text-sm text-[#8e8e9a] mt-1">
            Rendimiento real del negocio: ventas POS feria + web, costo de mercadería e IVA estimado.
          </p>
        </div>
      </div>

      {/* Filtros de período */}
      <div className="flex flex-wrap gap-2">
        {QUICK_DAYS.map(days => (
          <button type="button" key={days} onClick={() => applyQuick(days)}
            className="px-3 py-1.5 rounded-lg text-sm transition-all"
            style={{
              backgroundColor: quick === days ? 'var(--hc-accent)' : 'color-mix(in srgb,var(--hc-text) 5%,transparent)',
              color: quick === days ? 'white' : 'var(--hc-muted)',
              border: `1px solid ${quick === days ? 'color-mix(in srgb,var(--hc-accent) 40%,transparent)' : 'var(--hc-border)'}`,
            }}>{QUICK_LABEL[days]}</button>
        ))}
        <input type="date" value={desde} onChange={e => { setDesde(e.target.value); setQuick(-1) }}
          className="h-9 px-3 rounded-xl text-sm text-[#e8e8ed] focus:outline-none bg-[#111114] border border-white/10"/>
        <input type="date" value={hasta} onChange={e => { setHasta(e.target.value); setQuick(-1) }}
          className="h-9 px-3 rounded-xl text-sm text-[#e8e8ed] focus:outline-none bg-[#111114] border border-white/10"/>
      </div>

      {/* Bloqueo por plan */}
      {denied && (
        <div className="bg-[#111114] border border-amber-500/20 rounded-2xl p-8 text-center space-y-3">
          <p className="text-[#e8e8ed] font-bold text-lg">Función disponible en plan Pro+</p>
          <p className="text-sm text-[#8e8e9a] max-w-md mx-auto">
            La analítica financiera y el reporte para el contador requieren un plan Pro o superior.
            Ve a <TextoCamino partes={['Configuración', 'Suscripción']} /> para mejorar tu plan.
          </p>
        </div>
      )}

      {error && !denied && (
        <div className="bg-[#111114] border border-red-500/20 rounded-2xl p-8 text-center">
          <p className="text-[#f87171] text-sm">Error al cargar el reporte. Intenta de nuevo.</p>
        </div>
      )}

      {!denied && !error && (
        loading ? (
          <div className="flex justify-center py-16"><Spinner size="lg"/></div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <KPI label="Ventas totales" value={formatPrice(kpis?.ventasTotales ?? 0)}
                sub={`${kpis?.cantidadVentas ?? 0} ventas en el período`} color="#4f7cff"/>
              <KPI label="Ganancia neta" value={formatPrice(kpis?.gananciaNeta ?? 0)}
                sub="Ventas − costo de mercadería − envío" color={margen >= 0 ? '#4ade80' : '#f87171'}/>
              <KPI label="Margen %" value={`${margen}%`}
                sub="Ganancia neta / ventas totales" color={margen >= 0 ? '#4ade80' : '#f87171'}/>
            </div>

            {/* Desglose */}
            <div className="bg-[#111114] border border-white/8 rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-semibold text-[#e8e8ed]">Desglose del período</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-[#8e8e9a]">Subtotal productos</span>
                  <span className="font-semibold text-[#e8e8ed]">{formatPrice(kpis?.subtotalProductos ?? 0)}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-[#8e8e9a]">Costo mercadería (CMV)</span>
                  <span className="font-semibold text-amber-400">{formatPrice(kpis?.cmv ?? 0)}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-[#8e8e9a]">Costo de envío</span>
                  <span className="font-semibold text-amber-400">{formatPrice(kpis?.costoEnvio ?? 0)}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-[#8e8e9a]">IVA recaudado (confirmado)</span>
                  <span className="font-semibold text-[#e8e8ed]">{formatPrice(kpis?.ivaRecaudado ?? 0)}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-[#8e8e9a]">IVA estimado (13%)</span>
                  <span className="font-semibold text-[#e8e8ed]">{formatPrice(kpis?.ivaEstimado ?? 0)}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-[#8e8e9a]">Compras a proveedor recibidas</span>
                  <span className="font-semibold text-[#e8e8ed]">{formatPrice(kpis?.comprasRecibidas ?? 0)}</span>
                </div>
              </div>
            </div>

            {/* Export CSV */}
            <button type="button" onClick={handleExport} disabled={exporting}
              className="w-full flex items-center justify-center gap-3 py-5 rounded-2xl text-base font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
              {exporting ? <Spinner size="sm"/> : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12 12 16.5 7.5 12M12 16.5V3"/>
                </svg>
              )}
              {exporting ? 'Generando…' : 'Exportar reporte para el Contador (CSV)'}
            </button>
          </>
        )
      )}
    </div>
  )
}
