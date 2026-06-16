import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Spinner from '@/components/ui/Spinner'
import { orderService } from '@/services/orderService'
import { gastoService } from '@/services/gastoService'
import { formatPrice, formatDate } from '@/utils/format'
import ImportExportBar from '@/components/admin/ImportExportBar'
import { useToast } from '@/components/ui/Toast'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

const fmt     = (n) => new Intl.NumberFormat('es-CR').format(n ?? 0)
const toISO   = (d) => d.toISOString().slice(0, 10)

const QUICK_DAYS = [0, 7, 30, -1]
const QUICK_LABEL = { 0: 'Hoy', 7: '7 días', 30: '30 días', '-1': 'Todo' }

const CATEGORIAS = ['ALQUILER','SALARIOS','MARKETING','ENVIOS_EXTERNOS','SERVICIOS','INSUMOS','IMPUESTOS','OTRO']

function KPI({ label, value, sub, color = '#4ade80', negative = false }) {
  return (
    <div className="bg-[#111114] border border-white/8 rounded-2xl p-5">
      <p className="text-xs text-[#8e8e9a] mb-1">{label}</p>
      <p className="text-2xl font-bold" style={{ color }}>{negative && value > 0 ? '-' : ''}{formatPrice(Math.abs(value))}</p>
      {sub && <p className="text-xs text-[#8e8e9a] mt-1">{sub}</p>}
    </div>
  )
}

/* ── EMPTY FORM ─────────────────────────────────────────── */
const EMPTY_GASTO = { concepto: '', monto: '', categoria: 'OTRO', fecha: toISO(new Date()), notas: '' }

/* ── GASTO MODAL ────────────────────────────────────────── */
function GastoModal({ editing, onClose, onSaved }) {
  const { showToast } = useToast()
  const [form, setForm]   = useState(editing ?? EMPTY_GASTO)
  const [saving, setSaving] = useState(false)
  const set = (f) => (v) => setForm(p => ({ ...p, [f]: v }))

  const handleSave = async () => {
    if (!form.concepto.trim()) { showToast('El concepto es requerido', 'error'); return }
    if (!form.monto || parseInt(form.monto) <= 0) { showToast('El monto debe ser mayor a 0', 'error'); return }
    setSaving(true)
    try {
      const dto = { ...form, monto: parseInt(form.monto) }
      if (editing?.id) await gastoService.actualizar(editing.id, dto)
      else await gastoService.crear(dto)
      showToast(editing?.id ? 'Gasto actualizado' : 'Gasto registrado', 'success')
      onSaved()
    } catch { showToast('Error al guardar gasto', 'error') }
    finally { setSaving(false) }
  }

  const inp = 'w-full px-3 py-2 rounded-xl text-sm outline-none'
  const style = { backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--hc-text)' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-md rounded-2xl p-6 space-y-4"
        style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center justify-between">
          <h2 className="font-bold" style={{ color: 'var(--hc-text)' }}>
            {editing?.id ? 'Editar gasto' : 'Nuevo gasto'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--hc-muted)' }}>✕</button>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--hc-muted)' }}>Concepto *</label>
          <input type="text" value={form.concepto} onChange={e => set('concepto')(e.target.value)}
            placeholder="Ej: Pago de alquiler" className={inp} style={style}/>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--hc-muted)' }}>Monto (₡) *</label>
            <input type="number" min={1} value={form.monto} onChange={e => set('monto')(e.target.value)}
              placeholder="0" className={inp} style={style}/>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--hc-muted)' }}>Fecha</label>
            <input type="date" value={form.fecha} onChange={e => set('fecha')(e.target.value)}
              className={inp} style={style}/>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--hc-muted)' }}>Categoría</label>
          <select value={form.categoria} onChange={e => set('categoria')(e.target.value)}
            className={inp} style={style}>
            {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--hc-muted)' }}>Notas</label>
          <textarea value={form.notas} onChange={e => set('notas')(e.target.value)} rows={2}
            placeholder="Observaciones opcionales…"
            className={`${inp} resize-none`} style={style}/>
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--hc-muted)' }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving || !form.concepto.trim() || !form.monto || parseInt(form.monto) <= 0}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-80 disabled:opacity-40"
            style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Modal de detalle de venta ──────────────────────────── */
function SaleDetailModal({ pedidoId, onClose }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(false)

  useEffect(() => {
    setLoading(true)
    setError(false)
    orderService.getById(pedidoId)
      .then(r => { setData(r.data?.data ?? r.data) })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [pedidoId])

  const inp = 'w-full rounded-xl text-sm outline-none'
  const subtotal = data
    ? (data.subtotal ?? ((data.total ?? data.totalPedido ?? 0) - (data.costoEnvio ?? 0)))
    : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col max-h-[90vh]"
        style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid rgba(255,255,255,0.08)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div>
            <h2 className="font-bold text-[#e8e8ed]">
              Pedido #{data?.numeroPedido ?? data?.id ?? pedidoId}
            </h2>
            {data?.fechaCreacion && (
              <p className="text-xs text-[#8e8e9a] mt-0.5">{formatDate(data.fechaCreacion)}</p>
            )}
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--hc-muted)' }}>
            ✕
          </button>
        </div>

        {/* Body scrollable */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {loading && (
            <div className="flex justify-center py-10"><Spinner size="lg"/></div>
          )}
          {error && (
            <p className="text-center text-[#f87171] py-8 text-sm">Error al cargar el pedido.</p>
          )}
          {!loading && !error && data && (
            <>
              {/* Cliente */}
              <div className="rounded-xl p-3 space-y-1"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#8e8e9a]">Cliente</p>
                <p className="font-medium text-[#e8e8ed] text-sm">
                  {data.usuarioFinal?.nombre ?? data.nombreCliente ?? '—'}
                </p>
                {data.telefono && <p className="text-xs text-[#8e8e9a]">{data.telefono}</p>}
                {data.direccionEntrega && <p className="text-xs text-[#8e8e9a]">{data.direccionEntrega}</p>}
              </div>

              {/* Productos */}
              {(data.items ?? []).length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#8e8e9a] mb-2">
                    Productos ({(data.items ?? []).length})
                  </p>
                  <div className="space-y-2">
                    {(data.items ?? []).map((item, i) => {
                      const precio = item.precioUnitario ?? item.precio ?? 0
                      const subtotalItem = precio * (item.cantidad ?? 1)
                      return (
                        <div key={i} className="flex items-center gap-3 rounded-xl p-3"
                          style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          {item.imagenUrl && (
                            <img src={item.imagenUrl} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0"/>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#e8e8ed] truncate">
                              {item.nombreProducto ?? item.nombre ?? 'Producto'}
                            </p>
                            <p className="text-xs text-[#8e8e9a]">
                              {item.cantidad} × {formatPrice(precio)}
                            </p>
                          </div>
                          <p className="text-sm font-bold text-[#4ade80] shrink-0">{formatPrice(subtotalItem)}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Desglose financiero */}
              <div className="rounded-xl p-3 space-y-2"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#8e8e9a]">Resumen</p>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#8e8e9a]">Subtotal productos</span>
                    <span className="text-[#4ade80] font-semibold">{formatPrice(subtotal)}</span>
                  </div>
                  {(data.costoEnvio ?? 0) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[#8e8e9a]">Costo de envío</span>
                      <span className="text-amber-400 font-semibold">{formatPrice(data.costoEnvio)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <span className="font-bold text-[#e8e8ed]">Total cobrado</span>
                    <span className="font-bold text-[#4f7cff]">{formatPrice(data.total ?? data.totalPedido ?? 0)}</span>
                  </div>
                </div>
                <div className="flex gap-3 pt-1 text-xs text-[#8e8e9a]">
                  {data.metodoPago && <span>Pago: <span className="text-[#e8e8ed]">{data.metodoPago}</span></span>}
                  {data.metodoEnvio && <span>Envío: <span className="text-[#e8e8ed]">{data.metodoEnvio}</span></span>}
                  {data.origen && <span>Canal: <span className="text-[#e8e8ed]">{data.origen}</span></span>}
                </div>
              </div>

              {/* Guía de envío */}
              {data.numeroGuia && (
                <div className="rounded-xl p-3"
                  style={{ backgroundColor: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)' }}>
                  <p className="text-xs font-semibold text-[#6490EA] mb-0.5">Guía de envío</p>
                  <p className="text-sm text-[#e8e8ed]">{data.numeroGuia}</p>
                  {data.urlTracking && (
                    <a href={data.urlTracking} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-[#6490EA] underline mt-1 block">
                      Rastrear →
                    </a>
                  )}
                </div>
              )}

              {/* Notas */}
              {data.notas && (
                <div className="rounded-xl p-3"
                  style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#8e8e9a] mb-1">Notas</p>
                  <p className="text-sm text-[#8e8e9a]">{data.notas}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex gap-2">
            <Link to={`/admin/pedidos`}
              className="flex-1 py-2 rounded-xl text-xs font-semibold text-center transition-opacity hover:opacity-80"
              style={{ backgroundColor: 'rgba(23,71,168,0.12)', color: 'var(--hc-accent)', border: '1px solid rgba(23,71,168,0.25)' }}>
              Ver en pedidos
            </Link>
            <button onClick={onClose}
              className="flex-1 py-2 rounded-xl text-xs font-medium"
              style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--hc-muted)' }}>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Barra de progreso simple ───────────────────────────── */
function ProgressBar({ value, total, color }) {
  const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0
  return (
    <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }}/>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════ */
export default function AdminFinanzas() {
  const { t } = useTranslation()
  const { showToast } = useToast()

  const [tab, setTab]       = useState('ingresos')
  const [quick, setQuick]   = useState(30)
  const [desde, setDesde]   = useState('')
  const [hasta, setHasta]   = useState('')

  // Ingresos
  const [pedidos, setPedidos]   = useState([])
  const [loadingP, setLoadingP] = useState(true)

  // Egresos
  const [gastos, setGastos]         = useState([])
  const [loadingG, setLoadingG]     = useState(false)
  const [gastoModal, setGastoModal] = useState(null) // null | {} | gasto obj
  const [deleteGasto, setDeleteGasto] = useState(null)

  // Detalle de venta
  const [saleDetail, setSaleDetail] = useState(null) // pedidoId | null

  const applyQuick = (days) => {
    setQuick(days)
    if (days === -1) { setDesde(''); setHasta(''); return }
    if (days === 0) {
      const hoy = toISO(new Date())
      setDesde(hoy); setHasta(hoy); return
    }
    const end = new Date(), start = new Date()
    start.setDate(start.getDate() - days)
    setDesde(toISO(start)); setHasta(toISO(end))
  }

  useEffect(() => { applyQuick(30) }, [])

  useEffect(() => {
    setLoadingP(true)
    orderService.getAll()
      .then(({ data }) => {
        const raw = data?.data ?? data
        const all = Array.isArray(raw) ? raw : raw?.content ?? []
        setPedidos(all.filter(p => ['ENTREGADO','COMPLETADO'].includes(p.estado ?? p.estadoPedido)))
      })
      .finally(() => setLoadingP(false))
  }, [])

  const loadGastos = () => {
    setLoadingG(true)
    gastoService.listar(desde || undefined, hasta || undefined)
      .then(setGastos)
      .catch(() => showToast('Error al cargar gastos', 'error'))
      .finally(() => setLoadingG(false))
  }

  useEffect(() => {
    if (tab === 'egresos' || tab === 'dashboard') loadGastos()
  }, [tab, desde, hasta]) // eslint-disable-line react-hooks/exhaustive-deps

  // Ingresos filtrados
  const filteredP = useMemo(() => pedidos.filter(p => {
    const fecha = (p.fechaCreacion ?? p.fechaPedido ?? '').slice(0, 10)
    if (desde && fecha < desde) return false
    if (hasta && fecha > hasta) return false
    return true
  }), [pedidos, desde, hasta])

  const totalProductos = filteredP.reduce((s, p) => s + (p.subtotal ?? ((p.total ?? p.totalPedido ?? 0) - (p.costoEnvio ?? 0))), 0)
  const totalEnvio     = filteredP.reduce((s, p) => s + (p.costoEnvio ?? 0), 0)
  const totalIngresos  = filteredP.reduce((s, p) => s + (p.total ?? p.totalPedido ?? 0), 0)
  const totalEgresos   = gastos.reduce((s, g) => s + (g.monto ?? 0), 0)
  const utilidadNeta   = totalIngresos - totalEgresos

  // Por origen
  const porOrigen = useMemo(() => {
    const acc = { ONLINE: 0, POS: 0, MANUAL: 0 }
    filteredP.forEach(p => {
      const o = p.origen ?? 'ONLINE'
      acc[o] = (acc[o] ?? 0) + (p.total ?? p.totalPedido ?? 0)
    })
    return acc
  }, [filteredP])

  // Por método de pago
  const porMetodo = useMemo(() => {
    const acc = {}
    filteredP.forEach(p => {
      const m = p.metodoPago ?? 'OTRO'
      acc[m] = (acc[m] ?? 0) + (p.total ?? p.totalPedido ?? 0)
    })
    return Object.entries(acc).sort((a, b) => b[1] - a[1])
  }, [filteredP])

  // Por categoría de gasto
  const porCategoria = useMemo(() => {
    const acc = {}
    gastos.forEach(g => { const c = g.categoria ?? 'OTRO'; acc[c] = (acc[c] ?? 0) + g.monto })
    return Object.entries(acc).sort((a, b) => b[1] - a[1])
  }, [gastos])

  const handleDeleteGasto = async () => {
    if (!deleteGasto) return
    try {
      await gastoService.eliminar(deleteGasto.id)
      showToast('Gasto eliminado', 'success')
      setDeleteGasto(null)
      loadGastos()
    } catch { showToast('Error al eliminar', 'error') }
  }

  // ── Render ──────────────────────────────────────────────────
  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-[#e8e8ed]">Finanzas</h1>
            <p className="text-sm text-[#8e8e9a] mt-1">Ingresos, egresos y flujo de caja</p>
            <Link to="/admin/finanzas/reporte-contador"
              className="inline-block text-xs text-[#4f7cff] hover:underline mt-1">
              Ver analítica financiera y reporte para el contador →
            </Link>
          </div>
          {tab === 'ingresos' && (
            <ImportExportBar exportOnly
              data={filteredP.map(p => ({
                id: p.id,
                fecha: (p.fechaCreacion ?? p.fechaPedido ?? '').slice(0, 10),
                origen: p.origen ?? 'ONLINE',
                metodoPago: p.metodoPago,
                productos: p.subtotal ?? ((p.total ?? p.totalPedido ?? 0) - (p.costoEnvio ?? 0)),
                envio: p.costoEnvio ?? 0,
                total: p.total ?? p.totalPedido ?? 0,
              }))}
              columns={['id','fecha','origen','metodoPago','productos','envio','total']}
              filename="ingresos" sheetName="Ingresos"
            />
          )}
          {tab === 'egresos' && (
            <button onClick={() => setGastoModal(EMPTY_GASTO)}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
              style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
              + Nuevo gasto
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white/3 border border-white/8 rounded-xl p-1 w-fit">
          {[['ingresos','Ingresos'], ['egresos','Egresos'], ['dashboard','Dashboard']].map(([k,l]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                tab === k ? 'bg-[#4f7cff] text-white' : 'text-[#8e8e9a] hover:text-white'
              }`}>{l}</button>
          ))}
        </div>

        {/* Filtros de período */}
        <div className="flex flex-wrap gap-2">
          {QUICK_DAYS.map(days => (
            <button key={days} onClick={() => applyQuick(days)}
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

        {/* ══ TAB: INGRESOS ══════════════════════════════════════ */}
        {tab === 'ingresos' && (
          loadingP ? <div className="flex justify-center py-16"><Spinner size="lg"/></div> : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <KPI label="Productos vendidos" value={totalProductos}
                  sub={`${filteredP.length} pedidos entregados`} color="#4ade80"/>
                <KPI label="Costos de envío (moto)" value={totalEnvio}
                  sub={`${filteredP.filter(p => (p.costoEnvio ?? 0) > 0).length} con envío`} color="#f59e0b"/>
                <KPI label="Total cobrado" value={totalIngresos}
                  sub="Productos + envío" color="#4f7cff"/>
              </div>

              {filteredP.length === 0 ? (
                <div className="bg-[#111114] border border-white/8 rounded-2xl p-10 text-center space-y-2">
                  <p className="text-[#e8e8ed] font-medium">Sin ventas en este período</p>
                  <p className="text-sm text-[#8e8e9a]">
                    Las ventas aparecen aquí al marcar pedidos como <strong className="text-[#4ade80]">Entregado</strong>.
                  </p>
                  <Link to="/admin/pedidos" className="inline-block text-xs text-[#4f7cff] hover:underline mt-1">
                    Ver pedidos →
                  </Link>
                </div>
              ) : (
                <div className="bg-[#111114] border border-white/8 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[700px]">
                      <thead>
                        <tr className="border-b border-white/8">
                          {['#','Cliente','Fecha','Origen','Método','Productos','Envío','Total',''].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#8e8e9a]">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredP.map(p => {
                          const envio     = p.costoEnvio ?? 0
                          const productos = p.subtotal ?? ((p.total ?? p.totalPedido ?? 0) - envio)
                          const cliente   = p.usuarioFinal?.nombre ?? p.nombreCliente ?? '—'
                          return (
                            <tr key={p.id}
                              className="hover:bg-white/5 transition-colors cursor-pointer"
                              title="Ver detalle de venta"
                              onClick={() => setSaleDetail(p.id)}>
                              <td className="px-4 py-3 font-mono text-xs text-[#8e8e9a]">#{p.id}</td>
                              <td className="px-4 py-3 text-[#e8e8ed] truncate max-w-[120px]">{cliente}</td>
                              <td className="px-4 py-3 text-xs text-[#8e8e9a]">
                                {formatDate(p.fechaCreacion ?? p.fechaPedido)}
                              </td>
                              <td className="px-4 py-3">
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                                  style={{
                                    backgroundColor: { ONLINE:'rgba(23,71,168,0.12)', POS:'rgba(52,211,153,0.12)', MANUAL:'rgba(251,191,36,0.12)' }[p.origen ?? 'ONLINE'] ?? 'rgba(255,255,255,0.06)',
                                    color: { ONLINE:'var(--hc-accent)', POS:'#34d399', MANUAL:'#fbbf24' }[p.origen ?? 'ONLINE'] ?? '#A7B0BC',
                                  }}>{p.origen ?? 'ONLINE'}</span>
                              </td>
                              <td className="px-4 py-3 text-xs text-[#8e8e9a]">{p.metodoPago ?? '—'}</td>
                              <td className="px-4 py-3 font-semibold text-[#4ade80]">{formatPrice(productos)}</td>
                              <td className="px-4 py-3">
                                {envio > 0
                                  ? <span className="font-semibold text-amber-400">{formatPrice(envio)}</span>
                                  : <span className="text-[#8e8e9a]/40 text-xs">—</span>}
                              </td>
                              <td className="px-4 py-3 font-bold text-[#4f7cff]">
                                {formatPrice(p.total ?? p.totalPedido ?? 0)}
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-[10px] text-[#8e8e9a]/60 hover:text-[#4f7cff] transition-colors whitespace-nowrap">Ver →</span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot>
                        <tr style={{ borderTop: '2px solid var(--hc-border)' }}>
                          <td colSpan={5} className="px-4 py-3 text-xs font-semibold text-[#8e8e9a] uppercase">
                            Totales del período
                          </td>
                          <td className="px-4 py-3 font-bold text-[#4ade80]">{formatPrice(totalProductos)}</td>
                          <td className="px-4 py-3 font-bold text-amber-400">{formatPrice(totalEnvio)}</td>
                          <td className="px-4 py-3 font-bold text-[#4f7cff]">{formatPrice(totalIngresos)}</td>
                          <td/>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </>
          )
        )}

        {/* ══ TAB: EGRESOS ══════════════════════════════════════ */}
        {tab === 'egresos' && (
          loadingG ? <div className="flex justify-center py-16"><Spinner size="lg"/></div> : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <KPI label="Total egresos" value={totalEgresos}
                  sub={`${gastos.length} gasto${gastos.length !== 1 ? 's' : ''} registrado${gastos.length !== 1 ? 's' : ''}`}
                  color="#f87171" negative/>
                <KPI label="Promedio por gasto" value={gastos.length > 0 ? Math.round(totalEgresos / gastos.length) : 0}
                  sub="en el período" color="#f87171"/>
              </div>

              {gastos.length === 0 ? (
                <div className="bg-[#111114] border border-white/8 rounded-2xl p-10 text-center space-y-3">
                  <p className="text-[#e8e8ed] font-medium">Sin gastos registrados</p>
                  <p className="text-sm text-[#8e8e9a]">Registrá los egresos operativos para ver la utilidad neta.</p>
                  <button onClick={() => setGastoModal(EMPTY_GASTO)}
                    className="px-4 py-2 rounded-xl text-sm font-semibold"
                    style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
                    + Primer gasto
                  </button>
                </div>
              ) : (
                <div className="bg-[#111114] border border-white/8 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[560px]">
                      <thead>
                        <tr className="border-b border-white/8">
                          {['Fecha','Concepto','Categoría','Monto','Acciones'].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#8e8e9a]">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {gastos.map(g => (
                          <tr key={g.id} className="hover:bg-white/3 transition-colors">
                            <td className="px-4 py-3 text-xs text-[#8e8e9a]">{g.fecha ?? '—'}</td>
                            <td className="px-4 py-3">
                              <p className="font-medium text-[#e8e8ed]">{g.concepto}</p>
                              {g.notas && <p className="text-[10px] text-[#8e8e9a] truncate max-w-[200px]">{g.notas}</p>}
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-medium"
                                style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--hc-muted)' }}>
                                {g.categoria ?? 'OTRO'}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-bold text-[#f87171]">₡{fmt(g.monto)}</td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <button onClick={() => setGastoModal(g)}
                                  className="px-3 py-1 text-xs rounded-lg bg-white/5 hover:bg-white/10 text-[#8e8e9a] hover:text-white transition-colors">
                                  Editar
                                </button>
                                <button onClick={() => setDeleteGasto(g)}
                                  className="px-3 py-1 text-xs rounded-lg bg-red-500/8 hover:bg-red-500/15 text-red-400 transition-colors">
                                  Eliminar
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ borderTop: '2px solid var(--hc-border)' }}>
                          <td colSpan={3} className="px-4 py-3 text-xs font-semibold text-[#8e8e9a] uppercase">Total</td>
                          <td className="px-4 py-3 font-bold text-[#f87171]">₡{fmt(totalEgresos)}</td>
                          <td/>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </>
          )
        )}

        {/* ══ TAB: DASHBOARD ════════════════════════════════════ */}
        {tab === 'dashboard' && (
          (loadingP || loadingG) ? <div className="flex justify-center py-16"><Spinner size="lg"/></div> : (
            <>
              {/* KPIs principales */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KPI label="Ingresos brutos"  value={totalIngresos} color="#4ade80"/>
                <KPI label="Egresos totales"  value={totalEgresos}  color="#f87171" negative/>
                <KPI label="Utilidad neta"    value={utilidadNeta}  color={utilidadNeta >= 0 ? 'var(--hc-accent)' : '#f87171'}/>
                <div className="bg-[#111114] border border-white/8 rounded-2xl p-5">
                  <p className="text-xs text-[#8e8e9a] mb-1">Margen neto</p>
                  <p className="text-2xl font-bold" style={{ color: utilidadNeta >= 0 ? 'var(--hc-accent)' : '#f87171' }}>
                    {totalIngresos > 0 ? `${((utilidadNeta / totalIngresos) * 100).toFixed(1)}%` : '—'}
                  </p>
                  <p className="text-xs text-[#8e8e9a] mt-1">sobre ingresos brutos</p>
                </div>
              </div>

              {/* Barra ingresos vs egresos */}
              <div className="bg-[#111114] border border-white/8 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-semibold text-[#e8e8ed]">Ingresos vs Egresos</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: '#4ade80' }}>Ingresos</span>
                      <span style={{ color: '#4ade80' }}>₡{fmt(totalIngresos)}</span>
                    </div>
                    <ProgressBar value={totalIngresos} total={Math.max(totalIngresos, totalEgresos)} color="#4ade80"/>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: '#f87171' }}>Egresos</span>
                      <span style={{ color: '#f87171' }}>₡{fmt(totalEgresos)}</span>
                    </div>
                    <ProgressBar value={totalEgresos} total={Math.max(totalIngresos, totalEgresos)} color="#f87171"/>
                  </div>
                  <div className="pt-2 border-t border-white/8 flex justify-between text-sm">
                    <span style={{ color: 'var(--hc-muted)' }}>Utilidad neta</span>
                    <span className="font-bold" style={{ color: utilidadNeta >= 0 ? 'var(--hc-accent)' : '#f87171' }}>
                      {utilidadNeta >= 0 ? '+' : ''}₡{fmt(utilidadNeta)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Distribución por origen + método de pago */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Por origen */}
                <div className="bg-[#111114] border border-white/8 rounded-2xl p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-[#e8e8ed]">Ventas por canal</h3>
                  {Object.entries(porOrigen).filter(([,v]) => v > 0).map(([origen, valor]) => (
                    <div key={origen}>
                      <div className="flex justify-between text-xs mb-1">
                        <span style={{ color: { ONLINE:'var(--hc-accent)', POS:'#34d399', MANUAL:'#fbbf24' }[origen] ?? '#A7B0BC' }}>
                          {origen}
                        </span>
                        <span className="text-[#8e8e9a]">₡{fmt(valor)} ({totalIngresos > 0 ? ((valor/totalIngresos)*100).toFixed(0) : 0}%)</span>
                      </div>
                      <ProgressBar value={valor} total={totalIngresos}
                        color={{ ONLINE:'var(--hc-accent)', POS:'#34d399', MANUAL:'#fbbf24' }[origen] ?? '#A7B0BC'}/>
                    </div>
                  ))}
                  {Object.values(porOrigen).every(v => v === 0) && (
                    <p className="text-xs text-center py-4" style={{ color: 'var(--hc-muted)' }}>Sin ventas en el período</p>
                  )}
                </div>

                {/* Por método de pago */}
                <div className="bg-[#111114] border border-white/8 rounded-2xl p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-[#e8e8ed]">Ventas por método de pago</h3>
                  {porMetodo.slice(0, 5).map(([metodo, valor]) => (
                    <div key={metodo}>
                      <div className="flex justify-between text-xs mb-1">
                        <span style={{ color: 'var(--hc-text)' }}>{metodo}</span>
                        <span className="text-[#8e8e9a]">₡{fmt(valor)} ({totalIngresos > 0 ? ((valor/totalIngresos)*100).toFixed(0) : 0}%)</span>
                      </div>
                      <ProgressBar value={valor} total={totalIngresos} color="#4f7cff"/>
                    </div>
                  ))}
                  {porMetodo.length === 0 && (
                    <p className="text-xs text-center py-4" style={{ color: 'var(--hc-muted)' }}>Sin ventas en el período</p>
                  )}
                </div>
              </div>

              {/* Egresos por categoría */}
              {porCategoria.length > 0 && (
                <div className="bg-[#111114] border border-white/8 rounded-2xl p-5 space-y-3">
                  <h3 className="text-sm font-semibold text-[#e8e8ed]">Egresos por categoría</h3>
                  {porCategoria.map(([cat, valor]) => (
                    <div key={cat}>
                      <div className="flex justify-between text-xs mb-1">
                        <span style={{ color: 'var(--hc-text)' }}>{cat}</span>
                        <span className="text-[#8e8e9a]">₡{fmt(valor)} ({totalEgresos > 0 ? ((valor/totalEgresos)*100).toFixed(0) : 0}%)</span>
                      </div>
                      <ProgressBar value={valor} total={totalEgresos} color="#f87171"/>
                    </div>
                  ))}
                </div>
              )}
            </>
          )
        )}
      </div>

      {/* Modal detalle de venta */}
      {saleDetail && (
        <SaleDetailModal
          pedidoId={saleDetail}
          onClose={() => setSaleDetail(null)}
        />
      )}

      {/* Modal gasto */}
      {gastoModal && (
        <GastoModal
          editing={gastoModal}
          onClose={() => setGastoModal(null)}
          onSaved={() => { setGastoModal(null); loadGastos() }}
        />
      )}

      {/* Confirmar eliminar */}
      <ConfirmModal
        open={!!deleteGasto}
        title="Eliminar gasto"
        message={`¿Eliminar "${deleteGasto?.concepto}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={handleDeleteGasto}
        onCancel={() => setDeleteGasto(null)}
      />
    </>
  )
}
