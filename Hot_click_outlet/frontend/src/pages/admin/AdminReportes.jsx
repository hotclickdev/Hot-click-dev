import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Spinner from '@/components/ui/Spinner'
import Badge from '@/components/ui/Badge'
import { ventaService } from '@/services/orderService'
import { productService } from '@/services/productService'
import { posService } from '@/services/posService'
import { formatPrice, formatDate } from '@/utils/format'
import ImportExportBar from '@/components/admin/ImportExportBar'
import useTenantStore from '@/store/tenantStore'

const ESTADOS_COMPLETADOS = new Set(['COMPLETADO', 'ENTREGADO'])

const fmt       = (n) => new Intl.NumberFormat('es-CR').format(n ?? 0)
const TABLE_SIZE = 25

// Colores semánticos pensados para tarjetas/tablas sobre fondo claro
// (los tonos "neón" originales estaban pensados para fondo oscuro y
// pierden contraste sobre var(--hc-surface)).
const SUCCESS = '#1E7F4F'
const WARNING = '#8a5a00'
const DANGER  = '#a8291f'
const INFO    = 'var(--hc-accent)'

const QUICK = [
  { label: 'Hoy', days: 0 },
  { label: '7 días', days: 7 },
  { label: '30 días', days: 30 },
  { label: '3 meses', days: 90 },
  { label: 'Todo', days: -1 },
]

function toISO(date) { return date.toISOString().slice(0, 10) }

function StatCard({ label, value, sub, color }) {
  return (
    <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
      <p className="text-xs mb-1" style={{ color: 'var(--hc-muted)' }}>{label}</p>
      <p className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)', color: color ?? 'var(--hc-text)' }}>{value}</p>
      {sub && <p className="text-xs mt-1" style={{ color: 'var(--hc-muted)' }}>{sub}</p>}
    </div>
  )
}

const inputCls = 'h-9 px-3 rounded-xl text-sm focus:outline-none'
const inputStyle = { backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }
const cardStyle = { backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }

/* ════════════════════════════════════════════════════════════ */
export default function AdminReportes() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('ventas')

  const hasFeature = useTenantStore((s) => s.hasFeature)
  const tenantLoaded = useTenantStore((s) => s.loaded)
  const vistaPrevia = tenantLoaded && !hasFeature('reportes')

  // Datos
  const [ventas,    setVentas]    = useState([])
  const [productos, setProductos] = useState([])
  const [posVentas, setPosVentas] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [loadingP,  setLoadingP]  = useState(false)
  const [loadingPOS,setLoadingPOS]= useState(false)

  // Filtros
  const [quick,      setQuick]      = useState(30)
  const [desde,      setDesde]      = useState('')
  const [hasta,      setHasta]      = useState('')
  const [metodoPago, setMetodoPago] = useState('')
  const [estado,     setEstado]     = useState('')
  const [search,     setSearch]     = useState('')
  const [tablePage,  setTablePage]  = useState(0)

  // ── Carga inicial ────────────────────────────────────────────
  useEffect(() => {
    ventaService.getAll()
      .then(({ data }) => setVentas(Array.isArray(data) ? data : data?.content ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
    applyQuick(30)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeTab === 'inventario' && productos.length === 0) {
      setLoadingP(true)
      productService.adminGetAll(0, 500)
        .then(res => {
          const items = res?.data?.content ?? res?.data ?? []
          setProductos(Array.isArray(items) ? items : [])
        })
        .catch(() => {})
        .finally(() => setLoadingP(false))
    }
    if (activeTab === 'pos' && posVentas.length === 0) {
      setLoadingPOS(true)
      posService.historial()
        .then(res => setPosVentas(res?.data ?? []))
        .catch(() => setPosVentas([]))
        .finally(() => setLoadingPOS(false))
    }
  }, [activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

  const applyQuick = (days) => {
    setQuick(days); setTablePage(0)
    if (days === -1) { setDesde(''); setHasta(''); return }
    const end = new Date(), start = new Date()
    if (days > 0) start.setDate(start.getDate() - days)
    setDesde(toISO(start)); setHasta(toISO(end))
  }

  // ── Filtrado ─────────────────────────────────────────────────
  const filtered = useMemo(() => {
    setTablePage(0)
    return ventas.filter(v => {
      const fecha = (v.fechaCreacion ?? v.fechaPedido ?? '').slice(0, 10)
      if (desde && fecha < desde) return false
      if (hasta && fecha > hasta) return false
      if (metodoPago && v.metodoPago !== metodoPago) return false
      if (estado && v.estado !== estado) return false
      if (search) {
        const q   = search.toLowerCase()
        const name = (v.nombreCliente ?? v.cliente?.nombre ?? '').toLowerCase()
        if (!name.includes(q) && !String(v.id).includes(q)) return false
      }
      return true
    })
  }, [ventas, desde, hasta, metodoPago, estado, search])

  const completadas   = filtered.filter(v => ESTADOS_COMPLETADOS.has(v.estado))
  const totalIngresos = completadas.reduce((s, v) => s + (v.total ?? v.totalPedido ?? 0), 0)
  const totalEnvios   = completadas.reduce((s, v) => s + (v.costoEnvio ?? 0), 0)
  const totalProductos= totalIngresos - totalEnvios
  const ticketPromedio= completadas.length > 0 ? Math.round(totalIngresos / completadas.length) : 0

  const metodos = [...new Set(ventas.map(v => v.metodoPago).filter(Boolean))]
  const estados = [...new Set(ventas.map(v => v.estado).filter(Boolean))]

  const totalPages = Math.ceil(filtered.length / TABLE_SIZE)
  const paginated  = filtered.slice(tablePage * TABLE_SIZE, (tablePage + 1) * TABLE_SIZE)

  // ── Top productos (desde items de pedidos) ──────────────────
  const topProductos = useMemo(() => {
    const map = {}
    completadas.forEach(v => {
      (v.items ?? []).forEach(item => {
        const id   = item.producto?.id ?? item.productoId
        const name = item.producto?.nombreProducto ?? item.nombreProducto ?? `#${id}`
        if (!id) return
        if (!map[id]) map[id] = { id, nombre: name, cantidad: 0, ingreso: 0, costo: 0 }
        map[id].cantidad += item.cantidad ?? 1
        map[id].ingreso  += item.subtotalItem ?? (item.cantidad * item.precioUnitarioMomento)
        map[id].costo    += (item.costoUnitarioMomento ?? 0) * (item.cantidad ?? 1)
      })
    })
    return Object.values(map)
      .map(p => ({ ...p, utilidad: p.ingreso - p.costo, margen: p.ingreso > 0 ? ((p.ingreso - p.costo) / p.ingreso * 100).toFixed(1) : '0' }))
      .sort((a, b) => b.ingreso - a.ingreso)
      .slice(0, 50)
  }, [completadas])

  // ── Inventario en riesgo ────────────────────────────────────
  const stockRiesgo = useMemo(() =>
    productos
      .filter(p => (p.stockActual ?? p.stock ?? 0) <= (p.stockMinimo ?? 5))
      .sort((a, b) => (a.stockActual ?? a.stock ?? 0) - (b.stockActual ?? b.stock ?? 0))
  , [productos])

  // ── POS stats ───────────────────────────────────────────────
  const posFiltradas = useMemo(() => {
    const lista = posVentas?.data ?? posVentas ?? []
    return lista.filter(v => {
      const fecha = (v.fechaPedido ?? '').slice(0, 10)
      if (desde && fecha < desde) return false
      if (hasta && fecha > hasta) return false
      return true
    })
  }, [posVentas, desde, hasta])

  const posTotal      = posFiltradas.reduce((s, v) => s + (v.totalPedido ?? 0), 0)
  const posTx         = posFiltradas.length
  const posTicket     = posTx > 0 ? Math.round(posTotal / posTx) : 0

  const exportTopProductos = () => {
    const h = 'Producto,Unidades,Ingreso,Costo,Utilidad,Margen%'
    const rows = topProductos.map(p => [p.nombre, p.cantidad, p.ingreso, p.costo, p.utilidad, p.margen].join(','))
    const a = document.createElement('a')
    a.href = `data:text/csv;charset=utf-8,${encodeURIComponent([h, ...rows].join('\n'))}`
    a.download = `top-productos-${toISO(new Date())}.csv`; a.click()
  }

  const TABS = [
    { key: 'ventas',     label: 'Ventas' },
    { key: 'productos',  label: 'Top Productos' },
    { key: 'pos',        label: 'POS' },
    { key: 'inventario', label: 'Inventario' },
  ]

  // ── Render ──────────────────────────────────────────────────
  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--hc-text)' }}>{t('admin.reportes.title')}</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>{t('admin.reportes.generate')}</p>
          </div>
          <div className="flex gap-2">
            {activeTab === 'ventas' && (
              <ImportExportBar exportOnly
                data={filtered.map(v => ({ id:v.id, cliente:v.nombreCliente??'', productos:(v.total??0)-(v.costoEnvio??0), envio:v.costoEnvio??0, total:v.total??0, metodo:v.metodoPago??'', estado:v.estado??'', fecha:(v.fechaCreacion??'').slice(0,10) }))}
                columns={['id','cliente','productos','envio','total','metodo','estado','fecha']}
                filename={`ventas-${toISO(new Date())}`} sheetName="Ventas"
              />
            )}
            {activeTab === 'productos' && topProductos.length > 0 && (
              <button onClick={exportTopProductos}
                className="px-4 py-2 rounded-xl text-xs font-semibold transition-opacity hover:opacity-80"
                style={{ backgroundColor: 'var(--hc-surface-2)', color: 'var(--hc-muted)' }}>
                Exportar CSV
              </button>
            )}
          </div>
        </div>

        {/* Vista previa — plan sin la feature de reportes */}
        {vistaPrevia && (
          <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ backgroundColor: 'rgba(23,71,168,0.08)' }}>
            <svg className="w-5 h-5 shrink-0" style={{ color: 'var(--hc-accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <rect x="4" y="10" width="16" height="10" rx="2"/><path strokeLinecap="round" d="M8 10V7a4 4 0 118 0v3"/>
            </svg>
            <p className="text-sm" style={{ color: 'var(--hc-text)' }}>
              <strong>Estás viendo una vista previa</strong> con tus datos actuales. Con el plan PYME, estos reportes
              se actualizan con más historial y detalle todos los días.
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl p-1 w-fit flex-wrap" style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }}>
          {TABS.map(({ key, label }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className="px-4 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={activeTab === key
                ? { backgroundColor: 'var(--hc-accent)', color: '#fff' }
                : { color: 'var(--hc-muted)' }}>
              {label}
            </button>
          ))}
        </div>

        {/* Filtros rápidos (compartidos) */}
        <div className="flex flex-wrap gap-2">
          {QUICK.map(q => (
            <button key={q.days} onClick={() => applyQuick(q.days)}
              className="px-3 py-1.5 rounded-lg text-sm transition-all"
              style={quick === q.days
                ? { backgroundColor: 'var(--hc-accent)', color: '#fff' }
                : { backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)', color: 'var(--hc-muted)' }}>
              {q.label}
            </button>
          ))}
          <input type="date" value={desde} onChange={e => { setDesde(e.target.value); setQuick(-1) }}
            className={inputCls} style={inputStyle}/>
          <input type="date" value={hasta} onChange={e => { setHasta(e.target.value); setQuick(-1) }}
            className={inputCls} style={inputStyle}/>
        </div>

        {/* ══ TAB: VENTAS ═════════════════════════════════════════ */}
        {activeTab === 'ventas' && (
          <>
            {/* Filtros avanzados */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="flex flex-col gap-1 col-span-2">
                <label className="text-xs" style={{ color: 'var(--hc-muted)' }}>Buscar</label>
                <input type="text" placeholder="Cliente, ID…" value={search}
                  onChange={e => setSearch(e.target.value)}
                  className={inputCls} style={inputStyle}/>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs" style={{ color: 'var(--hc-muted)' }}>{t('admin.reportes.type')}</label>
                <select value={metodoPago} onChange={e => setMetodoPago(e.target.value)}
                  className={inputCls} style={inputStyle}>
                  <option value="">Todos</option>
                  {metodos.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs" style={{ color: 'var(--hc-muted)' }}>{t('admin.orders.status')}</label>
                <select value={estado} onChange={e => setEstado(e.target.value)}
                  className={inputCls} style={inputStyle}>
                  <option value="">Todos</option>
                  {estados.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Ventas en período" value={filtered.length}/>
              <StatCard label="Ingresos (completadas)" value={formatPrice(totalIngresos)} color={SUCCESS}
                sub={totalEnvios > 0 ? `Productos: ${formatPrice(totalProductos)}` : undefined}/>
              <StatCard label="Completadas" value={completadas.length} color={INFO}/>
              <StatCard label="Ticket promedio" value={formatPrice(ticketPromedio)} color={INFO}/>
            </div>

            {/* Tabla */}
            {loading ? <div className="flex justify-center py-16"><Spinner size="lg"/></div> : (
              <div className="rounded-2xl overflow-hidden" style={cardStyle}>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px] text-sm">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--hc-border)' }}>
                        {['#','Cliente','Productos','Envío','Total','Método','Fecha','Estado'].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--hc-muted)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.length === 0
                        ? <tr><td colSpan={8} className="px-4 py-12 text-center" style={{ color: 'var(--hc-muted)' }}>{t('common.noData')}</td></tr>
                        : paginated.map(v => {
                          const envio = v.costoEnvio ?? 0
                          const prods = (v.total ?? 0) - envio
                          return (
                            <tr key={v.id} className="transition-colors hover:bg-[var(--hc-surface-2)]" style={{ borderTop: '1px solid var(--hc-border)' }}>
                              <td className="px-4 py-3 text-xs font-mono" style={{ color: 'var(--hc-muted)' }}>#{v.id}</td>
                              <td className="px-4 py-3 max-w-[140px] truncate" style={{ color: 'var(--hc-text)' }}>{v.nombreCliente ?? v.usuarioFinal?.nombre ?? '—'}</td>
                              <td className="px-4 py-3 font-semibold" style={{ color: 'var(--hc-text)' }}>{formatPrice(prods)}</td>
                              <td className="px-4 py-3 text-xs">{envio > 0 ? <span style={{ color: WARNING }}>{formatPrice(envio)}</span> : <span style={{ color: 'var(--hc-muted)' }}>—</span>}</td>
                              <td className="px-4 py-3 font-semibold" style={{ color: SUCCESS }}>{formatPrice(v.total ?? 0)}</td>
                              <td className="px-4 py-3 text-xs" style={{ color: 'var(--hc-muted)' }}>{v.metodoPago ?? '—'}</td>
                              <td className="px-4 py-3 text-xs" style={{ color: 'var(--hc-muted)' }}>{formatDate(v.fechaCreacion ?? v.fechaPedido)}</td>
                              <td className="px-4 py-3">
                                <Badge variant={ESTADOS_COMPLETADOS.has(v.estado) ? 'success' : 'warning'}>
                                  {v.estado ?? '—'}
                                </Badge>
                              </td>
                            </tr>
                          )
                        })}
                    </tbody>
                  </table>
                </div>
                {filtered.length > TABLE_SIZE && (
                  <div className="px-4 py-3 flex items-center justify-between text-xs" style={{ borderTop: '1px solid var(--hc-border)', color: 'var(--hc-muted)' }}>
                    <span>{filtered.length} resultados</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setTablePage(p => Math.max(0, p-1))} disabled={tablePage === 0}
                        className="px-2 py-1 rounded-lg disabled:opacity-30" style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }}>←</button>
                      <span>{tablePage + 1} / {totalPages}</span>
                      <button onClick={() => setTablePage(p => Math.min(totalPages-1, p+1))} disabled={tablePage >= totalPages-1}
                        className="px-2 py-1 rounded-lg disabled:opacity-30" style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }}>→</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ══ TAB: TOP PRODUCTOS ══════════════════════════════════ */}
        {activeTab === 'productos' && (
          loading ? <div className="flex justify-center py-16"><Spinner size="lg"/></div> : (
            topProductos.length === 0 ? (
              <div className="rounded-2xl p-10 text-center" style={cardStyle}>
                <p style={{ color: 'var(--hc-muted)' }}>Sin datos de productos para este período.</p>
                <p className="text-xs mt-1" style={{ color: 'var(--hc-muted)' }}>Los ítems aparecen cuando los pedidos tienen líneas detalladas.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <StatCard label="Productos únicos" value={topProductos.length}/>
                  <StatCard label="Unidades vendidas" value={fmt(topProductos.reduce((s,p) => s + p.cantidad, 0))} color={SUCCESS}/>
                  <StatCard label="Ingreso total" value={formatPrice(topProductos.reduce((s,p) => s + p.ingreso, 0))} color={INFO}/>
                </div>
                <div className="rounded-2xl overflow-hidden" style={cardStyle}>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[600px] text-sm">
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--hc-border)' }}>
                          {['#','Producto','Unidades','Ingreso','Utilidad','Margen'].map(h => (
                            <th key={h} className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--hc-muted)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {topProductos.map((p, i) => (
                          <tr key={p.id} className="transition-colors hover:bg-[var(--hc-surface-2)]" style={{ borderTop: '1px solid var(--hc-border)' }}>
                            <td className="px-4 py-3 text-xs" style={{ color: 'var(--hc-muted)' }}>{i + 1}</td>
                            <td className="px-4 py-3 font-medium max-w-[200px] truncate" style={{ color: 'var(--hc-text)' }}>{p.nombre}</td>
                            <td className="px-4 py-3" style={{ color: 'var(--hc-text)' }}>{p.cantidad}</td>
                            <td className="px-4 py-3 font-semibold" style={{ color: SUCCESS }}>{formatPrice(p.ingreso)}</td>
                            <td className="px-4 py-3 font-semibold" style={{ color: INFO }}>{formatPrice(p.utilidad)}</td>
                            <td className="px-4 py-3">
                              <span className="font-semibold text-sm" style={{ color: Number.parseFloat(p.margen) >= 30 ? SUCCESS : Number.parseFloat(p.margen) >= 10 ? WARNING : DANGER }}>
                                {p.margen}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )
          )
        )}

        {/* ══ TAB: POS ════════════════════════════════════════════ */}
        {activeTab === 'pos' && (
          loadingPOS ? <div className="flex justify-center py-16"><Spinner size="lg"/></div> : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <StatCard label="Ventas POS" value={posTx}/>
                <StatCard label="Total facturado" value={formatPrice(posTotal)} color={SUCCESS}/>
                <StatCard label="Ticket promedio" value={formatPrice(posTicket)} color={INFO}/>
              </div>

              {posFiltradas.length === 0 ? (
                <div className="rounded-2xl p-10 text-center" style={cardStyle}>
                  <p style={{ color: 'var(--hc-muted)' }}>Sin ventas POS para este período.</p>
                </div>
              ) : (
                <div className="rounded-2xl overflow-hidden" style={cardStyle}>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[560px] text-sm">
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--hc-border)' }}>
                          {['Ticket','Fecha','Cliente','Ítems','Método','Total'].map(h => (
                            <th key={h} className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--hc-muted)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {posFiltradas.slice(0, 100).map(v => (
                          <tr key={v.id} className="transition-colors hover:bg-[var(--hc-surface-2)]" style={{ borderTop: '1px solid var(--hc-border)' }}>
                            <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--hc-muted)' }}>{v.numeroPedido}</td>
                            <td className="px-4 py-3 text-xs" style={{ color: 'var(--hc-muted)' }}>{formatDate(v.fechaPedido)}</td>
                            <td className="px-4 py-3 text-xs" style={{ color: 'var(--hc-text)' }}>
                              {v.usuarioFinal?.id === 999 ? 'Mostrador' : v.usuarioFinal?.nombre ?? '—'}
                            </td>
                            <td className="px-4 py-3 text-xs" style={{ color: 'var(--hc-muted)' }}>{(v.items ?? []).length}</td>
                            <td className="px-4 py-3 text-xs" style={{ color: 'var(--hc-muted)' }}>{v.metodoPago ?? '—'}</td>
                            <td className="px-4 py-3 font-semibold" style={{ color: SUCCESS }}>{formatPrice(v.totalPedido)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )
        )}

        {/* ══ TAB: INVENTARIO (STOCK EN RIESGO) ═══════════════════ */}
        {activeTab === 'inventario' && (
          loadingP ? <div className="flex justify-center py-16"><Spinner size="lg"/></div> : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <StatCard label="Total productos" value={productos.length}/>
                <StatCard label="Stock en riesgo" value={stockRiesgo.length} color={DANGER}
                  sub="stockActual ≤ stockMínimo"/>
                <StatCard label="Agotados" value={stockRiesgo.filter(p => (p.stockActual ?? p.stock ?? 0) <= 0).length} color={DANGER}/>
              </div>

              {stockRiesgo.length === 0 ? (
                <div className="rounded-2xl p-10 text-center" style={cardStyle}>
                  <p className="font-medium" style={{ color: SUCCESS }}>¡Todo el inventario está en niveles seguros!</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--hc-muted)' }}>Ningún producto está por debajo de su stock mínimo.</p>
                </div>
              ) : (
                <div className="rounded-2xl overflow-hidden" style={cardStyle}>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[560px] text-sm">
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--hc-border)' }}>
                          {['Producto','SKU','Stock actual','Stock mínimo','Diferencia','Estado'].map(h => (
                            <th key={h} className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--hc-muted)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {stockRiesgo.map(p => {
                          const actual = p.stockActual ?? p.stock ?? 0
                          const minimo = p.stockMinimo ?? 5
                          const diff   = actual - minimo
                          return (
                            <tr key={p.id} className="transition-colors hover:bg-[var(--hc-surface-2)]" style={{ borderTop: '1px solid var(--hc-border)' }}>
                              <td className="px-4 py-3">
                                <p className="font-medium max-w-[200px] truncate" style={{ color: 'var(--hc-text)' }}>{p.nombreProducto ?? p.nombre}</p>
                              </td>
                              <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--hc-muted)' }}>{p.sku ?? '—'}</td>
                              <td className="px-4 py-3">
                                <span className="font-bold" style={{ color: actual <= 0 ? DANGER : WARNING }}>{actual}</span>
                              </td>
                              <td className="px-4 py-3" style={{ color: 'var(--hc-muted)' }}>{minimo}</td>
                              <td className="px-4 py-3 font-semibold" style={{ color: DANGER }}>{diff}</td>
                              <td className="px-4 py-3">
                                <Badge variant={actual <= 0 ? 'danger' : 'warning'}>
                                  {actual <= 0 ? 'Agotado' : 'Stock bajo'}
                                </Badge>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )
        )}

        {/* Tarjeta de desbloqueo por plan */}
        {vistaPrevia && (
          <div className="rounded-2xl p-6 flex items-center gap-5 flex-wrap" style={cardStyle}>
            <div className="w-12 h-12 rounded-xl shrink-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(23,71,168,0.08)' }}>
              <svg className="w-6 h-6" style={{ color: 'var(--hc-accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <rect x="4" y="10" width="16" height="10" rx="2"/><path strokeLinecap="round" d="M8 10V7a4 4 0 118 0v3"/>
              </svg>
            </div>
            <div className="flex-1 min-w-[200px]">
              <p className="font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--hc-text)' }}>Activá tus reportes reales</p>
              <p className="text-sm mt-0.5" style={{ color: 'var(--hc-muted)' }}>
                Tu plan actual es <strong>Emprendedor (gratis)</strong>. Con el plan PYME sumás más historial, filtros y exportación.
              </p>
            </div>
            <Link to="/admin/billing/planes"
              className="px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--hc-primary)', color: '#fff' }}>
              Mejorá tu plan
            </Link>
          </div>
        )}
      </div>
    </>
  )
}
