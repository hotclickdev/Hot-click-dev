import { useState, useEffect, useMemo } from 'react'
import AdminLayout from '@/layouts/AdminLayout'
import Spinner from '@/components/ui/Spinner'
import Badge from '@/components/ui/Badge'
import api from '@/services/api'
import { ventaService } from '@/services/orderService'
import { formatPrice, formatDate } from '@/utils/format'

const QUICK = [
  { label: 'Hoy', days: 0 },
  { label: '7 días', days: 7 },
  { label: '30 días', days: 30 },
  { label: 'Todo', days: -1 },
]

function toISO(d) { return d.toISOString().slice(0, 10) }

export default function AdminFinanzas() {
  const [cotizaciones, setCotizaciones] = useState([])
  const [ventas, setVentas] = useState([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [quick, setQuick] = useState(30)
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState('')
  const [metodoPago, setMetodoPago] = useState('')

  useEffect(() => {
    Promise.all([
      api.get('/cotizaciones').catch(() => ({ data: [] })),
      ventaService.getAll().catch(() => ({ data: [] })),
    ]).then(([{ data: cots }, { data: vs }]) => {
      setCotizaciones(Array.isArray(cots) ? cots : cots?.content ?? [])
      setVentas(Array.isArray(vs) ? vs : vs?.content ?? [])
    }).finally(() => setLoading(false))
  }, [])

  const applyQuick = (days) => {
    setQuick(days)
    if (days === -1) { setDesde(''); setHasta(''); return }
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - days)
    setDesde(toISO(start))
    setHasta(toISO(end))
  }

  const filteredVentas = useMemo(() => ventas.filter((v) => {
    const fecha = (v.fechaCreacion ?? '').slice(0, 10)
    if (desde && fecha < desde) return false
    if (hasta && fecha > hasta) return false
    if (estadoFiltro && v.estado !== estadoFiltro) return false
    if (metodoPago && v.metodoPago !== metodoPago) return false
    return true
  }), [ventas, desde, hasta, estadoFiltro, metodoPago])

  const totalIngresos = filteredVentas
    .filter((v) => v.estado === 'COMPLETADO' || v.estado === 'ENTREGADO')
    .reduce((s, v) => s + (v.total ?? 0), 0)
  const completadas = filteredVentas.filter((v) => v.estado === 'COMPLETADO' || v.estado === 'ENTREGADO').length
  const pendientes = filteredVentas.filter((v) => v.estado === 'PENDIENTE').length

  const metodos = [...new Set(ventas.map((v) => v.metodoPago).filter(Boolean))]
  const estados = [...new Set(ventas.map((v) => v.estado).filter(Boolean))]

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#e8e8ed]">Finanzas</h1>
          <p className="text-sm text-[#8e8e9a] mt-1">Ingresos, ventas y cotizaciones</p>
        </div>

        {/* Quick period buttons */}
        <div className="flex flex-wrap gap-2">
          {QUICK.map((q) => (
            <button
              key={q.days}
              onClick={() => applyQuick(q.days)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                quick === q.days
                  ? 'bg-[#4f7cff] text-white'
                  : 'bg-white/5 border border-white/10 text-[#8e8e9a] hover:text-white'
              }`}
            >
              {q.label}
            </button>
          ))}
        </div>

        {/* Advanced filters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#8e8e9a]">Desde</label>
            <input type="date" value={desde} onChange={(e) => { setDesde(e.target.value); setQuick(-1) }}
              className="h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-[#e8e8ed] text-sm focus:outline-none focus:border-[#4f7cff]/60" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#8e8e9a]">Hasta</label>
            <input type="date" value={hasta} onChange={(e) => { setHasta(e.target.value); setQuick(-1) }}
              className="h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-[#e8e8ed] text-sm focus:outline-none focus:border-[#4f7cff]/60" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#8e8e9a]">Método de pago</label>
            <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}
              className="h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-[#e8e8ed] text-sm focus:outline-none focus:border-[#4f7cff]/60">
              <option value="">Todos</option>
              {metodos.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#8e8e9a]">Estado</label>
            <select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)}
              className="h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-[#e8e8ed] text-sm focus:outline-none focus:border-[#4f7cff]/60">
              <option value="">Todos</option>
              {estados.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-[#111114] border border-white/8 rounded-2xl p-5">
                <p className="text-xs text-[#8e8e9a] mb-1">Ingresos (completadas)</p>
                <p className="text-2xl font-bold text-emerald-400">{formatPrice(totalIngresos)}</p>
                <p className="text-xs text-[#8e8e9a] mt-1">{filteredVentas.length} ventas en período</p>
              </div>
              <div className="bg-[#111114] border border-white/8 rounded-2xl p-5">
                <p className="text-xs text-[#8e8e9a] mb-1">Completadas / Pendientes</p>
                <p className="text-2xl font-bold text-[#4f7cff]">{completadas} <span className="text-[#8e8e9a] text-base font-normal">/ {pendientes}</span></p>
                <p className="text-xs text-[#8e8e9a] mt-1">de {filteredVentas.length} ventas</p>
              </div>
              <div className="bg-[#111114] border border-white/8 rounded-2xl p-5">
                <p className="text-xs text-[#8e8e9a] mb-1">Cotizaciones WhatsApp</p>
                <p className="text-2xl font-bold text-amber-400">{cotizaciones.length}</p>
                <p className="text-xs text-[#8e8e9a] mt-1">Total registradas</p>
              </div>
            </div>

            {/* Cotizaciones table */}
            {cotizaciones.length > 0 && (
              <div>
                <h2 className="text-base font-semibold text-[#e8e8ed] mb-3">Cotizaciones / WhatsApp</h2>
                <div className="bg-[#111114] border border-white/8 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/8">
                          {['#', 'Cliente', 'Productos', 'Total', 'Fecha', 'Estado'].map((h) => (
                            <th key={h} className="text-left px-4 py-3 text-xs font-medium text-[#8e8e9a] uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {cotizaciones.map((c) => (
                          <tr key={c.id} className="hover:bg-white/3 transition-colors">
                            <td className="px-4 py-3 text-[#8e8e9a] text-xs font-mono">#{c.id}</td>
                            <td className="px-4 py-3 text-[#e8e8ed]">{c.nombreCliente ?? c.correoCliente ?? '—'}</td>
                            <td className="px-4 py-3 text-[#8e8e9a] text-xs max-w-[200px] truncate">
                              {c.items?.map((i) => i.nombreProducto ?? i.nombre).join(', ') ?? '—'}
                            </td>
                            <td className="px-4 py-3 font-medium text-[#e8e8ed]">{formatPrice(c.total ?? 0)}</td>
                            <td className="px-4 py-3 text-[#8e8e9a] text-xs">{c.fechaCreacion ? formatDate(c.fechaCreacion) : '—'}</td>
                            <td className="px-4 py-3">
                              <Badge variant={c.estado === 'COMPLETADA' ? 'success' : 'warning'}>{c.estado ?? 'PENDIENTE'}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Ventas filtradas */}
            <div>
              <h2 className="text-base font-semibold text-[#e8e8ed] mb-3">
                Ventas <span className="text-[#8e8e9a] text-sm font-normal">({filteredVentas.length} resultados)</span>
              </h2>
              {filteredVentas.length === 0 ? (
                <div className="bg-[#111114] border border-white/8 rounded-2xl p-8 text-center text-[#8e8e9a]">
                  Sin ventas para los filtros seleccionados
                </div>
              ) : (
                <div className="bg-[#111114] border border-white/8 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/8">
                          {['#', 'Cliente', 'Total', 'Método', 'Fecha', 'Estado'].map((h) => (
                            <th key={h} className="text-left px-4 py-3 text-xs font-medium text-[#8e8e9a] uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredVentas.slice(0, 50).map((v) => (
                          <tr key={v.id} className="hover:bg-white/3 transition-colors">
                            <td className="px-4 py-3 text-[#8e8e9a] text-xs font-mono">#{v.id}</td>
                            <td className="px-4 py-3 text-[#e8e8ed]">{v.nombreCliente ?? v.cliente?.nombre ?? '—'}</td>
                            <td className="px-4 py-3 font-bold text-emerald-400">{formatPrice(v.total ?? 0)}</td>
                            <td className="px-4 py-3 text-[#8e8e9a] text-xs">{v.metodoPago ?? '—'}</td>
                            <td className="px-4 py-3 text-[#8e8e9a] text-xs">{v.fechaCreacion ? formatDate(v.fechaCreacion) : '—'}</td>
                            <td className="px-4 py-3">
                              <Badge variant={v.estado === 'COMPLETADO' || v.estado === 'ENTREGADO' ? 'success' : 'warning'}>
                                {v.estado ?? '—'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
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
