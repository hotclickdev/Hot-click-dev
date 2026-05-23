import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import AdminLayout from '@/layouts/AdminLayout'
import Spinner from '@/components/ui/Spinner'
import Badge from '@/components/ui/Badge'
import { ventaService } from '@/services/orderService'
import { formatPrice, formatDate } from '@/utils/format'
import ImportExportBar from '@/components/admin/ImportExportBar'

const TABLE_PAGE_SIZE = 25

const QUICK = [
  { label: 'Hoy', days: 0 },
  { label: '7 días', days: 7 },
  { label: '30 días', days: 30 },
  { label: '3 meses', days: 90 },
  { label: 'Todo', days: -1 },
]

function toISO(date) { return date.toISOString().slice(0, 10) }

export default function AdminReportes() {
  const { t } = useTranslation()
  const [ventas, setVentas] = useState([])
  const [loading, setLoading] = useState(true)
  const [quick, setQuick] = useState(30)
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [metodoPago, setMetodoPago] = useState('')
  const [estado, setEstado] = useState('')
  const [search, setSearch] = useState('')
  const [tablePage, setTablePage] = useState(0)

  useEffect(() => {
    ventaService.getAll()
      .then(({ data }) => setVentas(Array.isArray(data) ? data : data?.content ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const applyQuick = (days) => {
    setQuick(days)
    setTablePage(0)
    if (days === -1) { setDesde(''); setHasta(''); return }
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - days)
    setDesde(toISO(start))
    setHasta(toISO(end))
  }

  const filtered = useMemo(() => {
    setTablePage(0)
    return ventas.filter((v) => {
      const fecha = (v.fechaCreacion ?? '').slice(0, 10)
      if (desde && fecha < desde) return false
      if (hasta && fecha > hasta) return false
      if (metodoPago && v.metodoPago !== metodoPago) return false
      if (estado && v.estado !== estado) return false
      if (search) {
        const q = search.toLowerCase()
        const name = (v.nombreCliente ?? v.cliente?.nombre ?? '').toLowerCase()
        if (!name.includes(q) && !String(v.id).includes(q)) return false
      }
      return true
    })
  }, [ventas, desde, hasta, metodoPago, estado, search])

  const completadas_list = filtered.filter((v) => v.estado === 'COMPLETADO' || v.estado === 'ENTREGADO')
  const totalIngresos   = completadas_list.reduce((s, v) => s + (v.total ?? 0), 0)
  const totalEnvios     = completadas_list.reduce((s, v) => s + (v.costoEnvio ?? 0), 0)
  const totalProductos  = totalIngresos - totalEnvios
  const completadas     = completadas_list.length
  const ticketPromedio  = completadas > 0 ? totalIngresos / completadas : 0

  const metodos = [...new Set(ventas.map((v) => v.metodoPago).filter(Boolean))]
  const estados = [...new Set(ventas.map((v) => v.estado).filter(Boolean))]

  const totalPages = Math.ceil(filtered.length / TABLE_PAGE_SIZE)
  const paginated  = filtered.slice(tablePage * TABLE_PAGE_SIZE, (tablePage + 1) * TABLE_PAGE_SIZE)

  const exportCSV = () => {
    const header = 'ID,Cliente,Subtotal Productos,Costo Envío,Total,Método,Estado,Fecha'
    const rows = filtered.map((v) => {
      const envio = v.costoEnvio ?? 0
      const subtotalProd = (v.total ?? 0) - envio
      return [v.id, v.nombreCliente ?? v.cliente?.nombre ?? '', subtotalProd, envio, v.total ?? 0, v.metodoPago ?? '', v.estado ?? '', (v.fechaCreacion ?? '').slice(0, 10)].join(',')
    })
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `ventas-${toISO(new Date())}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-[#e8e8ed]">{t('admin.reportes.title')}</h1>
            <p className="text-sm text-[#8e8e9a] mt-1">{t('admin.reportes.generate')}</p>
          </div>
          <ImportExportBar
            exportOnly
            data={filtered.map((v) => {
              const envio = v.costoEnvio ?? 0
              const subtotalProd = (v.total ?? 0) - envio
              return {
                id: v.id,
                cliente: v.nombreCliente ?? v.cliente?.nombre ?? '',
                subtotalProductos: subtotalProd,
                costoEnvio: envio,
                total: v.total ?? 0,
                metodoPago: v.metodoPago ?? '',
                estado: v.estado ?? '',
                fecha: (v.fechaCreacion ?? '').slice(0, 10),
              }
            })}
            columns={['id','cliente','subtotalProductos','costoEnvio','total','metodoPago','estado','fecha']}
            filename={`ventas-${toISO(new Date())}`}
            sheetName="Ventas"
          />
        </div>

        {/* Quick filters */}
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
            <label className="text-xs text-[#8e8e9a]">{t('admin.reportes.from')}</label>
            <input
              type="date"
              value={desde}
              onChange={(e) => { setDesde(e.target.value); setQuick(-1) }}
              className="h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-[#e8e8ed] text-sm focus:outline-none focus:border-[#4f7cff]/60"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#8e8e9a]">{t('admin.reportes.to')}</label>
            <input
              type="date"
              value={hasta}
              onChange={(e) => { setHasta(e.target.value); setQuick(-1) }}
              className="h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-[#e8e8ed] text-sm focus:outline-none focus:border-[#4f7cff]/60"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#8e8e9a]">{t('admin.reportes.type')}</label>
            <select
              value={metodoPago}
              onChange={(e) => setMetodoPago(e.target.value)}
              className="h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-[#e8e8ed] text-sm focus:outline-none focus:border-[#4f7cff]/60"
            >
              <option value="">Todos</option>
              {metodos.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#8e8e9a]">{t('admin.orders.status')}</label>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-[#e8e8ed] text-sm focus:outline-none focus:border-[#4f7cff]/60"
            >
              <option value="">Todos</option>
              {estados.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <input
          type="text"
          placeholder={t('common.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm h-9 px-4 rounded-xl bg-white/5 border border-white/10 text-[#e8e8ed] text-sm placeholder:text-[#8e8e9a]/60 focus:outline-none focus:border-[#4f7cff]/60"
        />

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-[#111114] border border-white/8 rounded-2xl p-4">
            <p className="text-xs text-[#8e8e9a] mb-1">Ventas en período</p>
            <p className="text-xl font-bold text-[#e8e8ed]">{filtered.length}</p>
          </div>
          <div className="bg-[#111114] border border-white/8 rounded-2xl p-4">
            <p className="text-xs text-[#8e8e9a] mb-1">Ingresos (completadas)</p>
            <p className="text-xl font-bold text-emerald-400">{formatPrice(totalIngresos)}</p>
            {totalEnvios > 0 && (
              <div className="mt-2 space-y-0.5">
                <p className="text-xs text-[#8e8e9a]">Productos: <span className="text-[#e8e8ed]">{formatPrice(totalProductos)}</span></p>
                <p className="text-xs text-[#8e8e9a]">Envíos: <span className="text-amber-400">{formatPrice(totalEnvios)}</span></p>
              </div>
            )}
          </div>
          <div className="bg-[#111114] border border-white/8 rounded-2xl p-4">
            <p className="text-xs text-[#8e8e9a] mb-1">Completadas</p>
            <p className="text-xl font-bold text-[#4f7cff]">{completadas}</p>
          </div>
          <div className="bg-[#111114] border border-white/8 rounded-2xl p-4">
            <p className="text-xs text-[#8e8e9a] mb-1">Ticket promedio</p>
            <p className="text-xl font-bold text-purple-400">{formatPrice(ticketPromedio)}</p>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : (
          <div className="bg-[#111114] border border-white/8 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/8">
                    {['#', t('admin.orders.client'), 'Productos', 'Envío', t('admin.orders.total'), t('admin.reportes.type'), t('admin.orders.date'), t('admin.orders.status')].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-[#8e8e9a] uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-12 text-center text-[#8e8e9a]">{t('common.noData')}</td></tr>
                  ) : paginated.map((v) => {
                    const envio = v.costoEnvio ?? 0
                    const subtotalProd = (v.total ?? 0) - envio
                    return (
                      <tr key={v.id} className="hover:bg-white/3 transition-colors">
                        <td className="px-4 py-3 text-[#8e8e9a] text-xs font-mono">#{v.id}</td>
                        <td className="px-4 py-3 text-[#e8e8ed]">{v.nombreCliente ?? v.cliente?.nombre ?? '—'}</td>
                        <td className="px-4 py-3 font-semibold text-[#e8e8ed]">{formatPrice(subtotalProd)}</td>
                        <td className="px-4 py-3 text-xs">{envio > 0 ? <span className="text-amber-400">{formatPrice(envio)}</span> : <span className="text-[#8e8e9a]">—</span>}</td>
                        <td className="px-4 py-3 font-semibold text-emerald-400">{formatPrice(v.total ?? 0)}</td>
                        <td className="px-4 py-3 text-[#8e8e9a] text-xs">{v.metodoPago ?? '—'}</td>
                        <td className="px-4 py-3 text-[#8e8e9a] text-xs">{v.fechaCreacion ? formatDate(v.fechaCreacion) : '—'}</td>
                        <td className="px-4 py-3">
                          <Badge variant={v.estado === 'COMPLETADO' || v.estado === 'ENTREGADO' ? 'success' : 'warning'}>
                            {v.estado ?? '—'}
                          </Badge>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {filtered.length > 0 && (
              <div className="px-4 py-3 border-t border-white/8 flex items-center justify-between text-xs text-[#8e8e9a]">
                <span>{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setTablePage((p) => Math.max(0, p - 1))}
                      disabled={tablePage === 0}
                      className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 disabled:opacity-30 hover:bg-white/10 transition-colors"
                    >
                      ←
                    </button>
                    <span>{tablePage + 1} / {totalPages}</span>
                    <button
                      onClick={() => setTablePage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={tablePage >= totalPages - 1}
                      className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 disabled:opacity-30 hover:bg-white/10 transition-colors"
                    >
                      →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
