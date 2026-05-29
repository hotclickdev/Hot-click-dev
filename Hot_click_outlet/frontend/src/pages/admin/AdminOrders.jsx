import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import AdminLayout from '@/layouts/AdminLayout'
import Spinner from '@/components/ui/Spinner'
import { orderService } from '@/services/orderService'
import { adminService } from '@/services/orderService'
import { productService } from '@/services/productService'
import { useToast } from '@/components/ui/Toast'
import { formatDate, formatPrice } from '@/utils/format'
import ImportExportBar from '@/components/admin/ImportExportBar'

const FILTERS = ['Todos', 'PENDIENTE', 'PAGADO', 'EN_PREPARACION', 'LISTO_RETIRO', 'ENVIADO', 'ENTREGADO', 'COMPLETADO', 'CANCELADO']

const ESTADO_STYLE = {
  PENDIENTE:      { bg: 'rgba(212,177,6,0.15)',   text: '#d4b106', border: 'rgba(212,177,6,0.35)' },
  PAGADO:         { bg: 'rgba(79,124,255,0.14)',  text: '#4f7cff', border: 'rgba(79,124,255,0.35)' },
  EN_PREPARACION: { bg: 'rgba(245,158,11,0.14)',  text: '#f59e0b', border: 'rgba(245,158,11,0.35)' },
  LISTO_RETIRO:   { bg: 'rgba(34,197,94,0.14)',   text: '#22c55e', border: 'rgba(34,197,94,0.35)' },
  ENVIADO:        { bg: 'rgba(96,165,250,0.14)',  text: '#60a5fa', border: 'rgba(96,165,250,0.35)' },
  ENTREGADO:      { bg: 'rgba(74,222,128,0.14)',  text: '#4ade80', border: 'rgba(74,222,128,0.35)' },
  COMPLETADO:     { bg: 'rgba(147,51,234,0.14)',  text: '#a855f7', border: 'rgba(147,51,234,0.35)' },
  CANCELADO:      { bg: 'rgba(248,113,113,0.14)', text: '#f87171', border: 'rgba(248,113,113,0.35)' },
}

function EstadoBadge({ estado }) {
  const { t } = useTranslation()
  const s = ESTADO_STYLE[estado] ?? { bg: 'rgba(142,142,154,0.14)', text: '#8e8e9a', border: 'rgba(142,142,154,0.35)' }
  return (
    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
      style={{ backgroundColor: s.bg, color: s.text, border: `1px solid ${s.border}` }}>
      {t(`adminOrders.status${estado}`, { defaultValue: estado })}
    </span>
  )
}

const ETAPAS_RETIRO = [
  { key: 'PENDIENTE',      labelKey: 'adminOrders.stepPending' },
  { key: 'PAGADO',         labelKey: 'adminOrders.stepPaid' },
  { key: 'EN_PREPARACION', labelKey: 'adminOrders.stepPrep' },
  { key: 'LISTO_RETIRO',   labelKey: 'adminOrders.stepReady' },
  { key: 'ENTREGADO',      labelKey: 'adminOrders.stepPickedUp' },
  { key: 'COMPLETADO',     labelKey: 'adminOrders.stepCompleted' },
]
const ETAPAS_ENVIO = [
  { key: 'PENDIENTE',      labelKey: 'adminOrders.stepPending' },
  { key: 'PAGADO',         labelKey: 'adminOrders.stepPaid' },
  { key: 'EN_PREPARACION', labelKey: 'adminOrders.stepPrep' },
  { key: 'ENVIADO',        labelKey: 'adminOrders.stepShipped' },
  { key: 'ENTREGADO',      labelKey: 'adminOrders.stepDelivered' },
  { key: 'COMPLETADO',     labelKey: 'adminOrders.stepCompleted' },
]

function StepTracker({ estado, esRetiro, onStep, saving }) {
  const { t } = useTranslation()
  const etapas  = esRetiro ? ETAPAS_RETIRO : ETAPAS_ENVIO
  const idx     = etapas.findIndex(e => e.key === estado)
  const idxSafe = idx === -1 ? 0 : idx
  return (
    <div className="flex items-center overflow-x-auto pb-1">
      {etapas.map((e, i) => {
        const done    = i < idxSafe
        const current = i === idxSafe
        const clickable = !current && !saving
        const label   = t(e.labelKey)
        return (
          <div key={e.key} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center gap-1 shrink-0">
              <button
                onClick={() => clickable && onStep(e.key)}
                disabled={saving}
                title={clickable ? `${t('adminOrders.changeTo')} ${label}` : label}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                style={{
                  backgroundColor: done || current ? 'var(--hc-accent)' : 'transparent',
                  border: `2px solid ${done || current ? 'var(--hc-accent)' : 'var(--hc-border)'}`,
                  boxShadow: current ? '0 0 12px color-mix(in srgb, var(--hc-accent) 50%, transparent)' : 'none',
                  cursor: clickable ? 'pointer' : 'default',
                  opacity: saving ? 0.5 : 1,
                }}
              >
                {done
                  ? <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                  : <div className="w-2 h-2 rounded-full" style={{ backgroundColor: current ? 'white' : 'var(--hc-border)' }} />
                }
              </button>
              <span className="text-[9px] text-center leading-tight max-w-[56px]"
                style={{ color: done || current ? 'var(--hc-text)' : 'var(--hc-muted)', fontWeight: current ? 700 : 400, opacity: done || current ? 1 : 0.45 }}>
                {label}
              </span>
            </div>
            {i < etapas.length - 1 && (
              <div className="h-0.5 flex-1 mx-1 rounded-full mb-4"
                style={{ backgroundColor: i < idxSafe ? 'var(--hc-accent)' : 'var(--hc-border)' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function getNextStep(estado, esRetiro) {
  if (estado === 'PAGADO')         return { type: 'btn', next: 'EN_PREPARACION', labelKey: 'adminOrders.markPrep' }
  if (estado === 'EN_PREPARACION') return esRetiro
    ? { type: 'btn', next: 'LISTO_RETIRO', labelKey: 'adminOrders.readyPickup' }
    : { type: 'envio' }
  if (estado === 'LISTO_RETIRO')   return { type: 'btn', next: 'ENTREGADO', labelKey: 'adminOrders.markDelivered' }
  if (estado === 'ENVIADO')        return { type: 'btn', next: 'ENTREGADO', labelKey: 'adminOrders.markDelivered' }
  if (estado === 'ENTREGADO')      return { type: 'btn', next: 'COMPLETADO', labelKey: 'adminOrders.markCompleted' }
  return null
}

function buildWaMessage(order) {
  const estado = order.estado ?? 'PENDIENTE'
  const items = (order.items ?? [])
    .map(i => `  • ${i.nombreProducto ?? 'Producto'} ×${i.cantidad} — ₡${((i.precioUnitario ?? 0) * i.cantidad).toLocaleString('es-CR')}`)
    .join('\n')
  const esRetiro = order.metodoEnvio !== 'ENVIO_A_DOMICILIO'
  let extra = ''
  if (order.numeroGuia) {
    const isCorreos = !order.urlTracking || order.urlTracking.includes('correos.go.cr')
    const trackUrl  = order.urlTracking ?? `https://rastreo.correos.go.cr/?codigo=${order.numeroGuia}`
    const courier   = isCorreos ? '🟡 Correos de Costa Rica' : '🛵 Entrega directa por HOTCLICK'
    extra = `\n\n📦 *Envío:* ${courier}\n*Guía:* ${order.numeroGuia}\n🔍 Rastrear: ${trackUrl}`
  } else if (esRetiro && (estado === 'LISTO_RETIRO' || estado === 'EN_PREPARACION')) {
    extra = `\n\n📍 *Retiro en tienda:* Cuando esté listo te avisamos.\nhttps://waze.com/ul?ll=9.9342,-84.0877&navigate=yes`
  }
  return encodeURIComponent(
    `Hola ${order.nombreCliente ?? 'Cliente'}! 👋 Te escribimos desde HOTCLICK con una actualización de tu pedido.\n\n` +
    `📋 *Pedido #${order.numeroPedido ?? order.id}*\n` +
    `Estado: *${estado}*\n\n` +
    `${items}\n\n` +
    `💰 *Total: ₡${(order.total ?? 0).toLocaleString('es-CR')}*` +
    extra +
    `\n\n¿Tenés alguna duda? Estamos para ayudarte 😊`
  )
}

const METODOS_PAGO  = ['SINPE', 'EFECTIVO', 'CONTRA_ENTREGA', 'TRANSFERENCIA']
const METODOS_ENVIO = [
  { value: 'RETIRO_EN_TIENDA',   labelKey: 'adminOrders.pickupStoreLabel' },
  { value: 'ENVIO_A_DOMICILIO',  labelKey: 'adminOrders.homeDeliveryLabel' },
]
const ESTADOS_INICIAL = ['PENDIENTE', 'PAGADO', 'EN_PREPARACION']

function CrearPedidoModal({ onClose, onCreated }) {
  const { t } = useTranslation()
  const toast         = useToast()
  const [saving, setSaving]           = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [users, setUsers]             = useState([])
  const [products, setProducts]       = useState([])
  const [userSearch, setUserSearch]   = useState('')
  const [prodSearch, setProdSearch]   = useState('')
  const [showUserDrop, setShowUserDrop] = useState(false)
  const [showProdDrop, setShowProdDrop] = useState(false)
  const prodRef  = useRef(null)

  const [form, setForm] = useState({
    usuarioId:    '',
    metodoEnvio:  'RETIRO_EN_TIENDA',
    metodoPago:   'SINPE',
    costoEnvio:   '',
    estadoPedido: 'PENDIENTE',
    notas:        '',
    items:        [],
  })

  useEffect(() => {
    async function load() {
      try {
        const [ur, pr] = await Promise.all([
          adminService.getUsers(),
          productService.adminGetAll(),
        ])
        const ud = ur.data?.data ?? ur.data ?? []
        setUsers(Array.isArray(ud) ? ud : [])
        const pd = pr.data?.content ?? pr.data ?? []
        setProducts(Array.isArray(pd) ? pd : [])
      } catch { toast({ message: t('adminOrders.errorLoading'), type: 'error' }) }
      finally { setLoadingData(false) }
    }
    load()
  }, [])

  useEffect(() => {
    function outside(e) {
      if (prodRef.current && !prodRef.current.contains(e.target)) setShowProdDrop(false)
    }
    document.addEventListener('mousedown', outside)
    return () => document.removeEventListener('mousedown', outside)
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const addProduct = (prod) => {
    const id = prod.id ?? prod.productoId
    setForm(f => ({
      ...f,
      items: f.items.find(i => i.productoId === id)
        ? f.items.map(i => i.productoId === id ? { ...i, cantidad: i.cantidad + 1 } : i)
        : [...f.items, { productoId: id, nombre: prod.nombre ?? prod.nombreProducto, precio: prod.precio ?? prod.precioVenta, cantidad: 1, precioUnitario: prod.precio ?? prod.precioVenta }],
    }))
    setProdSearch('')
    setShowProdDrop(false)
  }

  const removeItem = (id) => setForm(f => ({ ...f, items: f.items.filter(i => i.productoId !== id) }))

  const updateItem = (id, field, val) =>
    setForm(f => ({ ...f, items: f.items.map(i => i.productoId === id ? { ...i, [field]: val } : i) }))

  const costoEnvioNum = form.metodoEnvio === 'ENVIO_A_DOMICILIO' ? (parseInt(form.costoEnvio) || 0) : 0
  const subtotal      = form.items.reduce((s, i) => s + (parseInt(i.precioUnitario) || 0) * (parseInt(i.cantidad) || 0), 0)
  const total         = subtotal + costoEnvioNum

  const filteredUsers = users.filter(u =>
    (u.nombre ?? '').toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.correo ?? '').toLowerCase().includes(userSearch.toLowerCase())
  ).slice(0, 6)

  const filteredProds = prodSearch.length > 1
    ? products.filter(p =>
        (p.nombre ?? p.nombreProducto ?? '').toLowerCase().includes(prodSearch.toLowerCase())
      ).slice(0, 6)
    : []

  const selectedUser = users.find(u => u.id === Number(form.usuarioId))
  const canSubmit = form.usuarioId && form.items.length > 0

  const submit = async () => {
    if (!canSubmit) return
    setSaving(true)
    try {
      const payload = {
        usuarioId:    Number(form.usuarioId),
        bodegaId:     1,
        metodoEnvio:  form.metodoEnvio,
        metodoPago:   form.metodoPago,
        costoEnvio:   costoEnvioNum,
        estadoPedido: form.estadoPedido,
        notas:        form.notas || null,
        items: form.items.map(i => ({
          productoId:     i.productoId,
          cantidad:       parseInt(i.cantidad) || 1,
          precioUnitario: parseInt(i.precioUnitario) || i.precio,
        })),
      }
      const res    = await orderService.createManual(payload)
      const newOrd = res.data?.data ?? res.data
      toast({ message: t('adminOrders.orderCreated'), type: 'success' })
      onCreated(newOrd)
      onClose()
    } catch (e) {
      toast({ message: e.response?.data?.message ?? t('adminOrders.errorCreate'), type: 'error' })
    } finally { setSaving(false) }
  }

  const inp = { backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>

      <div className="h-full w-full max-w-lg flex flex-col overflow-hidden"
        style={{ backgroundColor: 'var(--hc-surface)', borderLeft: '1px solid var(--hc-border)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0"
          style={{ borderColor: 'var(--hc-border)' }}>
          <h2 className="text-base font-bold text-[#e8e8ed]">{t('adminOrders.newOrderTitle')}</h2>
          <button onClick={onClose} className="text-[#8e8e9a] hover:text-[#e8e8ed] transition-colors text-xl leading-none">✕</button>
        </div>

        {loadingData ? (
          <div className="flex-1 flex items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

            {/* Cliente */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#8e8e9a] uppercase tracking-widest">{t('adminOrders.clientLabel')}</label>
              {selectedUser ? (
                <div className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                  style={{ backgroundColor: 'color-mix(in srgb, var(--hc-accent) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--hc-accent) 30%, transparent)' }}>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#e8e8ed]">{selectedUser.nombre}</p>
                    <p className="text-xs text-[#8e8e9a]">{selectedUser.correo}</p>
                  </div>
                  <button onClick={() => { set('usuarioId', ''); setUserSearch(''); setShowUserDrop(true) }}
                    className="text-xs text-[#8e8e9a] hover:text-[#f87171] transition-colors">✕</button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    value={userSearch}
                    onChange={e => { setUserSearch(e.target.value); setShowUserDrop(true) }}
                    onFocus={() => setShowUserDrop(true)}
                    placeholder={t('adminOrders.clientSearch')}
                    className="w-full h-10 px-3 rounded-xl text-sm placeholder:text-[#8e8e9a]/50 focus:outline-none"
                    style={inp}
                  />
                  {showUserDrop && filteredUsers.length > 0 && (
                    <div className="absolute z-10 top-full left-0 right-0 mt-1 rounded-xl overflow-hidden"
                      style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }}>
                      {filteredUsers.map(u => (
                        <button key={u.id}
                          onMouseDown={() => { set('usuarioId', u.id); setShowUserDrop(false); setUserSearch('') }}
                          className="w-full text-left px-3 py-2.5 hover:bg-white/5 transition-colors">
                          <p className="text-sm text-[#e8e8ed]">{u.nombre}</p>
                          <p className="text-xs text-[#8e8e9a]">{u.correo}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Productos */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#8e8e9a] uppercase tracking-widest">{t('adminOrders.productsLabel')}</label>
              <div className="relative" ref={prodRef}>
                <input
                  type="text"
                  value={prodSearch}
                  onChange={e => { setProdSearch(e.target.value); setShowProdDrop(true) }}
                  onFocus={() => setShowProdDrop(true)}
                  placeholder={t('adminOrders.searchProduct')}
                  className="w-full h-10 px-3 rounded-xl text-sm placeholder:text-[#8e8e9a]/50 focus:outline-none"
                  style={inp}
                />
                {showProdDrop && filteredProds.length > 0 && (
                  <div className="absolute z-10 top-full left-0 right-0 mt-1 rounded-xl overflow-hidden"
                    style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }}>
                    {filteredProds.map(p => {
                      const id = p.id ?? p.productoId
                      return (
                        <button key={id}
                          onMouseDown={() => addProduct(p)}
                          className="w-full text-left flex items-center gap-3 px-3 py-2 hover:bg-white/5 transition-colors">
                          {p.imagenUrl && <img src={p.imagenUrl} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-[#e8e8ed] truncate">{p.nombre ?? p.nombreProducto}</p>
                            <p className="text-xs text-[#8e8e9a]">{formatPrice(p.precio ?? p.precioVenta ?? 0)}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Items agregados */}
              {form.items.length > 0 && (
                <div className="space-y-2 mt-2">
                  {form.items.map(item => (
                    <div key={item.productoId} className="rounded-xl px-3 py-2.5 space-y-2"
                      style={{ backgroundColor: 'var(--hc-glass-bg)', border: '1px solid var(--hc-border)' }}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm text-[#e8e8ed] flex-1 leading-tight">{item.nombre}</p>
                        <button onClick={() => removeItem(item.productoId)}
                          className="text-[#f87171] text-xs shrink-0 hover:opacity-80">✕</button>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-[#8e8e9a]">{t('adminOrders.quantity')}</span>
                          <input type="number" min={1}
                            value={item.cantidad}
                            onChange={e => updateItem(item.productoId, 'cantidad', e.target.value)}
                            className="w-16 h-8 px-2 rounded-lg text-sm text-center focus:outline-none"
                            style={inp}
                          />
                        </div>
                        <div className="flex items-center gap-1 flex-1">
                          <span className="text-xs text-[#8e8e9a]">₡</span>
                          <input type="number" min={0}
                            value={item.precioUnitario}
                            onChange={e => updateItem(item.productoId, 'precioUnitario', e.target.value)}
                            className="flex-1 h-8 px-2 rounded-lg text-sm focus:outline-none"
                            style={inp}
                          />
                        </div>
                        <span className="text-xs text-[#8e8e9a] self-center shrink-0">
                          = {formatPrice((parseInt(item.precioUnitario) || 0) * (parseInt(item.cantidad) || 0))}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pago y envío */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#8e8e9a] uppercase tracking-widest">{t('adminOrders.paymentMethod')}</label>
                <select value={form.metodoPago} onChange={e => set('metodoPago', e.target.value)}
                  className="w-full h-10 px-2 rounded-xl text-sm focus:outline-none" style={inp}>
                  {METODOS_PAGO.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#8e8e9a] uppercase tracking-widest">{t('adminOrders.initialStatus')}</label>
                <select value={form.estadoPedido} onChange={e => set('estadoPedido', e.target.value)}
                  className="w-full h-10 px-2 rounded-xl text-sm focus:outline-none" style={inp}>
                  {ESTADOS_INICIAL.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#8e8e9a] uppercase tracking-widest">{t('adminOrders.shippingMethod')}</label>
              <div className="flex gap-2">
                {METODOS_ENVIO.map(m => (
                  <button key={m.value}
                    onClick={() => set('metodoEnvio', m.value)}
                    className="flex-1 py-2 rounded-xl text-sm font-medium transition-all"
                    style={{
                      backgroundColor: form.metodoEnvio === m.value ? 'color-mix(in srgb, var(--hc-accent) 15%, transparent)' : 'var(--hc-glass-bg)',
                      border: `1px solid ${form.metodoEnvio === m.value ? 'color-mix(in srgb, var(--hc-accent) 45%, transparent)' : 'var(--hc-border)'}`,
                      color: form.metodoEnvio === m.value ? 'var(--hc-accent)' : 'var(--hc-muted)',
                    }}>
                    {t(m.labelKey)}
                  </button>
                ))}
              </div>
            </div>

            {/* Costo de envío */}
            {form.metodoEnvio === 'ENVIO_A_DOMICILIO' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#8e8e9a] uppercase tracking-widest">{t('adminOrders.shippingCostLabel')}</label>
                <div className="flex items-center gap-2">
                  <span className="text-[#8e8e9a]">₡</span>
                  <input
                    type="number" min={0} step={500}
                    value={form.costoEnvio}
                    onChange={e => set('costoEnvio', e.target.value)}
                    placeholder="Ej: 4000"
                    className="flex-1 h-10 px-3 rounded-xl text-sm focus:outline-none"
                    style={inp}
                  />
                </div>
              </div>
            )}

            {/* Notas */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#8e8e9a] uppercase tracking-widest">{t('adminOrders.orderNotes')}</label>
              <textarea
                value={form.notas}
                onChange={e => set('notas', e.target.value)}
                rows={2}
                placeholder={t('adminOrders.notesPlaceholder')}
                className="w-full px-3 py-2 rounded-xl text-sm resize-none focus:outline-none"
                style={inp}
              />
            </div>

            {/* Resumen */}
            {form.items.length > 0 && (
              <div className="rounded-xl px-4 py-3 space-y-1.5" style={{ backgroundColor: 'var(--hc-glass-bg)', border: '1px solid var(--hc-border)' }}>
                <p className="text-xs font-semibold text-[#8e8e9a] uppercase tracking-widest mb-2">{t('adminOrders.subtotal')}</p>
                <div className="flex justify-between text-sm text-[#8e8e9a]">
                  <span>{t('adminOrders.productsLabel')}</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                {costoEnvioNum > 0 && (
                  <div className="flex justify-between text-sm text-[#8e8e9a]">
                    <span>{t('adminOrders.shippingCost')}</span>
                    <span>{formatPrice(costoEnvioNum)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-[#e8e8ed] pt-1 border-t" style={{ borderColor: 'var(--hc-border)' }}>
                  <span>{t('adminOrders.total')}</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-4 border-t shrink-0 flex gap-3" style={{ borderColor: 'var(--hc-border)' }}>
          <button onClick={onClose} disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ backgroundColor: 'var(--hc-surface-2)', color: 'var(--hc-muted)' }}>
            {t('importExport.cancel')}
          </button>
          <button onClick={submit} disabled={saving || !canSubmit}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
            style={{ backgroundColor: 'var(--hc-accent)', color: 'white' }}>
            {saving ? t('adminOrders.creating') : t('adminOrders.createOrder')}
          </button>
        </div>
      </div>
    </div>
  )
}

function OrderCard({ order, onUpdate, onDelete }) {
  const { t } = useTranslation()
  const toast = useToast()
  const [open, setOpen]             = useState(false)
  const [saving, setSaving]         = useState(false)
  const [notifying, setNotifying]   = useState(false)
  const [pendingEstado, setPending] = useState(null)   // etapa seleccionada pero no guardada
  const [nota, setNota]             = useState('')
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
      if (!guia.trim()) { toast({ message: t('adminOrders.enterGuia'), type: 'error' }); return }
      setSaving(true)
      try {
        const costoNum = costo ? parseInt(costo, 10) : null
        await orderService.procesarEnvio(order.id, guia.trim(), costoNum)
        toast({ message: t('adminOrders.sentNotified'), type: 'success' })
        onUpdate(order.id, { estado: 'ENVIADO', numeroGuia: guia.trim(), costoEnvio: costoNum ?? order.costoEnvio })
        setPending(null)
      } catch { toast({ message: t('adminOrders.shipError'), type: 'error' }) }
      finally { setSaving(false) }
      return
    }
    setSaving(true)
    try {
      await orderService.updateStatus(order.id, pendingEstado, nota.trim() || null)
      toast({ message: nota.trim() ? t('adminOrders.savedNotified') : t('adminOrders.saved'), type: 'success' })
      onUpdate(order.id, { estado: pendingEstado })
      setPending(null)
      setNota('')
    } catch { toast({ message: t('adminOrders.errorSave'), type: 'error' }) }
    finally { setSaving(false) }
  }

  const sendEmail = async () => {
    setNotifying(true)
    try {
      await orderService.notificar(order.id)
      toast({ message: t('adminOrders.sent'), type: 'success' })
    } catch {
      toast({ message: t('adminOrders.errorEmail'), type: 'error' })
    } finally { setNotifying(false) }
  }

  const doDelete = async () => {
    if (!window.confirm(t('adminOrders.confirmDelete', { id: order.id }))) return
    setSaving(true)
    try {
      await orderService.delete(order.id)
      toast({ message: t('adminOrders.deleted'), type: 'success' })
      onDelete(order.id)
    } catch { toast({ message: t('adminOrders.errorDelete'), type: 'error' }) }
    finally { setSaving(false) }
  }

  return (
    <div className="rounded-2xl border overflow-hidden"
      style={{ backgroundColor: 'var(--hc-surface)', borderColor: 'var(--hc-border)' }}>

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

        {/* Tipo entrega + método de pago */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs text-[#8e8e9a]">
            {esRetiro ? t('adminOrders.pickupBadge') : t('adminOrders.deliveryBadge')}
          </span>
          {order.metodoPago && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: 'rgba(79,124,255,0.12)', color: '#4f7cff', border: '1px solid rgba(79,124,255,0.25)' }}>
              {order.metodoPago}
            </span>
          )}
        </div>

        {/* Total */}
        <span className="text-sm font-bold text-[#e8e8ed] min-w-[80px] text-right">
          {formatPrice(order.total ?? 0)}
        </span>

        {/* Estado */}
        <EstadoBadge estado={estado} />

        {/* Chevron */}
        <svg className="w-4 h-4 shrink-0 transition-transform"
          style={{ color: 'var(--hc-muted)', transform: open ? 'rotate(180deg)' : 'rotate(0)' }}
          fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Detalle expandible */}
      {open && (
        <div className="border-t px-4 py-4 space-y-4" style={{ borderColor: 'var(--hc-border)' }}>

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
                <>
                  <p className="text-[11px] text-[#8e8e9a] text-center -mt-1">
                    {estado} → <span className="text-[#4f7cff] font-semibold">{pendingEstado}</span>
                  </p>
                  <textarea
                    value={nota}
                    onChange={e => setNota(e.target.value)}
                    rows={2}
                    placeholder={t('adminOrders.notaPlaceholder')}
                    className="w-full mt-2 px-3 py-2 rounded-xl text-sm resize-none focus:outline-none placeholder:text-[#8e8e9a]/50"
                    style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
                  />
                </>
              )}
            </div>
          )}

          {/* Formulario envío si el pending es ENVIADO en flujo domicilio */}
          {needsEnvioForm && (
            <div className="space-y-2 rounded-xl p-3" style={{ backgroundColor: 'var(--hc-glass-bg)', border: '1px solid var(--hc-border)' }}>
              <p className="text-xs font-semibold text-[#e8e8ed]">{t('adminOrders.envioSection')}</p>
              <input
                type="text"
                value={guia}
                onChange={e => setGuia(e.target.value)}
                placeholder={t('adminOrders.guiaInputPh')}
                className="w-full h-10 px-3 rounded-xl text-sm text-[#e8e8ed] placeholder:text-[#8e8e9a]/50 focus:outline-none font-mono"
                style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
              />
              <div className="flex gap-2 items-center">
                <span className="text-[#8e8e9a] text-sm shrink-0">₡</span>
                <input
                  type="number"
                  value={costo}
                  onChange={e => setCosto(e.target.value)}
                  placeholder={t('adminOrders.costInputPh')}
                  min={4000} max={20000} step={500}
                  className="flex-1 h-10 px-3 rounded-xl text-sm text-[#e8e8ed] placeholder:text-[#8e8e9a]/50 focus:outline-none"
                  style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
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
                style={{ backgroundColor: 'var(--hc-accent)', color: 'white' }}
              >
                {saving ? t('adminOrders.saving') : t('adminOrders.saveChanges')}
              </button>
              <button
                onClick={() => { setPending(null); setNota('') }}
                disabled={saving}
                className="px-4 py-2.5 rounded-xl text-sm transition-all"
                style={{ backgroundColor: 'var(--hc-surface-2)', color: 'var(--hc-muted)' }}
              >
                {t('importExport.cancel')}
              </button>
            </div>
          )}

          {/* Productos con imagen */}
          {items.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#8e8e9a] mb-2">{t('adminOrders.productsSection')}</p>
              <div className="space-y-2">
                {items.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                    style={{ backgroundColor: 'var(--hc-glass-bg)' }}>
                    <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0"
                      style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }}>
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

          {/* Notificaciones al cliente */}
          <div className="flex flex-wrap gap-2">
            {order.clienteCorreo && order.clienteCorreo !== '—' && (
              <button
                onClick={sendEmail}
                disabled={notifying}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
                style={{ backgroundColor: 'color-mix(in srgb, var(--hc-accent) 12%, transparent)', color: 'var(--hc-accent)', border: '1px solid color-mix(in srgb, var(--hc-accent) 28%, transparent)' }}
              >
                📧 {notifying ? t('adminOrders.sending') : t('adminOrders.emailClient')}
              </button>
            )}
            {order.clienteTel && order.clienteTel !== '' && (() => {
              const tel = order.clienteTel.replace(/\D/g, '')
              const numero = tel.startsWith('506') ? tel : `506${tel}`
              const productos = (order.items ?? []).map(i => `• ${i.nombreProducto} ×${i.cantidad}`).join('\n')
              const msg = [
                `Hola ${order.nombreCliente ?? ''}, te escribimos de *HOTCLICK* sobre tu pedido *#${order.id}*.`,
                '',
                `Estado actual: *${order.estado ?? estado}*`,
                ...(productos ? ['\nProductos:', productos] : []),
                ...(order.numeroGuia ? [`\nGuía: *${order.numeroGuia}*`] : []),
                '',
                '¿Tenés alguna consulta? Con gusto te ayudamos. 🙂',
              ].join('\n')
              return (
                <a
                  href={`https://wa.me/${numero}?text=${encodeURIComponent(msg)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors"
                  style={{ backgroundColor: 'rgba(37,211,102,0.12)', color: '#25D366', border: '1px solid rgba(37,211,102,0.28)' }}
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  WhatsApp cliente
                </a>
              )
            })()}
            {order.costoEnvio > 0 && (
              <span className="flex items-center text-xs text-[#8e8e9a] px-2">{t('adminOrders.shippingDisplay', { amount: formatPrice(order.costoEnvio) })}</span>
            )}
            {order.notas && (
              <span className="flex items-center text-xs text-[#8e8e9a] px-2">💬 {order.notas}</span>
            )}
          </div>

          {/* Guía existente */}
          {order.numeroGuia && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
              style={{ backgroundColor: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)' }}>
              <span className="text-green-400">{t('adminOrders.guiaSection')}</span>
              <a href={`https://rastreo.correos.go.cr/?codigo=${order.numeroGuia}`}
                target="_blank" rel="noopener noreferrer"
                className="font-mono font-bold text-green-300 hover:underline flex-1">
                {order.numeroGuia}
              </a>
            </div>
          )}

          {estado === 'ENTREGADO' && (
            <p className="text-center text-sm text-green-400 py-1">{t('adminOrders.orderDelivered')}</p>
          )}
          {estado === 'COMPLETADO' && (
            <p className="text-center text-sm py-1" style={{ color: '#a855f7' }}>{t('adminOrders.orderCompleted')}</p>
          )}
          {estado === 'CANCELADO' && (
            <p className="text-center text-sm text-red-400 py-1">{t('adminOrders.orderCancelled')}</p>
          )}

          {/* Pie: override manual + eliminar */}
          <div className="pt-2 border-t flex items-start justify-between gap-4" style={{ borderColor: 'var(--hc-border)' }}>
            <div className="flex-1">
              <button onClick={() => setShowOver(v => !v)}
                className="text-xs text-[#8e8e9a]/50 hover:text-[#8e8e9a] transition-colors">
                {showOver ? '▲' : '▼'} {t('adminOrders.manualCorrection')}
              </button>
              {showOver && (
                <div className="flex gap-2 mt-2">
                  <select
                    value={override || estado}
                    onChange={e => setOverride(e.target.value)}
                    className="flex-1 h-9 px-2 rounded-xl text-sm text-[#e8e8ed] focus:outline-none"
                    style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
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
                        toast({ message: t('adminOrders.corrected'), type: 'success' })
                        onUpdate(order.id, { estado: override })
                        setShowOver(false)
                      } catch { toast({ message: t('adminOrders.errorCorrect'), type: 'error' }) }
                      finally { setSaving(false) }
                    }}
                    disabled={saving || !override || override === estado}
                    className="px-4 rounded-xl text-sm font-medium transition-all disabled:opacity-40"
                    style={{ backgroundColor: 'var(--hc-surface-2)', color: 'var(--hc-text)' }}
                  >
                    {saving ? '…' : t('adminOrders.apply')}
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={doDelete}
              disabled={saving}
              className="text-xs px-3 py-1.5 rounded-lg transition-all disabled:opacity-40 shrink-0"
              style={{ backgroundColor: 'rgba(248,113,113,0.10)', color: 'var(--hc-danger)', border: '1px solid rgba(248,113,113,0.25)' }}
            >
              {t('adminOrders.deleteOrder')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminOrders() {
  const { t } = useTranslation()
  const [orders, setOrders]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [filter, setFilter]         = useState('Todos')
  const [showCreate, setShowCreate] = useState(false)

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

  const handleCreated = (newOrder) => {
    if (newOrder?.id) setOrders(prev => [newOrder, ...prev])
    else load()
  }

  const filtered = filter === 'Todos'
    ? orders
    : orders.filter(o => o.estado === filter)

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-[#e8e8ed]">{t('adminOrders.title')}</h1>
            <p className="text-sm text-[#8e8e9a] mt-0.5">{t('adminOrders.subtitle', { count: orders.length })}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <ImportExportBar
              exportOnly
              data={orders.map((o) => ({
                id: o.id,
                fecha: (o.fechaCreacion ?? '').slice(0, 10),
                cliente: o.nombreCliente ?? '',
                correo: o.clienteCorreo ?? '',
                estado: o.estadoPedido ?? '',
                total: o.totalPedido ?? 0,
                subtotal: o.subtotal ?? 0,
                envio: o.costoEnvio ?? 0,
                tipoEntrega: o.tipoEntrega ?? '',
                guia: o.numeroGuia ?? '',
              }))}
              columns={['id','fecha','cliente','correo','estado','total','subtotal','envio','tipoEntrega','guia']}
              filename="pedidos"
              sheetName="Pedidos"
            />
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all shrink-0"
              style={{ backgroundColor: 'var(--hc-accent)', color: 'white' }}
            >
              {t('adminOrders.newOrderBtn')}
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                backgroundColor: filter === f ? 'var(--hc-accent)' : 'color-mix(in srgb, var(--hc-text) 5%, transparent)',
                color: filter === f ? 'white' : 'var(--hc-muted)',
                border: `1px solid ${filter === f ? 'color-mix(in srgb, var(--hc-accent) 40%, transparent)' : 'var(--hc-border)'}`,
              }}
            >
              {f === 'Todos' ? t('adminOrders.filterAll') : f}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-[#8e8e9a] text-sm">{t('adminOrders.noOrders')}</div>
        ) : (
          <div className="space-y-2">
            {filtered.map(order => (
              <OrderCard key={order.id} order={order} onUpdate={handleUpdate} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
      {showCreate && (
        <CrearPedidoModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
    </AdminLayout>
  )
}
