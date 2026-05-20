import { useState, useEffect, useMemo } from 'react'
import AdminLayout from '@/layouts/AdminLayout'
import Spinner from '@/components/ui/Spinner'
import { orderService } from '@/services/orderService'
import { formatPrice, formatDate } from '@/utils/format'

const QUICK = [
  { label: 'Hoy',    days: 0  },
  { label: '7 días', days: 7  },
  { label: '30 días',days: 30 },
  { label: 'Todo',   days: -1 },
]

function toISO(d) { return d.toISOString().slice(0, 10) }

function KPI({ label, value, sub, color = '#4ade80' }) {
  return (
    <div className="bg-[#111114] border border-white/8 rounded-2xl p-5">
      <p className="text-xs text-[#8e8e9a] mb-1">{label}</p>
      <p className="text-2xl font-bold" style={{ color }}>{formatPrice(value)}</p>
      {sub && <p className="text-xs text-[#8e8e9a] mt-1">{sub}</p>}
    </div>
  )
}

export default function AdminFinanzas() {
  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(true)
  const [quick, setQuick]     = useState(30)
  const [desde, setDesde]     = useState('')
  const [hasta, setHasta]     = useState('')

  useEffect(() => {
    orderService.getAll()
      .then(({ data }) => {
        const raw = data?.data ?? data
        const all = Array.isArray(raw) ? raw : raw?.content ?? []
        setPedidos(all.filter(p => p.estado === 'ENTREGADO'))
      })
      .finally(() => setLoading(false))
  }, [])

  const applyQuick = (days) => {
    setQuick(days)
    if (days === -1) { setDesde(''); setHasta(''); return }
    const end   = new Date()
    const start = new Date()
    start.setDate(start.getDate() - days)
    setDesde(toISO(start))
    setHasta(toISO(end))
  }

  const filtered = useMemo(() => pedidos.filter((p) => {
    const fecha = (p.fechaCreacion ?? '').slice(0, 10)
    if (desde && fecha < desde) return false
    if (hasta && fecha > hasta) return false
    return true
  }), [pedidos, desde, hasta])

  const totalProductos = filtered.reduce((s, p) => s + (p.subtotal ?? (p.total ?? 0) - (p.costoEnvio ?? 0)), 0)
  const totalEnvio     = filtered.reduce((s, p) => s + (p.costoEnvio ?? 0), 0)
  const totalCobrado   = filtered.reduce((s, p) => s + (p.total ?? 0), 0)

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold text-[#e8e8ed]">Finanzas</h1>
          <p className="text-sm text-[#8e8e9a] mt-1">Pedidos entregados · desglose productos vs envío</p>
        </div>

        {/* Período */}
        <div className="flex flex-wrap gap-2">
          {QUICK.map((q) => (
            <button key={q.days} onClick={() => applyQuick(q.days)}
              className="px-3 py-1.5 rounded-lg text-sm transition-all"
              style={{
                backgroundColor: quick === q.days ? 'var(--hc-accent)' : 'color-mix(in srgb, var(--hc-text) 5%, transparent)',
                color: quick === q.days ? 'white' : 'var(--hc-muted)',
                border: `1px solid ${quick === q.days ? 'color-mix(in srgb, var(--hc-accent) 40%, transparent)' : 'var(--hc-border)'}`,
              }}>
              {q.label}
            </button>
          ))}
          <input type="date" value={desde} onChange={e => { setDesde(e.target.value); setQuick(-1) }}
            className="h-9 px-3 rounded-xl text-sm text-[#e8e8ed] focus:outline-none"
            />
          <input type="date" value={hasta} onChange={e => { setHasta(e.target.value); setQuick(-1) }}
            className="h-9 px-3 rounded-xl text-sm text-[#e8e8ed] focus:outline-none"
            />
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <KPI
                label="Ingresos por productos"
                value={totalProductos}
                sub={`${filtered.length} pedido${filtered.length !== 1 ? 's' : ''} entregado${filtered.length !== 1 ? 's' : ''}`}
                color="#4ade80"
              />
              <KPI
                label="Costos de envío (moto)"
                value={totalEnvio}
                sub={`${filtered.filter(p => (p.costoEnvio ?? 0) > 0).length} envíos a domicilio`}
                color="#f59e0b"
              />
              <KPI
                label="Total cobrado"
                value={totalCobrado}
                sub="Productos + envío"
                color="#4f7cff"
              />
            </div>

            {/* Tabla */}
            <div>
              <h2 className="text-base font-semibold text-[#e8e8ed] mb-3">
                Pedidos entregados <span className="text-[#8e8e9a] text-sm font-normal">({filtered.length})</span>
              </h2>

              {filtered.length === 0 ? (
                <div className="bg-[#111114] border border-white/8 rounded-2xl p-10 text-center text-[#8e8e9a]">
                  No hay pedidos entregados en este período
                </div>
              ) : (
                <div className="bg-[#111114] border border-white/8 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/8">
                          {['#', 'Cliente', 'Fecha', 'Productos', 'Envío (moto)', 'Total cobrado'].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#8e8e9a]">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filtered.map((p) => {
                          const envio      = p.costoEnvio ?? 0
                          const productos  = p.subtotal ?? (p.total ?? 0) - envio
                          const esRetiro   = p.metodoEnvio !== 'ENVIO_A_DOMICILIO'
                          return (
                            <tr key={p.id} className="hover:bg-white/3 transition-colors">
                              <td className="px-4 py-3 font-mono text-xs text-[#8e8e9a]">#{p.id}</td>
                              <td className="px-4 py-3 text-[#e8e8ed]">
                                <p className="font-medium truncate max-w-[140px]">{p.nombreCliente ?? '—'}</p>
                                <p className="text-[11px] text-[#8e8e9a]">{esRetiro ? '🏪 Retiro' : '🚚 Domicilio'}</p>
                              </td>
                              <td className="px-4 py-3 text-xs text-[#8e8e9a]">
                                {p.fechaCreacion ? formatDate(p.fechaCreacion) : '—'}
                              </td>
                              <td className="px-4 py-3 font-semibold text-[#4ade80]">
                                {formatPrice(productos)}
                              </td>
                              <td className="px-4 py-3">
                                {envio > 0 ? (
                                  <span className="font-semibold text-amber-400">{formatPrice(envio)}</span>
                                ) : (
                                  <span className="text-[#8e8e9a]/40 text-xs">—</span>
                                )}
                              </td>
                              <td className="px-4 py-3 font-bold text-[#4f7cff]">
                                {formatPrice(p.total ?? 0)}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                      {/* Totales */}
                      <tfoot>
                        <tr style={{ borderTop: '2px solid var(--hc-border)' }}>
                          <td colSpan={3} className="px-4 py-3 text-xs font-semibold text-[#8e8e9a] uppercase tracking-wider">
                            Totales del período
                          </td>
                          <td className="px-4 py-3 font-bold text-[#4ade80]">{formatPrice(totalProductos)}</td>
                          <td className="px-4 py-3 font-bold text-amber-400">{formatPrice(totalEnvio)}</td>
                          <td className="px-4 py-3 font-bold text-[#4f7cff]">{formatPrice(totalCobrado)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  )
}
