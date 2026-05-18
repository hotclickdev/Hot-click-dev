import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import AdminLayout from '@/layouts/AdminLayout'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import Spinner from '@/components/ui/Spinner'
import { orderService } from '@/services/orderService'
import { useToast } from '@/components/ui/Toast'
import { formatDate, formatPrice, statusColor } from '@/utils/format'

const STATUS_OPTIONS = ['PENDIENTE', 'PAGADO', 'EN_PREPARACION', 'LISTO_RETIRO', 'ENVIADO', 'ENTREGADO', 'CANCELADO']

// Flujos según método de envío
const ETAPAS_RETIRO = [
  { key: 'PENDIENTE',      label: 'Pendiente' },
  { key: 'PAGADO',         label: 'Pagado' },
  { key: 'EN_PREPARACION', label: 'En preparación' },
  { key: 'LISTO_RETIRO',   label: 'Listo para retirar' },
  { key: 'ENTREGADO',      label: 'Entregado' },
]
const ETAPAS_ENVIO = [
  { key: 'PENDIENTE',      label: 'Pendiente' },
  { key: 'PAGADO',         label: 'Pagado' },
  { key: 'EN_PREPARACION', label: 'En preparación' },
  { key: 'ENVIADO',        label: 'Enviado' },
  { key: 'ENTREGADO',      label: 'Entregado' },
]

function getNextStep(estado, esRetiro) {
  if (estado === 'PAGADO')         return { type: 'btn',  next: 'EN_PREPARACION', label: '⚙️ Marcar en preparación' }
  if (estado === 'EN_PREPARACION') {
    if (esRetiro) return { type: 'btn', next: 'LISTO_RETIRO', label: '✅ Listo para retirar' }
    return { type: 'envio' }
  }
  if (estado === 'LISTO_RETIRO')   return { type: 'btn',  next: 'ENTREGADO', label: '🏁 Marcar como entregado' }
  if (estado === 'ENVIADO')        return { type: 'btn',  next: 'ENTREGADO', label: '🏁 Marcar como entregado' }
  return null
}

export default function AdminOrders() {
  const { t } = useTranslation()
  const toast = useToast()
  const [orders, setOrders]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [selected, setSelected]   = useState(null)
  const [filter, setFilter]       = useState('ALL')
  const [saving, setSaving]       = useState(false)
  const [guia, setGuia]           = useState('')
  const [costoEnvio, setCostoEnvio] = useState('')
  const [savingEnvio, setSavingEnvio] = useState(false)
  // override manual
  const [showOverride, setShowOverride] = useState(false)
  const [overrideStatus, setOverrideStatus] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await orderService.getAll()
      setOrders(Array.isArray(data) ? data : data.content ?? [])
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const openOrder = (order) => {
    setSelected(order)
    setGuia(order.numeroGuia ?? '')
    setCostoEnvio('')
    setShowOverride(false)
    setOverrideStatus(order.estado ?? '')
  }

  const handleNextStatus = async (next) => {
    if (!selected || !next) return
    setSaving(true)
    try {
      await orderService.updateStatus(selected.id, next)
      toast({ message: 'Estado actualizado', type: 'success' })
      setSelected(null)
      load()
    } catch { toast({ message: 'Error al actualizar estado', type: 'error' }) }
    finally { setSaving(false) }
  }

  const handleEnvio = async () => {
    if (!selected || !guia.trim()) return
    setSavingEnvio(true)
    try {
      const costo = costoEnvio ? parseInt(costoEnvio, 10) : null
      await orderService.procesarEnvio(selected.id, guia.trim(), costo)
      toast({ message: '📦 Enviado — cliente notificado por email', type: 'success' })
      setSelected(null)
      load()
    } catch { toast({ message: 'Error al procesar envío', type: 'error' }) }
    finally { setSavingEnvio(false) }
  }

  const handleOverride = async () => {
    if (!selected || !overrideStatus) return
    setSaving(true)
    try {
      await orderService.updateStatus(selected.id, overrideStatus)
      toast({ message: 'Estado actualizado manualmente', type: 'success' })
      setSelected(null)
      load()
    } catch { toast({ message: 'Error al actualizar', type: 'error' }) }
    finally { setSaving(false) }
  }

  const filtered = filter === 'ALL' ? orders : orders.filter((o) => o.estado === filter)

  // Datos del modal
  const estadoActual = selected?.estado ?? ''
  const esRetiro     = selected?.metodoEnvio !== 'ENVIO_A_DOMICILIO'
  const etapas       = esRetiro ? ETAPAS_RETIRO : ETAPAS_ENVIO
  const nextStep     = selected ? getNextStep(estadoActual, esRetiro) : null
  const idxActual    = etapas.findIndex(e => e.key === estadoActual)

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#e8e8ed]">{t('admin.orders.title')}</h1>
            <p className="text-sm text-[#8e8e9a] mt-1">{orders.length} {t('admin.orders.title').toLowerCase()}</p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-1 bg-white/3 border border-white/8 rounded-xl p-1 w-fit">
          {['ALL', ...STATUS_OPTIONS].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === s ? 'bg-[#4f7cff] text-white shadow-sm' : 'text-[#8e8e9a] hover:text-white'
              }`}
            >
              {s === 'ALL' ? 'Todos' : s}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : (
          <div className="bg-[#111114] border border-white/8 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/8">
                    {['#', 'Cliente', 'Total', 'Envío', 'Estado', 'Fecha', ''].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-[#8e8e9a] uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filtered.map((order) => (
                    <tr key={order.id} className="hover:bg-white/3 transition-colors">
                      <td className="px-4 py-3 text-[#8e8e9a] text-xs font-mono">#{order.id}</td>
                      <td className="px-4 py-3 text-[#e8e8ed]">
                        {order.nombreCliente ?? order.usuario?.nombre ?? '—'}
                      </td>
                      <td className="px-4 py-3 font-medium text-[#e8e8ed]">{formatPrice(order.total ?? 0)}</td>
                      <td className="px-4 py-3 text-xs text-[#8e8e9a]">
                        {order.metodoEnvio === 'ENVIO_A_DOMICILIO' ? '🚚 Domicilio' : '🏪 Retiro'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusColor(order.estado)}>{order.estado}</Badge>
                      </td>
                      <td className="px-4 py-3 text-[#8e8e9a] text-xs">
                        {order.fechaCreacion ? formatDate(order.fechaCreacion) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => openOrder(order)}
                          className="px-3 py-1 text-xs rounded-lg bg-white/5 hover:bg-white/10 text-[#8e8e9a] hover:text-white transition-colors"
                        >
                          Gestionar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="text-center py-12 text-[#8e8e9a]">{t('common.noData')}</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Order detail modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Pedido ${selected?.numeroPedido ?? '#' + selected?.id}`} size="md">
        {selected && (
          <div className="space-y-5">
            {/* Info básica */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-[#8e8e9a] text-xs mb-1">Cliente</p>
                <p className="text-[#e8e8ed]">{selected.nombreCliente ?? '—'}</p>
                {selected.clienteCorreo && <p className="text-[#8e8e9a] text-xs">{selected.clienteCorreo}</p>}
                {selected.clienteTel  && <p className="text-[#8e8e9a] text-xs">{selected.clienteTel}</p>}
              </div>
              <div>
                <p className="text-[#8e8e9a] text-xs mb-1">Total pagado</p>
                <p className="text-[#e8e8ed] font-bold text-lg">{formatPrice(selected.total ?? 0)}</p>
                {selected.costoEnvio > 0 && (
                  <p className="text-[#8e8e9a] text-xs">Envío: {formatPrice(selected.costoEnvio)}</p>
                )}
              </div>
              {selected.notas && (
                <div className="col-span-2">
                  <p className="text-[#8e8e9a] text-xs mb-1">Notas</p>
                  <p className="text-[#e8e8ed] text-sm bg-white/3 px-3 py-2 rounded-lg">{selected.notas}</p>
                </div>
              )}
            </div>

            {/* Items */}
            {selected.items?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-[#8e8e9a] mb-2">Productos</p>
                <div className="space-y-1.5">
                  {selected.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm text-[#e8e8ed] bg-white/3 px-3 py-2 rounded-lg">
                      <span>{item.nombreProducto ?? item.producto?.nombre ?? '—'} ×{item.cantidad}</span>
                      <span>{formatPrice((item.precioUnitario ?? 0) * item.cantidad)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Seguimiento de etapas */}
            <div className="border-t border-white/8 pt-4 space-y-4">
              {/* Tipo de envío + progreso */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-base">{esRetiro ? '🏪' : '🚚'}</span>
                  <span className="text-sm font-medium text-[#e8e8ed]">
                    {esRetiro ? 'Retiro en tienda' : 'Envío a domicilio'}
                  </span>
                  <Badge variant={statusColor(estadoActual)} className="ml-auto">{estadoActual}</Badge>
                </div>

                {/* Barra de progreso */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1">
                  {etapas.map((e, i) => {
                    const done    = i < idxActual
                    const current = e.key === estadoActual
                    return (
                      <div key={e.key} className="flex items-center gap-1 shrink-0">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium transition-colors ${
                          current ? 'bg-[#4f7cff] text-white' :
                          done    ? 'bg-green-500/15 text-green-400' :
                                    'text-[#8e8e9a]/40'
                        }`}>{e.label}</span>
                        {i < etapas.length - 1 && (
                          <span className={`text-xs ${done || current ? 'text-[#8e8e9a]' : 'text-[#8e8e9a]/25'}`}>›</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Guía existente */}
              {selected.numeroGuia && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/20">
                  <span className="text-xs text-green-400">Guía:</span>
                  <a href={`https://rastreo.correos.go.cr/?codigo=${selected.numeroGuia}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-xs font-mono font-bold text-green-300 hover:underline flex-1">
                    {selected.numeroGuia}
                  </a>
                  <span className="text-xs text-[#8e8e9a]">↗ rastrear</span>
                </div>
              )}

              {/* Botón siguiente paso (simple) */}
              {nextStep?.type === 'btn' && (
                <button
                  onClick={() => handleNextStatus(nextStep.next)}
                  disabled={saving}
                  className="w-full py-3 rounded-xl bg-[#4f7cff] hover:bg-[#3d6ee0] text-white font-semibold text-sm transition-all disabled:opacity-50"
                >
                  {saving ? 'Guardando…' : nextStep.label}
                </button>
              )}

              {/* Formulario envío a domicilio */}
              {nextStep?.type === 'envio' && (
                <div className="space-y-3 p-4 rounded-xl bg-white/3 border border-white/8">
                  <p className="text-sm font-semibold text-[#e8e8ed]">📦 Procesar envío a domicilio</p>

                  <div>
                    <label className="text-xs text-[#8e8e9a] mb-1.5 block">Número de guía Correos CR *</label>
                    <input
                      type="text"
                      value={guia}
                      onChange={(e) => setGuia(e.target.value)}
                      placeholder="Ej: CR123456789CR"
                      className="w-full h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-[#e8e8ed] text-sm placeholder:text-[#8e8e9a]/50 focus:outline-none focus:border-[#4f7cff]/60 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-[#8e8e9a] mb-1.5 block">
                      Costo de envío real (₡4,000 – ₡20,000)
                      <span className="ml-1 opacity-60">— varía según zona</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8e8e9a] text-sm">₡</span>
                      <input
                        type="number"
                        value={costoEnvio}
                        onChange={(e) => setCostoEnvio(e.target.value)}
                        placeholder="Ej: 6000"
                        min={4000} max={20000} step={500}
                        className="w-full h-10 pl-7 pr-3 rounded-xl bg-white/5 border border-white/10 text-[#e8e8ed] text-sm placeholder:text-[#8e8e9a]/50 focus:outline-none focus:border-[#4f7cff]/60"
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-[#8e8e9a]/60 mt-1 px-1">
                      <span>Zona cercana ~₡4,000</span>
                      <span>Zona lejana ~₡20,000</span>
                    </div>
                  </div>

                  <button
                    onClick={handleEnvio}
                    disabled={savingEnvio || !guia.trim()}
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-all disabled:opacity-50"
                  >
                    {savingEnvio ? 'Procesando…' : '📦 Marcar como enviado y notificar al cliente'}
                  </button>
                </div>
              )}

              {/* Finalizado */}
              {estadoActual === 'ENTREGADO' && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium">
                  ✅ Pedido entregado — completado
                </div>
              )}
              {estadoActual === 'CANCELADO' && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium">
                  ✖ Pedido cancelado
                </div>
              )}

              {/* Override manual (colapsable) */}
              {!['ENTREGADO', 'CANCELADO'].includes(estadoActual) && (
                <div className="border-t border-white/8 pt-3">
                  <button
                    onClick={() => setShowOverride(v => !v)}
                    className="text-xs text-[#8e8e9a] hover:text-[#e8e8ed] transition-colors"
                  >
                    {showOverride ? '▲' : '▼'} Cambio manual de estado
                  </button>
                  {showOverride && (
                    <div className="flex gap-2 mt-2">
                      <select
                        value={overrideStatus}
                        onChange={(e) => setOverrideStatus(e.target.value)}
                        className="flex-1 h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-[#e8e8ed] text-sm focus:outline-none"
                      >
                        {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <button
                        onClick={handleOverride}
                        disabled={saving || overrideStatus === estadoActual}
                        className="px-4 py-1.5 rounded-xl bg-white/8 hover:bg-white/15 text-[#e8e8ed] text-xs font-medium transition-all disabled:opacity-50"
                      >
                        {saving ? '…' : 'Aplicar'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </AdminLayout>
  )
}
