import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import AdminLayout from '@/layouts/AdminLayout'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import Spinner from '@/components/ui/Spinner'
import { orderService } from '@/services/orderService'
import { useToast } from '@/components/ui/Toast'
import { formatDate, formatPrice, statusColor } from '@/utils/format'

const STATUS_OPTIONS = ['PENDIENTE', 'DESPACHADO', 'ENTREGADO', 'CANCELADO']

export default function AdminOrders() {
  const { t } = useTranslation()
  const toast = useToast()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [newStatus, setNewStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('ALL')

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
    setNewStatus(order.estado ?? '')
  }

  const handleStatusUpdate = async () => {
    if (!selected || !newStatus) return
    setSaving(true)
    try {
      await orderService.updateStatus(selected.id, newStatus)
      toast({ message: 'Estado actualizado', type: 'success' })
      setSelected(null)
      load()
    } catch { toast({ message: 'Error al actualizar', type: 'error' }) }
    finally { setSaving(false) }
  }

  const filtered = filter === 'ALL' ? orders : orders.filter((o) => o.estado === filter)

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
        <div className="flex gap-1 bg-white/3 border border-white/8 rounded-xl p-1 w-fit">
          {['ALL', ...STATUS_OPTIONS].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === s
                  ? 'bg-[#4f7cff] text-white shadow-sm'
                  : 'text-[#8e8e9a] hover:text-white'
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
                    {['#', t('admin.orders.client'), t('admin.orders.total'), t('admin.orders.status'), t('admin.orders.date'), ''].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-[#8e8e9a] uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filtered.map((order) => (
                    <tr key={order.id} className="hover:bg-white/3 transition-colors">
                      <td className="px-4 py-3 text-[#8e8e9a] text-xs font-mono">#{order.id}</td>
                      <td className="px-4 py-3 text-[#e8e8ed]">
                        {order.usuario?.nombre ?? order.nombreCliente ?? '—'}
                      </td>
                      <td className="px-4 py-3 font-medium text-[#e8e8ed]">
                        {formatPrice(order.total ?? 0)}
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
                          {t('admin.orders.detail')}
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
      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Pedido #${selected?.id}`} size="md">
        {selected && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-[#8e8e9a] text-xs mb-1">{t('admin.orders.client')}</p>
                <p className="text-[#e8e8ed]">{selected.usuario?.nombre ?? selected.nombreCliente ?? '—'}</p>
              </div>
              <div>
                <p className="text-[#8e8e9a] text-xs mb-1">{t('admin.orders.total')}</p>
                <p className="text-[#e8e8ed] font-bold">{formatPrice(selected.total)}</p>
              </div>
              <div>
                <p className="text-[#8e8e9a] text-xs mb-1">{t('admin.orders.status')}</p>
                <Badge variant={statusColor(selected.estado)}>{selected.estado}</Badge>
              </div>
              <div>
                <p className="text-[#8e8e9a] text-xs mb-1">{t('admin.orders.date')}</p>
                <p className="text-[#e8e8ed] text-xs">
                  {selected.fechaCreacion ? formatDate(selected.fechaCreacion) : '—'}
                </p>
              </div>
            </div>

            {/* Items */}
            {selected.items?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-[#8e8e9a] mb-2">{t('admin.sales.products')}</p>
                <div className="space-y-2">
                  {selected.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm text-[#e8e8ed] bg-white/3 px-3 py-2 rounded-lg">
                      <span>{item.nombreProducto ?? item.producto?.nombre} ×{item.cantidad}</span>
                      <span>{formatPrice((item.precioUnitario ?? item.precio) * item.cantidad)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Update status */}
            <div>
              <p className="text-xs font-medium text-[#8e8e9a] mb-2">{t('admin.orders.updateStatus')}</p>
              <div className="flex gap-2">
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="flex-1 h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-[#e8e8ed] text-sm focus:outline-none focus:border-[#4f7cff]/60"
                >
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <Button onClick={handleStatusUpdate} loading={saving} disabled={newStatus === selected.estado}>
                  {t('common.save')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </AdminLayout>
  )
}
