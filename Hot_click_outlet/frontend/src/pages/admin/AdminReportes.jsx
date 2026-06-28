import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import Spinner from '@/components/ui/Spinner'
import Badge from '@/components/ui/Badge'
import { ventaService } from '@/services/orderService'
import { productService } from '@/services/productService'
import { posService } from '@/services/posService'
import { formatPrice, formatDate } from '@/utils/format'
import ImportExportBar from '@/components/admin/ImportExportBar'

const ESTADOS_COMPLETADOS = new Set(['COMPLETADO', 'ENTREGADO'])

const fmt       = (n) => new Intl.NumberFormat('es-CR').format(n ?? 0)
const TABLE_SIZE = 25

const QUICK = [
  { label: 'Hoy', days: 0 },
  { label: '7 días', days: 7 },
  { label: '30 días', days: 30 },
  { label: '3 meses', days: 90 },
  { label: 'Todo', days: -1 },
]

function toISO(date) { return date.toISOString().slice(0, 10) }

function StatCard({ label, value, sub, color = '#F4F6F9' }) {
  return (
    <div className="bg-[#111114] border border-white/8 rounded-2xl p-4">
      <p className="text-xs text-[#8e8e9a] mb-1">{label}</p>
      <p className="text-xl font-bold" style={{ color }}>{value}</p>
      {sub && <p className="text-xs text-[#8e8e9a] mt-1">{sub}</p>}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════ */
export default function AdminReportes() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('ventas')

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

  const exportVentas = () => {
    const h = 'ID,Cliente,Productos,Envío,Total,Método,Estado,Fecha'
    const rows = filtered.map(v => [
      v.id, v.nombreCliente ?? '', (v.total ?? 0) - (v.costoEnvio ?? 0),
      v.costoEnvio ?? 0, v.total ?? 0, v.metodoPago ?? '', v.estado ?? '',
      (v.fechaCreacion ?? '').slice(0, 10)
    ].join(','))
    const a = document.createElement('a')
    a.href = `data:text/csv;charset=utf-8,${encodeURIComponent([h, ...rows].join('\n'))}`
    a.download = `ventas-${toISO(new Date())}.csv`; a.click()
  }

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
            <h1 className="text-2xl font-bold text-[#e8e8ed]">{t('admin.reportes.title')}</h1>
            <p className="text-sm text-[#8e8e9a] mt-1">{t('admin.reportes.generate')}</p>
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
                style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--hc-muted)' }}>
                Exportar CSV
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white/3 border border-white/8 rounded-xl p-1 w-fit flex-wrap">
          {TABS.map(({ key, label }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === key ? 'bg-[#4f7cff] text-white' : 'text-[#8e8e9a] hover:text-white'
              }`}>{label}</button>
          ))}
        </div>

        {/* Filtros rápidos (compartidos) */}
        <div className="flex flex-wrap gap-2">
          {QUICK.map(q => (
            <button key={q.days} onClick={() => applyQuick(q.days)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                quick === q.days ? 'bg-[#4f7cff] text-white' : 'bg-white/5 border border-white/10 text-[#8e8e9a] hover:text-white'
              }`}>{q.label}</button>
          ))}
          <input type="date" value={desde} onChange={e => { setDesde(e.target.value); setQuick(-1) }}
            className="h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-[#e8e8ed] text-sm focus:outline-none"/>
          <input type="date" value={hasta} onChange={e => { setHasta(e.target.value); setQuick(-1) }}
            className="h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-[#e8e8ed] text-sm focus:outline-none"/>
        </div>

        {/* ══ TAB: VENTAS ═════════════════════════════════════════ */}
        {activeTab === 'ventas' && (
          <>
            {/* Filtros avanzados */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="flex flex-col gap-1 col-span-2">
                <label className="text-xs text-[#8e8e9a]">Buscar</label>
                <input type="text" placeholder="Cliente, ID…" value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-[#e8e8ed] text-sm focus:outline-none"/>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[#8e8e9a]">{t('admin.reportes.type')}</label>
                <select value={metodoPago} onChange={e => setMetodoPago(e.target.value)}
                  className="h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-[#e8e8ed] text-sm focus:outline-none">
                  <option value="">Todos</option>
                  {metodos.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[#8e8e9a]">{t('admin.orders.status')}</label>
                <select value={estado} onChange={e => setEstado(e.target.value)}
                  className="h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-[#e8e8ed] text-sm focus:outline-none">
                  <option value="">Todos</option>
                  {estados.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Ventas en período" value={filtered.length}/>
              <StatCard label="Ingresos (completadas)" value={formatPrice(totalIngresos)} color="#4ade80"
                sub={totalEnvios > 0 ? `Productos: ${formatPrice(totalProductos)}` : undefined}/>
              <StatCard label="Completadas" value={completadas.length} color="#4f7cff"/>
              <StatCard label="Ticket promedio" value={formatPrice(ticketPromedio)} color="var(--hc-blue-400)"/>
            </div>

            {/* Tabla */}
            {loading ? <div className="flex justify-center py-16"><Spinner size="lg"/></div> : (
              <div className="bg-[#111114] border border-white/8 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px] text-sm">
                    <thead>
                      <tr className="border-b border-white/8">
                        {['#','Cliente','Productos','Envío','Total','Método','Fecha','Estado'].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-medium text-[#8e8e9a] uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filtered.length === 0
                        ? <tr><td colSpan={8} className="px-4 py-12 text-center text-[#8e8e9a]">{t('common.noData')}</td></tr>
                        : paginated.map(v => {
                          const envio = v.costoEnvio ?? 0
                          const prods = (v.total ?? 0) - envio
                          return (
                            <tr key={v.id} className="hover:bg-white/3 transition-colors">
                              <td className="px-4 py-3 text-[#8e8e9a] text-xs font-mono">#{v.id}</td>
                              <td className="px-4 py-3 text-[#e8e8ed] max-w-[140px] truncate">{v.nombreCliente ?? v.usuarioFinal?.nombre ?? '—'}</td>
                              <td className="px-4 py-3 font-semibold text-[#e8e8ed]">{formatPrice(prods)}</td>
                              <td className="px-4 py-3 text-xs">{envio > 0 ? <span className="text-amber-400">{formatPrice(envio)}</span> : <span className="text-[#8e8e9a]">—</span>}</td>
                              <td className="px-4 py-3 font-semibold text-emerald-400">{formatPrice(v.total ?? 0)}</td>
                              <td className="px-4 py-3 text-[#8e8e9a] text-xs">{v.metodoPago ?? '—'}</td>
                              <td className="px-4 py-3 text-[#8e8e9a] text-xs">{formatDate(v.fechaCreacion ?? v.fechaPedido)}</td>
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
                  <div className="px-4 py-3 border-t border-white/8 flex items-center justify-between text-xs text-[#8e8e9a]">
                    <span>{filtered.length} resultados</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setTablePage(p => Math.max(0, p-1))} disabled={tablePage === 0}
                        className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 disabled:opacity-30">←</button>
                      <span>{tablePage + 1} / {totalPages}</span>
                      <button onClick={() => setTablePage(p => Math.min(totalPages-1, p+1))} disabled={tablePage >= totalPages-1}
                        className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 disabled:opacity-30">→</button>
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
              <div className="bg-[#111114] border border-white/8 rounded-2xl p-10 text-center">
                <p className="text-[#8e8e9a]">Sin datos de productos para este período.</p>
                <p className="text-xs text-[#8e8e9a] mt-1">Los ítems aparecen cuando los pedidos tienen líneas detalladas.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <StatCard label="Productos únicos" value={topProductos.length} color="#F4F6F9"/>
                  <StatCard label="Unidades vendidas" value={fmt(topProductos.reduce((s,p) => s + p.cantidad, 0))} color="#4ade80"/>
                  <StatCard label="Ingreso total" value={formatPrice(topProductos.reduce((s,p) => s + p.ingreso, 0))} color="#4f7cff"/>
                </div>
                <div className="bg-[#111114] border border-white/8 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[600px] text-sm">
                      <thead>
                        <tr className="border-b border-white/8">
                          {['#','Producto','Unidades','Ingreso','Utilidad','Margen'].map(h => (
                            <th key={h} className="text-left px-4 py-3 text-xs font-medium text-[#8e8e9a] uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {topProductos.map((p, i) => (
                          <tr key={p.id} className="hover:bg-white/3 transition-colors">
                            <td className="px-4 py-3 text-xs text-[#8e8e9a]">{i + 1}</td>
                            <td className="px-4 py-3 font-medium text-[#e8e8ed] max-w-[200px] truncate">{p.nombre}</td>
                            <td className="px-4 py-3 text-[#e8e8ed]">{p.cantidad}</td>
                            <td className="px-4 py-3 font-semibold text-emerald-400">{formatPrice(p.ingreso)}</td>
                            <td className="px-4 py-3 font-semibold text-[#4f7cff]">{formatPrice(p.utilidad)}</td>
                            <td className="px-4 py-3">
                              <span className={`font-semibold text-sm ${Number.parseFloat(p.margen) >= 30 ? 'text-emerald-400' : Number.parseFloat(p.margen) >= 10 ? 'text-amber-400' : 'text-red-400'}`}>
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
                <StatCard label="Ventas POS" value={posTx} color="#F4F6F9"/>
                <StatCard label="Total facturado" value={formatPrice(posTotal)} color="#34d399"/>
                <StatCard label="Ticket promedio" value={formatPrice(posTicket)} color="var(--hc-blue-300)"/>
              </div>

              {posFiltradas.length === 0 ? (
                <div className="bg-[#111114] border border-white/8 rounded-2xl p-10 text-center">
                  <p className="text-[#8e8e9a]">Sin ventas POS para este período.</p>
                </div>
              ) : (
                <div className="bg-[#111114] border border-white/8 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[560px] text-sm">
                      <thead>
                        <tr className="border-b border-white/8">
                          {['Ticket','Fecha','Cliente','Ítems','Método','Total'].map(h => (
                            <th key={h} className="text-left px-4 py-3 text-xs font-medium text-[#8e8e9a] uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {posFiltradas.slice(0, 100).map(v => (
                          <tr key={v.id} className="hover:bg-white/3 transition-colors">
                            <td className="px-4 py-3 font-mono text-xs text-[#8e8e9a]">{v.numeroPedido}</td>
                            <td className="px-4 py-3 text-xs text-[#8e8e9a]">{formatDate(v.fechaPedido)}</td>
                            <td className="px-4 py-3 text-[#e8e8ed] text-xs">
                              {v.usuarioFinal?.id === 999 ? 'Mostrador' : v.usuarioFinal?.nombre ?? '—'}
                            </td>
                            <td className="px-4 py-3 text-[#8e8e9a] text-xs">{(v.items ?? []).length}</td>
                            <td className="px-4 py-3 text-[#8e8e9a] text-xs">{v.metodoPago ?? '—'}</td>
                            <td className="px-4 py-3 font-semibold text-emerald-400">{formatPrice(v.totalPedido)}</td>
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
                <StatCard label="Total productos" value={productos.length} color="#F4F6F9"/>
                <StatCard label="Stock en riesgo" value={stockRiesgo.length} color="#f87171"
                  sub="stockActual ≤ stockMínimo"/>
                <StatCard label="Agotados" value={stockRiesgo.filter(p => (p.stockActual ?? p.stock ?? 0) <= 0).length} color="#f87171"/>
              </div>

              {stockRiesgo.length === 0 ? (
                <div className="bg-[#111114] border border-white/8 rounded-2xl p-10 text-center">
                  <p className="text-emerald-400 font-medium">¡Todo el inventario está en niveles seguros!</p>
                  <p className="text-xs text-[#8e8e9a] mt-1">Ningún producto está por debajo de su stock mínimo.</p>
                </div>
              ) : (
                <div className="bg-[#111114] border border-white/8 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[560px] text-sm">
                      <thead>
                        <tr className="border-b border-white/8">
                          {['Producto','SKU','Stock actual','Stock mínimo','Diferencia','Estado'].map(h => (
                            <th key={h} className="text-left px-4 py-3 text-xs font-medium text-[#8e8e9a] uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {stockRiesgo.map(p => {
                          const actual = p.stockActual ?? p.stock ?? 0
                          const minimo = p.stockMinimo ?? 5
                          const diff   = actual - minimo
                          return (
                            <tr key={p.id} className="hover:bg-white/3 transition-colors">
                              <td className="px-4 py-3">
                                <p className="font-medium text-[#e8e8ed] max-w-[200px] truncate">{p.nombreProducto ?? p.nombre}</p>
                              </td>
                              <td className="px-4 py-3 font-mono text-xs text-[#8e8e9a]">{p.sku ?? '—'}</td>
                              <td className="px-4 py-3">
                                <span className={`font-bold ${actual <= 0 ? 'text-red-400' : 'text-amber-400'}`}>{actual}</span>
                              </td>
                              <td className="px-4 py-3 text-[#8e8e9a]">{minimo}</td>
                              <td className="px-4 py-3 font-semibold text-red-400">{diff}</td>
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
      </div>
    </>
  )
}
