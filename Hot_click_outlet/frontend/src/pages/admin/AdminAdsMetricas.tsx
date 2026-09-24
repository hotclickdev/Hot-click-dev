import { useCallback, useEffect, useState } from 'react'
import {
  adsMetricasService,
  type AdsAlerta,
  type AdsCampanaRow,
  type AdsGastoRow,
  type AdsMetricasResumen,
} from '@/services/adsMetricasService'
import { useToast } from '@/components/ui/Toast'

const CRC = new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 })

function hoyIso() {
  return new Date().toISOString().slice(0, 10)
}

function haceDias(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

function fmtRoas(pct: number | null | undefined) {
  if (pct == null) return '—'
  return `${(pct / 100).toFixed(2)}x`
}

function fmtCrc(n: number | null | undefined) {
  if (n == null) return '—'
  return CRC.format(n)
}

/**
 * Tablero ROAS / CAC / LTV + gasto manual de ads y alertas de fatiga.
 */
export default function AdminAdsMetricas() {
  const { showToast } = useToast()
  const [desde, setDesde] = useState(() => haceDias(29))
  const [hasta, setHasta] = useState(() => hoyIso())
  const [ventana, setVentana] = useState(7)
  const [loading, setLoading] = useState(true)
  const [resumen, setResumen] = useState<AdsMetricasResumen | null>(null)
  const [gastos, setGastos] = useState<AdsGastoRow[]>([])
  const [formFecha, setFormFecha] = useState(() => hoyIso())
  const [formCampana, setFormCampana] = useState('')
  const [formMonto, setFormMonto] = useState('')
  const [saving, setSaving] = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [m, g] = await Promise.all([
        adsMetricasService.metricas({ desde, hasta, ventanaDias: ventana }),
        adsMetricasService.listarGastos({ desde, hasta }),
      ])
      setResumen(m)
      setGastos(Array.isArray(g) ? g : [])
    } catch (err) {
      console.error('[AdminAdsMetricas]', err)
      showToast('No se pudieron cargar las métricas de ads', 'error')
    } finally {
      setLoading(false)
    }
  }, [desde, hasta, ventana, showToast])

  useEffect(() => {
    void cargar()
  }, [cargar])

  async function guardarGasto() {
    const monto = Number.parseInt(formMonto, 10)
    if (!formCampana.trim() || Number.isNaN(monto) || monto < 0) {
      showToast('Campaña y monto válidos son requeridos', 'error')
      return
    }
    setSaving(true)
    try {
      await adsMetricasService.crearGasto({
        fecha: formFecha,
        campana: formCampana.trim(),
        montoCrc: monto,
        canal: 'meta',
      })
      setFormCampana('')
      setFormMonto('')
      showToast('Gasto de ads registrado', 'success')
      await cargar()
    } catch (err) {
      console.error('[AdminAdsMetricas] gasto', err)
      showToast('No se pudo guardar el gasto', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function borrarGasto(id: number) {
    try {
      await adsMetricasService.eliminarGasto(id)
      showToast('Gasto eliminado', 'success')
      await cargar()
    } catch (err) {
      console.error('[AdminAdsMetricas] delete', err)
      showToast('No se pudo eliminar', 'error')
    }
  }

  const campanas: AdsCampanaRow[] = resumen?.campanas ?? []
  const alertas: AdsAlerta[] = resumen?.alertas ?? []
  const cpm = resumen?.cpmCpc

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-hc-text">Ads y atribución</h1>
          <p className="text-sm text-hc-muted mt-1">
            ROAS, CAC y LTV sobre ventas atribuidas. El gasto se carga a mano o se sincroniza desde Meta.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-end">
          <label className="text-xs text-hc-muted flex flex-col gap-1">
            Desde
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)}
              className="h-9 px-3 rounded-xl border border-hc-border bg-hc-surface text-sm" />
          </label>
          <label className="text-xs text-hc-muted flex flex-col gap-1">
            Hasta
            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)}
              className="h-9 px-3 rounded-xl border border-hc-border bg-hc-surface text-sm" />
          </label>
          <label className="text-xs text-hc-muted flex flex-col gap-1">
            Ventana clic
            <select value={ventana} onChange={(e) => setVentana(Number(e.target.value))}
              className="h-9 px-3 rounded-xl border border-hc-border bg-hc-surface text-sm">
              <option value={1}>1 día</option>
              <option value={7}>7 días</option>
              <option value={28}>28 días</option>
            </select>
          </label>
        </div>
      </header>

      {loading && <p className="text-sm text-hc-muted">Cargando…</p>}

      {!loading && resumen && (
        <>
          <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Kpi label="Ingresos atribuidos" value={fmtCrc(resumen.ingresosAtribuidos)} />
            <Kpi label="Utilidad atribuida" value={fmtCrc(resumen.utilidadAtribuida)} />
            <Kpi label="ROAS utilidad" value={fmtRoas(resumen.roasUtilidad)} hint={resumen.gastoTotal == null ? 'Sin gasto cargado' : undefined} />
            <Kpi label="ROAS ingresos" value={fmtRoas(resumen.roasIngresos)} />
            <Kpi label="ROAS blended" value={fmtRoas(resumen.roasBlended)} hint="Ingresos totales ÷ gasto" />
            <Kpi label="CAC" value={fmtCrc(resumen.cac)} hint={`${resumen.nuevosClientes ?? 0} clientes nuevos`} />
            <Kpi label="LTV 90 días" value={fmtCrc(resumen.ltv90)} />
            <Kpi label="Gasto ads" value={fmtCrc(resumen.gastoTotal)} />
          </section>

          {(cpm?.impresiones || cpm?.clics) ? (
            <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Kpi label="CPM" value={fmtCrc(cpm.cpm)} />
              <Kpi label="CPC" value={fmtCrc(cpm.cpc)} />
              <Kpi label="CPR" value={fmtCrc(cpm.cpr)} />
              <Kpi label="Impresiones" value={String(cpm.impresiones ?? 0)} />
            </section>
          ) : null}

          {alertas.length > 0 && (
            <section className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 space-y-2">
              <h2 className="font-semibold text-hc-text">Alertas creativas</h2>
              <ul className="space-y-1 text-sm text-hc-text">
                {alertas.map((a, i) => (
                  <li key={`${a.tipo}-${i}`}>• {a.mensaje}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="rounded-2xl border border-hc-border bg-hc-surface overflow-hidden">
            <div className="px-4 py-3 border-b border-hc-border font-semibold">Por campaña</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-hc-muted border-b border-hc-border">
                    <th className="p-3">Campaña</th>
                    <th className="p-3">Pedidos</th>
                    <th className="p-3">Ingresos</th>
                    <th className="p-3">Utilidad</th>
                    <th className="p-3">Gasto</th>
                    <th className="p-3">ROAS util.</th>
                  </tr>
                </thead>
                <tbody>
                  {campanas.length === 0 && (
                    <tr><td colSpan={6} className="p-4 text-hc-muted">Sin ventas atribuidas en el período.</td></tr>
                  )}
                  {campanas.map((c) => (
                    <tr key={c.campana} className="border-b border-hc-border/60">
                      <td className="p-3 font-medium">{c.campana}</td>
                      <td className="p-3">{c.pedidos}</td>
                      <td className="p-3">{fmtCrc(c.ingresos)}</td>
                      <td className="p-3">{fmtCrc(c.utilidad)}</td>
                      <td className="p-3">{fmtCrc(c.gasto)}</td>
                      <td className="p-3">{fmtRoas(c.roasUtilidad)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <section className="rounded-2xl border border-hc-border bg-hc-surface p-4 space-y-4">
        <h2 className="font-semibold text-hc-text">Cargar gasto de campaña</h2>
        <div className="flex flex-wrap gap-2 items-end">
          <label className="text-xs text-hc-muted flex flex-col gap-1">
            Fecha
            <input type="date" value={formFecha} onChange={(e) => setFormFecha(e.target.value)}
              className="h-9 px-3 rounded-xl border border-hc-border bg-hc-bg text-sm" />
          </label>
          <label className="text-xs text-hc-muted flex flex-col gap-1 min-w-[12rem] flex-1">
            Campaña (utm_campaign)
            <input value={formCampana} onChange={(e) => setFormCampana(e.target.value)}
              placeholder="ej. tienda-slug-marzo"
              className="h-9 px-3 rounded-xl border border-hc-border bg-hc-bg text-sm" />
          </label>
          <label className="text-xs text-hc-muted flex flex-col gap-1">
            Monto CRC
            <input type="number" min={0} value={formMonto} onChange={(e) => setFormMonto(e.target.value)}
              className="h-9 px-3 rounded-xl border border-hc-border bg-hc-bg text-sm w-32" />
          </label>
          <button type="button" onClick={() => void guardarGasto()} disabled={saving}
            className="h-9 px-4 rounded-xl bg-hc-accent text-white text-sm font-medium disabled:opacity-50">
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
        <ul className="divide-y divide-hc-border text-sm">
          {gastos.length === 0 && <li className="py-2 text-hc-muted">Sin gastos en el período.</li>}
          {gastos.map((g) => (
            <li key={g.id} className="py-2 flex items-center justify-between gap-2">
              <span>{g.fecha} · {g.campana} · {fmtCrc(g.montoCrc)} <span className="text-hc-muted">({g.fuente})</span></span>
              <button type="button" onClick={() => void borrarGasto(g.id)}
                className="text-xs text-red-500 hover:underline">Eliminar</button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-hc-border bg-hc-surface p-4">
      <div className="text-xs text-hc-muted">{label}</div>
      <div className="text-xl font-bold text-hc-text mt-1">{value}</div>
      {hint && <div className="text-[11px] text-hc-muted mt-1">{hint}</div>}
    </div>
  )
}
