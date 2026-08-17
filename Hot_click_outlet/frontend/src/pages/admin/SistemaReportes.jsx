import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Spinner from '@/components/ui/Spinner'
import { ventaService } from '@/services/orderService'
import { productService } from '@/services/productService'
import { formatPrice } from '@/utils/format'
import useTenantStore from '@/store/tenantStore'

const ESTADOS_COMPLETADOS = new Set(['COMPLETADO', 'ENTREGADO'])
const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const DIAS_LARGO = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

const TABS = [
  { key: 'finanzas',  label: 'Finanzas' },
  { key: 'analisis',  label: 'Análisis y recomendaciones' },
  { key: 'alertas',   label: 'Alertas de productos' },
]

// Tarjetas y contenedores del mockup no usan borde: solo esta sombra.
const CARD_SHADOW = '0 1px 2px rgba(26,26,26,0.04), 0 8px 20px rgba(26,26,26,0.06)'

function toISO(d) { return d.toISOString().slice(0, 10) }

export default function SistemaReportes() {
  const hasFeature = useTenantStore((s) => s.hasFeature)
  const tenantLoaded = useTenantStore((s) => s.loaded)
  const vistaPrevia = tenantLoaded && !hasFeature('reportes')

  const [tab, setTab] = useState('finanzas')
  const [ventas, setVentas]       = useState([])
  const [productos, setProductos] = useState([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    Promise.all([
      ventaService.getAll().catch(() => ({ data: [] })),
      productService.adminGetAll(0, 500).catch(() => ({ data: [] })),
    ]).then(([{ data: vs }, { data: ps }]) => {
      setVentas(Array.isArray(vs) ? vs : vs?.content ?? [])
      const lista = ps?.content ?? (Array.isArray(ps) ? ps : [])
      setProductos(Array.isArray(lista) ? lista : [])
    }).finally(() => setLoading(false))
  }, [])

  // ── Ventana de los últimos 7 días ────────────────────────────
  const dias7 = useMemo(() => {
    const out = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      out.push({ iso: toISO(d), dow: d.getDay(), label: DIAS[d.getDay()], labelLargo: DIAS_LARGO[d.getDay()] })
    }
    return out
  }, [])

  const ventasSemana = useMemo(
    () => ventas.filter(v => ESTADOS_COMPLETADOS.has(v.estado) && dias7.some(d => (v.fechaCreacion ?? '').startsWith(d.iso))),
    [ventas, dias7]
  )

  const porDia = useMemo(() => dias7.map(d => ({
    ...d,
    total: ventasSemana.filter(v => (v.fechaCreacion ?? '').startsWith(d.iso)).reduce((s, v) => s + (v.total ?? 0), 0),
  })), [ventasSemana, dias7])

  const totalSemana = porDia.reduce((s, d) => s + d.total, 0)
  const maxDia = Math.max(...porDia.map(d => d.total), 1)
  const mejorDia = porDia.reduce((max, d) => d.total > max.total ? d : max, porDia[0] ?? { total: 0, label: '—' })
  const mejorDiaPct = totalSemana > 0 ? Math.round((mejorDia.total / totalSemana) * 100) : 0

  const costoSemana = useMemo(() => ventasSemana.reduce((s, v) =>
    s + (v.items ?? []).reduce((si, i) => si + (i.costoUnitarioMomento ?? 0) * (i.cantidad ?? 1), 0), 0
  ), [ventasSemana])
  const ingresoNeto = totalSemana - costoSemana

  // ── Productos estrella (top por ingreso, semana) ─────────────
  const productosEstrella = useMemo(() => {
    const map = {}
    ventasSemana.forEach(v => (v.items ?? []).forEach(item => {
      const id = item.producto?.id ?? item.productoId
      const nombre = item.producto?.nombreProducto ?? item.nombreProducto ?? `#${id}`
      if (!id) return
      map[id] = (map[id] ?? { nombre, ingreso: 0 })
      map[id].ingreso += item.subtotalItem ?? ((item.cantidad ?? 1) * (item.precioUnitarioMomento ?? 0))
    }))
    return Object.values(map)
      .sort((a, b) => b.ingreso - a.ingreso)
      .slice(0, 3)
      .map(p => ({ ...p, pct: totalSemana > 0 ? Math.round((p.ingreso / totalSemana) * 100) : 0 }))
  }, [ventasSemana, totalSemana])

  // ── Alertas de stock bajo ─────────────────────────────────────
  const stockRiesgo = useMemo(() => productos
    .filter(p => (p.stockActual ?? p.stock ?? 0) <= (p.stockMinimo ?? 5))
    .sort((a, b) => (a.stockActual ?? a.stock ?? 0) - (b.stockActual ?? b.stock ?? 0)),
    [productos]
  )

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  return (
    <div className="space-y-4 max-w-[1060px]">
      <Link to="/admin" className="inline-flex items-center gap-1 text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>← Inicio</Link>

      <header>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, letterSpacing: '-0.5px', color: 'var(--hc-text)' }}>Reportes</h1>
        <p style={{ margin: '4px 0 0', fontSize: 15, color: 'var(--hc-muted)' }}>Entendé cómo va tu negocio con datos claros.</p>
      </header>

      {vistaPrevia && (
        <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ backgroundColor: 'rgba(23,71,168,0.08)' }}>
          <svg className="w-5 h-5 shrink-0" style={{ color: 'var(--hc-accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <rect x="4" y="10" width="16" height="10" rx="2"/><path strokeLinecap="round" d="M8 10V7a4 4 0 118 0v3"/>
          </svg>
          <p className="text-sm" style={{ color: 'var(--hc-text)' }}>
            <strong>Estás viendo una vista previa</strong> con tus datos actuales. Con el plan PYME estos reportes traen más historial y detalle.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="inline-flex gap-1 rounded-xl p-1 w-fit flex-wrap" style={{ backgroundColor: 'var(--hc-surface)' }}>
        {TABS.map(({ key, label }) => (
          <button type="button" key={key} onClick={() => setTab(key)}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5"
            style={tab === key ? { backgroundColor: 'var(--hc-accent)', color: '#fff' } : { color: 'var(--hc-muted)' }}>
            {label}
            {key === 'alertas' && stockRiesgo.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#f7ead2', color: '#8a5a00' }}>
                {stockRiesgo.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Finanzas ── */}
      {tab === 'finanzas' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 rounded-2xl p-6 flex flex-col gap-4" style={{ backgroundColor: 'var(--hc-surface)', boxShadow: CARD_SHADOW }}>
            <div className="flex items-center justify-between">
              <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--hc-text)' }}>Ventas de la semana</h2>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--hc-text)' }}>{formatPrice(totalSemana)}</span>
            </div>
            <div className="flex items-end gap-3.5 h-44">
              {porDia.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max((d.total / maxDia) * 100, d.total > 0 ? 6 : 2)}px` }}
                    transition={{ duration: 0.4, delay: i * 0.05 }}
                    className="w-full rounded-t-md"
                    style={{ backgroundColor: d.iso === mejorDia.iso && d.total > 0 ? 'var(--hc-accent)' : '#cdd9ef' }}
                  />
                  <span style={{ fontSize: 12, color: '#8a8378', fontWeight: d.iso === mejorDia.iso ? 700 : 400 }}>{d.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl p-5 flex flex-col gap-1.5" style={{ backgroundColor: 'var(--hc-surface)', boxShadow: CARD_SHADOW }}>
              <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--hc-text)' }}>Ingreso neto de la semana</h3>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 24, color: 'var(--hc-text)' }}>{formatPrice(ingresoNeto)}</div>
              {costoSemana > 0 && <p style={{ fontSize: 13, color: '#1E7F4F', fontWeight: 600, margin: 0 }}>Después de {formatPrice(costoSemana)} en costos</p>}
            </div>
            <div className="rounded-2xl p-5 flex flex-col gap-1.5" style={{ backgroundColor: 'var(--hc-surface)', boxShadow: CARD_SHADOW }}>
              <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--hc-text)' }}>Mejor día para vender</h3>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: 'var(--hc-text)' }}>{mejorDia.labelLargo ? mejorDia.labelLargo[0].toUpperCase() + mejorDia.labelLargo.slice(1) : '—'}</div>
              {totalSemana > 0 && <p style={{ fontSize: 13, color: 'var(--hc-muted)', margin: 0 }}>{mejorDiaPct}% de tus ventas de la semana</p>}
            </div>
          </div>
        </div>
      )}

      {/* ── Análisis y recomendaciones ── */}
      {tab === 'analisis' && (
        <div className="flex flex-col gap-3.5">
          <div className="rounded-2xl p-5 flex flex-col gap-2.5" style={{ backgroundColor: 'var(--hc-surface)', boxShadow: CARD_SHADOW }}>
            <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--hc-text)' }}>Productos estrella</h2>
            {productosEstrella.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>Sin ventas suficientes esta semana todavía.</p>
            ) : (
              productosEstrella.map(p => (
                <div key={p.nombre} className="flex justify-between text-sm" style={{ color: 'var(--hc-text)' }}>
                  <span>{p.nombre}</span>
                  <span style={{ fontWeight: 700 }}>{p.pct}% de tus ventas</span>
                </div>
              ))
            )}
          </div>

          {totalSemana > 0 && (
            <div className="rounded-2xl p-5 flex items-start gap-3.5" style={{ backgroundColor: 'var(--hc-surface)', boxShadow: CARD_SHADOW }}>
              <div className="w-9 h-9 rounded-[10px] shrink-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(23,71,168,0.08)', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, color: 'var(--hc-accent)' }}>H</div>
              <div className="flex flex-col gap-1">
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--hc-text)' }}>Recomendación</div>
                <div style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--hc-text)' }}>
                  {mejorDiaPct >= 20
                    ? `Los ${mejorDia.labelLargo} vendés un ${mejorDiaPct}% de tu semana. Probá anunciar una promo ese día para aprovechar el tráfico.`
                    : `Tus ventas están repartidas parejo en la semana — el mejor día (${mejorDia.labelLargo}) es solo un ${mejorDiaPct}% del total.`}
                </div>
              </div>
            </div>
          )}

          {productosEstrella.length > 0 && (
            <div className="rounded-2xl p-5 flex items-start gap-3.5" style={{ backgroundColor: 'var(--hc-surface)', boxShadow: CARD_SHADOW }}>
              <div className="w-9 h-9 rounded-[10px] shrink-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(23,71,168,0.08)', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, color: 'var(--hc-accent)' }}>H</div>
              <div className="flex flex-col gap-1">
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--hc-text)' }}>Recomendación</div>
                <div style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--hc-text)' }}>
                  {`"${productosEstrella[0].nombre}" es tu producto más vendido — representa ${productosEstrella[0].pct}% de tus ingresos de la semana. Asegurate de no quedarte sin stock.`}
                </div>
              </div>
            </div>
          )}

          <Link to="/admin/copilot" className="text-sm font-semibold self-start" style={{ color: 'var(--hc-accent)' }}>Consultale más a Hot →</Link>
        </div>
      )}

      {/* ── Alertas de productos ── */}
      {tab === 'alertas' && (
        stockRiesgo.length === 0 ? (
          <div className="rounded-2xl p-10 text-center" style={{ backgroundColor: 'var(--hc-surface)', boxShadow: CARD_SHADOW }}>
            <p className="font-medium" style={{ color: '#1E7F4F' }}>¡Todo el inventario está en niveles seguros!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {stockRiesgo.map(p => {
              const actual = p.stockActual ?? p.stock ?? 0
              return (
                <div key={p.id} className="rounded-2xl flex items-center gap-4" style={{ backgroundColor: 'var(--hc-surface)', boxShadow: CARD_SHADOW, padding: '18px 20px' }}>
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: actual <= 0 ? '#a8291f' : '#8a5a00' }} />
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--hc-text)' }}>{p.nombreProducto ?? p.nombre}</p>
                    <p style={{ fontSize: 13, color: 'var(--hc-muted)' }}>
                      {actual <= 0 ? 'Agotado' : `Quedan ${actual} unidades, por debajo del mínimo`}
                    </p>
                  </div>
                  <Link to="/admin/productos" className="text-sm font-semibold shrink-0" style={{ color: 'var(--hc-accent)' }}>Reponé →</Link>
                </div>
              )
            })}
          </div>
        )
      )}

      {vistaPrevia && (
        <section className="rounded-2xl flex items-center gap-5 flex-wrap" style={{ backgroundColor: 'var(--hc-surface)', boxShadow: CARD_SHADOW, padding: '24px 28px' }}>
          <div className="w-12 h-12 rounded-xl shrink-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(23,71,168,0.08)' }}>
            <svg className="w-6 h-6" style={{ color: 'var(--hc-accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <rect x="4" y="10" width="16" height="10" rx="2"/><path strokeLinecap="round" d="M8 10V7a4 4 0 118 0v3"/>
            </svg>
          </div>
          <div className="flex-1 min-w-[200px]">
            <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, color: 'var(--hc-text)' }}>Activá tus reportes reales</p>
            <p style={{ margin: '2px 0 0', fontSize: 14, color: 'var(--hc-muted)' }}>
              Tu plan actual es <strong>Emprendedor (gratis)</strong>. Con el plan PYME sumás más historial y detalle.
            </p>
          </div>
          <Link to="/admin/billing/planes"
            className="whitespace-nowrap transition-opacity hover:opacity-90"
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--hc-primary)', color: '#fff', fontSize: 15, fontWeight: 700, padding: '13px 24px', borderRadius: 10 }}>
            Mejorá tu plan
          </Link>
        </section>
      )}
    </div>
  )
}
