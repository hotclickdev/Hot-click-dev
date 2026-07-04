import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import PhoneField from '@/components/ui/PhoneField'
import Spinner from '@/components/ui/Spinner'
import { productService } from '@/services/productService'
import { ventaService } from '@/services/orderService'
import { crmService } from '@/services/crmService'
import { useToast } from '@/components/ui/Toast'
import { formatPrice } from '@/utils/format'

const ETAPAS_RETIRO = [
  { key: 'PENDIENTE',      label: 'Pendiente' },
  { key: 'PAGADO',         label: 'Pago confirmado' },
  { key: 'EN_PREPARACION', label: 'En preparación' },
  { key: 'LISTO_RETIRO',   label: 'Listo p/ retirar' },
  { key: 'ENTREGADO',      label: 'Retirado' },
  { key: 'COMPLETADO',     label: 'Completado' },
]
const ETAPAS_ENVIO = [
  { key: 'PENDIENTE',      label: 'Pendiente' },
  { key: 'PAGADO',         label: 'Pago confirmado' },
  { key: 'EN_PREPARACION', label: 'En preparación' },
  { key: 'ENVIADO',        label: 'Enviado' },
  { key: 'ENTREGADO',      label: 'Entregado' },
  { key: 'COMPLETADO',     label: 'Completado' },
]

function SaleStepTracker({ estado, esRetiro }) {
  const etapas  = esRetiro ? ETAPAS_RETIRO : ETAPAS_ENVIO
  const idx     = etapas.findIndex(e => e.key === estado)
  const idxSafe = idx === -1 ? 0 : idx
  return (
    <div className="flex items-center overflow-x-auto pb-1">
      {etapas.map((e, i) => {
        const done    = i < idxSafe
        const current = i === idxSafe
        return (
          <div key={e.key} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: done || current ? '#10b981' : 'transparent',
                  border: `2px solid ${done || current ? '#10b981' : 'var(--hc-border)'}`,
                  boxShadow: current ? '0 0 12px rgba(16,185,129,0.4)' : 'none',
                }}
              >
                {done || current
                  ? <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                  : <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--hc-border)' }} />
                }
              </div>
              <span
                className="text-[9px] text-center leading-tight max-w-[56px]"
                style={{ color: done || current ? 'var(--hc-text)' : 'var(--hc-muted)', fontWeight: current ? 700 : 400, opacity: done || current ? 1 : 0.4 }}
              >
                {e.label}
              </span>
            </div>
            {i < etapas.length - 1 && (
              <div className="h-0.5 flex-1 mx-1 rounded-full mb-4"
                style={{ backgroundColor: i < idxSafe ? '#10b981' : 'var(--hc-border)' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

const WHATSAPP = '50686667888'
const TABS = [
  { id: 'cliente', label: 'Venta con Cliente', icon: '👤' },
  { id: 'rapida',  label: 'Venta Rápida',      icon: '⚡' },
  { id: 'cotizar', label: 'Cotización WhatsApp', icon: '💬' },
]

export default function AdminNewSale() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast()
  const [tab, setTab] = useState('cliente')
  const [products, setProducts] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [createdOrder, setCreatedOrder] = useState(null)

  // Shared state
  const [items, setItems] = useState([])
  const [search, setSearch] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('EFECTIVO')

  // Tab 1 – Venta con Cliente
  const [clientId, setClientId] = useState('')
  const [clientName, setClientName] = useState('')
  const [showNewClient, setShowNewClient] = useState(false)
  const [newClientName, setNewClientName] = useState('')
  const [newClientPhone, setNewClientPhone] = useState('')
  const [creatingClient, setCreatingClient] = useState(false)

  // Tab 3 – Cotización
  const [cotNombre, setCotNombre] = useState('')
  const [cotTelefono, setCotTelefono] = useState('')
  const [cotNota, setCotNota] = useState('')

  // Shared – costo de envío opcional
  const [costoEnvio, setCostoEnvio] = useState('')

  // Tipo de entrega
  const [tipoEntrega, setTipoEntrega] = useState('LOCAL')

  // Estado inicial del pedido
  const [estadoInicial, setEstadoInicial] = useState('COMPLETADO')

  useEffect(() => {
    Promise.all([
      productService.adminGetAll(0, 500),
      ventaService.getClientes(),
    ]).then(([{ data: prods }, { data: cl }]) => {
      setProducts(prods.content ?? prods ?? [])
      setClients(Array.isArray(cl) ? cl : [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  // Reset items when switching tabs
  const switchTab = (id) => { setTab(id); setItems([]); setCostoEnvio(''); setTipoEntrega('LOCAL'); setEstadoInicial('COMPLETADO') }

  const handleCreateClient = async () => {
    if (!newClientName.trim()) {
      toast({ message: 'Indica el nombre del cliente', type: 'error' }); return
    }
    setCreatingClient(true)
    try {
      const nuevo = await crmService.crearCliente({ nombre: newClientName.trim(), telefono: newClientPhone })
      setClients((prev) => [nuevo, ...prev])
      setClientId(String(nuevo.id))
      setClientName('')
      setShowNewClient(false)
      setNewClientName('')
      setNewClientPhone('')
      toast({ message: 'Cliente creado', type: 'success' })
    } catch {
      toast({ message: 'No se pudo crear el cliente', type: 'error' })
    } finally {
      setCreatingClient(false)
    }
  }

  const filteredProducts = products.filter((p) =>
    p.stock > 0 && (!search || p.nombre?.toLowerCase().includes(search.toLowerCase()))
  )

  const addProduct = (p) => {
    setItems((prev) => {
      const ex = prev.find((i) => i.id === p.id)
      if (ex) return prev.map((i) => i.id === p.id ? { ...i, cantidad: Math.min(i.cantidad + 1, p.stock) } : i)
      return [...prev, { ...p, cantidad: 1 }]
    })
  }

  const removeItem = (id) => setItems((prev) => prev.filter((i) => i.id !== id))

  const updateQty = (id, val) => {
    const n = Number(val)
    if (n < 1) return removeItem(id)
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, cantidad: n } : i))
  }

  const subtotal = items.reduce((s, i) => s + i.precio * i.cantidad, 0)
  const envioNum = Number(costoEnvio) || 0
  const total = subtotal + envioNum

  const handleSave = async (withClient) => {
    if (items.length === 0) { toast({ message: 'Agrega al menos un producto', type: 'error' }); return }
    if (withClient && !clientId && !clientName.trim()) {
      toast({ message: 'Indica el cliente o su nombre', type: 'error' }); return
    }
    setSaving(true)
    try {
      const payload = {
        clienteId: withClient ? (clientId || null) : null,
        nombreCliente: withClient ? clientName : 'Venta rápida',
        metodoPago: paymentMethod,
        tipoEntrega,
        estadoInicial,
        items: items.map((i) => ({ productoId: i.id, cantidad: i.cantidad, precioUnitario: i.precio })),
        costoEnvio: envioNum,
        total,
      }
      await ventaService.create(payload)
      toast({ message: 'Venta registrada con éxito', type: 'success' })
      setCreatedOrder({
        estado: estadoInicial,
        esRetiro: tipoEntrega === 'LOCAL',
        nombreCliente: withClient ? clientName || 'Cliente' : 'Venta rápida',
        metodoPago: paymentMethod,
        items: [...items],
        subtotal,
        costoEnvio: envioNum,
        total,
      })
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Error al registrar venta', type: 'error' })
    } finally { setSaving(false) }
  }

  const handleCotizacion = () => {
    if (items.length === 0) { toast({ message: 'Agrega al menos un producto', type: 'error' }); return }
    const lines = items.map((i) => `• ${i.nombre} ×${i.cantidad} — ${formatPrice(i.precio * i.cantidad)}`)
    let header = 'Hola HotClick, solicito una *cotización formal*'
    if (cotNombre) header += ` para *${cotNombre}*`
    if (cotTelefono) header += ` (${cotTelefono})`
    const body = [
      header + ':',
      '',
      ...lines,
      '',
      `Subtotal: ${formatPrice(subtotal)}`,
    ]
    if (envioNum > 0) body.push(`Envío: ${formatPrice(envioNum)}`)
    body.push(`*Total estimado: ${formatPrice(total)}*`)
    if (cotNota) body.push('', `Nota: ${cotNota}`)
    body.push('', '¿Pueden confirmar disponibilidad, tiempo de entrega y métodos de pago? Gracias.')
    globalThis.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(body.join('\n'))}`, '_blank')
  }

  if (loading) return <><div className="flex justify-center py-20"><Spinner size="lg" /></div></>

  if (createdOrder) return (
    <>
      <div className="max-w-lg mx-auto space-y-6 py-4">
        {/* Header éxito */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-500/15 flex items-center justify-center">
            <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[#e8e8ed]">Venta registrada</h2>
          <p className="text-sm text-[#8e8e9a]">{createdOrder.nombreCliente} · {createdOrder.metodoPago}</p>
        </div>

        {/* Stepper de etapas */}
        <div className="bg-white/3 border border-white/8 rounded-2xl px-4 py-5 space-y-3">
          <p className="text-xs font-semibold text-[#8e8e9a] uppercase tracking-wider">Estado del pedido</p>
          <SaleStepTracker estado={createdOrder.estado} esRetiro={createdOrder.esRetiro} />
        </div>

        {/* Resumen de productos */}
        <div className="bg-white/3 border border-white/8 rounded-2xl px-4 py-4 space-y-2">
          <p className="text-xs font-semibold text-[#8e8e9a] uppercase tracking-wider">Productos</p>
          {createdOrder.items.map((i) => (
            <div key={i.id} className="flex justify-between items-center text-sm">
              <span className="text-[#e8e8ed] truncate flex-1 mr-3">{i.nombre} <span className="text-[#8e8e9a]">×{i.cantidad}</span></span>
              <span className="text-[#e8e8ed] font-medium shrink-0">{formatPrice(i.precio * i.cantidad)}</span>
            </div>
          ))}
          <div className="border-t border-white/8 pt-2 mt-2 space-y-1">
            {createdOrder.costoEnvio > 0 && (
              <div className="flex justify-between text-sm text-[#8e8e9a]">
                <span>Envío</span>
                <span>{formatPrice(createdOrder.costoEnvio)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-[#e8e8ed]">
              <span>Total</span>
              <span className="text-lg">{formatPrice(createdOrder.total)}</span>
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex gap-3">
          <Button variant="ghost" size="lg" className="flex-1" onClick={() => { setCreatedOrder(null); setItems([]); setCostoEnvio(''); setClientId(''); setClientName(''); setTipoEntrega('LOCAL') }}>
            + Nueva venta
          </Button>
          <Button size="lg" className="flex-1" onClick={() => navigate('/admin/pedidos')}>
            Ver pedidos →
          </Button>
        </div>
      </div>
    </>
  )

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              <span className="text-[#e8e8ed]">{t('admin.sales.title')}</span>
            </h1>
            <p className="text-sm text-[#8e8e9a] mt-1">Registra una venta, venta rápida o cotización por WhatsApp</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="shrink-0">
            ← Volver
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-[#111114] border border-white/8 rounded-2xl p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => switchTab(t.id)}
              className={`
                flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                ${tab === t.id
                  ? 'bg-[#4f7cff] text-white shadow-[0_0_12px_rgba(23,71,168,0.35)]'
                  : 'text-[#8e8e9a] hover:text-[#e8e8ed] hover:bg-white/5'
                }
              `}
            >
              <span>{t.icon}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: product search */}
          <div className="space-y-4">
            <h2 className="text-xs font-semibold text-[#8e8e9a] uppercase tracking-wider">{t('admin.sales.products')}</h2>
            <Input placeholder={t('common.search')} value={search} onChange={(e) => setSearch(e.target.value)} />
            <div className="h-72 overflow-y-auto space-y-1.5 pr-1">
              {filteredProducts.length === 0 ? (
                <p className="text-sm text-[#8e8e9a] text-center py-8">{t('common.noData')}</p>
              ) : filteredProducts.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => addProduct(p)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-white/3 hover:bg-white/6 border border-white/8 rounded-xl text-left transition-colors group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#e8e8ed] truncate">{p.nombre}</p>
                    <p className="text-xs text-[#8e8e9a]">Stock: {p.stock}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className="text-sm font-semibold text-[#4f7cff]">{formatPrice(p.precio)}</span>
                    <span className="w-6 h-6 rounded-lg bg-[#4f7cff]/20 text-[#4f7cff] text-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">+</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right: order + client info */}
          <div className="space-y-4">
            {/* Tab 1: Venta con Cliente */}
            {tab === 'cliente' && (
              <>
                <h2 className="text-xs font-semibold text-[#8e8e9a] uppercase tracking-wider">{t('admin.sales.client')}</h2>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-[#e8e8ed]">Cliente registrado</label>
                    <button
                      type="button"
                      onClick={() => setShowNewClient((v) => !v)}
                      className="text-xs font-medium text-[#4f7cff] hover:text-[#7c9cff] transition-colors"
                    >
                      {showNewClient ? 'Cancelar' : '+ Nuevo cliente'}
                    </button>
                  </div>
                  {!showNewClient && (
                    <select
                      value={clientId}
                      onChange={(e) => { setClientId(e.target.value); setClientName('') }}
                      className="h-11 px-3 rounded-xl bg-white/5 border border-white/10 text-[#e8e8ed] text-sm focus:outline-none focus:border-[#4f7cff]/60"
                    >
                      <option value="">— Sin cliente registrado —</option>
                      {clients.map((c) => <option key={c.id} value={c.id}>{c.nombre ?? c.correo}</option>)}
                    </select>
                  )}
                </div>
                {showNewClient && (
                  <div className="flex flex-col gap-3 bg-white/5 border border-white/10 rounded-xl p-3">
                    <Input
                      label="Nombre del cliente"
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      placeholder="Nombre completo"
                    />
                    <PhoneField label="Teléfono (opcional)" value={newClientPhone} onChange={setNewClientPhone} />
                    <Button onClick={handleCreateClient} disabled={creatingClient} size="sm">
                      {creatingClient ? 'Creando…' : 'Crear cliente'}
                    </Button>
                  </div>
                )}
                {!showNewClient && !clientId && (
                  <Input
                    label="Nombre del cliente"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Nombre para el pedido"
                    required
                  />
                )}
              </>
            )}

            {/* Tab 2: Venta Rápida */}
            {tab === 'rapida' && (
              <>
                <h2 className="text-xs font-semibold text-[#8e8e9a] uppercase tracking-wider">Venta rápida</h2>
                <div className="bg-amber-500/8 border border-amber-500/15 rounded-xl px-4 py-3">
                  <p className="text-xs text-amber-400/80">La venta se registrará como venta rápida sin asociar a un cliente. Útil para ventas en mostrador.</p>
                </div>
              </>
            )}

            {/* Tab 3: Cotización WhatsApp */}
            {tab === 'cotizar' && (
              <>
                <h2 className="text-xs font-semibold text-[#8e8e9a] uppercase tracking-wider">Datos de la cotización</h2>
                <Input label="Nombre del cliente" value={cotNombre} onChange={(e) => setCotNombre(e.target.value)} placeholder="Opcional" />
                <PhoneField label="Teléfono / WhatsApp" value={cotTelefono} onChange={setCotTelefono} hint="Opcional" />
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-[#e8e8ed]">Nota adicional</label>
                  <textarea
                    value={cotNota}
                    onChange={(e) => setCotNota(e.target.value)}
                    placeholder="Condiciones especiales, descuentos, etc."
                    rows={2}
                    className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[#e8e8ed] text-sm placeholder-[#8e8e9a] focus:outline-none focus:border-[#4f7cff]/60 resize-none"
                  />
                </div>
              </>
            )}

            {/* Payment method + tipo entrega (tabs 1 & 2 only) */}
            {tab !== 'cotizar' && (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-[#e8e8ed]">Método de pago</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="h-11 px-3 rounded-xl bg-white/5 border border-white/10 text-[#e8e8ed] text-sm focus:outline-none focus:border-[#4f7cff]/60"
                  >
                    {['EFECTIVO', 'SINPE', 'TARJETA', 'TRANSFERENCIA'].map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-[#e8e8ed]">Tipo de entrega</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'LOCAL', label: 'Retiro en local', icon: '🏪' },
                      { value: 'DOMICILIO', label: 'Envío a domicilio', icon: '🚚' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => { setTipoEntrega(opt.value); setEstadoInicial('COMPLETADO') }}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                          tipoEntrega === opt.value
                            ? 'bg-[#4f7cff]/15 border-[#4f7cff]/50 text-[#7fa3ff]'
                            : 'bg-white/3 border-white/8 text-[#8e8e9a] hover:border-white/15 hover:text-[#e8e8ed]'
                        }`}
                      >
                        <span>{opt.icon}</span>
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Estado inicial del pedido */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-[#e8e8ed]">
                    Etapa actual
                    {(estadoInicial === 'ENTREGADO' || estadoInicial === 'COMPLETADO')
                      ? <span className="ml-2 text-xs text-emerald-400 font-normal">aparece en finanzas</span>
                      : <span className="ml-2 text-xs text-amber-400 font-normal">no aparece en finanzas aún</span>
                    }
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {(tipoEntrega === 'LOCAL' ? ETAPAS_RETIRO : ETAPAS_ENVIO).map((e) => (
                      <button
                        key={e.key}
                        type="button"
                        onClick={() => setEstadoInicial(e.key)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          estadoInicial === e.key
                            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                            : 'bg-white/3 border-white/8 text-[#8e8e9a] hover:border-white/20 hover:text-[#e8e8ed]'
                        }`}
                      >
                        {e.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Cart items */}
            {items.length > 0 ? (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {items.map((i) => (
                  <div key={i.id} className="flex items-center gap-3 bg-white/3 border border-white/8 rounded-xl px-3 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[#e8e8ed] truncate">{i.nombre}</p>
                      <p className="text-xs text-[#8e8e9a]">{formatPrice(i.precio)} c/u</p>
                    </div>
                    <input
                      type="number" min="1" max={i.stock} value={i.cantidad}
                      onChange={(e) => updateQty(i.id, e.target.value)}
                      className="w-14 h-7 text-center text-sm bg-white/5 border border-white/10 rounded-lg text-[#e8e8ed] focus:outline-none"
                    />
                    <span className="text-xs font-semibold text-[#e8e8ed] w-16 text-right">{formatPrice(i.precio * i.cantidad)}</span>
                    <button type="button" onClick={() => removeItem(i.id)} className="text-[#8e8e9a] hover:text-red-400 transition-colors text-sm">✕</button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white/2 border border-white/5 rounded-xl px-4 py-6 text-center text-xs text-[#8e8e9a]">
                Selecciona productos de la lista
              </div>
            )}

            {/* Costo de envío (opcional) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#8e8e9a] uppercase tracking-wider">Costo de envío <span className="normal-case font-normal">(opcional)</span></label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#8e8e9a] pointer-events-none">₡</span>
                <input
                  type="number"
                  min="0"
                  value={costoEnvio}
                  onChange={(e) => setCostoEnvio(e.target.value)}
                  placeholder="0"
                  className="w-full h-11 pl-7 pr-3 rounded-xl bg-white/5 border border-white/10 text-[#e8e8ed] text-sm placeholder-[#8e8e9a] focus:outline-none focus:border-[#4f7cff]/60"
                />
              </div>
            </div>

            {/* Total */}
            <div className="pt-3 border-t border-white/8 space-y-1">
              {envioNum > 0 && (
                <>
                  <div className="flex justify-between items-center text-sm text-[#8e8e9a]">
                    <span>Subtotal productos</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-[#8e8e9a]">
                    <span>Costo de envío</span>
                    <span>{formatPrice(envioNum)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between items-center font-bold text-[#e8e8ed]">
                <span className="text-sm">{t('admin.sales.total')}</span>
                <span className="text-xl">{formatPrice(total)}</span>
              </div>
            </div>

            {/* Action button */}
            {tab === 'cliente' && (
              <Button
                type="button"
                loading={saving}
                size="lg"
                className="w-full"
                disabled={items.length === 0}
                onClick={() => handleSave(true)}
              >
                {t('admin.sales.submit')}
              </Button>
            )}
            {tab === 'rapida' && (
              <Button
                type="button"
                loading={saving}
                size="lg"
                className="w-full bg-amber-500 hover:bg-amber-600 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                disabled={items.length === 0}
                onClick={() => handleSave(false)}
              >
                ⚡ {t('admin.sales.submit')}
              </Button>
            )}
            {tab === 'cotizar' && (
              <Button
                type="button"
                size="lg"
                className="w-full bg-[#25D366] hover:bg-[#1da851] shadow-[0_0_20px_rgba(37,211,102,0.25)]"
                disabled={items.length === 0}
                onClick={handleCotizacion}
              >
                <WhatsAppIcon />
                Enviar Cotización por WhatsApp
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function WhatsAppIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}
