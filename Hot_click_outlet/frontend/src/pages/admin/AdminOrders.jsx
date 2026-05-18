import { useState, useEffect } from 'react'
import AdminLayout from '@/layouts/AdminLayout'
import Spinner from '@/components/ui/Spinner'
import { orderService } from '@/services/orderService'
import { useToast } from '@/components/ui/Toast'
import { formatDate, formatPrice } from '@/utils/format'

const FILTERS = ['Todos', 'PENDIENTE', 'PAGADO', 'EN_PREPARACION', 'LISTO_RETIRO', 'ENVIADO', 'ENTREGADO', 'CANCELADO']

const ESTADO_STYLE = {
  PENDIENTE:      { bg: '#2a2a18', text: '#d4b106', border: '#d4b10630' },
  PAGADO:         { bg: '#0f1f3d', text: '#4f7cff', border: '#4f7cff30' },
  EN_PREPARACION: { bg: '#1e1400', text: '#f59e0b', border: '#f59e0b30' },
  LISTO_RETIRO:   { bg: '#0a1f14', text: '#22c55e', border: '#22c55e30' },
  ENVIADO:        { bg: '#0d1a30', text: '#60a5fa', border: '#60a5fa30' },
  ENTREGADO:      { bg: '#0a1f14', text: '#4ade80', border: '#4ade8030' },
  CANCELADO:      { bg: '#1f0a0a', text: '#f87171', border: '#f8717130' },
}

function estadoBadge(e) {
  const s = ESTADO_STYLE[e] ?? { bg: '#1a1a1a', text: '#8e8e9a', border: '#8e8e9a20' }
  return (
    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
      style={{ backgroundColor: s.bg, color: s.text, border: `1px solid ${s.border}` }}>
      {e}
    </span>
  )
}

const ETAPAS_RETIRO = [
  { key: 'PENDIENTE',      label: 'Pendiente' },
  { key: 'PAGADO',         label: 'Pago confirmado' },
  { key: 'EN_PREPARACION', label: 'En preparación' },
  { key: 'LISTO_RETIRO',   label: 'Listo p/ retirar' },
  { key: 'ENTREGADO',      label: 'Retirado' },
]
const ETAPAS_ENVIO = [
  { key: 'PENDIENTE',      label: 'Pendiente' },
  { key: 'PAGADO',         label: 'Pago confirmado' },
  { key: 'EN_PREPARACION', label: 'En preparación' },
  { key: 'ENVIADO',        label: 'Enviado' },
  { key: 'ENTREGADO',      label: 'Entregado' },
]

function StepTracker({ estado, esRetiro, onStep, saving }) {
  const etapas  = esRetiro ? ETAPAS_RETIRO : ETAPAS_ENVIO
  const idx     = etapas.findIndex(e => e.key === estado)
  const idxSafe = idx === -1 ? 0 : idx
  return (
    <div className="flex items-center overflow-x-auto pb-1">
      {etapas.map((e, i) => {
        const done    = i < idxSafe
        const current = i === idxSafe
        const clickable = !current && !saving
        return (
          <div key={e.key} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center gap-1 shrink-0">
              <button
                onClick={() => clickable && onStep(e.key)}
                disabled={saving}
                title={clickable ? `Cambiar a: ${e.label}` : e.label}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                style={{
                  backgroundColor: done || current ? '#4f7cff' : 'transparent',
                  border: `2px solid ${done || current ? '#4f7cff' : '#ffffff20'}`,
                  boxShadow: current ? '0 0 12px rgba(79,124,255,0.5)' : 'none',
                  cursor: clickable ? 'pointer' : 'default',
                  opacity: saving ? 0.5 : 1,
                }}
              >
                {done
                  ? <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                  : <div className="w-2 h-2 rounded-full" style={{ backgroundColor: current ? '#fff' : '#ffffff30' }} />
                }
              </button>
              <span className="text-[9px] text-center leading-tight max-w-[56px]"
                style={{ color: done || current ? '#e8e8ed' : '#8e8e9a55', fontWeight: current ? 700 : 400 }}>
                {e.label}
              </span>
            </div>
            {i < etapas.length - 1 && (
              <div className="h-0.5 flex-1 mx-1 rounded-full mb-4"
                style={{ backgroundColor: i < idxSafe ? '#4f7cff' : '#ffffff15' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function getNextStep(estado, esRetiro) {
  if (estado === 'PAGADO')         return { type: 'btn', next: 'EN_PREPARACION', label: 'Marcar en preparación' }
  if (estado === 'EN_PREPARACION') return esRetiro
    ? { type: 'btn', next: 'LISTO_RETIRO', label: 'Listo para retirar' }
    : { type: 'envio' }
  if (estado === 'LISTO_RETIRO')   return { type: 'btn', next: 'ENTREGADO', label: 'Marcar entregado' }
  if (estado === 'ENVIADO')        return { type: 'btn', next: 'ENTREGADO', label: 'Marcar entregado' }
  return null
}

function OrderCard({ order, onUpdate, onDelete }) {
  const toast = useToast()
  const [open, setOpen]             = useState(false)
  const [saving, setSaving]         = useState(false)
  const [pendingEstado, setPending] = useState(null)   // etapa seleccionada pero no guardada
  const [guia, setGuia]             = useState(order.numeroGuia ?? '')
  const [costo, setCosto]           = useState('')
  const [showOver, setShowOver]     = useState(false)
  const [override, setOverride]     = useState('')

  const estado   = order.estado ?? 'PENDIENTE'
  const esRetiro = order.metodoEnvio !== 'ENVIO_A_DOMICILIO'
  const items    = order.items ?? []

  // Muestra el formulario de envío si el estado pendiente (o actual) es EN_PREPARACION y es domicilio
  const estadoVista      = pendingEstado ?? estado
  const needsEnvioForm   = estadoVista === 'ENVIADO' && !esRetiro && estado === 'EN_PREPARACION'

  const saveEstado = async () => {
    if (!pendingEstado || pendingEstado === estado) return
    // Si va a ENVIADO en flujo domicilio, necesita guía
    if (pendingEstado === 'ENVIADO' && !esRetiro) {
      if (!guia.trim()) { toast({ message: 'Ingresa el número de guía', type: 'error' }); return }
      setSaving(true)
      try {
        const costoNum = costo ? parseInt(costo, 10) : null
        await orderService.procesarEnvio(order.id, guia.trim(), costoNum)
        toast({ message: 'Enviado — cliente notificado', type: 'success' })
        onUpdate(order.id, { estado: 'ENVIADO', numeroGuia: guia.trim(), costoEnvio: costoNum ?? order.costoEnvio })
        setPending(null)
      } catch { toast({ message: 'Error al procesar envío', type: 'error' }) }
      finally { setSaving(false) }
      return
    }
    setSaving(true)
    try {
      await orderService.updateStatus(order.id, pendingEstado)
      toast({ message: 'Estado guardado', type: 'success' })
      onUpdate(order.id, { estado: pendingEstado })
      setPending(null)
    } catch { toast({ message: 'Error al guardar', type: 'error' }) }
    finally { setSaving(false) }
  }

  const doDelete = async () => {
    if (!window.confirm(`¿Eliminar pedido #${order.id}? Esta acción no se puede deshacer.`)) return
    setSaving(true)
    try {
      await orderService.delete(order.id)
      toast({ message: 'Pedido eliminado', type: 'success' })
      onDelete(order.id)
    } catch { toast({ message: 'Error al eliminar', type: 'error' }) }
    finally { setSaving(false) }
  }

  return (
    <div className="rounded-2xl border overflow-hidden"
      style={{ backgroundColor: '#111114', borderColor: '#ffffff14' }}>

      {/* Fila resumen — siempre visible */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex flex-wrap items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/3"
      >
        {/* Número + fecha */}
        <div className="min-w-[110px]">
          <p className="text-xs font-mono text-[#8e8e9a]">#{order.id}</p>
          <p className="text-[11px] text-[#8e8e9a]/60 mt-0.5">
            {order.fechaCreacion ? formatDate(order.fechaCreacion) : '—'}
          </p>
        </div>

        {/* Cliente */}
        <div className="flex-1 min-w-[120px]">
          <p className="text-sm font-medium text-[#e8e8ed] truncate">
            {order.nombreCliente ?? '—'}
          </p>
          <p className="text-[11px] text-[#8e8e9a] truncate">{order.clienteCorreo ?? ''}</p>
        </div>

        {/* Tipo entrega */}
        <span className="text-xs text-[#8e8e9a]">
          {esRetiro ? '🏪 Retiro' : '🚚 Domicilio'}
        </span>

        {/* Total */}
        <span className="text-sm font-bold text-[#e8e8ed] min-w-[80px] text-right">
          {formatPrice(order.total ?? 0)}
        </span>

        {/* Estado */}
        {estadoBadge(estado)}

        {/* Chevron */}
        <svg className="w-4 h-4 shrink-0 transition-transform"
          style={{ color: '#8e8e9a', transform: open ? 'rotate(180deg)' : 'rotate(0)' }}
          fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Detalle expandible */}
      {open && (
        <div className="border-t px-4 py-4 space-y-4" style={{ borderColor: '#ffffff14' }}>

          {/* Stepper — click selecciona etapa, no guarda todavía */}
          {estado !== 'CANCELADO' && (
            <div>
              <StepTracker
                estado={pendingEstado ?? estado}
                esRetiro={esRetiro}
                onStep={s => setPending(s === estado ? null : s)}
                saving={saving}
              />
              {pendingEstado && pendingEstado !== estado && (
                <p className="text-[11px] text-[#8e8e9a] text-center -mt-1">
                  {estado} → <span className="text-[#4f7cff] font-semibold">{pendingEstado}</span>
                </p>
              )}
            </div>
          )}

          {/* Formulario envío si el pending es ENVIADO en flujo domicilio */}
          {needsEnvioForm && (
            <div className="space-y-2 rounded-xl p-3" style={{ backgroundColor: '#ffffff05', border: '1px solid #ffffff10' }}>
              <p className="text-xs font-semibold text-[#e8e8ed]">Datos del envío a domicilio</p>
              <input
                type="text"
                value={guia}
                onChange={e => setGuia(e.target.value)}
                placeholder="Número de guía Correos CR"
                className="w-full h-10 px-3 rounded-xl text-sm text-[#e8e8ed] placeholder:text-[#8e8e9a]/50 focus:outline-none font-mono"
                style={{ backgroundColor: '#ffffff08', border: '1px solid #ffffff15' }}
              />
              <div className="flex gap-2 items-center">
                <span className="text-[#8e8e9a] text-sm shrink-0">₡</span>
                <input
                  type="number"
                  value={costo}
                  onChange={e => setCosto(e.target.value)}
                  placeholder="Costo envío (4000–20000)"
                  min={4000} max={20000} step={500}
                  className="flex-1 h-10 px-3 rounded-xl text-sm text-[#e8e8ed] placeholder:text-[#8e8e9a]/50 focus:outline-none"
                  style={{ backgroundColor: '#ffffff08', border: '1px solid #ffffff15' }}
                />
              </div>
            </div>
          )}

          {/* Botón guardar cambios — solo aparece cuando hay algo pendiente */}
          {pendingEstado && pendingEstado !== estado && (
            <div className="flex gap-2">
              <button
                onClick={saveEstado}
                disabled={saving || (needsEnvioForm && !guia.trim())}
                className="flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-50"
                style={{ backgroundColor: '#4f7cff', color: '#fff' }}
              >
                {saving ? 'Guardando…' : '💾 Guardar cambios'}
              </button>
              <button
                onClick={() => setPending(null)}
                disabled={saving}
                className="px-4 py-2.5 rounded-xl text-sm transition-all"
                style={{ backgroundColor: '#ffffff08', color: '#8e8e9a' }}
              >
                Cancelar
              </button>
            </div>
          )}

          {/* Productos con imagen */}
          {items.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#8e8e9a] mb-2">Productos</p>
              <div className="space-y-2">
                {items.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                    style={{ backgroundColor: '#ffffff08' }}>
                    <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0"
                      style={{ backgroundColor: '#ffffff0a', border: '1px solid #ffffff12' }}>
                      {item.imagenUrl
                        ? <img src={item.imagenUrl} alt={item.nombreProducto} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-lg">📦</div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#e8e8ed] truncate">{item.nombreProducto ?? '—'}</p>
                      <p className="text-xs text-[#8e8e9a]">×{item.cantidad} · {formatPrice(item.precioUnitario ?? 0)} c/u</p>
                    </div>
                    <span className="text-sm font-medium text-[#e8e8ed] shrink-0">
                      {formatPrice((item.precioUnitario ?? 0) * item.cantidad)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contacto */}
          <div className="flex flex-wrap gap-3 text-xs">
            {order.clienteTel && (
              <a
                href={`https://wa.me/506${order.clienteTel.replace(/\D/g, '')}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors"
                style={{ backgroundColor: '#128c7e18', color: '#25d366', border: '1px solid #25d36625' }}
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                {order.clienteTel}
              </a>
            )}
            {order.costoEnvio > 0 && (
              <span className="text-[#8e8e9a]">Envío: {formatPrice(order.costoEnvio)}</span>
            )}
            {order.notas && (
              <span className="text-[#8e8e9a]">💬 {order.notas}</span>
            )}
          </div>

          {/* Guía existente */}
          {order.numeroGuia && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
              style={{ backgroundColor: '#0a1f1408', border: '1px solid #22c55e25' }}>
              <span className="text-green-400">Guía:</span>
              <a href={`https://rastreo.correos.go.cr/?codigo=${order.numeroGuia}`}
                target="_blank" rel="noopener noreferrer"
                className="font-mono font-bold text-green-300 hover:underline flex-1">
                {order.numeroGuia}
              </a>
            </div>
          )}

          {estado === 'ENTREGADO' && (
            <p className="text-center text-sm text-green-400 py-1">✅ Pedido entregado</p>
          )}
          {estado === 'CANCELADO' && (
            <p className="text-center text-sm text-red-400 py-1">✖ Pedido cancelado</p>
          )}

          {/* Pie: override manual + eliminar */}
          <div className="pt-2 border-t flex items-start justify-between gap-4" style={{ borderColor: '#ffffff0a' }}>
            <div className="flex-1">
              <button onClick={() => setShowOver(v => !v)}
                className="text-xs text-[#8e8e9a]/50 hover:text-[#8e8e9a] transition-colors">
                {showOver ? '▲' : '▼'} Corrección manual
              </button>
              {showOver && (
                <div className="flex gap-2 mt-2">
                  <select
                    value={override || estado}
                    onChange={e => setOverride(e.target.value)}
                    className="flex-1 h-9 px-2 rounded-xl text-sm text-[#e8e8ed] focus:outline-none"
                    style={{ backgroundColor: '#ffffff08', border: '1px solid #ffffff15' }}
                  >
                    {FILTERS.filter(f => f !== 'Todos').map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <button
                    onClick={async () => {
                      if (!override || override === estado) return
                      setSaving(true)
                      try {
                        await orderService.updateStatus(order.id, override)
                        toast({ message: 'Estado corregido', type: 'success' })
                        onUpdate(order.id, { estado: override })
                        setShowOver(false)
                      } catch { toast({ message: 'Error', type: 'error' }) }
                      finally { setSaving(false) }
                    }}
                    disabled={saving || !override || override === estado}
                    className="px-4 rounded-xl text-sm font-medium transition-all disabled:opacity-40"
                    style={{ backgroundColor: '#ffffff10', color: '#e8e8ed' }}
                  >
                    {saving ? '…' : 'Aplicar'}
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={doDelete}
              disabled={saving}
              className="text-xs px-3 py-1.5 rounded-lg transition-all disabled:opacity-40 shrink-0"
              style={{ backgroundColor: '#f8717112', color: '#f87171', border: '1px solid #f8717120' }}
            >
              🗑 Eliminar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminOrders() {
  const [orders, setOrders]   = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('Todos')

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await orderService.getAll()
      const raw = data?.data ?? data
      setOrders(Array.isArray(raw) ? raw : raw?.content ?? [])
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleUpdate = (id, fields) =>
    setOrders(prev => prev.map(o => o.id === id ? { ...o, ...fields } : o))

  const handleDelete = (id) =>
    setOrders(prev => prev.filter(o => o.id !== id))

  const filtered = filter === 'Todos'
    ? orders
    : orders.filter(o => o.estado === filter)

  return (
    <AdminLayout>
      <div className="space-y-5 max-w-3xl">
        <div>
          <h1 className="text-xl font-bold text-[#e8e8ed]">Pedidos</h1>
          <p className="text-sm text-[#8e8e9a] mt-0.5">{orders.length} pedidos en total</p>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                backgroundColor: filter === f ? '#4f7cff' : '#ffffff0a',
                color: filter === f ? '#fff' : '#8e8e9a',
                border: `1px solid ${filter === f ? '#4f7cff50' : '#ffffff10'}`,
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-[#8e8e9a] text-sm">No hay pedidos</div>
        ) : (
          <div className="space-y-2">
            {filtered.map(order => (
              <OrderCard key={order.id} order={order} onUpdate={handleUpdate} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
